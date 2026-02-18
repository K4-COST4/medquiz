/**
 * Batch Embedding Generation
 * 
 * Adiciona suporte para geração de embeddings em lote para melhor performance
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '@/lib/ai-config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Gera embeddings para múltiplos textos em paralelo
 */
export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
        return [];
    }

    const model = genAI.getGenerativeModel({ model: AI_CONFIG.embeddingModel });

    try {
        // Gerar todos embeddings em paralelo (dims configuráveis via AI_CONFIG)
        const promises = texts.map(text => model.embedContent({
            content: { role: 'user', parts: [{ text }] },
            outputDimensionality: AI_CONFIG.embeddingDimensions
        } as any));
        const results = await Promise.all(promises);

        return results.map(r => r.embedding.values);
    } catch (error) {
        console.error('[Batch Embedding] Erro:', error);
        throw error;
    }
}
