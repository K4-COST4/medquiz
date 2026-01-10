'use server'

import { askMedAI } from "./medai-core"
import { getEnhancedContext } from "@/app/actions/medai-rag"

// Interface do retorno
export interface GeneratedCard {
    front: string;
    back: string;
}

export async function generateFlashcardsAI({
    topic,
    details,
    references,
    difficulty,
    amount,
    fileBase64
}: {
    topic: string,
    details?: string,
    references?: string, // Pode vir vazio se tiver arquivo
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed',
    amount: number,
    fileBase64?: string
}) {
    // 1. LÓGICA DO ARQUIVO (Prioridade)
    let inlineData = undefined;
    let fileContextInstruction = "";

    if (fileBase64) {
        // Limpa o header do base64 se existir
        const base64Data = fileBase64.split(',')[1] || fileBase64;

        inlineData = {
            data: base64Data,
            mimeType: "application/pdf" // Assumindo PDF
        };

        // AQUI ESTÁ O SEGREDO QUE FALTAVA:
        fileContextInstruction = `
        IMPORTANTE - FONTE DE DADOS (PRIORIDADE MÁXIMA):
        - O usuário anexou um documento/arquivo.
        - Você deve extrair as informações PRIORITARIAMENTE deste documento para criar os cards.
        - Use o Tópico "${topic}" apenas para saber qual seção do documento focar.
        - Se a informação não estiver no documento, não invente.
        `;
    }

    // 2. DEFINE REFERÊNCIAS
    // Se tem arquivo, a referência é o arquivo. Se não, usa as padrões.
    const referencesText = fileBase64
        ? "Baseie-se estritamente no documento em anexo."
        : (references ? `Baseie-se em: ${references}` : "Baseie-se em Diretrizes (SBC/AMB), Guyton & Hall e Harrison.");

    // 3. DEFINE DIFICULDADE
    const difficultyInstruction = difficulty === 'mixed'
        ? "Varie a dificuldade: 30% fáceis (conceitos básicos), 40% médios (aplicação) e 30% difíceis (casos clínicos)."
        : `Nível de dificuldade: ${difficulty === 'hard' ? 'Especialista/Residência' : difficulty === 'medium' ? 'Graduação em Medicina' : 'Básico'}.`;

    // 4. RAG CONTEXT (Secundário)
    // Se tiver arquivo, usamos RAG também? Sim, para complementar.
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
    const response = await askMedAI({
        contextKey: 'flashcard_creator',
        userMessage: userMessage,
        inlineData: inlineData,
        responseType: 'json'
    })

    if (!response.success || !response.data) {
        return { success: false, error: response.error || "Erro ao gerar cards." }
    }

    return { success: true, cards: response.data as GeneratedCard[] }
}