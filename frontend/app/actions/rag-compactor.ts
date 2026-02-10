/**
 * RAG Compactor
 * 
 * Compacta contexto RAG bruto em bullets estruturados para melhorar
 * a qualidade da geração de questões sem diluir o foco.
 */

'use server';

import { askMedAI } from './medai-core';

export async function compactRAG(rawRAG: string, topic: string): Promise<string> {
    if (!rawRAG || rawRAG.length < 100) {
        return '';
    }

    const compactionPrompt = `
Você é um curador de conteúdo médico. Seu trabalho é extrair APENAS os fatos mais relevantes do texto abaixo para o tópico: "${topic}".

TAREFA:
1. Extrair 5-10 bullets de FATOS ÚTEIS (doses, valores, mecanismos, condutas)
2. Destacar 2 RED FLAGS ou contraindicações
3. Listar 2 ERROS COMUNS de estudantes
4. (Opcional) 1 mini-caso clínico ilustrativo

FORMATO DE SAÍDA:
FATOS ESSENCIAIS:
- [fato 1]
- [fato 2]
...

RED FLAGS:
- [red flag 1]
- [red flag 2]

ERROS COMUNS:
- [erro 1]
- [erro 2]

MINI-CASO (opcional):
[1-2 linhas de caso clínico típico]

TEXTO ORIGINAL:
${rawRAG.substring(0, 3000)}
`;

    try {
        const response = await askMedAI({
            contextKey: 'medai_tutor',
            userMessage: compactionPrompt,
            responseType: 'text',
            modelName: 'gemini-2.0-flash-exp',
            skipQuota: true,
            quotaType: 'unlimited'
        });

        return response.success ? response.message : '';
    } catch (error) {
        console.error('[RAG Compactor] Erro:', error);
        return ''; // Fallback: retornar vazio em vez de quebrar
    }
}

/**
 * Extrai keywords de um texto para uso em reranking
 */
export async function extractKeywords(text: string): Promise<string[]> {
    if (!text) return [];

    // Stopwords médicas básicas
    const stopwords = new Set([
        'o', 'a', 'de', 'da', 'do', 'em', 'para', 'com', 'por', 'que', 'os', 'as',
        'dos', 'das', 'no', 'na', 'nos', 'nas', 'ao', 'à', 'aos', 'às', 'um', 'uma',
        'uns', 'umas', 'se', 'é', 'são', 'foi', 'ser', 'ter', 'tem', 'mais', 'como'
    ]);

    // Extrair palavras de 4+ caracteres
    const words = text
        .toLowerCase()
        .match(/\b[a-záàâãéêíóôõúç]{4,}\b/g) || [];

    // Filtrar stopwords e remover duplicatas
    const uniqueWords = [...new Set(words)]
        .filter(w => !stopwords.has(w))
        .slice(0, 20);

    return uniqueWords;
}
