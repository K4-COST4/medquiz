"use server";

import { createClient } from "@/utils/supabase/server"
import { askMedAI, getDailyUsesLeft } from "@/app/actions/medai-core";
import { getEnhancedContext } from "@/app/actions/medai-rag";


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

// Wrapper para manter compatibilidade com frontend
export async function getRemainingDailyUses() {
  return await getDailyUsesLeft()
}

// --- LÓGICA DO CHAT (OTIMIZADA) ---

// --- LÓGICA DO CHAT (OTIMIZADA) ---

export async function sendMessage({ sessionId, message, fileBase64 }: { sessionId: string, message: string, fileBase64?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Login necessário." }

  // Check preliminar de cota para evitar processamento desnecessário (RAG/PubMed)
  const remaining = await getDailyUsesLeft()
  if (remaining <= 0) {
    return { success: false, limitReached: true, message: "Limite diário atingido." }
  }

  // Parse Inline Data if present
  let inlineDataPayload: { data: string, mimeType: string } | undefined = undefined
  if (fileBase64) {
    // Extract base64 (remove prefix)
    const base64Data = fileBase64.split(',')[1] || fileBase64
    // Determine mimeType (simple heuristic or Regex)
    let mimeType = 'image/jpeg'
    if (fileBase64.startsWith('data:')) {
      mimeType = fileBase64.substring(5, fileBase64.indexOf(';'))
    } else if (fileBase64.startsWith('JVBER')) {
      mimeType = 'application/pdf'
    }
    inlineDataPayload = { data: base64Data, mimeType }
  }

  try {
    // 1. Salvar mensagem do usuário (incluindo nota de anexo se houver?)
    // Opcional: Adicionar " [Anexo]" ao texto salvo no banco? Ou criar coluna?
    // Por simplicidade, salvamos apenas o texto. O anexo é efêmero para a IA neste momento.
    await supabase.from('medai_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message + (fileBase64 ? " 📎 [Arquivo Anexado]" : "")
    })

    // 2. Recuperar histórico
    const { data: historyData } = await supabase
      .from('medai_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50)

    const mappedHistory = historyData?.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })) || []


    // --- PREPARAÇÃO DAS TAREFAS PARALELAS ---

    // Tarefa A: Gerar o Título (Se necessário)
    // Usa askMedAI com skipQuota=true
    const titlePromise = (async () => {
      const { data: currentSession } = await supabase.from('medai_sessions').select('title').eq('id', sessionId).single()

      if (currentSession?.title === 'Nova Conversa' || (historyData && historyData.length <= 2)) {
        try {
          const res = await askMedAI({
            contextKey: 'title_generator',
            userMessage: `Mensagem: "${message}"`,
            skipQuota: true, // IMPORTANT: Não gasta cota
            modelName: "gemini-2.5-flash-lite" // Modelo mais rápido para título
          })

          if (res.success && res.message) {
            const title = res.message.replace(/"/g, '').trim()
            await supabase.from('medai_sessions').update({ title }).eq('id', sessionId)
            return title
          }
        } catch (err) {
          console.error("Erro título:", err)
        }
      }
      return null
    })()

    // Tarefa B: Gerar a Resposta Principal (HÍBRIDA)
    const chatPromise = (async () => {
      // 1. RAG Unified Service (Substitui lógica manual anterior)
      const ragContext = await getEnhancedContext(message);

      // 2. Build Final Context (Adiciona contexto de arquivo se houver)
      const contextArgs = `
               ${ragContext}
               
               ${fileBase64 ? "3. CONTEXTO DO ARQUIVO: O usuário enviou um arquivo em anexo. Use-o como contexto principal se relevante." : ""}
      `

      // 6. Call MedAI Core (Actual Chat)
      // Mapped History precisa tipagem correta
      const historyTyped = mappedHistory as { role: 'user' | 'model', parts: { text: string }[] }[]

      const finalRes = await askMedAI({
        contextKey: 'medai_tutor',
        userMessage: message,
        history: historyTyped,
        systemInstructionArgs: contextArgs,
        modelName: "gemini-3-flash-preview", // Use latest flash for better multimodal
        inlineData: inlineDataPayload // Pass attachment here
        // skipQuota: false (Default) -> COBRA COTA AQUI
      })

      return finalRes
    })()

    // 4. Executa Title e Chat
    const [newTitle, chatResult] = await Promise.all([titlePromise, chatPromise])

    if (!chatResult.success) {
      if (chatResult.limitReached) return { success: false, limitReached: true, message: "Limite diário atingido." }
      return { success: false, message: chatResult.error || "Erro desconhecido." }
    }

    const responseText = chatResult.message

    // 5. Salvar resposta da IA
    await supabase.from('medai_messages').insert({
      session_id: sessionId,
      role: 'ai',
      content: responseText
    })

    // 6. Atualizar timestamp da sessão
    await supabase.from('medai_sessions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    // Nota: A cota foi atualizada dentro de askMedAI

    return {
      success: true,
      message: responseText,
      usesLeft: chatResult.usesLeft,
      newTitle: newTitle
    }

  } catch (error) {
    console.error("Erro MedAI:", error)
    return { success: false, message: "Erro de conexão ou modelo indisponível." }
  }
}

