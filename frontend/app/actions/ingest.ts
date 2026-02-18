'use server'

import { createAdminClient } from "@/utils/supabase/admin";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ActionResponse } from "@/types/medai";
import { AI_CONFIG } from "@/lib/ai-config";

// ============================================
// CONFIGURAÇÃO OTIMIZADA PARA GEMINI SPECS
// ============================================
const CHUNK_SIZE = 3800;
const OVERLAP = 570;
const BATCH_SIZE = 150;
const MAX_RETRIES = 3;
const MIN_CHUNK_LENGTH = 100;
const MAX_CONTENT_LENGTH = 1_000_000;

// ============================================
// ESTIMATIVA DE TOKENS
// ============================================
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

// Inicializa Gemini com validação
function getGeminiModel() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY não configurada nas variáveis de ambiente");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-embedding-001" });
}

// ============================================
// CHUNKING INTELIGENTE (OTIMIZADO)
// ============================================
function smartChunk(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;
    const textLength = text.length;

    let safetyCounter = 0;
    const MAX_LOOPS = 100000;

    while (start < textLength) {
        if (safetyCounter++ > MAX_LOOPS) {
            console.error("⚠️ Loop infinito detectado no chunking. Abortando para salvar o processo.");
            break;
        }

        let end = start + CHUNK_SIZE;

        if (end >= textLength) {
            const finalChunk = text.slice(start).trim();
            if (finalChunk) chunks.push(finalChunk);
            break;
        }

        let lookBackWindow = Math.min(500, Math.floor(CHUNK_SIZE * 0.1));
        let searchStart = Math.max(start + MIN_CHUNK_LENGTH, end - lookBackWindow);

        const segment = text.slice(searchStart, end);
        let cutPoint = -1;

        const p1 = segment.lastIndexOf('\n\n');
        if (p1 !== -1) cutPoint = searchStart + p1 + 2;

        if (cutPoint === -1) {
            const p2 = segment.lastIndexOf('. ');
            if (p2 !== -1) cutPoint = searchStart + p2 + 1;
        }

        if (cutPoint === -1) {
            const p3 = segment.lastIndexOf(' ');
            if (p3 !== -1) cutPoint = searchStart + p3;
        }

        if (cutPoint === -1) {
            cutPoint = end;
        }

        const chunk = text.slice(start, cutPoint).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        let nextStart = cutPoint - OVERLAP;

        if (nextStart <= start) {
            nextStart = cutPoint;
            if (nextStart <= start) {
                nextStart = start + CHUNK_SIZE;
            }
        }

        start = nextStart;
    }

    return chunks;
}

// ============================================
// PROCESSAMENTO EM LOTE COM RETRY
// ============================================
async function processChunkWithRetry(
    chunk: string,
    model: any, // SDK do Google não exporta facilmente o tipo GenerativeModel genérico aqui
    chunkIndex: number,
    retries = MAX_RETRIES
): Promise<number[]> {
    const tokens = estimateTokens(chunk);

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const result = await model.embedContent({
                content: { role: 'user', parts: [{ text: chunk }] },
                outputDimensionality: AI_CONFIG.embeddingDimensions
            } as any);
            return result.embedding.values;
        } catch (error: any) {
            const isTokenError = error?.message?.includes('token') || error?.message?.includes('length');

            if (isTokenError) {
                console.error(`❌ Chunk ${chunkIndex + 1} excedeu limite de tokens (${tokens} estimados)`);
                throw new Error(`Token limit exceeded: ${tokens} tokens (max: 2048)`);
            }

            if (attempt < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            } else {
                throw error;
            }
        }
    }

    throw new Error("Todas as tentativas falharam");
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================
export async function addMedicalKnowledge(
    topic: string,
    rawContent: string,
    source: string = "Manual"
): Promise<ActionResponse<{ chunks_processed: number; saved: number }>> {

    // ============================================
    // VALIDAÇÃO DE INPUTS
    // ============================================
    if (!topic || topic.trim().length === 0) {
        return { success: false, error: "Tópico é obrigatório" };
    }

    if (!rawContent || rawContent.trim().length === 0) {
        return { success: false, error: "Conteúdo não pode estar vazio" };
    }

    if (rawContent.length > MAX_CONTENT_LENGTH) {
        return { success: false, error: `Conteúdo muito grande. Máximo: ${MAX_CONTENT_LENGTH} caracteres` };
    }

    // ============================================
    // INICIALIZAÇÃO
    // ============================================
    const supabase = createAdminClient();
    const model = getGeminiModel();

    const cleanText = rawContent.replace(/\s+/g, " ").trim();
    const chunks = smartChunk(cleanText);

    // ============================================
    // PROCESSAMENTO EM LOTE
    // ============================================
    let savedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        const embeddingPromises = batch.map((chunk, idx) =>
            processChunkWithRetry(chunk, model, i + idx)
                .then(vector => ({ success: true as const, chunk, vector, chunkIndex: i + idx }))
                .catch(error => ({ success: false as const, chunk, error, chunkIndex: i + idx }))
        );

        const batchResults = await Promise.all(embeddingPromises);

        for (const result of batchResults) {
            if (result.success) {
                try {
                    const { error } = await supabase
                        .from("med_knowledge_base")
                        .insert({
                            content: result.chunk,
                            embedding: result.vector,
                            metadata: {
                                topic: topic.trim(),
                                source: source.trim(),
                                created_at: new Date().toISOString(),
                                chunk_length: result.chunk.length,
                                estimated_tokens: estimateTokens(result.chunk),
                                chunk_index: result.chunkIndex
                            }
                        });

                    if (error) {
                        console.error(`❌ Erro ao salvar chunk ${result.chunkIndex + 1}:`, error.message);
                        errorCount++;
                    } else {
                        savedCount++;
                    }
                } catch (e: any) {
                    console.error(`❌ Erro no insert (chunk ${result.chunkIndex + 1}):`, e?.message);
                    errorCount++;
                }
            } else {
                const errorMessage = result.error?.message || 'Erro desconhecido';
                console.error(`❌ Falha no embedding (chunk ${result.chunkIndex + 1}):`, errorMessage);
                errorCount++;
            }
        }

        if (i + BATCH_SIZE < chunks.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    const success = savedCount > 0;

    return {
        success,
        data: {
            chunks_processed: chunks.length,
            saved: savedCount,
        },
        error: success ? undefined : "Falha ao processar chunks"
    };
}