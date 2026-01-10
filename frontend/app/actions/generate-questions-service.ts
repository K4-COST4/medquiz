import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"; // Admin Client
import { getEnhancedContext } from "@/app/actions/medai-rag";

export interface GenerationParams {
    nodeId: string;
    topic: string;
    aiContext: string;
    mode: 'standard' | 'boss' | 'kahoot';
    neededDifficulties?: string[];
    forcedTypes?: string[];
    userId?: string; // Optional: for tracking usages if needed
}

export async function generateQuestionsService(params: GenerationParams) {
    const { nodeId, topic, aiContext, mode, neededDifficulties, forcedTypes } = params;

    // USE ADMIN CLIENT TO BYPASS RLS ON INSERT
    const supabase = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. LÓGICA DE MODO (O Maestro decide a regência)
    let difficultyRecipe: string[] = [];
    let allowedTypes: string[] = [];

    switch (mode) {
        case 'boss':
            difficultyRecipe = Array(5).fill('medium').concat(Array(5).fill('hard'));
            allowedTypes = ['multiple_choice', 'true_false', 'fill_gap'];
            break;
        case 'kahoot':
            difficultyRecipe = neededDifficulties && neededDifficulties.length > 0
                ? neededDifficulties
                : ['medium', 'medium', 'hard', 'hard', 'hard'];
            allowedTypes = ['multiple_choice'];
            break;
        case 'standard':
        default:
            difficultyRecipe = neededDifficulties && neededDifficulties.length > 0
                ? neededDifficulties
                : ['easy', 'medium', 'medium', 'hard', 'hard'];
            allowedTypes = forcedTypes || ['multiple_choice', 'true_false', 'fill_gap'];
            break;
    }

    if (difficultyRecipe.length === 0) {
        return { success: true, count: 0, data: [] };
    }

    // 2. RAG CONTEXT (Novo!)
    const ragContext = await getEnhancedContext(topic);

    // 3. PREPARAÇÃO DA IA
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview",
        generationConfig: { responseMimeType: "application/json" }
    });

    // 4. PROMPT
    const prompt = `
      Você é o motor de geração de questões do MedQuiz.
      
      === REGRAS ESTRITAS DE DIFICULDADE (TAXONOMIA DO MEDQUIZ) ===
      Para CADA questão, verifique qual dificuldade foi solicitada e siga ESTRITAMENTE estas regras:

      - IF EASY: "Gere questões puramente CONCEITUAIS. Foque em definições, mecanismos fisiológicos e anatomia. PROIBIDO usar casos clínicos ou histórias de pacientes. A pergunta deve ser direta (Ex: 'O que é...', 'Qual a função de...')."
      
      - IF MEDIUM: "Gere questões de CORRELAÇÃO ('Bridge Questions'). Use cenários curtos (1 frase) ou descrições de sintomas isolados para testar a ponte entre teoria e prática. (Ex: 'Em um paciente com X, o achado Y indica o quê?')."
      
      - IF HARD: "Gere CASOS CLÍNICOS COMPLETOS (Vingetas). Inclua HDA (História da Doença Atual), sinais vitais e/ou exames se pertinente. A questão deve exigir raciocínio clínico complexo para diagnóstico, conduta ou tratamento baseado no caso apresentado."
      
      === PARÂMETROS DA SESSÃO ===
      Tópico: ${topic}
      Tópico: ${topic}
      Contexto/Referência do Usuário: ${aiContext || "Nenhum específico"}
      
      === FONTES DE CONTEXTO (RAG) ===
      ${ragContext} 

      === PROTOCOLO DE CRIAÇÃO (HÍBRIDO PRIORITÁRIO) ===
      1. PRIORIDADE MÁXIMA (A Verdade): 
         - Use os dados acima (RAG) para garantir a exatidão técnica das questões (valores, condutas).
         - Se o RAG trouxer um "Estudo X", tente criar uma questão que mencione esse estudo ou seus achados (especialmente para níveis Medium/Hard).

      2. COMPLETUDE:
         - Se o RAG for omisso, use seu conhecimento para preencher onde for necessário, garantindo que a questão seja pedagogicamente completa.
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
        "content": { 
           "options": [
             { "id": "true", "text": "Verdadeiro", "isCorrect": true },
             { "id": "false", "text": "Falso", "isCorrect": false }
           ]
        }
        NOTA: 'isCorrect' deve refletir a verdade da afirmação.
      }` : ""}

      ${allowedTypes.includes('fill_gap_select') ? `
      TIPO 'fill_gap_select':
      {
        "statement": "Frase com uma lacuna marcada por ___ para preencher.",
        "q_type": "fill_gap_select",
        "difficulty": "...",
        "commentary": "...",
        "content": {
          "correct_answer": "Resposta",
          "options": [
             { "id": "a", "text": "Resposta", "isCorrect": true },
             { "id": "b", "text": "Distrator1", "isCorrect": false },
             { "id": "c", "text": "Distrator2", "isCorrect": false },
             { "id": "d", "text": "Distrator3", "isCorrect": false }
          ]
        }
      }` : ""}
    `;

    // 4. EXECUÇÃO
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let generatedQuestions;
        try {
            generatedQuestions = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
        } catch (e) {
            console.error("Erro JSON IA:", text);
            throw new Error("Falha ao parsear resposta da IA");
        }

        // 5. SALVAMENTO
        const questionsToInsert = generatedQuestions.map((q: any, index: number) => ({
            node_id: nodeId,
            statement: q.statement,
            q_type: q.q_type,
            difficulty: difficultyRecipe[index] || q.difficulty,
            content: q.content,
            commentary: q.commentary,
            xp_reward: (difficultyRecipe[index] || q.difficulty) === 'hard' ? 20 : 10
        }));

        const { data, error } = await supabase
            .from('track_questions')
            .insert(questionsToInsert)
            .select();

        if (error) throw error;

        return { success: true, count: data.length, data };

    } catch (error: any) {
        console.error("Service Logic Error:", error);
        throw error;
    }
}
