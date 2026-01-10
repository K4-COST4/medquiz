'use server'

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/utils/supabase/server"
import { AI_CONTEXTS, type AIContextKey } from "@/lib/ai-prompts"
import { MedAIResponse } from "@/types/medai"

const DAILY_LIMIT = 5

interface MedAIOptions {
    contextKey: AIContextKey
    userMessage: string
    history?: { role: 'user' | 'model', parts: { text: string }[] }[]
    responseType?: 'text' | 'json'
    modelName?: string
    systemInstructionArgs?: string
    inlineData?: { data: string, mimeType: string }
    skipQuota?: boolean
}

const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error("API Key não encontrada")
    return new GoogleGenerativeAI(apiKey)
}

export async function askMedAI(options: MedAIOptions): Promise<MedAIResponse> {
    const supabase = await createClient()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: "", error: "Usuário não autenticado." }

    // 2. Quota Check
    const today = new Date().toISOString().split('T')[0]
    const { data: profile } = await supabase
        .from('profiles')
        .select('ai_usage_count, ai_usage_date')
        .eq('id', user.id)
        .single()

    let currentCount = 0
    if (profile && profile.ai_usage_date === today) {
        currentCount = profile.ai_usage_count || 0
    }

    if (currentCount >= DAILY_LIMIT) {
        return {
            success: false,
            message: "Limite diário atingido.",
            limitReached: true,
            usesLeft: 0
        }
    }

    try {
        const genAI = getGenAI()
        const modelName = options.modelName || "gemini-3-flash-preview"

        let systemPrompt = AI_CONTEXTS[options.contextKey]
        if (options.systemInstructionArgs) {
            systemPrompt += `\n\nCONTEXTO ADICIONAL:\n${options.systemInstructionArgs}`
        }

        const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt
        })

        let finalText = ""

        if (options.history && options.history.length > 0) {
            const chat = model.startChat({
                history: options.history
            })
            const payload = options.inlineData
                ? [{ inlineData: options.inlineData }, options.userMessage] as any // Casting necessário ou ajustar tipagem do SDK
                : options.userMessage

            const result = await chat.sendMessage(payload)
            finalText = result.response.text()
        } else {
            const parts: any[] = []
            if (options.inlineData) {
                parts.push({ inlineData: options.inlineData })
            }
            parts.push({ text: options.userMessage })

            const result = await model.generateContent(parts)
            finalText = result.response.text()
        }

        let parsedData = null
        if (options.responseType === 'json') {
            const cleanJson = finalText.replace(/```json|```/g, '').trim()
            finalText = cleanJson
            try {
                parsedData = JSON.parse(cleanJson)
            } catch (e) {
                return { success: false, message: finalText, error: "IA retornou formato inválido." }
            }
        }

        if (!options.skipQuota) {
            await supabase.from('profiles').update({
                ai_usage_date: today,
                ai_usage_count: currentCount + 1
            }).eq('id', user.id)
        }

        return {
            success: true,
            message: finalText,
            data: parsedData,
            usesLeft: Math.max(0, DAILY_LIMIT - (currentCount + 1))
        }

    } catch (error: any) {
        // Mantendo apenas log de erro em catch
        console.error("MedAI Core Error:", error)
        return { success: false, message: "", error: "Erro de conexão com a IA." }
    }
}

// Helper para só consultar saldo sem gastar
export async function getDailyUsesLeft() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const today = new Date().toISOString().split('T')[0]
    const { data: profile } = await supabase
        .from('profiles')
        .select('ai_usage_count, ai_usage_date')
        .eq('id', user.id)
        .single()

    if (!profile || profile.ai_usage_date !== today) return DAILY_LIMIT
    return Math.max(0, DAILY_LIMIT - (profile.ai_usage_count || 0))
}

// Helper para Embeddings (usado no RAG)
export async function generateEmbedding(text: string) {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: "embedding-001" })
    const result = await model.embedContent(text)
    return result.embedding.values
}


