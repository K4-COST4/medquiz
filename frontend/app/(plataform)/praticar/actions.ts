'use server';

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getOrGenerateQuestions } from "@/app/actions/generate-questions-service";

// --- TIPOS ---
type Difficulty = 'easy' | 'medium' | 'hard';
type QuestionType = 'multiple_choice' | 'true_false' | 'fill_gap' | 'open_ended';

export interface Question {
    id: string;
    statement: string;
    q_type: QuestionType;
    content: any;
    commentary: string;
    difficulty: Difficulty;
    xp_reward: number;
}

interface SessionProgress {
    currentIndex: number;
    correctCount: number;
    currentScore: number;
}

interface SessionData {
    questions: Question[];
    currentLevel: number;
    isBoss: boolean;
    nodeTitle: string;
    parentThemeId?: string | null;
    progress?: SessionProgress;
}

// --- RECEITAS DE BOLO (MAESTRO) ---
const MASTERY_RULES = {
    0: { easy: 6, medium: 2, hard: 0 },
    1: { easy: 2, medium: 6, hard: 0 },
    2: { easy: 1, medium: 4, hard: 3 },
    3: { easy: 0, medium: 5, hard: 5 }, // Revisão Dourada
};

const BOSS_RECIPE = { easy: 0, medium: 5, hard: 5 };

/**
 * Função Principal: Prepara a sessão de estudo do aluno (Adaptive Learning)
 */
// --- TIPOS DE SESSÃO ---
interface StudySession {
    id: string;
    questions: Question[];
    status: 'active' | 'completed' | 'abandoned';
}

/**
 * Função Principal: Prepara a sessão de estudo do aluno (Adaptive Learning)
 * COM PERSISTÊNCIA DE SESSÃO
 */
