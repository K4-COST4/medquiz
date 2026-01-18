"use server";

import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { askMedAI } from "./medai-core";
import { getEnhancedContext } from "./medai-rag";

export async function getOrGenerateSummary(lessonId: string) {
    noStore();

    // 1. Instancia o Supabase ADMIN
    const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log("SummaryService: Buscando aula...", lessonId);

    // 2. Busca dados da aula (Incluindo ai_description)
    const { data: lesson, error } = await supabaseAdmin
        .from('study_nodes')
        .select('title, ai_description, ai_context, parent_id')
        .eq('id', lessonId)
        .single();

    if (error || !lesson) {
        console.error("SummaryService: Aula não encontrada ou erro.", { lessonId, error });
        return { success: false, error: "Aula não encontrada. Verifique o ID." };
    }

    // 3. CACHE: Se já existe conteúdo em ai_description, retorna-o.
    if (lesson.ai_description && lesson.ai_description.length > 50) {
        console.log("SummaryService: Retornando cache do banco (ai_description).");
        return { success: true, data: lesson.ai_description, source: 'database' };
    }

    // 4. Se não existe, gera com IA via MedAI Core
    try {
        console.log("SummaryService: Gerando novo resumo com IA...");
        const ragContext = await getEnhancedContext(lesson.title);

        const aiResponse = await askMedAI({
            contextKey: 'summary_generator',
            userMessage: `Título: "${lesson.title}"\nContexto Pedagógico: "${lesson.ai_context || "Aborde os conceitos fundamentais."}"\n\n${ragContext}`,
            modelName: "gemini-3-flash-preview",
            quotaType: 'general'
        });

        if (!aiResponse.success || !aiResponse.message) {
            if (aiResponse.limitReached) {
                return { success: false, error: aiResponse.message };
            }
            throw new Error(aiResponse.error || aiResponse.message || "Falha na resposta da IA");
        }

        const aiText = aiResponse.message;

        // 5. Salva no banco (ai_description)
        const { error: updateError } = await supabaseAdmin
            .from('study_nodes')
            .update({ ai_description: aiText })
            .eq('id', lessonId);

        if (updateError) {
            console.error("Erro ao salvar ai_description:", updateError);
        }

        return { success: true, data: aiText, source: 'ai_generated' };

    } catch (error) {
        console.error("Erro na geração de resumo:", error);
        return { success: false, error: "Falha ao gerar resumo." };
    }
}
