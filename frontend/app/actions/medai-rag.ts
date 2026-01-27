'use server'

import { createClient } from "@/utils/supabase/server"
import { generateEmbedding, askMedAI } from "@/app/actions/medai-core"
import { getPubMedEvidence } from "@/utils/pubmed/pubmed"
import crypto from 'crypto'

// Helper: Generate hash for cache key
function generateQueryHash(topic: string): string {
    const normalized = topic.toLowerCase().trim()
    return crypto.createHash('sha256').update(normalized).digest('hex')
}

export async function getEnhancedContext(topic: string, options: { usePubMed?: boolean, useDb?: boolean } = { usePubMed: true, useDb: true }) {
    if (!topic) return "";

    const supabase = await createClient();
    const startTime = Date.now()

    // CACHE LOOKUP
    const queryHash = generateQueryHash(topic)

    try {
        const { data: cachedResult } = await supabase
            .from('rag_cache')
            .select('context')
            .eq('query_hash', queryHash)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (cachedResult?.context) {
            const elapsed = Date.now() - startTime
            console.log(`[RAG Cache] HIT - Returned in ${elapsed}ms (hash: ${queryHash.slice(0, 8)}...)`)
            return cachedResult.context
        }
    } catch (error) {
        // Cache miss or error - proceed to full RAG
        console.log(`[RAG Cache] MISS - Executing full RAG (hash: ${queryHash.slice(0, 8)}...)`)
    }

    // PARALLEL EXECUTION: Embeddings & PubMed Keywords 
    // We need keywords for PubMed because the raw topic might be too broad or in Portuguese
    const keywordsPromise = options.usePubMed ? (async () => {
        try {
            const res = await askMedAI({
                contextKey: 'medai_tutor', // Using generic tutor for translation/keyword extraction
                systemInstructionArgs: "Apenas traduza para keywords em inglês separadas por espaço. Ex: 'Heart Failure' -> 'heart failure diagnosis treatment'",
                userMessage: `Transforme esta dúvida médica em keywords de busca para o PubMed (em inglês): "${topic}"`,
                skipQuota: true,
                modelName: "gemini-2.5-flash-lite"
            });
            return res.success ? res.message : topic;
        } catch {
            return topic;
        }
    })() : Promise.resolve("");

    const embeddingPromise = options.useDb ? generateEmbedding(topic) : Promise.resolve(null);

    const [pubMedQuery, textVector] = await Promise.all([keywordsPromise, embeddingPromise]);

    // SECOND LAYER PARALLEL: External Search & Internal Search
    const externalEvidencePromise = (options.usePubMed && pubMedQuery)
        ? getPubMedEvidence(pubMedQuery)
        : Promise.resolve("");

    const internalEvidencePromise = (options.useDb && textVector) ? (async () => {
        try {
            const { data: documents } = await supabase.rpc('match_documents', {
                query_embedding: textVector,
                match_threshold: 0.65, // Otimizado: alta precisão (avg similarity: 0.795)
                match_count: 6         // Otimizado: reduz contexto de ~9200 para ~5500 tokens
            });

            if (!documents || documents.length === 0) return "";

            return documents
                .map((doc: any) => `--- TRECHO DE CONTEXTO INTERNO ---\n${doc.content}\n`)
                .join("\n");
        } catch (e) {
            console.error("Vector Search Error:", e);
            return "";
        }
    })() : Promise.resolve("");

    const [pubMedString, localContext] = await Promise.all([externalEvidencePromise, internalEvidencePromise]);

    // FINAL FORMATTING
    if (!pubMedString && !localContext) return "";

    const finalContext = `
    === MATERIAL DE APOIO E REFERÊNCIA (RAG SYSTEM) ===
    
    1. BASE INTERNA (LIVROS/APOSTILAS/MATERIAIS CURADOS):
    ${localContext || "Nenhuma informação específica encontrada na base local."}

    2. LITERATURA CIENTÍFICA RECENTE (PUBMED):
    ${pubMedString || "Nenhum artigo recente relevante encontrado automaticamente."}
    
    (Utilize estas informações como base técnica para garantir precisão e atualidade).
    `;

    // SAVE TO CACHE (24h TTL)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    try {
        await supabase
            .from('rag_cache')
            .insert({
                query_hash: queryHash,
                context: finalContext,
                expires_at: expiresAt.toISOString()
            })

        const elapsed = Date.now() - startTime
        console.log(`[RAG Cache] MISS - Full RAG executed in ${elapsed}ms, cached for 24h`)
    } catch (error) {
        // Ignore cache save errors (could be duplicate key if concurrent requests)
        console.error('[RAG Cache] Save error (non-critical):', error)
    }

    return finalContext;
}
