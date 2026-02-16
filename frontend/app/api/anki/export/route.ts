import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAnkiDeck } from '@/lib/anki-export';
import { renderMarkdownForAnki } from '@/lib/markdown-render';
import crypto from 'crypto';
import path from 'path';

/**
 * GET /api/anki/export?deckId={uuid}
 * Exportar deck para formato Anki (.apkg) com mídias embutidas
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const deckId = searchParams.get('deckId');

        if (!deckId) {
            return NextResponse.json(
                { error: 'deckId é obrigatório' },
                { status: 400 }
            );
        }

        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Buscar deck e verificar permissão
        const { data: deck, error: deckError } = await supabase
            .from('decks')
            .select('id, title, user_id')
            .eq('id', deckId)
            .single();

        if (deckError || !deck) {
            return NextResponse.json(
                { error: 'Deck não encontrado' },
                { status: 404 }
            );
        }

        // Verificar se é o dono (apenas dono pode exportar)
        if (deck.user_id !== user.id) {
            return NextResponse.json(
                { error: 'Permissão negada' },
                { status: 403 }
            );
        }

        // Buscar cards do deck
        const { data: cards, error: cardsError } = await supabase
            .from('flashcards')
            .select('id, front, back, media_refs')
            .eq('deck_id', deckId)
            .order('created_at', { ascending: true });

        if (cardsError) {
            console.error('cardsError:', cardsError);
            return NextResponse.json(
                { error: 'Erro ao buscar cards' },
                { status: 500 }
            );
        }

        if (!cards || cards.length === 0) {
            return NextResponse.json(
                { error: 'Deck vazio' },
                { status: 400 }
            );
        }

        // Extrair mídias (paths, não URLs)
        const mediaPaths = new Set<string>();
        cards.forEach((card: { media_refs?: string[] }) => {
            if (card.media_refs && Array.isArray(card.media_refs)) {
                card.media_refs.forEach((path: string) => mediaPaths.add(path));
            }
        });

        // Download de mídias (server-side, bucket PRIVADO via service role)
        // Nota: Precisa de service role key para acessar bucket privado
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            console.error('SUPABASE_SERVICE_ROLE_KEY não configurado');
            // Continuar sem mídias se não tiver service role key
        }

        const mediaFiles: { filename: string; data: Buffer; originalPath: string }[] = [];

        if (supabaseServiceKey && mediaPaths.size > 0) {
            const { createClient: createServiceClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createServiceClient(supabaseUrl, supabaseServiceKey);

            const downloadPromises = Array.from(mediaPaths).map(async (storagePath) => {
                try {
                    const { data, error } = await supabaseAdmin.storage
                        .from('flashcard-media')
                        .download(storagePath);

                    if (error || !data) {
                        console.error(`Erro ao baixar ${storagePath}:`, error);
                        return null;
                    }

                    // Renomear com hash para evitar colisões
                    const ext = path.extname(storagePath);
                    const hash = crypto.createHash('sha1').update(storagePath).digest('hex').slice(0, 12);
                    const filename = `medquiz_${hash}${ext}`;

                    return {
                        filename,
                        data: Buffer.from(await data.arrayBuffer()),
                        originalPath: storagePath
                    };
                } catch (err) {
                    console.error(`Erro ao processar ${storagePath}:`, err);
                    return null;
                }
            });

            const results = await Promise.all(downloadPromises);
            mediaFiles.push(...results.filter(r => r !== null) as any[]);
        }

        // Criar mapeamento de paths → filenames para substituir no HTML
        const pathToFilename = new Map(
            mediaFiles.map(m => [m.originalPath, m.filename])
        );

        // Converter Markdown → HTML e substituir paths por filenames
        const htmlCards = await Promise.all(
            cards.map(async (card: { front: string; back: string }) => {
                let frontHtml = await renderMarkdownForAnki(card.front);
                let backHtml = await renderMarkdownForAnki(card.back);

                // Substituir storage paths por filenames do Anki
                pathToFilename.forEach((filename, storagePath) => {
                    const escapedPath = storagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    frontHtml = frontHtml.replace(new RegExp(escapedPath, 'g'), filename);
                    backHtml = backHtml.replace(new RegExp(escapedPath, 'g'), filename);
                });

                return { front: frontHtml, back: backHtml };
            })
        );

        // Criar .apkg
        const apkgBuffer = await createAnkiDeck(
            deck.title,
            htmlCards,
            mediaFiles.map(m => ({ filename: m.filename, data: m.data }))
        );

        // Retornar como download
        return new NextResponse(new Uint8Array(apkgBuffer), {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${deck.title}.apkg"`,
                'Content-Length': apkgBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Anki export error:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('Error message:', error instanceof Error ? error.message : String(error));

        return NextResponse.json(
            {
                error: 'Erro ao exportar deck',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
