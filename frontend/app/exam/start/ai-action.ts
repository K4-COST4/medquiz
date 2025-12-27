'use server'

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/utils/supabase/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const DAILY_LIMIT = 5

export async function chatWithMedAI(history: any[], currentQuestion: any, userMessage: string) {
  const supabase = await createClient()

  // 1. Identificar o Usuário
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Usuário não autenticado." }

  // 2. Verificar Uso Hoje
  const today = new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
  
  const { data: usageData, error: usageError } = await supabase
    .from('daily_ai_usage')
    .select('request_count')
    .eq('user_id', user.id)
    .eq('usage_date', today)
    .single()

  const currentCount = usageData?.request_count || 0

  // 3. Bloqueio de Limite (Futuramente aqui checaríamos se é Premium)
  if (currentCount >= DAILY_LIMIT) {
    return { 
      success: false, 
      limitReached: true, 
      message: `Você atingiu seu limite diário de ${DAILY_LIMIT} perguntas. Volte amanhã ou assine o Premium!` 
    }
  }

  try {
    // 4. Se passou, chama o Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"})

    const context = `
      CONTEXTO ATUAL (O aluno está vendo esta questão agora):
      Enunciado: ${currentQuestion.text}
      Tipo: ${currentQuestion.type}
      Alternativas: ${JSON.stringify(currentQuestion.alternatives)}
      Gabarito (Se disponível): ${currentQuestion.correctAnswer}
      Explicação (Se disponível): ${currentQuestion.explanation}
    `

    const systemPrompt = `
      Você é o MedAI, um professor de medicina sênior e mentor.
      Seu objetivo é ajudar estudantes de medicina e residentes a raciocinarem clinicamente.
      
      Regras:
      1. Seja didático, direto e encorajador.
      2. Use o CONTEXTO ATUAL fornecido acima para responder a dúvida do aluno sobre a questão específica.
      3. Se o aluno perguntar a resposta, não dê de bandeja imediatamente, tente guiar o raciocínio clínico antes (Socrático), a menos que ele peça explicitamente o gabarito.
      4. Se o assunto mudar, use seu conhecimento médico geral.
      5. Responda em Markdown formatado.
    `

    const chat = model.startChat({
      history: history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
    })

    const fullMessage = `${systemPrompt}\n\n${context}\n\nPERGUNTA DO ALUNO: ${userMessage}`
    const result = await chat.sendMessage(fullMessage)
    const response = result.response.text()

    // 5. Sucesso! Incrementa o contador no banco
    await supabase.from('daily_ai_usage').upsert({
      user_id: user.id,
      usage_date: today,
      request_count: currentCount + 1
    })

    return { success: true, message: response, usesLeft: DAILY_LIMIT - (currentCount + 1) }

  } catch (error) {
    console.error("Erro na MedAI:", error)
    return { success: false, message: "Erro de conexão com a IA. O uso não foi descontado." }
  }
}

// ADICIONE ESTA NOVA FUNÇÃO NO FINAL DO ARQUIVO:
export async function getRemainingDailyUses() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0 // Se não logado, assume 0 para não quebrar layout

  const today = new Date().toISOString().split('T')[0]
  
  const { data: usageData } = await supabase
    .from('daily_ai_usage')
    .select('request_count')
    .eq('user_id', user.id)
    .eq('usage_date', today)
    .single()

  const used = usageData?.request_count || 0
  return Math.max(0, DAILY_LIMIT - used)
}