export async function getStudentSession(nodeId: string): Promise<{ success: boolean; data?: SessionData; error?: string }> {
    const supabase = await createClient();

    try {
        // 1. AUTH & USER CHECK
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return { success: false, error: "Usuário não autenticado." };

        // 2. BUSCAR DADOS DO NÓ (Contexto)
        const { data: node, error: nodeError } = await supabase
            .from('study_nodes')
            .select('id, title, ai_context, is_boss, is_module_boss, parent_id, node_type')
            .eq('id', nodeId)
            .single();

        if (nodeError || !node) return { success: false, error: "Módulo não encontrado." };

        const isBoss = node.is_boss || node.is_module_boss;

        // Buscar o tema pai (para redirecionamento futuro)
        let parentThemeId = null;
        if (node.node_type === 'theme') parentThemeId = node.id;

        // 3. BUSCAR PROGRESSO DO ALUNO
        const { data: progress } = await supabase
            .from('user_node_progress')
            .select('current_level')
            .eq('user_id', user.id)
            .eq('node_id', nodeId)
            .maybeSingle();

        const currentLevel = (progress?.current_level || 0) as 0 | 1 | 2 | 3;

        // --- NOVA LÓGICA: VERIFICAR SESSÃO ATIVA ---
        const { data: activeSession } = await supabase
            .from('study_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('node_id', nodeId)
            .eq('status', 'active')
            .maybeSingle();

        if (activeSession) {
            console.log("🔄 Retomando sessão ativa:", activeSession.id);
            const sessionQuestions = activeSession.questions as Question[];

            // Verificar histórico para restaurar progresso
            const qIds = sessionQuestions.map(q => q.id);

            // Buscar histórico recente (ou total) dessas questões para este usuário
            const { data: history } = await supabase
                .from('user_question_history')
                .select('question_id, is_correct')
                .in('question_id', qIds)
                .eq('user_id', user.id);

            const answeredMap = new Map<string, boolean>();
            let correctCount = 0;
            let currentScore = 0;

            if (history) {
                history.forEach((h: any) => {
                    if (!answeredMap.has(h.question_id)) {
                        answeredMap.set(h.question_id, h.is_correct);
                        if (h.is_correct) {
                            correctCount++;
                            // Encontrar XP da questão na sessão
                            const q = sessionQuestions.find(sq => sq.id === h.question_id);
                            if (q) currentScore += (q.xp_reward || 10);
                        }
                    }
                });
            }

            const answeredCount = answeredMap.size;

            // --- AUTO-COMPLETE CHECK ---
            if (answeredCount >= sessionQuestions.length) {
                console.log("🏁 Sessão anterior estava 100% concluída. Finalizando e gerando nova...");

                // 1. Marca como completed
                await supabase
                    .from('study_sessions')
                    .update({ status: 'completed', finished_at: new Date().toISOString() })
                    .eq('id', activeSession.id);

                // 2. Continua o fluxo para criar uma nova (NÃO RETORNA)
            } else {
                // Sessão ainda ativa e incompleta, retorna ela
                console.log(`✅ Retomando sessão: ${answeredCount}/${sessionQuestions.length} respondidas, ${correctCount} corretas, ${currentScore} XP`);
                return {
                    success: true,
                    data: {
                        questions: sessionQuestions,
                        currentLevel,
                        isBoss,
                        nodeTitle: node.title,
                        parentThemeId,
                        progress: {
                            currentIndex: answeredCount,
                            correctCount,
                            currentScore
                        }
                    }
                };
            }
        }

        // --- FIM VERIFICAÇÃO SESSÃO ATIVA ---


        // 4. DEFINIR A "RECEITA" (O que precisamos?)
        let recipe: { easy: number, medium: number, hard: number };

        if (isBoss) {
            recipe = BOSS_RECIPE;
        } else {
            recipe = MASTERY_RULES[currentLevel] || MASTERY_RULES[0];
        }

        const wishList: Difficulty[] = [];
        Object.entries(recipe).forEach(([diff, count]) => {
            for (let i = 0; i < count; i++) wishList.push(diff as Difficulty);
        });

        // 5. CONSULTAR ESTOQUE (RPC)
        const { data: dbQuestions, error: rpcError } = await supabase
            .rpc('get_adaptive_session', { p_node_id: nodeId });

        if (rpcError) throw new Error(`Erro RPC: ${rpcError.message}`);

        let availableQuestions = (dbQuestions || []) as Question[];

        // --- FILTRAR QUESTÕES QUE JÁ ESTÃO NA FILA DE ERROS (Evitar Duplicidade) ---
        // Se a questão está em 'user_mistakes', ela deve ser feita via "Revisão", não na sessão normal.
        const { data: mistakeIds } = await supabase
            .from('user_mistakes')
            .select('question_id')
            .eq('user_id', user.id);

        const mistakeIdSet = new Set(mistakeIds?.map((m: any) => m.question_id));
        availableQuestions = availableQuestions.filter(q => !mistakeIdSet.has(q.id));
        // --------------------------------------------------------------------------

        // 6. CALCULAR O GAP (O que tem vs O que preciso)
        const finalSessionQuestions: Question[] = [];
        const neededDifficulties: Difficulty[] = [];

        for (const diff of wishList) {
            const foundIndex = availableQuestions.findIndex(q => q.difficulty === diff);

            if (foundIndex !== -1) {
                finalSessionQuestions.push(availableQuestions[foundIndex]);
                availableQuestions.splice(foundIndex, 1);
            } else {
                neededDifficulties.push(diff);
            }
        }

        // 7. CHAMAR O MAESTRO (IA) SE HOUVER GAP
        if (neededDifficulties.length > 0) {
            console.log(`🤖 Maestro: Preciso gerar ${neededDifficulties.length} questões (${neededDifficulties.join(', ')})`);

            try {
                // REDUNDÂNCIA: Chamada Direta ao Service (Evita problemas de fetch local)
                const result = await getOrGenerateQuestions({
                    nodeId: nodeId,
                    mode: isBoss ? 'boss' : 'standard',
                    neededDifficulties: neededDifficulties,
                    userId: user.id
                });

                if (result.success && Array.isArray(result.data)) {
                    const newQuestions = result.data as Question[];
                    finalSessionQuestions.push(...newQuestions);
                    console.log(`✅ Maestro gerou ${newQuestions.length} novas questões.`);
                }

            } catch (generatedError) {
                console.error("Maestro Direct Call error:", generatedError);
            }
        }

        // 8. FINALIZAÇÃO
        if (finalSessionQuestions.length === 0) {
            return { success: false, error: "Não há questões disponíveis no momento." };
        }

        const shuffled = finalSessionQuestions.sort(() => Math.random() - 0.5);

        // --- SALVAR NOVA SESSÃO ---
        await supabase.from('study_sessions').insert({
            user_id: user.id,
            node_id: nodeId,
            questions: shuffled,
            status: 'active'
        });
        // --------------------------

        return {
            success: true,
            data: {
                questions: shuffled,
                currentLevel,
                isBoss,
                nodeTitle: node.title,
                parentThemeId
            }
        };

    } catch (err: any) {
        console.error("Critical Error in getStudentSession:", err);
        return { success: false, error: err.message || "Erro interno ao iniciar sessão." };
    }
}

/**
 * Server Action: Salva a resposta do aluno e revalida o cache
 */
export async function saveQuestionHistory(nodeId: string, questionId: string, isCorrect: boolean) {
    const supabase = await createClient();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { success: false, error: "Usuário não logado" };

        const { error } = await supabase.from('user_question_history').insert({
            user_id: user.id,
            question_id: questionId,
            is_correct: isCorrect,
            answered_at: new Date().toISOString()
        });

        if (error) throw error;

        // --- ATUALIZAÇÃO DA FILA DE ERROS (REVIEW QUEUE) ---
        if (isCorrect) {
            // Se acertou, remove da fila (consertou o erro)
            await supabase.from('user_mistakes')
                .delete()
                .eq('user_id', user.id)
                .eq('question_id', questionId);
        } else {
            // Se errou, adiciona/garante na fila
            await supabase.from('user_mistakes')
                .upsert({
                    user_id: user.id,
                    question_id: questionId
                }, { onConflict: 'user_id, question_id' });
        }
        // ---------------------------------------------------

        // --- INTEGRAÇÃO VECTOR BANK (STATS) ---
        // Fire-and-forget stats update
        (async () => {
            // 1. Descobrir se essa questão tem um Pai no Question Bank
            const { data: qData } = await supabase
                .from('track_questions')
                .select('original_question_id')
                .eq('id', questionId)
                .single();

            if (qData?.original_question_id) {
                // 2. Chama RPC para incrementar stats globais
                await supabase.rpc('increment_question_stats', {
                    question_id: qData.original_question_id,
                    is_correct: isCorrect
                });
            }
        })();

        revalidatePath(`/praticar/${nodeId}`);

        return { success: true };
    } catch (e: any) {
        console.error("Erro ao salvar histórico (Server Action):", e);
        return { success: false, error: e.message };
    }
}

