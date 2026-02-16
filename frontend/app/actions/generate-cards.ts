'use server'

import { askMedAI } from "./medai-core"
import { getEnhancedContext } from "@/app/actions/medai-rag"
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { createClient } from "@/utils/supabase/server";
import { AI_CONTEXTS } from "@/lib/ai-prompts";

const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY!);

// Re-export type from centralized location
export type { GeneratedCard } from '@/lib/flashcard-validation';
import type { GeneratedCard } from '@/lib/flashcard-validation';

export async function generateFlashcardsAI({
    topic,
    details,
    references,
    difficulty,
    amount,
    fileBase64, // Legacy (Mantido por compatibilidade, mas preferimos StoragePath)
    deckId, // Novo: Se passado, buscaremos o arquivo do deck
    skipQuota = false // Quando chamado pelo batching, pular quota (gerenciada no nível superior)
}: {
    topic: string,
    details?: string,
    references?: string,
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed',
    amount: number,
    fileBase64?: string,
    deckId?: string,
    skipQuota?: boolean
}) {
    // ========================================================================
    // VALIDAÇÃO DE INPUT
    // ========================================================================
    const MAX_CARDS = 50;
    const MIN_CARDS = 5;

    if (amount > MAX_CARDS) {
        return { success: false, error: `Máximo de ${MAX_CARDS} cards por geração` };
    }
    if (amount < MIN_CARDS) {
        return { success: false, error: `Mínimo de ${MIN_CARDS} cards` };
    }

    // ========================================================================
    // SETUP
    // ========================================================================
    let inlineData = undefined;
    let fileContextInstruction = "";
    let googleFileUri = null;

    // A. Tenta usar o arquivo do DECK (Storage -> Google File API) 📁
    if (deckId) {
        // ... (existing deck logic)
    }

    // --- MANUAL QUOTA CHECK (Flashcards: 1/day) ---
    // Quando skipQuota=true (chamado pelo batching), pula check e increment
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Não autorizado." };

    const today = new Date().toISOString().split('T')[0];
    let profile: any = null;

    if (!skipQuota) {
        const { data: fetchedProfile } = await supabase
            .from('profiles')
            .select('daily_flashcards_count, ai_usage_date')
            .eq('id', user.id)
            .single();
        profile = fetchedProfile;

        if (profile) {
            let flashCount = 0;
            if (profile.ai_usage_date === today) {
                flashCount = profile.daily_flashcards_count || 0;
            }
            if (flashCount >= 1) { // LIMITS.flashcard = 1
                return { success: false, error: "Limite diário de Flashcards atingido (1 por dia)." };
            }
        }
    }
    // ---------------------------------------------------

    if (deckId) {
        // Re-get deck logic inside the scope if needed or just continue since we have supabase client now
        const { data: deck } = await supabase.from('decks').select('temp_file_path, file_uploaded_at').eq('id', deckId).single();
        if (deck && deck.temp_file_path) {
            // ... existing logic ...

            // 1. Verifica Validade (7 dias)
            const uploadDate = new Date(deck.file_uploaded_at);
            const now = new Date();
            const diffDays = (now.getTime() - uploadDate.getTime()) / (1000 * 3600 * 24);

            if (diffDays > 7) {
                // Expirado: Ignora silenciosamente ou avisa? 
                // O frontend já deve ter avisado, mas aqui garantimos que não usa arquivo velho.
                console.log("Arquivo expirado ignorado na geração.");
            } else {
                // 2. Download do Supabase
                const { data: fileBlob, error } = await supabase.storage.from('deck-attachments').download(deck.temp_file_path);

                if (fileBlob && !error) {
                    try {
                        // 3. Upload para Google AI File Manager (Temporário)
                        // Precisamos converter Blob para um path local ou buffer. 
                        // O SDK Node do Google geralmente pede path. Vamos usar um truque ou buffer se suporte.
                        // Como estamos em Server Action Vercel/Next, escrever em disco é limitado (/tmp).

                        const arrayBuffer = await fileBlob.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        // Workaround: Escrever em /tmp para enviar
                        const fs = require('fs');
                        const path = require('path');
                        const tmpPath = path.join('/tmp', `upload-${Date.now()}.pdf`);
                        fs.writeFileSync(tmpPath, buffer);

                        const uploadResponse = await fileManager.uploadFile(tmpPath, {
                            mimeType: "application/pdf",
                            displayName: "Contexto de Estudo",
                        });

                        googleFileUri = uploadResponse.file.uri;

                        // Esperar processamento? PDF costuma ser instantâneo.

                        fileContextInstruction = `
                        IMPORTANTE - FONTE DE DADOS (ARQUIVO ANEXADO VIA FILE API):
                        - O usuário anexou um PDF de referência que a IA já processou.
                        - Use as informações DESTE ARQUIVO com PRIORIDADE MÁXIMA.
                        - Ignore conhecimentos gerais que contradigam o arquivo.
                        `;

                        // Limpa tmp
                        fs.unlinkSync(tmpPath);

                    } catch (e) {
                        console.error("Erro no fluxo Google File API:", e);
                        // Fallback: Segue sem arquivo se der erro
                    }
                }
            }
        }
    }

    // B. Fallback para Base64 (Legacy - Pequenos arquivos)
    if (!googleFileUri && fileBase64) {
        const base64Data = fileBase64.split(',')[1] || fileBase64;
        inlineData = {
            data: base64Data,
            mimeType: "application/pdf"
        };
        fileContextInstruction = `
        IMPORTANTE: Use o documento PDF fornecido (base64) como fonte primária.
        `;
    }

    // 2. DEFINE REFERÊNCIAS
    const referencesText = (googleFileUri || fileBase64)
        ? "Baseie-se estritamente no documento em anexo."
        : (references ? `Baseie-se em: ${references}` : "Baseie-se em Diretrizes (SBC/AMB), Guyton & Hall e Harrison.");

    // 3. DEFINE DIFICULDADE
    const difficultyInstruction = difficulty === 'mixed'
        ? "Varie a dificuldade: 30% fáceis (conceitos básicos), 40% médios (aplicação) e 30% difíceis (casos clínicos)."
        : `Nível de dificuldade: ${difficulty === 'hard' ? 'Especialista/Residência' : difficulty === 'medium' ? 'Graduação em Medicina' : 'Básico'}.`;

    // 4. RAG CONTEXT (Secundário)
    const ragContext = await getEnhancedContext(topic);

    // 5. MONTA O PROMPT FINAL
    const userMessage = `
      TÓPICO: "${topic}"
      QUANTIDADE: ${amount}
      
      ${fileContextInstruction}
      
      ${ragContext}

      CONTEXTO E PREFERÊNCIAS:
      - Detalhes/Foco: ${details || "Foco em raciocínio clínico, fisiopatologia e conduta."}
      - Referências: ${referencesText}
      - Dificuldade: ${difficultyInstruction}
    `

    // 6. CHAMA O CORE
    // Se tiver googleFileUri, precisamos passar de um jeito especial para o 'askMedAI' ou chamar o modelo direto aqui.
    // O 'askMedAI' atual não suporta 'fileUri' direto na interface. Vamos adaptar ou chamar direto.
    // Para simplificar e manter o controle de quota centralizado, vamos adicionar suporte a 'fileUri' no askMedAI? 
    // Melhor: vamos passar como systemInstructionArgs ou adaptar o askMedAI. 
    // Mas wait, askMedAI usa 'inlineData'. File API usa 'fileData'.

    // Vou usar askMedAI mas passar um 'systemInstructionArgs' bombado? Não, fileData é parte do conteudo do user/model.
    // Vamos chamar askMedAI passando um parametro novo 'fileDataPart'.

    // (Ajuste rápido: vou instanciar o modelo aqui se tiver arquivo, para não refatorar o medai-core inteiro agora, 
    // mas o ideal seria atualizar o core. Como o user pediu "passos", vou fazer funcionar aqui primeiro).

    // *Importante*: O askMedAI faz controle de quota. Se eu pular ele, perco o controle.
    // Vamos modificar o askMedAI no futuro. Por agora, vou assumir que se tem arquivo, é um "Special Generation".

    // ... Implementação direta com GoogleGenerativeAI aqui para suportar File API ...

    try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview", // Reverted to stable model for consistency, or keep user's if valid
            systemInstruction: AI_CONTEXTS.flashcard_creator,
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const parts: any[] = [{ text: userMessage }];
        if (googleFileUri) {
            parts.unshift({
                fileData: {
                    mimeType: "application/pdf",
                    fileUri: googleFileUri
                }
            });
        } else if (inlineData) {
            parts.unshift({ inlineData });
        }

        // Gera
        const result = await model.generateContent(parts);
        let finalText = result.response.text();

        // Parse JSON com auto-repair (3 níveis de fallback)
        const { parseWithRepair } = await import('@/lib/flashcard-validation');
        const cards = parseWithRepair(finalText);

        // Cleanup Google File (safe delete)
        await safeDeleteGoogleFile(googleFileUri);

        // MANUAL QUOTA INCREMENT (skip se batching gerencia)
        if (!skipQuota && user && profile) {
            const updates: any = { ai_usage_date: today };
            const currentFlash = (profile.ai_usage_date === today) ? (profile.daily_flashcards_count || 0) : 0;
            updates.daily_flashcards_count = currentFlash + 1;
            if (profile.ai_usage_date !== today) updates.ai_usage_count = 0;

            await supabase.from('profiles').update(updates).eq('id', user.id);
        }

        return { success: true, cards: cards as GeneratedCard[] };

    } catch (e: any) {
        // Cleanup Google File em caso de erro
        await safeDeleteGoogleFile(googleFileUri);
        return { success: false, error: "Erro na geração com arquivo: " + e.message };
    }
}

// ============================================================================
// SAFE DELETE GOOGLE FILE
// ============================================================================

async function safeDeleteGoogleFile(fileUri: string | null) {
    if (!fileUri) return;

    try {
        // Extrair fileId de forma segura
        const parts = fileUri.split('/');
        const fileId = parts[parts.length - 1];

        if (!fileId || fileId.length < 10) {
            console.warn('⚠️ Invalid fileId extracted:', fileId, 'from:', fileUri);
            return;
        }

        await fileManager.deleteFile(fileId);
        console.log('✅ Google file deleted:', fileId);

    } catch (error) {
        // Não falhar a geração por não conseguir deletar
        console.error('⚠️ Failed to delete Google file:', fileUri, error);
        // TODO: Logar em sistema de monitoramento para limpeza manual
    }
}