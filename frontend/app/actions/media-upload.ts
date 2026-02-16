'use server';

import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';
import path from 'path';

/**
 * Upload de mídia para flashcards
 * Retorna o storage path (não URL) para armazenar em media_refs
 */
export async function uploadCardMedia(
    file: File,
    deckId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: 'Não autenticado' };
        }

        // Validar tipo de arquivo
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return { success: false, error: 'Tipo de arquivo não permitido. Use JPEG, PNG, GIF ou WebP.' };
        }

        // Validar tamanho (5MB máximo)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return { success: false, error: 'Arquivo muito grande. Máximo: 5MB.' };
        }

        // Gerar hash único para o arquivo
        const buffer = await file.arrayBuffer();
        const hash = crypto.createHash('sha1').update(Buffer.from(buffer)).digest('hex').slice(0, 12);
        const ext = path.extname(file.name) || '.png';
        const filename = `${hash}${ext}`;

        // Construir path: userId/deckId/filename
        const storagePath = `${user.id}/${deckId}/${filename}`;

        // Upload para Supabase Storage (bucket privado)
        const { error: uploadError } = await supabase.storage
            .from('flashcard-media')
            .upload(storagePath, buffer, {
                contentType: file.type,
                upsert: true, // Sobrescrever se já existir (mesmo hash)
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return { success: false, error: 'Erro ao fazer upload da imagem.' };
        }

        return { success: true, path: storagePath };
    } catch (error) {
        console.error('uploadCardMedia error:', error);
        return { success: false, error: 'Erro inesperado ao fazer upload.' };
    }
}

/**
 * Deletar mídia do storage
 */
export async function deleteCardMedia(
    storagePath: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: 'Não autenticado' };
        }

        // Verificar se o path pertence ao usuário
        if (!storagePath.startsWith(user.id + '/')) {
            return { success: false, error: 'Permissão negada' };
        }

        // Deletar do storage
        const { error: deleteError } = await supabase.storage
            .from('flashcard-media')
            .remove([storagePath]);

        if (deleteError) {
            console.error('Delete error:', deleteError);
            return { success: false, error: 'Erro ao deletar imagem.' };
        }

        return { success: true };
    } catch (error) {
        console.error('deleteCardMedia error:', error);
        return { success: false, error: 'Erro inesperado ao deletar.' };
    }
}

/**
 * Gerar signed URL para exibição de mídia (60min expiry)
 * Usado para exibir imagens de bucket privado
 */
export async function getMediaSignedUrl(
    storagePath: string
): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const supabase = await createClient();

        // Gerar signed URL (60 minutos)
        const { data, error } = await supabase.storage
            .from('flashcard-media')
            .createSignedUrl(storagePath, 3600); // 60 minutos

        if (error || !data) {
            console.error('Signed URL error:', error);
            return { success: false, error: 'Erro ao gerar URL da imagem.' };
        }

        return { success: true, url: data.signedUrl };
    } catch (error) {
        console.error('getMediaSignedUrl error:', error);
        return { success: false, error: 'Erro inesperado ao gerar URL.' };
    }
}

/**
 * Gerar signed URLs para múltiplos paths (batch)
 */
export async function getMediaSignedUrls(
    storagePaths: string[]
): Promise<{ success: boolean; urls?: Record<string, string>; error?: string }> {
    try {
        const supabase = await createClient();

        // Gerar signed URLs em paralelo
        const results = await Promise.all(
            storagePaths.map(async (path) => {
                const { data, error } = await supabase.storage
                    .from('flashcard-media')
                    .createSignedUrl(path, 3600);

                return { path, url: data?.signedUrl, error };
            })
        );

        // Criar mapeamento path -> URL
        const urls: Record<string, string> = {};
        for (const result of results) {
            if (result.url) {
                urls[result.path] = result.url;
            }
        }

        return { success: true, urls };
    } catch (error) {
        console.error('getMediaSignedUrls error:', error);
        return { success: false, error: 'Erro inesperado ao gerar URLs.' };
    }
}

/**
 * Extrair referências de mídia de conteúdo Markdown
 * Procura por padrões: ![alt](path) ou <img src="path">
 */
export function extractMediaRefs(content: string): string[] {
    const paths: string[] = [];

    // Padrão Markdown: ![alt](path)
    const markdownRegex = /!\[.*?\]\((.*?)\)/g;
    let match;
    while ((match = markdownRegex.exec(content)) !== null) {
        paths.push(match[1]);
    }

    // Padrão HTML: <img src="path">
    const htmlRegex = /<img[^>]+src="([^">]+)"/g;
    while ((match = htmlRegex.exec(content)) !== null) {
        paths.push(match[1]);
    }

    // Filtrar apenas paths do storage (userId/deckId/...)
    return paths.filter(p => p.includes('/') && !p.startsWith('http'));
}
