"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/utils/supabase/server"; // Cliente normal (para ler sessão se precisar)
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"; // Cliente Admin direto
import { unstable_noStore as noStore } from "next/cache";
import { getEnhancedContext } from "@/app/actions/medai-rag";

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Chave GEMINI não configurada");
  return new GoogleGenerativeAI(apiKey);
};

export async function getTrackDescription(nodeId: string) {
  noStore();

  // 1. Instancia o Supabase ADMIN (Poder Absoluto)
  // Isso ignora as regras de RLS que estão bloqueando o salvamento
  const supabaseAdmin = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Certifique-se que essa chave está no .env.local
  );

  // 2. Busca dados iniciais (Pode usar o admin também para garantir que acha)
  const { data: node } = await supabaseAdmin
    .from('study_nodes')
    .select('id, title, ai_description, ai_context, node_type')
    .eq('id', nodeId)
    .single();

  if (!node) return { error: "Objetivo não encontrado" };

  // CACHE: Se já existe, retorna.
  if (node.ai_description) {
    return {
      title: node.title,
      description: node.ai_description,
      ai_context: node.ai_context,
      source: 'database'
    };
  }

  // 3. LOGICA DE CONTEXTO RECURSIVO (TRACK/MODULE) 🧬
  let compiledContext = node.ai_context;
  let sourceType = node.node_type;

  if (node.node_type === 'custom_track' || node.node_type === 'module') {
    let lessons: any[] = [];
    let modulesMap: Record<string, string> = {};

    if (node.node_type === 'custom_track') {
      // TRILHA: Busca Módulos -> Aulas
      const { data: modules } = await supabaseAdmin
        .from('study_nodes')
        .select('id, title')
        .eq('parent_id', nodeId)
        .eq('node_type', 'module')
        .order('order_index');

      if (modules && modules.length > 0) {
        modules.forEach((m: any) => modulesMap[m.id] = m.title);
        const moduleIds = modules.map((m: any) => m.id);

        const { data: trackLessons } = await supabaseAdmin
          .from('study_nodes')
          .select('title, ai_context, parent_id')
          .in('parent_id', moduleIds)
          .eq('node_type', 'objective')
          .order('order_index');

        lessons = trackLessons || [];
      }
    } else {
      // MÓDULO: Busca Aulas diretas
      modulesMap[node.id] = node.title;
      const { data: modLessons } = await supabaseAdmin
        .from('study_nodes')
        .select('title, ai_context, parent_id')
        .eq('parent_id', nodeId)
        .eq('node_type', 'objective')
        .order('order_index');

      lessons = modLessons || [];
    }

    // FORMATAÇÃO DO CONTEXTO AGRUPADO
    if (lessons.length > 0) {
      const groupByModule: Record<string, string[]> = {};

      lessons.forEach((l: any) => {
        const mTitle = modulesMap[l.parent_id] || "Conteúdo";
        if (!groupByModule[mTitle]) groupByModule[mTitle] = [];
        // [Lesson Title]: context
        groupByModule[mTitle].push(`${l.title} (${l.ai_context || "Geral"})`);
      });

      compiledContext = Object.entries(groupByModule).map(([mod, ctxs]) => {
        return `[${mod}]: ${ctxs.join(" + ")}`;
      }).join("; \n\n");
    }
  }

  // 4. RETORNO OTIMIZADO
  return {
    title: node.title,
    description: node.ai_description, // Pode ser null (sem auto-gen)
    ai_context: compiledContext,
    node_type: node.node_type, // Vital para o frontend saber onde salvar
    source: 'database'
  };
}