"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/utils/supabase/server"; // Cliente normal (para ler sessão se precisar)
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"; // Cliente Admin direto
import { unstable_noStore as noStore } from "next/cache";

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
    .select('title, ai_description, node_type')
    .eq('id', nodeId)
    .single();

  if (!node) return { error: "Objetivo não encontrado" };

  // CACHE: Se já existe, retorna.
  if (node.ai_description) {
    return { 
      title: node.title, 
      description: node.ai_description, 
      source: 'database' 
    };
  }

  // 3. Se não existe, busca os filhos
  const { data: children } = await supabaseAdmin
    .from('study_nodes')
    .select('title, node_type')
    .eq('parent_id', nodeId)
    .order('order_index', { ascending: true });

  const islandsList = children?.map((c, index) => `${index + 1}. ${c.title}`).join("\n") || "Conteúdo prático";

  try {
    const genAI = getGenAI();
    // Usando modelo 1.5-flash para garantir estabilidade (ou mantenha o 3.0 se sua chave permitir)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

   const prompt = `
      Atue como um Professor Titular de Medicina realizando uma aula de revisão teórica aprofundada.
      
      CONTEXTO DE ESTUDO:
      Módulo Central: "${node.title}"
      Roteiro de Aulas (Ilhas): 
      ${islandsList}

      OBJETIVO:
      Criar um MATERIAL DE ESTUDO completo e técnico que explique os conceitos fundamentais dessas aulas. O texto deve servir como uma fonte de aprendizado real, não apenas um guia de navegação.

      ESTRUTURA OBRIGATÓRIA (Use Markdown Rico):
      
      ## 🏥 Panorama Clínico e Fisiopatológico
      (Introdução técnica. Defina o tema central, explique a fisiopatologia base ou o mecanismo fisiológico principal envolvido. Se for doença, cite brevemente a epidemiologia ou quadro clássico).

      ## 🧬 Aprofundamento por Tópico
      (Para CADA ilha listada no roteiro, crie um tópico '### Nome da Ilha' e explique:)
      - **Mecanismo/Conceito:** Explique DETALHADAMENTE o funcionamento. (Ex: Se for Farmaco, explique o mecanismo de ação molecular. Se for Doença, a patogênese. Se for Anatomia, as relações nobres).
      - **Aplicação Prática:** Como isso se traduz na clínica, no exame físico ou no diagnóstico?
      *Seja técnico: Use termos médicos corretos, cite valores de referência se necessário.*

      ## ⚠️ Pérolas de Residência (High-Yield)
      (Liste 3 a 5 pontos cruciais, pegadinhas comuns de prova ou detalhes que diferenciam o generalista do especialista sobre este tema).

      FONTES E TOM:
      - Baseie-se em literatura padrão-ouro (Harrison, Guyton, Diretrizes Brasileiras).
      - Tom sério, didático e direto.
      - Use **negrito** para termos-chave.
      - Explique o "Porquê" dos processos (ex: "Ocorre dispneia PORQUE o aumento da pressão hidrostática capilar...").
    `;

    const result = await model.generateContent(prompt);
    const aiText = result.response.text();

    // 4. SALVANDO COMO ADMIN (Aqui estava o erro antes)
    const { error: updateError } = await supabaseAdmin
      .from('study_nodes')
      .update({ ai_description: aiText })
      .eq('id', nodeId);

    if (updateError) {
      console.error("Erro CRÍTICO ao salvar:", updateError.message);
      // Se der erro aqui, é porque a chave SERVICE_ROLE está errada no .env
    } else {
      console.log("✅ Salvo com sucesso via Admin!");
    }

    return { 
      title: node.title, 
      description: aiText, 
      source: 'ai_generated' 
    };

  } catch (error) {
    console.error("Erro na IA:", error);
    return { error: "Não foi possível gerar o roteiro agora." };
  }
}