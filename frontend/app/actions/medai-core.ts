'use server'

import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/utils/supabase/server"
import { AI_CONTEXTS, type AIContextKey } from "@/lib/ai-prompts"
import { MedAIResponse } from "@/types/medai"
import { AI_CONFIG } from "@/lib/ai-config"
import { QUOTA_LIMITS } from "@/lib/quota"

const DAILY_LIMIT = QUOTA_LIMITS.general

interface MedAIOptions {
    contextKey: AIContextKey
    userMessage: string
    history?: { role: 'user' | 'model', parts: { text: string }[] }[]
    responseType?: 'text' | 'json'
    modelName?: string
    systemInstructionArgs?: string
    inlineData?: { data: string, mimeType: string }
    skipQuota?: boolean
    quotaType?: 'general' | 'flashcard' | 'track' | 'clinical' | 'unlimited'
}

const LIMITS = QUOTA_LIMITS;

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
    const quotaType = options.quotaType || 'general';
    let profile: any = null;
    let currentCount = 0; // For verification calculation in return

    if (quotaType === 'unlimited') {
        // Sem restrições
    } else {
        const { data: fetchedProfile } = await supabase
            .from('profiles')
            .select('ai_usage_count, ai_usage_date, daily_flashcards_count, daily_clinical_count, last_track_generation_date')
            .eq('id', user.id)
            .single()

        profile = fetchedProfile;

        // Verificação por Tipo de Cota
        if (profile) {
            // Set currentCount for general context (used in return)
            if (profile.ai_usage_date === today) {
                currentCount = profile.ai_usage_count || 0;
            }

            // A. FLASHCARDS (1 por dia)
            if (quotaType === 'flashcard') {
                let flashCount = 0;
                if (profile.ai_usage_date === today) {
                    flashCount = profile.daily_flashcards_count || 0;
                }
                if (flashCount >= LIMITS.flashcard && !options.skipQuota) {
                    return { success: false, message: "Limite diário de Flashcards atingido.", limitReached: true, usesLeft: 0 };
                }
            }
            // B. TRACKS (1 por semana)
            else if (quotaType === 'track') {
                const lastDate = profile.last_track_generation_date ? new Date(profile.last_track_generation_date) : null;
                if (lastDate) {
                    const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays < 7 && !options.skipQuota) {
                        return { success: false, message: `Limite de 1 trilha por semana. Aguarde ${7 - diffDays} dias.`, limitReached: true, usesLeft: 0 };
                    }
                }
            }
            // C. GENERAL (10 por dia)
            else if (quotaType === 'general') {
                // currentCount already set above
                if (currentCount >= LIMITS.general && !options.skipQuota) {
                    return { success: false, message: "Limite diário geral atingido.", limitReached: true, usesLeft: 0 };
                }
            }
            // D. CLINICAL (3 por dia)
            else if (quotaType === 'clinical') {
                let clinicalCount = 0;
                if (profile.ai_usage_date === today) {
                    clinicalCount = profile.daily_clinical_count || 0;
                }
                if (clinicalCount >= LIMITS.clinical && !options.skipQuota) {
                    return { success: false, message: "Limite diário de treinos clínicos atingido (3 por dia).", limitReached: true, usesLeft: 0 };
                }
            }
        }
    }

    try {
        const genAI = getGenAI()
        const modelName = options.modelName || AI_CONFIG.chatModel

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
            // 1. Remove Markdown code blocks (Case insensitive)
            let cleanJson = finalText.replace(/```json/gi, '').replace(/```/g, '').trim();

            // 2. Extrair apenas o JSON se houver texto em volta
            const firstBrace = cleanJson.indexOf("{");
            const lastBrace = cleanJson.lastIndexOf("}");

            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
            }

            finalText = cleanJson;
            try {
                parsedData = JSON.parse(cleanJson);
            } catch (e) {
                console.error("JSON Parse Error:", e);
                // Retorna o texto original na mensagem para tentativa de debug ou fallback
                return { success: false, message: finalText, error: "IA retornou formato inválido." }
            }
        }

        if (!options.skipQuota && quotaType !== 'unlimited') {
            const updates: any = { ai_usage_date: today };

            if (quotaType === 'general') {
                const currentGeneral = (profile?.ai_usage_date === today) ? (profile?.ai_usage_count || 0) : 0;
                updates.ai_usage_count = currentGeneral + 1;
                // Mantém o de flashcards se já for hoje, senão reseta
                if (profile?.ai_usage_date !== today) updates.daily_flashcards_count = 0;
            }
            else if (quotaType === 'flashcard') {
                const currentFlash = (profile?.ai_usage_date === today) ? (profile?.daily_flashcards_count || 0) : 0;
                updates.daily_flashcards_count = currentFlash + 1;
                // Mantém o geral se já for hoje, senão reseta
                if (profile?.ai_usage_date !== today) updates.ai_usage_count = 0;
            }
            else if (quotaType === 'track') {
                updates.last_track_generation_date = new Date().toISOString();
                delete updates.ai_usage_date; // Remove do update p/ não afetar ciclo diário
            }

            if (Object.keys(updates).length > 0) {
                await supabase.from('profiles').update(updates).eq('id', user.id)
            }
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

// Helper para obter status de todas as cotas (UI Indicators)
export async function getUsageQuotas() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const today = new Date().toISOString().split('T')[0];
    const { data: profile } = await supabase
        .from('profiles')
        .select('ai_usage_count, ai_usage_date, daily_flashcards_count, last_track_generation_date')
        .eq('id', user.id)
        .single();

    if (!profile) return null;

    // 1. General
    let generalUsed = 0;
    if (profile.ai_usage_date === today) {
        generalUsed = profile.ai_usage_count || 0;
    }
    const generalRemaining = Math.max(0, LIMITS.general - generalUsed);

    // 2. Flashcards
    let flashUsed = 0;
    if (profile.ai_usage_date === today) {
        flashUsed = profile.daily_flashcards_count || 0;
    }
    const flashcardsRemaining = Math.max(0, LIMITS.flashcard - flashUsed);

    // 3. Tracks
    let trackAvailable = true;
    let daysUntilNextTrack = 0;

    if (profile.last_track_generation_date) {
        const lastDate = new Date(profile.last_track_generation_date);
        const diffTime = Math.abs(new Date().getTime() - lastDate.getTime());
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays < 7) {
            trackAvailable = false;
            daysUntilNextTrack = Math.ceil(7 - diffDays);
        }
    }

    return {
        general: {
            remaining: generalRemaining,
            limit: LIMITS.general,
            used: generalUsed
        },
        flashcard: {
            remaining: flashcardsRemaining,
            limit: LIMITS.flashcard,
            used: flashUsed
        },
        track: {
            available: trackAvailable,
            daysUntilNext: daysUntilNextTrack,
            limit: LIMITS.track
        }
    };
}

// Helper para Embeddings (usado no RAG)
// IMPORTANTE: gemini-embedding-001 suporta Matryoshka (3072, 1536, 768)
// Database definida com 768 dimensões - DEVE coincidir
export async function generateEmbedding(text: string) {
    const genAI = getGenAI()
    const model = genAI.getGenerativeModel({ model: AI_CONFIG.embeddingModel })
    // outputDimensionality não está nos types do SDK mas é suportado pela API REST
    const result = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: AI_CONFIG.embeddingDimensions
    } as any)
    return result.embedding.values
}


