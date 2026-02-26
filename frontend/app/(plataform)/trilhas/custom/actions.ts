"use server";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { askMedAI, generateEmbedding } from "@/app/actions/medai-core";
import { AI_CONFIG } from "@/lib/ai-config";
import { getEnhancedContext } from "@/app/actions/medai-rag";
import { revalidatePath } from "next/cache";

// --- VALIDATION SCHEMAS ---

// Request payload schema using discriminated union for type safety
const TrackGenerationPayloadSchema = z.discriminatedUnion("mode", [
    z.object({
        mode: z.literal("OBJECTIVES"),
        user_input: z.array(z.string().min(1, "Objetivo não pode ser vazio")).min(1, "Pelo menos um objetivo é necessário")
    }),
    z.object({
        mode: z.literal("FREE_TEXT"),
        user_input: z.string().min(1, "Texto não pode ser vazio")
    })
]);

type TrackGenerationPayload = z.infer<typeof TrackGenerationPayloadSchema>;

// Response schemas with enhanced validation
const LessonSchema = z.object({
    title: z.string(),
    ai_context: z
        .string()
        .min(100, "ai_context muito curto (mín 100 caracteres)")
        .max(1500, "ai_context muito longo (máx 1500 caracteres)")
        .describe("Instrução técnica detalhada para geração de questões"),
    icon_suggestion: z.string().optional().default("book-open"),
});

const ModuleSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    icon_suggestion: z.string().optional().default("folder"),
    lessons: z.array(LessonSchema).min(1, "Módulo deve ter pelo menos 1 aula"),
});

const TrackSchema = z.object({
    track_title: z.string(),
    track_description: z.string().optional(),
    modules: z.array(ModuleSchema).min(1, "Trilha deve ter pelo menos 1 módulo"),
});

// --- HELPER FUNCTIONS ---

// Helper para sanitização rigorosa de JSON
function cleanJsonString(input: string): string {
    // 1. Remove blocos de markdown ```json ... ``` ou apenas ``` ... ```
    let cleaned = input.replace(/```json/g, "").replace(/```/g, "").trim();

    // 2. Tenta extrair apenas o objeto JSON se houver texto em volta
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return cleaned;
}

// Helper para gerar Slug único e amigável
function generateSlug(title: string): string {
    const base = title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]+/g, "-") // Substitui chars especiais por hifen
        .replace(/^-+|-+$/g, ""); // Trim hifens

    // Sufixo: Timestamp + Random String (evita colisão em Promise.all)
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${base}-${timestamp}-${random}`;
}

// --- MAIN ACTION ---

export async function generateCustomTrack(userInput: string | string[] | TrackGenerationPayload) {
    const supabase = await createClient();

    // 1. Autenticação Step
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "Usuário não autenticado." };
    }

    // 2. Payload Validation with Backward Compatibility
    let validatedPayload: TrackGenerationPayload;

    if (typeof userInput === 'object' && userInput !== null && 'mode' in userInput) {
        // New format - validate directly
        try {
            validatedPayload = TrackGenerationPayloadSchema.parse(userInput);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return { success: false, message: `Erro de validação: ${error.issues[0].message}` };
            }
            return { success: false, message: "Payload inválido." };
        }
    } else {
        // Legacy format - auto-convert with telemetry
        console.warn("⚠️ LEGACY FORMAT DETECTED - Auto-converting to new format");

        // Log telemetry (optional - only if table exists)
        try {
            await supabase.from('api_telemetry').insert({
                user_id: user.id,
                endpoint: 'generateCustomTrack',
                format_version: 'legacy',
                timestamp: new Date().toISOString(),
                metadata: { input_type: Array.isArray(userInput) ? 'array' : 'string' }
            });
        } catch (telemetryError) {
            // Silently fail telemetry - don't block the request
            console.warn("Telemetry logging failed (table may not exist):", telemetryError);
        }

        // Convert to new format
        if (Array.isArray(userInput)) {
            validatedPayload = { mode: "OBJECTIVES", user_input: userInput };
        } else {
            validatedPayload = { mode: "FREE_TEXT", user_input: userInput as string };
        }

        // Validate converted payload
        try {
            validatedPayload = TrackGenerationPayloadSchema.parse(validatedPayload);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return { success: false, message: `Erro de validação: ${error.issues[0].message}` };
            }
            return { success: false, message: "Payload inválido após conversão." };
        }
    }

    try {
        // 3. Embedding & Busca Vetorial (RAG)
        const textForEmbedding = Array.isArray(validatedPayload.user_input)
            ? validatedPayload.user_input.join(" ")
            : validatedPayload.user_input;
        const embedding = await generateEmbedding(textForEmbedding);

        let ragContext = "";
        if (embedding) {
            // Busca documentos similares na knowledge base
            const { data: documents } = await supabase.rpc("match_documents", {
                query_embedding: embedding,
                match_threshold: 0.5,
                match_count: 10,
            });

            if (documents && documents.length > 0) {
                ragContext = documents
                    .map((doc: any) => doc.content)
                    .join("\n---\n");
            }
        }

        // 4. Geração de Trilha com Gemini (MedAI)
        // Separate system context from user input for prompt injection defense
        const systemArgs = `
