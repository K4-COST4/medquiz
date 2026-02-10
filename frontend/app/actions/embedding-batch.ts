/**
 * Batch Embedding Generation
 * 
 * Adiciona suporte para geração de embeddings em lote para melhor performance
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Gera embeddings para múltiplos textos em paralelo
 */
export async function generateEmbeddingBatch(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
        return [];
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

    try {
        // Gerar todos embeddings em paralelo
        const promises = texts.map(text => model.embedContent(text));
        const results = await Promise.all(promises);

        return results.map(r => r.embedding.values);
    } catch (error) {
        console.error('[Batch Embedding] Erro:', error);
        throw error;
    }
}