/**
 * Busca o número de erros pendentes para uma aula (Lesson Accordion)
 */
export async function getLessonMistakeCount(lessonId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    // Precisamos fazer um JOIN para saber quais questões da fila pertencem a esta 'lessonId'.
    // Como a tabela user_mistakes só tem question_id, e track_questions tem metadata (topics ou lesson_id se houver).
    // Assumindo que track_questions tem ligação com o node (lesson) via tabela intermediária ou array.
    // O RPC 'get_adaptive_session' usava p_node_id. As questões tem 'topics'.
    // SOLUÇÃO: Vamos contar quantos 'user_mistakes' cujos question_id retornam na query de 'nodes' ou algo similar?
    // Mais simples: Buscar TODAS as questões dessa lesson (via RPC ou select) e ver quantas estão em 'user_mistakes'.

    // 1. Pega IDs de questões desta aula (Via helper existente ou query direta)
    // Assumindo que temos como filtrar questões por node_id.
    // 'track_questions' geralmente tem FK para lesson? Ou é many-to-many?
    // Se for complexo, vamos contar APENAS se tivermos um jeito fácil.
    // O jeito mais garantido hoje:
    // Buscar mistakes do user -> Buscar detalhes dessas questões -> Verificar se pertencem ao node.

    // Otimização: Vamos contar apenas na tabela user_mistakes se tivermos um 'context_node_id' lá? Não tem.

    // Vamos tentar via 'track_questions' se ele tiver 'lesson_id' ou 'node_id'.
    // Se não tiver, usaremos a lógica inversa:

    // Busca IDs dos mistakes
    const { data: mistakes } = await supabase.from('user_mistakes').select('question_id').eq('user_id', user.id);
    if (!mistakes || mistakes.length === 0) return 0;

    const mistakeIds = mistakes.map((m: any) => m.question_id);

    // Verifica quais destes IDs pertencem ao lessonId (nodes)
    // Se a questão foi gerada, ela deve ter vínculo.
    // Vamos usar a tabela study_sessions? Não.
    // Vamos usar 'track_questions' -> verificando se 'topics' contem o titulo da lesson? Ruim.

    // PENDÊNCIA: Precisamos garantir que track_questions tenha 'node_id'.
    // Se não tiver, a contagem fica difícil.

    // Assumindo 'track_questions' tem coluna 'node_id' ou similar.
    // Se não, só retorna 0 por enquanto até ajustarmos o banco.

    // WORKAROUND: Count total mistakes globally for now (PROVISÓRIO)
    // O ideal é filtrar. Vou tentar filtrar por 'node_id' se existir.

    const { count } = await supabase
        .from('track_questions')
        .select('*', { count: 'exact', head: true })
        .in('id', mistakeIds)
        .eq('node_id', lessonId); // Tentar esta coluna. Se falhar, é pq não existe.

    return count || 0;
}

/**
 * Gera sessão de REVISÃO (Só erros)
 */
export async function getReviewSession(lessonId: string): Promise<{ success: boolean; data?: SessionData; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Auth required" };

    // 1. Busca IDs de erros
    const { data: mistakes } = await supabase.from('user_mistakes').select('question_id').eq('user_id', user.id);
    if (!mistakes || mistakes.length === 0) return { success: false, error: "Nenhum erro pendente para revisão." };

    const mistakeIds = mistakes.map((m: any) => m.question_id);

    // 2. Busca os objetos completos das questões, FILTRANDO pela Lesson
    const { data: questions } = await supabase
        .from('track_questions')
        .select('*')
        .in('id', mistakeIds)
        .eq('node_id', lessonId); // Garante escopo da aula

    if (!questions || questions.length === 0) {
        return { success: false, error: "Nenhum erro encontrado para esta aula específica." };
    }

    // 3. Monta Sessão Falsa (Sem persistencia ou com persistencia 'review')
    // Para simplificar, retornamos no formato SessionData

    // Buscar info do node para titulo
    const { data: node } = await supabase.from('study_nodes').select('title').eq('id', lessonId).single();

    return {
        success: true,
        data: {
            questions: questions as Question[],
            currentLevel: 0,
            isBoss: false,
            nodeTitle: `Revisão de Erros: ${node?.title || 'Aula'}`,
            progress: {
                currentIndex: 0,
                correctCount: 0,
                currentScore: 0
            }
        }
    };
}