CONTEXTO RAG RECUPERADO (Base de Conhecimento):
${ragContext || "Nenhum contexto específico encontrado na base interna."}
    `;

        // User message with explicit mode and input
        const userMessage = `
mode: ${validatedPayload.mode}
user_input: ${JSON.stringify(validatedPayload.user_input)}
    `;

        // Chamada à IA
        const aiResponse = await askMedAI({
            contextKey: "syllabus_generator",
            userMessage: userMessage,
            systemInstructionArgs: systemArgs,
            responseType: "json",
            modelName: AI_CONFIG.trackModel,
            enableThinking: AI_CONFIG.trackModelThinking,
            quotaType: 'track'
        });

        if (!aiResponse.success) {
            // Se for limite atingido, retorna erro imediatamente
            if (aiResponse.limitReached) {
                return { success: false, message: aiResponse.message };
            }

            // Se for erro de formato mas tiver mensagem, tenta recuperar (Fallback antigo)
            if (aiResponse.message && aiResponse.error === "IA retornou formato inválido.") {
                console.warn("AI Success False (Parse Error), tentando recuperar JSON manualmente...");
            } else {
                throw new Error(aiResponse.message || "A IA não retornou um conteúdo válido.");
            }
        }

        // 5. Tratamento e Validação da Resposta com Auto-Repair
        let trackData;
        let repairAttempted = false;

        try {
            if (aiResponse.success && aiResponse.data) {
                // Se askMedAI já parseou com sucesso
                trackData = aiResponse.data;
            } else {
                // Fallback: Sanitiza e faz parse manual (mesmo se success=false)
                const cleanedJson = cleanJsonString(aiResponse.message);
                trackData = JSON.parse(cleanedJson);
            }
            // Validação Zod (Garante estrutura correta)
            trackData = TrackSchema.parse(trackData);
        } catch (parseError) {
            console.error("Erro de Parse/Validação JSON (primeira tentativa):", parseError);

            // AUTO-REPAIR: Tenta pedir ao modelo para consertar o JSON
            if (!repairAttempted) {
                repairAttempted = true;
                console.warn("🔧 Tentando auto-repair do JSON...");

                const repairResponse = await askMedAI({
                    contextKey: "syllabus_generator",
                    userMessage: `Conserte o JSON abaixo para que seja válido e siga estritamente o schema. Não altere o conteúdo, apenas corrija a estrutura:\n\n${aiResponse.message}`,
                    responseType: "json",
                    modelName: "gemini-3-flash-preview", // Modelo mais rápido para repair
                    skipQuota: true, // Não contar como uso adicional
                    quotaType: 'unlimited'
                });

                if (repairResponse.success && repairResponse.data) {
                    try {
                        trackData = TrackSchema.parse(repairResponse.data);
                        console.log("✅ Auto-repair bem-sucedido");
                    } catch (repairParseError) {
                        console.error("Auto-repair falhou:", repairParseError);
                        throw new Error("A IA gerou um formato inválido mesmo após tentativa de correção. Tente novamente sendo mais específico.");
                    }
                } else {
                    throw new Error("A IA gerou um formato inválido. Tente novamente sendo mais específico.");
                }
            } else {
                throw new Error("A IA gerou um formato inválido. Tente novamente sendo mais específico.");
            }
        }

        // 6. Persistência no Banco de Dados (Transação Simulada com Rollback)
        let trackId: string | null = null;

        try {
            // A. Criar Nó Raiz: TRILHA (Custom Track)
            const trackSlug = generateSlug(trackData.track_title);
            const { data: track, error: trackError } = await supabase
                .from("study_nodes")
                .insert({
                    title: trackData.track_title,
                    description: trackData.track_description,
                    node_type: "custom_track",
                    user_id: user.id, // RLS Ownership
                    slug: trackSlug,
                    ai_context: "Track generated by MedAI",
                })
                .select("id")
                .single();

            if (trackError || !track) {
                throw new Error("Erro ao salvar trilha: " + trackError?.message);
            }
            trackId = track.id;

            // B. Criar Módulos (Iteração Sequencial para manter ordem macro, mas interna paralela)
            for (let i = 0; i < trackData.modules.length; i++) {
                const mod = trackData.modules[i];
                const modSlug = generateSlug(mod.title);

                // B1. Insert Módulo
                const { data: moduleNode, error: moduleError } = await supabase
                    .from("study_nodes")
                    .insert({
                        title: mod.title,
                        description: mod.description,
                        node_type: "module", // Nível 2
                        parent_id: trackId,
                        user_id: user.id, // Propagação obrigatória do ID
                        slug: modSlug,
                        order_index: i,
                        icon_url: mod.icon_suggestion, // Mapeamento de ícone
                    })
                    .select("id")
                    .single();

                if (moduleError || !moduleNode) {
                    throw new Error(`Erro ao salvar módulo ${i + 1}: ` + moduleError?.message);
                }

                // C. Criar Aulas/Objectives (PARALELO - Promise.all)
                // Otimização: Dispara todos os inserts de aulas deste módulo de uma vez
                const lessonPromises = mod.lessons.map((lesson, j) => {
                    const lessonSlug = generateSlug(lesson.title);
                    return supabase.from("study_nodes").insert({
                        title: lesson.title,
                        node_type: "objective", // Nível 3 (Neto)
                        parent_id: moduleNode.id,
                        user_id: user.id, // Propagação obrigatória
                        slug: lessonSlug,
                        order_index: j,
                        ai_context: lesson.ai_context, // CRUCIAL para geração de questões
                        icon_url: lesson.icon_suggestion, // Mapeamento de ícone
                    });
                });

                const results = await Promise.all(lessonPromises);

                // Verifica se algum insert falhou
                const failed = results.find((r) => r.error);
                if (failed) {
                    throw new Error("Erro ao salvar aula do módulo: " + failed.error?.message);
                }
            }

            // SUCESSO TOTAL
            return { success: true, track_id: trackId };

        } catch (persistError: any) {
            // ROLLBACK LOGIC
            console.error("Erro na persistência. Executando Rollback...", persistError);

            if (trackId) {
                // Tenta limpar a trilha criada para evitar orfãos.
                // Se o banco tiver ON DELETE CASCADE, isso apaga módulos e aulas automaticamente.
                // Se não tiver, isso lançará erro de FK, mas é a melhor tentativa "safe" sem cascade manual complexo.
                try {
                    await supabase.from("study_nodes").delete().eq("id", trackId);
                } catch (cleanupError) {
                    console.error("FALHA CRÍTICA NO ROLLBACK: Trilha orfã pode ter sido deixada.", cleanupError);
                }
            }

            throw new Error("Falha ao salvar a trilha. Operação cancelada.");
        }

    } catch (error: any) {
        console.error("Create Custom Track Error:", error);
        return { success: false, message: error.message || "Erro interno ao gerar trilha." };
    }
}

export async function deleteCustomTrack(trackId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "Não autorizado." };
    }

    try {
        // Verificar se a trilha pertence ao usuário
        const { data: track } = await supabase
            .from("study_nodes")
            .select("id")
            .eq("id", trackId)
            .eq("user_id", user.id)
            .eq("node_type", "custom_track") // Segurança extra
            .single();

        if (!track) {
            return { success: false, message: "Trilha não encontrada ou permissão negada." };
        }

        // Deletar a trilha (Cascade deletará módulos e aulas)
        const { error } = await supabase
            .from("study_nodes")
            .delete()
            .eq("id", trackId);

        if (error) throw error;

        revalidatePath("/trilhas/custom");
        return { success: true };

    } catch (error: any) {
        console.error("Delete Track Error:", error);
        return { success: false, message: "Erro ao excluir trilha." };
    }
}

// --- LMS ACTIONS (SUMMARY) ---

export async function getOrGenerateSummary(lessonId: string) {
    const supabase = await createClient();

    // 1. Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Não autorizado." };

    try {
        // 2. Buscar Nó e verificar se já tem resumo
        const { data: lesson, error: fetchError } = await supabase
            .from("study_nodes")
            .select("id, title, ai_context, content") // Assumindo coluna 'content'
            .eq("id", lessonId)
            .single();

        if (fetchError || !lesson) {
            return { success: false, message: "Aula não encontrada." };
        }

        // 3. Se já existe resumo, retorna
        if (lesson.content && lesson.content.trim().length > 10) {
            return { success: true, data: lesson.content };
        }

        // 4. Se não existe, gerar com IA
        // 4. Se não existe, gerar com IA

        // 4.1. Real-Time RAG Search (Fonte de Verdade)
        const bibliographicContext = await getEnhancedContext(lesson.title, { usePubMed: true, useDb: true });

        // 4.2 Contexto Pedagógico (Roteiro)
        const pedagogicalContext = lesson.ai_context || "Contexto geral sobre o tema.";

        const inputData = `
        TEMA DA AULA: "${lesson.title}"

        1. CONTEXTO PEDAGÓGICO (ROTEIRO):
        """
        ${pedagogicalContext}
        """

        2. CONTEXTO BIBLIOGRÁFICO (RAG):
        """
        ${bibliographicContext}
        """
        
        Por favor, gere o resumo seguindo o protocolo.
        `;

        const aiResponse = await askMedAI({
            contextKey: "summary_generator",
            userMessage: inputData,
            modelName: AI_CONFIG.summaryModel,
            enableThinking: AI_CONFIG.summaryModelThinking,
            responseType: "text",
            quotaType: 'summary'
        });

        if (!aiResponse.success || !aiResponse.message) {
            throw new Error(aiResponse.error || "Erro na geração do resumo.");
        }

        const generatedSummary = aiResponse.message;

        // 5. Salvar no Banco (Cache)
        const { error: updateError } = await supabase
            .from("study_nodes")
            .update({ content: generatedSummary })
            .eq("id", lessonId);

        if (updateError) {
            console.error("Erro ao salvar resumo:", updateError);
            // Não bloqueia o retorno pro usuário, apenas loga erro de cache
        }

        return { success: true, data: generatedSummary };

    } catch (error: any) {
        console.error("Get Summary Error:", error);
        return { success: false, message: "Erro ao carregar resumo." };
    }
}
