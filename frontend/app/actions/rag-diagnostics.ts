'use server'

import { createClient } from "@/utils/supabase/server"
import { generateEmbedding } from "@/app/actions/medai-core"

export interface RAGDiagnosticResult {
    query: string
    totalFound: number
    documents: {
        content: string
        similarity: number
        contentLength: number
        preview: string
    }[]
    metrics: {
        avgSimilarity: number
        minSimilarity: number
        maxSimilarity: number
        totalChars: number
        estimatedTokens: number
        relevantDocs: number // similarity >= 0.6
        marginalDocs: number // 0.5 <= similarity < 0.6
        lowQualityDocs: number // similarity < 0.5
    }
    recommendations: string[]
}

/**
 * Diagnóstico do sistema RAG - Analisa qualidade dos resultados
 * @param topic - Tópico de teste para análise
 * @param threshold - Threshold a testar (padrão: 0.5)
 * @param count - Número de documentos a buscar (padrão: 10)
 */
export async function diagnoseRAG(
    topic: string,
    threshold: number = 0.5,
    count: number = 10
): Promise<RAGDiagnosticResult> {
    const supabase = await createClient()

    // Gerar embedding
    const embedding = await generateEmbedding(topic)

    // Buscar documentos
    const { data: documents } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: count
    })

    if (!documents || documents.length === 0) {
        return {
            query: topic,
            totalFound: 0,
            documents: [],
            metrics: {
                avgSimilarity: 0,
                minSimilarity: 0,
                maxSimilarity: 0,
                totalChars: 0,
                estimatedTokens: 0,
                relevantDocs: 0,
                marginalDocs: 0,
                lowQualityDocs: 0
            },
            recommendations: [
                '⚠️ NENHUM documento encontrado!',
                '💡 Considere diminuir o threshold para 0.3-0.4',
                '💡 Verifique se há documentos no banco (med_knowledge_base)',
                '💡 Confirme que os embeddings foram gerados corretamente'
            ]
        }
    }

    // Processar documentos
    const processedDocs = documents.map((doc: any) => ({
        content: doc.content,
        similarity: doc.similarity,
        contentLength: doc.content.length,
        preview: doc.content.substring(0, 150) + '...'
    }))

    // Calcular métricas
    const similarities = processedDocs.map((d: typeof processedDocs[0]) => d.similarity)
    const avgSimilarity = similarities.reduce((a: number, b: number) => a + b, 0) / similarities.length
    const minSimilarity = Math.min(...similarities)
    const maxSimilarity = Math.max(...similarities)
    const totalChars = processedDocs.reduce((sum: number, d: typeof processedDocs[0]) => sum + d.contentLength, 0)
    const estimatedTokens = Math.ceil(totalChars / 4)

    const relevantDocs = processedDocs.filter((d: typeof processedDocs[0]) => d.similarity >= 0.6).length
    const marginalDocs = processedDocs.filter((d: typeof processedDocs[0]) => d.similarity >= 0.5 && d.similarity < 0.6).length
    const lowQualityDocs = processedDocs.filter((d: typeof processedDocs[0]) => d.similarity < 0.5).length

    // Gerar recomendações
    const recommendations: string[] = []

    // Análise de Threshold
    if (avgSimilarity >= 0.7) {
        recommendations.push('✅ Threshold está BEM configurado - Alta qualidade média')
        if (documents.length < count) {
            recommendations.push('💡 Considere AUMENTAR threshold para 0.6-0.7 (filtrar melhor)')
        }
    } else if (avgSimilarity >= 0.55) {
        recommendations.push('⚠️ Threshold ACEITÁVEL - Qualidade moderada')
        recommendations.push('💡 Mantenha 0.5 ou teste 0.55 para melhor precisão')
    } else {
        recommendations.push('❌ Threshold pode estar BAIXO demais - Muitos docs irrelevantes')
        recommendations.push('💡 Considere AUMENTAR para 0.6-0.65')
    }

    // Análise de Match Count
    if (estimatedTokens > 2000) {
        recommendations.push('⚠️ Contexto MUITO GRANDE (~' + estimatedTokens + ' tokens)')
        recommendations.push('💡 Considere REDUZIR match_count para 5-7 documentos')
    } else if (estimatedTokens > 1500) {
        recommendations.push('⚠️ Contexto grande (~' + estimatedTokens + ' tokens)')
        recommendations.push('💡 Match_count de 10 está no limite, considere reduzir para 8')
    } else {
        recommendations.push('✅ Tamanho do contexto está BOM (~' + estimatedTokens + ' tokens)')
    }

    // Análise de distribuição
    if (lowQualityDocs > 0) {
        recommendations.push(`⚠️ ${lowQualityDocs} documentos com similaridade < 0.5 (abaixo do threshold!)`)
    }

    if (marginalDocs > relevantDocs) {
        recommendations.push('⚠️ Mais documentos marginais (0.5-0.6) que relevantes (>0.6)')
        recommendations.push('💡 Aumente threshold para 0.6 para melhorar precisão')
    }

    if (relevantDocs === documents.length) {
        recommendations.push('✅ TODOS os documentos são altamente relevantes (>0.6)!')
    }

    return {
        query: topic,
        totalFound: documents.length,
        documents: processedDocs,
        metrics: {
            avgSimilarity,
            minSimilarity,
            maxSimilarity,
            totalChars,
            estimatedTokens,
            relevantDocs,
            marginalDocs,
            lowQualityDocs
        },
        recommendations
    }
}

/**
 * Testa múltiplas queries de uma vez para análise comparativa
 */
export async function batchDiagnoseRAG(queries: string[]) {
    const results = await Promise.all(
        queries.map(q => diagnoseRAG(q))
    )

    return {
        results,
        summary: {
            avgDocsFound: results.reduce((sum: number, r) => sum + r.totalFound, 0) / results.length,
            avgSimilarity: results.reduce((sum: number, r) => sum + r.metrics.avgSimilarity, 0) / results.length,
            avgTokens: results.reduce((sum: number, r) => sum + r.metrics.estimatedTokens, 0) / results.length,
            totalRelevant: results.reduce((sum: number, r) => sum + r.metrics.relevantDocs, 0),
            totalMarginal: results.reduce((sum: number, r) => sum + r.metrics.marginalDocs, 0),
            totalLowQuality: results.reduce((sum: number, r) => sum + r.metrics.lowQualityDocs, 0)
        }
    }
}
