"use server";

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/utils/supabase/server"

// Instancia dentro da função para garantir que a env var carregue no runtime correto
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Chave GEMINI_API_KEY não configurada")
  return new GoogleGenerativeAI(apiKey)
}

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

// --- LÓGICA DO CHAT (OTIMIZADA) ---

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
    const genAI = getGenAI()

    // 2. Salvar mensagem do usuário (Await aqui é importante para manter ordem)
    await supabase.from('medai_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message
    })

    // 3. Recuperar histórico
    const { data: historyData } = await supabase
      .from('medai_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      // Removemos o limite de 20 para o contexto não quebrar em conversas longas,
      // ou aumentamos para garantir contexto suficiente. O Flash aguenta muito token.
      .limit(50) 

    // --- PREPARAÇÃO DAS TAREFAS PARALELAS ---
    
    // Tarefa A: Gerar o Título (Se necessário)
    const titlePromise = (async () => {
        const { data: currentSession } = await supabase.from('medai_sessions').select('title').eq('id', sessionId).single()
        
        // Só gera se for "Nova Conversa" ou tivermos muito poucas mensagens (início do papo)
        if (currentSession?.title === 'Nova Conversa' || (historyData && historyData.length <= 2)) {
            try {
                // CORRIGIDO: Nome do modelo
                const titleModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
                const titlePrompt = `Analise a seguinte mensagem inicial de um usuário em um chat médico e crie um Título Curto (máximo 4 ou 5 palavras) que resuma o tópico. Retorne APENAS o título, sem aspas. Mensagem: "${message}"`
                const titleResult = await titleModel.generateContent(titlePrompt)
                const generatedTitle = titleResult.response.text()
                
                if (generatedTitle) {
                    await supabase.from('medai_sessions').update({ title: generatedTitle }).eq('id', sessionId)
                    return generatedTitle
                }
            } catch (err) {
                console.error("Erro título:", err)
            }
        }
        return null
    })()

    // Tarefa B: Gerar a Resposta Principal
    const chatPromise = (async () => {
        // CORRIGIDO: Nome do modelo para 1.5-flash
        // System Prompt movido para systemInstruction (Mais robusto)
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: `
              Você é o MedAI, um assistente avançado para estudantes de medicina e médicos.
      
              SEU OBJETIVO:
              Ajudar com dúvidas gerais, etiologias, conceitos, fisiopatologia, diagnóstico, tratamento, farmacologia, resumos de diretrizes e casos clínicos simulados.
              
              REGRAS:
              1. Respostas diretas, técnicas, mas didáticas. Use Markdow para formatar (negrito, listas, tabelas).
              2. Se for um caso clínico, ajude a raciocinar o diagnóstico diferencial.
              3. Sempre responda baseado em referências e diretrizes, livros-texto confiávei e artigo cietíficos, e cite a base (ex: "Segundo o Harrison..." ou "Diretrizes da SBC...") quando possível.
              4. Nunca forneça aconselhamento médico real ou diagnóstico. Mantenha a ética e a privacidade do paciente em mente.
              4. Se a pergunta não for médica, ou se for um caso clínico, ou da área da saúde, recuse educadamente.
            `
        })

        const chat = model.startChat({
            history: historyData?.map((msg: any) => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }],
            })) || [],
        })

        const result = await chat.sendMessage(message)
        return result.response.text()
    })()

    // 4. Executa Título e Chat AO MESMO TEMPO
    const [newTitle, responseText] = await Promise.all([titlePromise, chatPromise])

    // 5. Salvar resposta da IA
    await supabase.from('medai_messages').insert({
      session_id: sessionId,
      role: 'ai',
      content: responseText
    })

    // 6. Atualizar timestamp e contador
    await supabase.from('medai_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    await supabase.from('daily_ai_usage').upsert({
      user_id: user.id,
      usage_date: today,
      request_count: currentCount + 1
    })

    return { 
        success: true, 
        message: responseText, 
        usesLeft: DAILY_LIMIT - (currentCount + 1),
        newTitle: newTitle 
    }

  } catch (error) {
    console.error("Erro MedAI:", error)
    return { success: false, message: "Erro de conexão ou modelo indisponível." }
  }
}