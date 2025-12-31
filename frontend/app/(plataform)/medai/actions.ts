'use server'

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/utils/supabase/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const DAILY_LIMIT = 5

// --- GERENCIAMENTO DE SESSÕES ---

export async function createSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from('medai_sessions')
    .insert({ user_id: user.id, title: 'Nova Conversa' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getSessions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('medai_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return data || []
}

export async function deleteSession(sessionId: string) {
  const supabase = await createClient()
  await supabase.from('medai_sessions').delete().eq('id', sessionId)
}

// NOVA FUNÇÃO: Renomear manualmente
export async function renameSession(sessionId: string, newTitle: string) {
  const supabase = await createClient()
  await supabase
    .from('medai_sessions')
    .update({ title: newTitle, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
}

export async function getSessionMessages(sessionId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('medai_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  return data || []
}

export async function getRemainingDailyUses() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const today = new Date().toISOString().split('T')[0]
  const { data: usageData } = await supabase
    .from('daily_ai_usage')
    .select('request_count')
    .eq('user_id', user.id)
    .eq('usage_date', today)
    .single()

  return Math.max(0, DAILY_LIMIT - (usageData?.request_count || 0))
}

// --- LÓGICA DO CHAT (COM AUTO-TITLE) ---

export async function sendMessage({ sessionId, message }: { sessionId: string, message: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Login necessário." }

  // 1. Verificar Limite
  const today = new Date().toISOString().split('T')[0]
  const { data: usageData } = await supabase
    .from('daily_ai_usage')
    .select('request_count')
    .eq('user_id', user.id)
    .eq('usage_date', today)
    .single()

  const currentCount = usageData?.request_count || 0
  if (currentCount >= DAILY_LIMIT) {
    return { success: false, limitReached: true, message: "Limite diário atingido." }
  }

  try {
    // 2. Salvar mensagem do usuário
    await supabase.from('medai_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message
    })

    // 3. Recuperar histórico para contexto
    const { data: historyData } = await supabase
      .from('medai_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20)

    // 4. Instancia o Modelo
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // 5. AUTO-TITLE: Se for a primeira mensagem ou o título for padrão, gera um novo
    // Verifica quantas mensagens existem. Se tiver poucas (ex: acabamos de inserir a primeira user + a resposta virá), gera título.
    // Ou verifica se o título atual é "Nova Conversa"
    const { data: currentSession } = await supabase.from('medai_sessions').select('title').eq('id', sessionId).single()
    
    let newTitle = null
    if (currentSession?.title === 'Nova Conversa' || (historyData && historyData.length <= 1)) {
        try {
            const titleModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
            const titlePrompt = `Analise a seguinte mensagem inicial de um usuário em um chat médico e crie um Título Curto (máximo 4 ou 5 palavras) que resuma o tópico. Retorne APENAS o título, sem aspas. Mensagem: "${message}"`
            const titleResult = await titleModel.generateContent(titlePrompt)
            const generatedTitle = titleResult.response.text()
            
            if (generatedTitle) {
                newTitle = generatedTitle
                await supabase.from('medai_sessions').update({ title: generatedTitle }).eq('id', sessionId)
            }
        } catch (err) {
            console.error("Erro ao gerar título automático (não crítico):", err)
        }
    }

    // 6. Resposta Principal da IA
    const chat = model.startChat({
      history: historyData?.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })) || [],
    })

    const systemPrompt = `
      Você é o MedAI, um assistente avançado para estudantes de medicina e médicos.
      
      SEU OBJETIVO:
      Ajudar com dúvidas gerais, etiologias, conceitos, fisiopatologia, diagnóstico, tratamento, farmacologia, resumos de diretrizes e casos clínicos simulados.
      
      REGRAS:
      1. Respostas diretas, técnicas, mas didáticas.
      2. Use Markdown para formatar (negrito, listas, tabelas).
      3. Se for um caso clínico, ajude a raciocinar o diagnóstico diferencial.
      4. Sempre cite a base (ex: "Segundo o Harrison..." ou "Diretrizes da SBC...") quando possível.
      5. Sempre use como referências diretrizes médicas reconhecidas, artigos científicos e livros-texto.
      6. Nunca forneça aconselhamento médico real ou diagnóstico.
      7. Mantenha a ética e a privacidade do paciente em mente.
      8. Se a pergunta não for médica, ou se for um caso clínico, ou da área da saúde, recuse educadamente.
    `
    
    const result = await chat.sendMessage(`${systemPrompt}\n\n${message}`)
    const responseText = result.response.text()

    // 7. Salvar resposta da IA
    await supabase.from('medai_messages').insert({
      session_id: sessionId,
      role: 'ai',
      content: responseText
    })

    // 8. Atualizar timestamp da sessão
    await supabase.from('medai_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    // 9. Incrementar uso
    await supabase.from('daily_ai_usage').upsert({
      user_id: user.id,
      usage_date: today,
      request_count: currentCount + 1
    })

    return { 
        success: true, 
        message: responseText, 
        usesLeft: DAILY_LIMIT - (currentCount + 1),
        newTitle: newTitle // Retorna o título novo para o front atualizar
    }

  } catch (error) {
    console.error("Erro MedAI:", error)
    return { success: false, message: "Erro de conexão." }
  }
}