'use server'

import { askMedAI, getDailyUsesLeft } from "@/app/actions/medai-core"

export async function chatWithMedAI(history: any[], currentQuestion: any, userMessage: string) {
  // 1. Preparar Contexto da Questão
  const context = `
      CONTEXTO ATUAL (O aluno está vendo esta questão agora):
      Enunciado: ${currentQuestion.text}
      Tipo: ${currentQuestion.type}
      Alternativas: ${JSON.stringify(currentQuestion.alternatives)}
      Gabarito (Se disponível): ${currentQuestion.correctAnswer}
      Explicação (Se disponível): ${currentQuestion.explanation}
  `

  // 2. Mapear Histórico para formato do Gemini / MedAIOptions
  // O frontend envia history com role 'user' | 'model' geralmente.
  // Precisamos garantir que askMedAI receba no formato { role, parts: [{ text }] }
  const mappedHistory = history.map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  })) as { role: 'user' | 'model', parts: { text: string }[] }[]


  // 3. Chamar Core
  const response = await askMedAI({
    contextKey: 'exam_mentor',
    userMessage: userMessage,
    history: mappedHistory,
    systemInstructionArgs: context,
    modelName: "gemini-3-flash-preview"
  })

  // 4. Tratamento de Erro Unificado
  if (!response.success) {
    if (response.limitReached) {
      return {
        success: false,
        limitReached: true,
        message: `Você atingiu seu limite diário. Volte amanhã ou assine o Premium!`
      }
    }
    return { success: false, message: response.message || response.error || "Erro ao conectar com o Tutor." }
  }

  return { success: true, message: response.message, usesLeft: response.usesLeft }
}

export async function getRemainingDailyUses() {
  return await getDailyUsesLeft()
}
