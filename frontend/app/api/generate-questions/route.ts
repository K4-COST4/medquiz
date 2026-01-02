import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Configurações de execução
export const maxDuration = 60; // Limite de 60s para a IA pensar
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // --- PARÂMETROS DO MAESTRO ---
    // mode: 'standard' | 'boss' | 'kahoot'
    // neededDifficulties: Array de strings (ex: ['easy', 'hard']) - O que falta criar?
    // forcedTypes: Array de strings (opcional) - Ex: ['multiple_choice'] para Kahoot
    let { nodeId, topic, aiContext, mode, neededDifficulties, forcedTypes } = body;

    if (!nodeId || !topic) {
      return NextResponse.json({ error: "Dados vitais faltando (NodeID/Topic)" }, { status: 400 });
    }

    // 1. LÓGICA DE MODO (O Maestro decide a regência)
    let difficultyRecipe: string[] = [];
    let allowedTypes: string[] = [];

    switch (mode) {
      case 'boss':
        // BOSS: Fixo e Brutal (10 questões pesadas)
        difficultyRecipe = Array(5).fill('medium').concat(Array(5).fill('hard'));
        allowedTypes = ['multiple_choice', 'true_false', 'fill_gap'];
        break;

      case 'kahoot':
        // KAHOOT: Competitivo (Geralmente só Multipla Escolha para ser rápido)
        // Se não vier dificuldades, assume 5 médias/difíceis
        difficultyRecipe = neededDifficulties && neededDifficulties.length > 0
          ? neededDifficulties
          : ['medium', 'medium', 'hard', 'hard', 'hard'];
        allowedTypes = ['multiple_choice']; // Kahoot raramente usa true_false ou gap complexo
        break;

      case 'standard':
      default:
        // PADRÃO/ADAPTATIVO: Obedece estritamente o que o SQL pediu (neededDifficulties)
        // Se vier vazio (fallback), cria um mix básico
        difficultyRecipe = neededDifficulties && neededDifficulties.length > 0
          ? neededDifficulties
          : ['easy', 'medium', 'medium', 'hard', 'hard'];
        allowedTypes = forcedTypes || ['multiple_choice', 'true_false', 'fill_gap'];
        break;
    }

    // Se a receita estiver vazia por algum erro lógico, aborta para não gastar IA
    if (difficultyRecipe.length === 0) {
      return NextResponse.json({ success: true, message: "Nada a gerar.", count: 0, data: [] });
    }

    // 2. PREPARAÇÃO DA IA
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // 3. O PROMPT DE ENGENHARIA (O Partitura)
    const prompt = `
      Você é o motor de geração de questões do MedQuiz.
      
      === PARÂMETROS DA SESSÃO ===
      Tópico: ${topic}
      Contexto Clínico: ${aiContext || "Geral"}
      Modo de Jogo: ${mode?.toUpperCase() || "PADRÃO"}
      
      === SUA TAREFA ===
      Gere EXATAMENTE ${difficultyRecipe.length} questões.
      Dificuldades Obrigatórias (na ordem): ${difficultyRecipe.join(", ")}.
      Tipos Permitidos: ${allowedTypes.join(", ")}.

      === REGRAS DE ESTILO ===
      ${mode === 'kahoot' ? "- KAHOOT MODE: Enunciados curtos e diretos (máx 120 caracteres). Alternativas curtas." : "- PADRÃO: Enunciados detalhados, foco em casos clínicos e fisiopatologia."}
      ${mode === 'boss' ? "- BOSS MODE: Questões 'hard' devem ser multidisciplinares e complexas." : ""}
      
      === FORMATO JSON (ARRAY) ===
      Retorne um array de objetos. Estrutura obrigatória para cada tipo:

      TIPO 'multiple_choice':
      {
        "statement": "...",
        "q_type": "multiple_choice",
        "difficulty": "...",
        "commentary": "Explicação educativa...",
        "content": {
          "options": [
             { "id": "a", "text": "Errada", "isCorrect": false },
             { "id": "b", "text": "Certa", "isCorrect": true },
             { "id": "c", "text": "Errada", "isCorrect": false },
             { "id": "d", "text": "Errada", "isCorrect": false }
          ]
        }
      }

      ${allowedTypes.includes('true_false') ? `
      TIPO 'true_false':
      {
        "statement": "Afirmação completa...",
        "q_type": "true_false",
        "difficulty": "...",
        "commentary": "...",
        "content": { "isTrue": true }
      }` : ""}

      ${allowedTypes.includes('fill_gap') ? `
      TIPO 'fill_gap':
      {
        "statement": "Complete...",
        "q_type": "fill_gap",
        "difficulty": "...",
        "commentary": "...",
        "content": {
          "text_start": "...",
          "text_end": "...",
          "correct_answer": "Resposta",
          "options": ["Resposta", "Distrator1", "Distrator2", "Distrator3"]
        }
        NOTA PARA O FILL_GAP:
      - O array "options" deve conter 4 strings: a "correct_answer" e 3 distratores incorretos mas plausíveis (do mesmo contexto semântico).
      - Exemplo: Se a resposta for "Mitral", as opções podem ser ["Mitral", "Tricúspide", "Aórtica", "Pulmonar"].
      - Não use sinônimos da resposta certa como distratores.
      }` : ""}
    `;

    // 4. EXECUÇÃO
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Tratamento de JSON (Limpeza de Markdown se houver)
    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch (e) {
      console.error("Erro JSON IA:", text);
      throw new Error("Falha ao parsear resposta da IA");
    }

    // 5. SALVAMENTO NO SUPABASE
    const questionsToInsert = generatedQuestions.map((q: any, index: number) => ({
      node_id: nodeId,
      statement: q.statement,
      q_type: q.q_type,
      // Garante a dificuldade pedida caso a IA se perca
      difficulty: difficultyRecipe[index] || q.difficulty,
      content: q.content,
      commentary: q.commentary,
      // XP: Boss e Kahoot podem ter multiplicadores diferentes no futuro
      xp_reward: (difficultyRecipe[index] || q.difficulty) === 'hard' ? 20 : 10
    }));

    const { data, error } = await supabase
      .from('track_questions')
      .insert(questionsToInsert)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, count: data.length, mode: mode, data });

  } catch (error: any) {
    console.error("Erro Route Maestro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}