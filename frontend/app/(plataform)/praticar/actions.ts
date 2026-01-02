'use server';

import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

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

interface SessionData {
    questions: Question[];
    currentLevel: number;
    isBoss: boolean;
    nodeTitle: string;
    parentThemeId?: string | null;
}

// --- RECEITAS DE BOLO (MAESTRO) ---
const MASTERY_RULES = {
    0: { easy: 5, medium: 0, hard: 0 },
    1: { easy: 0, medium: 5, hard: 0 },
    2: { easy: 0, medium: 3, hard: 2 },
    3: { easy: 0, medium: 2, hard: 3 }, // Revisão Dourada
};

const BOSS_RECIPE = { easy: 0, medium: 5, hard: 5 };

/**
 * Função Principal: Prepara a sessão de estudo do aluno (Adaptive Learning)
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
        // Logica simples de subida na arvore (poderia ser uma RPC recursiva, mas aqui faremos simples)
        if (node.node_type === 'theme') parentThemeId = node.id;
        // (A busca profunda do tema ancestral idealmente fica no client para não bloquear, 
        // mas se quiséssemos retornar aqui, faríamos uma query recursiva. 
        // Por enquanto vamos retornar null e deixar o client lidar ou implementar aqui se for crítico).

        // 3. BUSCAR PROGRESSO DO ALUNO
        const { data: progress } = await supabase
            .from('user_node_progress')
            .select('current_level')
            .eq('user_id', user.id)
            .eq('node_id', nodeId)
            .maybeSingle();

        const currentLevel = (progress?.current_level || 0) as 0 | 1 | 2 | 3;

        // 4. DEFINIR A "RECEITA" (O que precisamos?)
        let recipe: { easy: number, medium: number, hard: number };

        if (isBoss) {
            recipe = BOSS_RECIPE;
        } else {
            recipe = MASTERY_RULES[currentLevel] || MASTERY_RULES[0];
        }

        // Transformar a receita em array lista de desejos
        // Ex: ['easy', 'easy', 'medium'...]
        const wishList: Difficulty[] = [];
        Object.entries(recipe).forEach(([diff, count]) => {
            for (let i = 0; i < count; i++) wishList.push(diff as Difficulty);
        });

        // 5. CONSULTAR ESTOQUE (RPC)
        // Busca questões que o aluno AINDA NÃO DOMINOU (ou aleatórias se já dominou tudo)
        const { data: dbQuestions, error: rpcError } = await supabase
            .rpc('get_adaptive_session', { p_node_id: nodeId });

        if (rpcError) throw new Error(`Erro RPC: ${rpcError.message}`);

        // Tipar o retorno do banco
        let availableQuestions = (dbQuestions || []) as Question[];

        // 6. CALCULAR O GAP (O que tem vs O que preciso)
        const finalSessionQuestions: Question[] = [];
        const neededDifficulties: Difficulty[] = [];

        // Algoritmo de Preenchimento:
        // Para cada item da WishList, tenta achar um correspondente no Estoque
        for (const diff of wishList) {
            const foundIndex = availableQuestions.findIndex(q => q.difficulty === diff);

            if (foundIndex !== -1) {
                // Tem no estoque!
                finalSessionQuestions.push(availableQuestions[foundIndex]);
                // Remove do estoque para não repetir
                availableQuestions.splice(foundIndex, 1);
            } else {
                // Não tem! Adiciona à lista de compras da IA
                neededDifficulties.push(diff);
            }
        }

        // 7. CHAMAR O MAESTRO (IA) SE HOUVER GAP
        if (neededDifficulties.length > 0) {
            console.log(`🤖 Maestro: Preciso gerar ${neededDifficulties.length} questões (${neededDifficulties.join(', ')})`);

            // Importante: Fetch para a rota de API local. 
            // Em Server Actions, precisamos da URL absoluta ou relativa se configurado corretamente.
            // Usar `process.env.NEXT_PUBLIC_APP_URL` ou assumir funcionamento local

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Fallback dev

            try {
                const response = await fetch(`${appUrl}/api/generate-questions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Repassar cookies de sessão se necessário? Geralmente a API Route usa Service Role se for interna, 
                        // mas nossa rota API checa sessão? Vamos checar.
                        // A rota api/generate-questions usa createClient service role internamente?
                        // Verifiquei o código anterior: usa process.env.SUPABASE_SERVICE_ROLE_KEY!
                        // Então não precisa de auth user context.
                    },
                    body: JSON.stringify({
                        nodeId: nodeId,
                        topic: node.title,
                        aiContext: node.ai_context,
                        mode: isBoss ? 'boss' : 'standard', // 'kahoot' não se aplica aqui por enquanto
                        neededDifficulties: neededDifficulties
                    }),
                    cache: 'no-store' // Jamais cachear isso
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success && Array.isArray(result.data)) {
                        // Adiciona as novas questões à sessão
                        const newQuestions = result.data as Question[];
                        finalSessionQuestions.push(...newQuestions);
                    }
                } else {
                    console.error("Maestro API error:", response.status);
                }
            } catch (generatedError) {
                console.error("Maestro fetch error:", generatedError);
                // Falha silenciosa: O aluno jogará com o que tem (melhor que travar)
            }
        }

        // 8. FINALIZAÇÃO
        // Se, mesmo após a IA, a lista estiver vazia (erro total), lançamos erro
        if (finalSessionQuestions.length === 0) {
            return { success: false, error: "Não há questões disponíveis no momento." };
        }

        // Embaralha para não ficar Ease, Easy, Medium... ordenado
        const shuffled = finalSessionQuestions.sort(() => Math.random() - 0.5);

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
