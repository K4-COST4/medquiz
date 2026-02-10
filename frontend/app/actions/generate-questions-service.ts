import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"; // Admin Client
import { getEnhancedContext } from "@/app/actions/medai-rag";
import { generateEmbedding } from "@/app/actions/medai-core"; // Importando embedding

// Imports do Sistema de Qualidade
import { validateQuestionBatch } from "@/app/actions/question-validator";
import { compactRAG, extractKeywords } from "@/app/actions/rag-compactor";
import {
    buildEnrichedQuery,
    rerankMatches,
    selectMatchStrategy,
    fetchNodeHierarchy
} from "@/app/actions/question-helpers";
import {
    DIFFICULTY_DEFINITIONS,
    DISTRACTOR_RULES,
    COMMENTARY_TEMPLATE,
    FEW_SHOT_EXAMPLES
} from "@/lib/ai-prompts";


export interface GenerationParams {
    nodeId: string;
    mode: 'standard' | 'boss' | 'kahoot';
    neededDifficulties?: string[];
    forcedTypes?: string[];
    userId?: string;
}

export async function getOrGenerateQuestions(params: GenerationParams) {
    const { nodeId, mode, neededDifficulties, forcedTypes, userId } = params;

    // 1. INIT SUPABASE ADMIN (Bypass RLS)
    const supabase = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // =========================================================
    // PASSO 1: VERIFICAÇÃO DE CACHE DE TRILHA (Cópia Local)
    // =========================================================
    // Se o caller especificou "neededDifficulties", significa que ele JÁ verificou (via RPC)
    // e sabe que faltam questões. Nesse caso, ignoramos o cache simples.
    const shouldSkipCache = neededDifficulties && neededDifficulties.length > 0;

    if (!shouldSkipCache) {
        const { data: existingQuestions } = await supabase
            .from('track_questions')
            .select('*')
            .eq('node_id', nodeId);

        if (existingQuestions && existingQuestions.length > 0) {
            return { success: true, count: existingQuestions.length, data: existingQuestions, fromCache: true };
        }
    }

    // =========================================================
    // PASSO 2: PREPARAÇÃO DO CONTEXTO (Dados do Nó)
    // =========================================================
    const { data: node, error: nodeError } = await supabase
        .from('study_nodes')
        .select('title, description, ai_context, parent_id, node_type')
        .eq('id', nodeId)
        .single();

    if (nodeError || !node) {
        throw new Error("Study Node not found for generation.");
    }

    // =========================================================
    // PASSO 3: CONFIGURAÇÃO DA RECEITA (O que precisamos?)
    // =========================================================
    // =========================================================
    // PASSO 3: CONFIGURAÇÃO DA RECEITA (O que precisamos?)
    // =========================================================
    let difficultyRecipe: string[] = [];
    let allowedTypes: string[] = [];

    // Fetch User Level for Standard Mode
    let userLevel = 0;
    if (userId && mode === 'standard') {
        const { data: progress } = await supabase
            .from('user_node_progress')
            .select('current_level')
            .eq('user_id', userId)
            .eq('node_id', nodeId)
            .single();
        if (progress && progress.current_level) userLevel = progress.current_level;
    }

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
            if (neededDifficulties && neededDifficulties.length > 0) {
                difficultyRecipe = neededDifficulties;
            } else {
                // Lógica Dinâmica baseada no Nível do Usuário
                if (userLevel === 0) {
                    // Nível 1: 6 Fáceis + 2 Médias
                    difficultyRecipe = [...Array(6).fill('easy'), ...Array(2).fill('medium')];
                } else if (userLevel === 1) {
                    // Nível 2: 2 Fáceis + 6 Médias
                    difficultyRecipe = [...Array(2).fill('easy'), ...Array(6).fill('medium')];
                } else if (userLevel === 2) {
                    // Nível 3: 1 Fácil + 4 Médias + 3 Difíceis
                    difficultyRecipe = ['easy', ...Array(4).fill('medium'), ...Array(3).fill('hard')];
                } else {
                    // Nível Dourado: 5 Médias + 5 Difíceis
                    difficultyRecipe = [...Array(5).fill('medium'), ...Array(5).fill('hard')];
                }
            }
            allowedTypes = forcedTypes || ['multiple_choice', 'true_false', 'fill_gap'];
            break;
    }

    // =========================================================
    // PASSO 4: VECTOR SEARCH (Busca no Banco com Enrichment + Reranking)
    // =========================================================
    let foundQuestions: any[] = [];
    let telemetryData: any = {
        node_id: nodeId,
        vector_query: null,
        top1_distance: null,
        top3_distances: [],
        vector_matches_count: 0,
        vector_hit_rate: 0,
        ai_generated_count: 0,
        validation_passed: 0,
        validation_failed: 0
    };

    if (mode !== 'boss') {
        try {
            // A. Query Enrichment com ai_context
            const { data: parentNode } = node.parent_id
                ? await supabase.from('study_nodes').select('title').eq('id', node.parent_id).single()
                : { data: null };

            const enrichedQuery = buildEnrichedQuery(node, parentNode);
            const queryVector = await generateEmbedding(enrichedQuery);

            telemetryData.vector_query = enrichedQuery.substring(0, 200);

            // B. Buscar Questões Similares (RPC com distance)
            let { data: vectorMatches, error: matchError } = await supabase.rpc('match_questions', {
                query_embedding: queryVector,
                match_threshold: 0.75,
                match_count: 20,
                filter_topics: null,
                filter_difficulty: null
            });

            if (!matchError && vectorMatches && vectorMatches.length > 0) {
                telemetryData.vector_matches_count = vectorMatches.length;
                telemetryData.top1_distance = vectorMatches[0]?.distance || null;
                telemetryData.top3_distances = vectorMatches.slice(0, 3).map((m: any) => m.distance);

                // C. Reranking com keywords
                const keywords = await extractKeywords(node.ai_context || node.title);
                const reranked = rerankMatches(vectorMatches, keywords, node);
                vectorMatches = reranked; // Usar versão reranked

                // D. Filtrar e Preencher a "Receita"
                const usedIds = new Set();
                const needed = [...difficultyRecipe];

                for (let i = 0; i < needed.length; i++) {
                    const targetDiff = needed[i];
                    const matchIndex = vectorMatches.findIndex((q: any) =>
                        q.difficulty === targetDiff &&
                        !usedIds.has(q.id) &&
                        allowedTypes.includes(q.q_type)
                    );

                    if (matchIndex >= 0) {
                        const match = vectorMatches[matchIndex];
                        foundQuestions.push({
                            ...match,
                            is_vector_match: true
                        });
                        usedIds.add(match.id);
                        needed[i] = 'DONE';
                    }
                }

                difficultyRecipe = needed.filter((d: string) => d !== 'DONE');
                telemetryData.vector_hit_rate = foundQuestions.length / (foundQuestions.length + difficultyRecipe.length);
            }

        } catch (e) {
            console.error("Vector Search Failed (Ignored):", e);
        }
    }

    // Se a receita zerou, significa que achamos TUDO no banco!
    if (difficultyRecipe.length === 0) {
        // Pula geração IA -> Vai direto para o Bridge (Passo 6)
    } else {
        // =========================================================
        // PASSO 5: FALLBACK GENERATION (IA cria o que faltou)
        // =========================================================
        // Aqui usamos a lógica antiga, mas APENAS para o que faltou (difficultyRecipe)

        // Define System Prompt & Context com Constantes de Qualidade
        let systemPrompt = "";
        let contextSource = "";
        let ragContent = "";

        if (node.ai_context && node.ai_context.trim().length > 0) {
            contextSource = "CUSTOM_TRACK";
            const rawRAG = await getEnhancedContext(node.title);
            ragContent = await compactRAG(rawRAG, node.title);

            systemPrompt = `
VOCÊ É UM PROFESSOR DE MEDICINA DE ELITE CRIANDO QUESTÕES DE PROVA.

${DIFFICULTY_DEFINITIONS}

${DISTRACTOR_RULES}

${COMMENTARY_TEMPLATE}

== CONTEXTO PEDAGÓGICO (PRIORIDADE TOTAL) ==
${node.ai_context}

== CONTEXTO BIBLIOGRÁFICO (RAG - Background Knowledge) ==
${ragContent}

REGRAS DE OURO:
1. Baseie-se PRINCIPALMENTE no Contexto Pedagógico.
2. O Contexto Bibliográfico serve apenas como suporte técnico de fundo.
3. Formule como Verdades Médicas Universais ou Casos Clínicos.

${FEW_SHOT_EXAMPLES}
            `;
        } else {
            contextSource = "OFFICIAL_TRACK";
            const rawRAG = await getEnhancedContext(node.title);
            ragContent = await compactRAG(rawRAG, node.title);

            systemPrompt = `
VOCÊ É UM PROFESSOR DE MEDICINA DE ELITE CRIANDO QUESTÕES DE PROVA.

${DIFFICULTY_DEFINITIONS}

${DISTRACTOR_RULES}

${COMMENTARY_TEMPLATE}

Tópico: ${node.title}

== CONTEXTO BIBLIOGRÁFICO (RAG) ==
${ragContent}

REGRAS:
1. Use RAG ou conhecimento médico. Formule como Casos Clínicos ou Verdades Médicas.
2. O RAG é uma fonte de consulta, o usuário não consegue ler o texto, portanto, evite citar o que selecionou nas questões.

${FEW_SHOT_EXAMPLES}
            `;
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        const BATCH_SIZE = 5;
        const totalNeeded = difficultyRecipe.length;

        // Split recipe into chunks
        const chunks = [];
        for (let i = 0; i < totalNeeded; i += BATCH_SIZE) {
            chunks.push(difficultyRecipe.slice(i, i + BATCH_SIZE));
        }

        console.log(`🤖 Maestro: Gerando ${totalNeeded} questões em ${chunks.length} lotes...`);

        // Process chunks (Parallel or Sequential? Parallel is faster)
        const batchPromises = chunks.map(async (chunkRecipe, chunkIndex) => {
            const finalPrompt = `
              ${systemPrompt}
              === TAREFA (LOTE ${chunkIndex + 1}) ===
              Gere EXATAMENTE ${chunkRecipe.length} questões.
              Dificuldades: ${chunkRecipe.join(", ")}.
              Tipos permitidos: ${allowedTypes.join(", ")}.
              
              === FORMATO JSON (RIGOROSO) ===
              Retorne um ARRAY de objetos.
              Estrutura OBRIGATÓRIA para "options" em Multiple Choice:
              "options": [
                 { "id": "A", "text": "Texto da opção A...", "isCorrect": false },
                 { "id": "B", "text": "Texto da opção B...", "isCorrect": true },
                 ...
              ] (Aleatorize qual alternativa é "true")
              
              Estrutura Completa do Objeto:
              { 
                "statement": "...", 
                "q_type": "multiple_choice", 
                "difficulty": "...", 
                "commentary": "...",
                "content": { 
                   "options": [...],
                   "correct_answer": "..." // OBRIGATÓRIO se for fill_gap
                }
              }
              (Se for true_false, use id="true"/"false" e text="Verdadeiro"/"Falso")
              (Se for fill_gap, OBRIGATÓRIO fornecer "options" contendo a reposta correta e 3 distratores incorretos. NÃO use campo de texto livre.)
            `;

            try {
                const result = await model.generateContent(finalPrompt);
                const text = result.response.text();
                const jsonRaw = JSON.parse(text.replace(/```json|```/g, "").trim());
                return Array.isArray(jsonRaw) ? jsonRaw : [jsonRaw];
            } catch (err) {
                console.error(`Erro no lote ${chunkIndex + 1}:`, err);
                return [];
            }
        });

        const results = await Promise.all(batchPromises);
        let generatedNew = results.flat();

        // =========================================================
        // PASSO 5.1: VALIDAÇÃO COM RETRY
        // =========================================================
        const MAX_RETRIES = 2;
        let retryCount = 0;

        while (retryCount < MAX_RETRIES) {
            const validation = validateQuestionBatch(generatedNew, difficultyRecipe);

            telemetryData.validation_passed = validation.stats.passed;
            telemetryData.validation_failed = validation.stats.failed;

            if (validation.invalid.length === 0) {
                // Todas passaram!
                generatedNew = validation.valid;
                console.log(`✅ Validação: ${validation.stats.passed} questões aprovadas`);
                break;
            }

            console.warn(`⚠️ Validação: ${validation.stats.failed} questões reprovadas (tentativa ${retryCount + 1}/${MAX_RETRIES})`);
            console.warn('Problemas:', validation.stats.criticalIssues.slice(0, 5));

            if (retryCount === MAX_RETRIES - 1) {
                // Última tentativa: aceitar apenas as válidas
                generatedNew = validation.valid;
                console.error(`❌ Algumas questões não passaram após ${MAX_RETRIES} tentativas. Usando apenas ${generatedNew.length} válidas.`);
                break;
            }

            // Re-gerar apenas as reprovadas
            const failedDifficulties = validation.invalid.map(item => item.expectedDifficulty || 'medium');

            try {
                const retryPrompt = `
${systemPrompt}
=== TAREFA (RETRY) ===
Gere EXATAMENTE ${failedDifficulties.length} questões.
Dificuldades: ${failedDifficulties.join(", ")}.
Tipos permitidos: ${allowedTypes.join(", ")}.

ATENÇÃO: As questões anteriores foram REPROVADAS por:
${validation.stats.criticalIssues.slice(0, 3).join('\n')}

Corrija esses problemas!
                `;

                const retryResult = await model.generateContent(retryPrompt);
                const retryText = retryResult.response.text();
                const retryJson = JSON.parse(retryText.replace(/```json|```/g, "").trim());
                const retryQuestions = Array.isArray(retryJson) ? retryJson : [retryJson];

                // Substituir reprovadas por novas
                generatedNew = [...validation.valid, ...retryQuestions];
            } catch (err) {
                console.error('Erro no retry:', err);
                generatedNew = validation.valid; // Aceitar apenas válidas
                break;
            }

            retryCount++;
        }

        telemetryData.ai_generated_count = generatedNew.length;

        // =========================================================
        // PASSO 5.1: INGESTÃO ASSÍNCRONA (Save to Bank)
        // =========================================================
        if (generatedNew.length > 0) {
            // É melhor salvar agora e pegar os IDs.
            const bankInserts = generatedNew.map((q: any) => ({
                statement: q.statement,
                options: (q.content && q.content.options) ? q.content.options : (q.options || []), // Garante array vazio se nulo
                q_type: q.q_type,
                difficulty: q.difficulty,
                commentary: q.commentary,
                topics: [node.title], // Tag inicial
                source: 'ai_auto_gen',
                content: q.content || { options: q.options || [] } // Garante content COMPLETO na tabela nova
            }));

            // Tenta inserir no Bank
            const { data: savedBankQuestions, error: bankError } = await supabase
                .from('question_bank')
                .insert(bankInserts)
                .select();

            if (bankError) {
                console.error("❌ ERRO CRÍTICO AO SALVAR NO QUESTION_BANK:", bankError);
                // Não damos throw, deixamos o fallback salvar no track_questions
            }

            if (!bankError && savedBankQuestions) {
                // Background: Gerar Embedding para eles depois? 
                (async () => {
                    for (const q of savedBankQuestions) {
                        try {
                            const vec = await generateEmbedding(q.statement); // Vetoriza enunciado
                            await supabase.from('question_bank').update({ embedding: vec }).eq('id', q.id);
                        } catch (err) { console.error("Background Embedding Error", err) }
                    }
                })();

                // Adiciona na lista de encontrados
                foundQuestions.push(...savedBankQuestions);
            } else {
                // Fallback se falhar banco: usa o JSON puro e marca sem ID original
                foundQuestions.push(...generatedNew.map((q: any) => ({ ...q, content: q.content || { options: q.options } })));
            }
        }

    }

    // =========================================================
    // PASSO 6: THE BRIDGE (Track Questions Insert)
    // =========================================================
    // Agora temos 'foundQuestions' (vinda do Vetor ou da IA salvas no Banco)
    // Vamos inserir na tabela do usuário 'track_questions'

    // Normalização final antes de inserir
    const questionsToInsert = foundQuestions.map((q: any) => ({
        node_id: nodeId,
        statement: q.statement,
        q_type: q.q_type,
        difficulty: (q.difficulty || 'medium').toLowerCase(),
        content: q.content || { options: q.options }, // Garante estrutura
        commentary: q.commentary,
        xp_reward: (q.difficulty) === 'hard' ? 20 : 10,
        original_question_id: q.id // LINK IMPORTANTE (pode ser undefined se falhou save, ok)
    }));

    const { data, error } = await supabase
        .from('track_questions')
        .insert(questionsToInsert)
        .select();

    if (error) throw error;

    // =========================================================
    // PASSO 7: TELEMETRIA (Logging de Métricas)
    // =========================================================
    try {
        await supabase.from('question_generation_logs').insert(telemetryData);
    } catch (telemetryError) {
        console.error('[Telemetry] Erro ao salvar log:', telemetryError);
        // Não bloqueia o fluxo
    }

    return { success: true, count: data.length, data, fromCache: false, source: "HYBRID" };
}
