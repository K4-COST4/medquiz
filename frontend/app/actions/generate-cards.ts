'use server'

import { getEnhancedContext } from "@/app/actions/medai-rag"
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { createClient } from "@/utils/supabase/server";
import { AI_CONTEXTS } from "@/lib/ai-prompts";
import { AI_CONFIG } from "@/lib/ai-config";
import { checkQuota, consumeQuota } from "@/lib/quota";
import { flashcardTelemetry } from "@/lib/telemetry";

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
    fileBase64,
    deckId,
    skipQuota = false
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
    const startTime = Date.now();

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
    // AUTH
    // ========================================================================
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Não autorizado." };

    // ========================================================================
    // QUOTA CHECK (Centralizada via lib/quota.ts)
    // ========================================================================
    if (!skipQuota) {
        const quotaResult = await checkQuota(user.id, 'flashcard');
        flashcardTelemetry.quotaCheck({
            userId: user.id,
            type: 'flashcard',
            allowed: quotaResult.allowed,
            remaining: quotaResult.remaining,
        });
        if (!quotaResult.allowed) {
            return { success: false, error: quotaResult.error || 'Limite atingido.' };
        }
    }

    // ========================================================================
    // SETUP (File handling)
    // ========================================================================
    let inlineData = undefined;
    let fileContextInstruction = "";
    let googleFileUri: string | null = null;

    // A. Tenta usar o arquivo do DECK (Storage -> Google File API) 📁
    if (deckId) {
        const { data: deck } = await supabase.from('decks').select('temp_file_path, file_uploaded_at').eq('id', deckId).single();
        if (deck && deck.temp_file_path) {
            const uploadDate = new Date(deck.file_uploaded_at);
            const diffDays = (Date.now() - uploadDate.getTime()) / (1000 * 3600 * 24);

            if (diffDays > 7) {
                flashcardTelemetry.error('generate-cards', 'expired_file', new Error('Arquivo expirado ignorado'));
            } else {
                const { data: fileBlob, error } = await supabase.storage.from('deck-attachments').download(deck.temp_file_path);

                if (fileBlob && !error) {
                    try {
                        const arrayBuffer = await fileBlob.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        const fs = require('fs');
                        const path = require('path');
                        const tmpPath = path.join('/tmp', `upload-${Date.now()}.pdf`);
                        fs.writeFileSync(tmpPath, buffer);

                        const uploadResponse = await fileManager.uploadFile(tmpPath, {
                            mimeType: "application/pdf",
                            displayName: "Contexto de Estudo",
                        });

                        googleFileUri = uploadResponse.file.uri;

                        fileContextInstruction = `
                        IMPORTANTE - FONTE DE DADOS (ARQUIVO ANEXADO VIA FILE API):
                        - O usuário anexou um PDF de referência que a IA já processou.
                        - Use as informações DESTE ARQUIVO com PRIORIDADE MÁXIMA.
                        - Ignore conhecimentos gerais que contradigam o arquivo.
                        `;

                        fs.unlinkSync(tmpPath);
                    } catch (e) {
                        flashcardTelemetry.error('generate-cards', 'google_file_api_upload', e);
                    }
                }
            }
        }
    }

    // B. Fallback para Base64 (Legacy)
    if (!googleFileUri && fileBase64) {
        const base64Data = fileBase64.split(',')[1] || fileBase64;
        inlineData = { data: base64Data, mimeType: "application/pdf" };
        fileContextInstruction = `IMPORTANTE: Use o documento PDF fornecido (base64) como fonte primária.`;
    }

    // ========================================================================
    // BUILD PROMPT
    // ========================================================================
    const referencesText = (googleFileUri || fileBase64)
        ? "Baseie-se estritamente no documento em anexo."
        : (references ? `Baseie-se em: ${references}` : "Baseie-se em Diretrizes (SBC/AMB), Guyton & Hall e Harrison.");

    const difficultyInstruction = difficulty === 'mixed'
        ? "Varie a dificuldade: 40% fáceis/diretos (recall puro, conceitos básicos), 40% médios (aplicação, fisiopatologia) e 20% difíceis (casos clínicos complexos, conduta)."
        : `Nível de dificuldade: ${difficulty === 'hard' ? 'Especialista/Residência' : difficulty === 'medium' ? 'Graduação em Medicina' : 'Básico'}.`;

    const ragContext = await getEnhancedContext(topic);

    const userMessage = `
      TÓPICO: "${topic}"
      QUANTIDADE: ${amount}
      
      ${fileContextInstruction}
      
      ${ragContext}

      CONTEXTO E PREFERÊNCIAS:
      - Detalhes/Foco: ${details || "Foco em raciocínio clínico, fisiopatologia e conduta."}
      - Referências: ${referencesText}
      - Dificuldade: ${difficultyInstruction}
    `;

    // ========================================================================
    // TELEMETRIA + GERAÇÃO
    // ========================================================================
    const modelName = AI_CONFIG.flashcardModel;
    flashcardTelemetry.generationStart({
        topic,
        amount,
        difficulty,
        hasFile: !!(googleFileUri || fileBase64),
        model: modelName,
    });

    try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: AI_CONTEXTS.flashcard_creator,
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const parts: any[] = [{ text: userMessage }];
        if (googleFileUri) {
            parts.unshift({
                fileData: { mimeType: "application/pdf", fileUri: googleFileUri }
            });
        } else if (inlineData) {
            parts.unshift({ inlineData });
        }

        const result = await model.generateContent(parts);
        let finalText = result.response.text();

        // Parse JSON com auto-repair (3 níveis de fallback)
        const { parseWithRepair } = await import('@/lib/flashcard-validation');
        const cards = parseWithRepair(finalText);

        const duration = Date.now() - startTime;
        flashcardTelemetry.generationEnd({
            topic,
            requested: amount,
            generated: cards.length,
            duration_ms: duration,
            parseMethod: 'json',
        });

        // Cleanup Google File
        await safeDeleteGoogleFile(googleFileUri);

        // Quota consume (centralizado)
        if (!skipQuota) {
            await consumeQuota(user.id, 'flashcard');
        }

        return { success: true, cards: cards as GeneratedCard[] };

    } catch (e: any) {
        const duration = Date.now() - startTime;
        flashcardTelemetry.error('generate-cards', `generation_failed after ${duration}ms`, e);
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
        const parts = fileUri.split('/');
        const fileId = parts[parts.length - 1];
        if (!fileId || fileId.length < 10) {
            flashcardTelemetry.error('generate-cards', 'invalid_file_id', new Error(`Invalid fileId: ${fileId}`));
            return;
        }
        await fileManager.deleteFile(fileId);
    } catch (error) {
        flashcardTelemetry.error('generate-cards', 'file_delete_failed', error);
    }
}