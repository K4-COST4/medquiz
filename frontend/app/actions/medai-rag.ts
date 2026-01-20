'use server'

import { createClient } from "@/utils/supabase/server"
import { generateEmbedding, askMedAI } from "@/app/actions/medai-core"
import { getPubMedEvidence } from "@/utils/pubmed/pubmed"

export async function getEnhancedContext(topic: string, options: { usePubMed?: boolean, useDb?: boolean } = { usePubMed: true, useDb: true }) {
    if (!topic) return "";

    const supabase = await createClient();

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
                match_threshold: 0.5,
                match_count: 10
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

    return `
    === MATERIAL DE APOIO E REFERÊNCIA (RAG SYSTEM) ===
    
    1. BASE INTERNA (LIVROS/APOSTILAS/MATERIAIS CURADOS):
    ${localContext || "Nenhuma informação específica encontrada na base local."}

    2. LITERATURA CIENTÍFICA RECENTE (PUBMED):
    ${pubMedString || "Nenhum artigo recente relevante encontrado automaticamente."}
    
    (Utilize estas informações como base técnica para garantir precisão e atualidade).
    `;
}
