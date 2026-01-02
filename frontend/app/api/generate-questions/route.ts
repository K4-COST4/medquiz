import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Configuração do Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Recebemos aiContext do Frontend (vindo do banco de dados)
    // neededDifficulties agora é let para podermos modificar se vier vazio
    let { nodeId, topic, aiContext, neededDifficulties } = body;

    // Validação básica (neededDifficulties não é mais obrigatório aqui, pois temos fallback)
    if (!nodeId || !topic) {
      return NextResponse.json({ error: "Dados incompletos (NodeID ou Tópico faltando)" }, { status: 400 });
    }

    // --- LÓGICA DE ECONOMIA DE REQUISIÇÕES ---
    // Se o frontend não especificar quantidade, geramos um BLOCO DE 5 por padrão.
    // Isso garante que cada chamada à IA valha a pena financeiramente.
    if (!neededDifficulties || neededDifficulties.length === 0) {
        // Mix padrão: 1 Fácil, 2 Médias, 2 Difíceis
        neededDifficulties = ['easy', 'medium', 'medium', 'hard', 'hard'];
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" } // Força resposta JSON
    });

    // PROMPT ENGENHEIRADO PARA VARIEDADE E FORMATO RÍGIDO
    const prompt = `
      Você é um Professor de Medicina Especialista criando questões para o MedQuiz.
      
      === CONTEXTO DA AULA ===
      Tópico Principal: ${topic}
      Diretrizes Específicas (AI Context): ${aiContext || "Foque nos conceitos fundamentais, clínicos e fisiopatológicos relevantes para este tópico."}
      
      === TAREFA ===
      Gere exatas ${neededDifficulties.length} questões.
      Dificuldades solicitadas (na ordem): ${neededDifficulties.join(", ")}.

      === TIPOS DE QUESTÃO (IMPORTANTE: Escolha ALEATORIAMENTE para cada questão) ===
      Para cada questão, escolha um destes 3 tipos (tente variar entre eles):
      1. "multiple_choice": Clássica, 4 alternativas.
      2. "true_false": Julgar uma afirmação.
      3. "fill_gap": Completar uma frase chave com opções clicáveis.

      === FORMATO JSON OBRIGATÓRIO ===
      Retorne um ARRAY de objetos contendo TODAS as ${neededDifficulties.length} questões.
      Siga ESTRITAMENTE a estrutura do campo "content" para cada tipo:

      1. TIPO 'multiple_choice':
      {
        "statement": "Enunciado clínico ou teórico...",
        "q_type": "multiple_choice",
        "difficulty": "definido pela ordem",
        "commentary": "Explicação detalhada...",
        "content": {
          "options": [
             { "id": "a", "text": "Incorreta", "isCorrect": false },
             { "id": "b", "text": "Correta", "isCorrect": true },
             { "id": "c", "text": "Incorreta", "isCorrect": false },
             { "id": "d", "text": "Incorreta", "isCorrect": false }
          ]
        }
      }

      2. TIPO 'true_false':
      {
        "statement": "Uma afirmação médica completa para ser julgada.",
        "q_type": "true_false",
        "difficulty": "...",
        "commentary": "Por que é verdadeiro ou falso...",
        "content": {
          "isTrue": true // ou false
        }
      }

      3. TIPO 'fill_gap' (ESTILO "SELECIONAR A PALAVRA"):
      {
        "statement": "Complete a lacuna sobre o conceito X:",
        "q_type": "fill_gap",
        "difficulty": "...",
        "commentary": "Explicação...",
        "content": {
          "text_start": "O início da frase até a lacuna",
          "text_end": "o restante da frase após a lacuna (ou ponto final).",
          "correct_answer": "PalavraCerta",
          "options": ["PalavraCerta", "Distrator1", "Distrator2", "Distrator3"] 
        }
      }
      
      NOTA PARA O FILL_GAP:
      - O array "options" deve conter 4 strings: a "correct_answer" e 3 distratores incorretos mas plausíveis (do mesmo contexto semântico).
      - Exemplo: Se a resposta for "Mitral", as opções podem ser ["Mitral", "Tricúspide", "Aórtica", "Pulmonar"].
      - Não use sinônimos da resposta certa como distratores.
    `;

    // 3. Chamar a IA (UMA ÚNICA VEZ PARA O BLOCO INTEIRO)
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(text);
    } catch (e) {
      // Fallback para limpeza caso o modelo não respeite o mimeType (raro no Flash atual)
      const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
      generatedQuestions = JSON.parse(cleanText);
    }

    // 4. Salvar no Supabase
    // Adicionamos os campos de controle que a IA não precisa saber (node_id, xp_reward calculado)
    const questionsToInsert = generatedQuestions.map((q: any) => ({
      node_id: nodeId,
      statement: q.statement,
      q_type: q.q_type,
      difficulty: q.difficulty,
      content: q.content,
      commentary: q.commentary,
      // Lógica de XP baseada na dificuldade (Regra de Negócio)
      xp_reward: q.difficulty === 'hard' ? 15 : q.difficulty === 'medium' ? 10 : 5
    }));

    const { data, error } = await supabase
      .from('track_questions')
      .insert(questionsToInsert)
      .select();

    if (error) {
      console.error("Erro Supabase:", error);
      throw error;
    }

    return NextResponse.json({ success: true, count: data.length, data });

  } catch (error: any) {
    console.error("Erro na Geração:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}