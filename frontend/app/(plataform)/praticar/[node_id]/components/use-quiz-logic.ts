import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { deductHeart, updateUserStreak } from "../../../user/actions";
import { getStudentSession, saveQuestionHistory, getReviewSession } from "../../actions";
import { getOrGenerateQuestions } from "@/app/actions/generate-questions-service";

// Tipos locais ou importados
type Question = any; // Idealmente importar de types/medai.ts se disponível, mas seguiremos o page.tsx original por enquanto

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useQuizLogic(node_id: string, mode: 'standard' | 'review' = 'standard') {
    const router = useRouter();

    // Estados
    const [status, setStatus] = useState<'checking' | 'generating' | 'ready' | 'error'>('checking');
    const [loadingMessage, setLoadingMessage] = useState("Consultando histórico...");
    const [errorDetails, setErrorDetails] = useState<string>("");

    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [lives, setLives] = useState(5);
    const [score, setScore] = useState(0);

    // Estados de Interação
    const [selectedOption, setSelectedOption] = useState<any>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

    // Estados de Resultado/Progresso
    const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
    const [isBoss, setIsBoss] = useState(false);
    const [redirectPath, setRedirectPath] = useState<string>('/trilhas');
    const [showSummary, setShowSummary] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Função auxiliar (mantida do original, mas agora interna ao hook)
    const findThemeAncestor = async (startNodeId: string): Promise<string | null> => {
        let currentId = startNodeId;
        let depth = 0;
        while (depth < 5) {
            const { data, error } = await supabase.from('study_nodes').select('id, parent_id, node_type').eq('id', currentId).maybeSingle();
            if (error || !data) return null;
            if (data.node_type === 'theme') return data.id;
            if (!data.parent_id) return null;
            currentId = data.parent_id;
            depth++;
        }
        return null;
    };

    // 1. Inicialização
    useEffect(() => {
        let isMounted = true;
        let retryCount = 0;

        async function initializeSession() {
            try {
                if (!isMounted) return;
                console.log(`useQuizLogic: INICIANDO SESSÃO (Tentativa ${retryCount + 1}) - Node ID:`, node_id);

                let response;
                if (mode === 'review') {
                    console.log("useQuizLogic: MODO REVISÃO ATIVADO");
                    response = await getReviewSession(node_id);
                } else {
                    response = await getStudentSession(node_id);
                }

                if (!response.success || !response.data) {
                    throw new Error(response.error || "Erro desconhecido ao iniciar sessão.");
                }

                const { data } = response;

                // --- CORREÇÃO DE LOOP INFINITO (EMPTY STATE TRIGGER) ---
                if (data.questions.length === 0) {
                    console.warn("⚠️ Banco vazio detectado. Detectando falha de geração automática.");

                    // Em modo review, se não tem questões é porque não tem erros, não geramos novas.
                    if (mode === 'review') {
                        throw new Error("Não há erros pendentes para revisão nesta aula.");
                    }

                    if (retryCount < 2) { // Tenta gerar ativamente 2 vezes
                        console.log("⚡ INICIANDO GERAÇÃO FORÇADA...");
                        setLoadingMessage(`Maestro: Criando novas questões... (Tentativa ${retryCount + 1})`);
                        setStatus('generating');

                        try {
                            // CHAMADA EXPLÍCITA AO GERADOR
                            const result = await getOrGenerateQuestions({
                                nodeId: node_id,
                                mode: data.isBoss ? 'boss' : 'standard',
                                neededDifficulties: ['easy', 'medium', 'medium', 'hard', 'hard'] // Receita Padrão
                            });

                            if (!result.success || !result.data || result.data.length === 0) {
                                throw new Error("Não há questões disponíveis no momento.");
                            }

                            console.log("✅ Geração forçada concluída via Hook. Usando dados retornados.");

                            // 🚀 CORREÇÃO PRINCIPAL: Usar os dados retornados DIRETAMENTE
                            data.questions = result.data;

                            // Não precisamos mais do retry loop, pois já temos as questões!
                            // O fluxo segue abaixo para setQuestions(data.questions)

                        } catch (genErr: any) {
                            console.error("❌ Falha na geração forçada:", genErr);
                            throw new Error(genErr.message || "Erro ao tentar gerar questões.");
                        }
                    } else {
                        throw new Error("Não foi possível gerar questões. O sistema parece sobrecarregado ou sem contexto.");
                    }
                }

                setIsBoss(data.isBoss);
                setQuestions(data.questions);

                if (data.progress) {
                    console.log("Restaurando progresso:", data.progress);
                    setCurrentQIndex(data.progress.currentIndex);
                    setCorrectAnswersCount(data.progress.correctCount);
                    setScore(data.progress.currentScore);

                    if (data.progress.currentIndex >= data.questions.length && data.questions.length > 0) {
                        setShowSummary(true);
                    }
                }

                // Lógica de Redirecionamento (Cálculo do "Theme" e "Tópico Avô")
                const { data: currentNode } = await supabase
                    .from('study_nodes')
                    .select('parent_id')
                    .eq('id', node_id)
                    .single();

                if (currentNode?.parent_id) {
                    const parentId = currentNode.parent_id;

                    // Busca o Avô (Tópico ou Trilha Customizada)
                    const { data: parentNode } = await supabase
                        .from('study_nodes')
                        .select('parent_id, node_type')
                        .eq('id', parentId)
                        .single();

                    const grandParentId = parentNode?.parent_id;

                    // --- NOVA LÓGICA DE REDIRECT ---
                    let path = '/trilhas'; // Default fallback seguro (Lista de trilhas)

                    // 1. Verificar se é Trilha Customizada (O pai do módulo é a Trilha)
                    if (parentNode?.node_type === 'custom_track') {
                        // Se a hierarquia for Trilha > Aula direto (menos comum, mas possível)
                        path = `/trilhas/${parentId}`;
                    }
                    else if (grandParentId) {
                        // Verificar se o Avô é Custom Track (Trilha > Módulo > Aula)
                        const { data: grandParentNode } = await supabase
                            .from('study_nodes')
                            .select('node_type')
                            .eq('id', grandParentId)
                            .single();

                        if (grandParentNode?.node_type === 'custom_track') {
                            path = `/trilhas/${grandParentId}`;
                        } else {
                            // Lógica legado para Trilhas Oficiais (T > M > A)
                            const themeId = await findThemeAncestor(grandParentId);
                            path = themeId ? `/trilha/${themeId}/${grandParentId}` : '/trilhas';
                        }
                    } else {
                        // Se só tem pai (sem avô), pode ser um nó filho direto de tema ou algo assim
                        const themeId = await findThemeAncestor(parentId);
                        path = themeId ? `/trilha/${themeId}/${parentId}` : '/trilhas';
                    }

                    setRedirectPath(path);
                } else {
                    setRedirectPath('/trilhas');
                }

                if (isMounted) setStatus('ready');
            } catch (error: any) {
                if (!isMounted) return;
                console.error('useQuizLogic: ERRO FATAL:', error);
                setErrorDetails(error.message || "Falha ao carregar sessão.");
                setStatus('error');
            }
        }

        initializeSession();

        return () => { isMounted = false; };
    }, [node_id]);

    // 2. Salvar Histórico (Server Action com revalidatePath)
    const saveUserHistory = async (questionId: string, isCorrect: boolean) => {
        try {
            // Nota: O node_id vem do hook, garantindo que o revalidatePath limpe o cache correto
            const result = await saveQuestionHistory(node_id, questionId, isCorrect);
            if (!result.success) {
                console.error('Erro ao salvar histórico:', result.error);
            }
        } catch (error) {
            console.error('Erro ao chamar server action:', error);
        }
    };

    // 3. Verificar Resposta
    const handleCheckAnswer = async () => {
        const currentQ = questions[currentQIndex];
        let correct = false;

        if (currentQ.q_type === 'multiple_choice') {
            const option = currentQ.content.options.find((o: any) => o.id === selectedOption);
            correct = option?.isCorrect || false;
        } else if (currentQ.q_type === 'true_false') {
            // DB Schema uses 'options' array for T/F just like Multiple Choice
            // options: [{id: 'true', isCorrect: true}, {id: 'false', ...}]
            const correctOption = currentQ.content.options?.find((o: any) => o.isCorrect);
            const userAns = String(selectedOption).toLowerCase(); // 'true' or 'false'
            const dbAns = String(correctOption?.id || "").toLowerCase();
            correct = userAns === dbAns;
        } else if (currentQ.q_type === 'fill_gap') {
            // Defensive Check: Ensure correct_answer exists
            const rawAnswer = currentQ.content.correct_answer || "";
            const answer = String(rawAnswer).toLowerCase().trim();

            if (currentQ.content.options && currentQ.content.options.length > 0) {
                correct = selectedOption === rawAnswer; // Compare exact value (or normalized if needed)
            } else {
                correct = inputValue.toLowerCase().trim() === answer;
            }
        }

        saveUserHistory(currentQ.id, correct);
        setIsCorrect(correct);
        setIsAnswered(true);

        if (correct) {
            setScore(s => s + currentQ.xp_reward);
            setCorrectAnswersCount(prev => prev + 1);
        } else {
            const newLives = lives - 1;
            // COMMENTED OUT FOR INFINITE LIVES MODE
            // setLives(newLives); 
            // await deductHeart();
            // if (newLives <= 0) {
            //     setTimeout(() => setShowSummary(true), 1500);
            // }
        }
    };

    // 4. Flashcard: Revelar
    const handleRevealAnswer = () => {
        setShowFlashcardAnswer(true);
        setIsAnswered(true);
        const currentQ = questions[currentQIndex];
        saveUserHistory(currentQ.id, true); // Flashcard conta como "visto/acerto" ao revelar
        setCorrectAnswersCount(prev => prev + 1);
    };

    // 5. Flashcard: Auto-avaliação (Próxima)
    // No código original, flashcard botões chamavam handleNext.
    // Vamos manter simples: qualquer botão avança.
    const handleSelfEvaluate = (difficulty: string) => {
        // Futuramente pode salvar a dificuldade escolhida
        handleNext();
    };

    // 6. Próxima Questão
    const handleNext = () => {
        if (currentQIndex < questions.length - 1) {
            // COMMENTED OUT: Infinite Lives Mode
            // if (lives <= 0) return;
            setCurrentQIndex(prev => prev + 1);
            setIsAnswered(false);
            setIsCorrect(false);
            setSelectedOption(null);
            setInputValue("");
            setShowFlashcardAnswer(false);
        } else {
            setShowSummary(true);
        }
    };

    // 7. Finalizar Sessão
    const handleFinishSession = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const totalQuestions = questions.length;
            const finalScorePct = totalQuestions > 0 ? Math.round((correctAnswersCount / totalQuestions) * 100) : 0;
            const passed = lives > 0 ? (isBoss ? finalScorePct >= 70 : true) : false;

            // ... (Lógica de Banco de Dados Igual ao Original) ...
            const promises = [];
            if (score > 0) {
                const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).single();
                if (profile) promises.push(supabase.from('profiles').update({ xp: profile.xp + score }).eq('id', user.id));
            }

            if (passed) {
                if (isBoss) {
                    promises.push(supabase.rpc('complete_until_checkpoint', { p_boss_node_id: node_id }));
                } else {
                    const { data: curr } = await supabase.from('user_node_progress').select('current_level').eq('user_id', user.id).eq('node_id', node_id).maybeSingle();
                    const newLevel = Math.min((curr?.current_level || 0) + 1, 3);
                    promises.push(supabase.from('user_node_progress').upsert({ user_id: user.id, node_id, current_level: newLevel, last_practiced_at: new Date().toISOString() }, { onConflict: 'user_id, node_id' }));
                }
                promises.push(updateUserStreak());
            }

            await Promise.all(promises);

            // Redireciona
            router.push(redirectPath);
            router.refresh();

        } catch (error) {
            console.error("Erro ao finalizar:", error);
            window.location.href = redirectPath;
        }
    };

    const isButtonDisabled = questions[currentQIndex]?.q_type === 'fill_gap'
        ? (questions[currentQIndex]?.content.options && questions[currentQIndex]?.content.options.length > 0 ? selectedOption === null : inputValue.trim() === "")
        : selectedOption === null;


    return {
        // State
        status,
        loadingMessage,
        errorDetails,
        questions,
        currentQIndex,
        lives,
        score,
        selectedOption,
        inputValue,
        isAnswered,
        isCorrect,
        showFlashcardAnswer,
        correctAnswersCount,
        isBoss,
        showSummary,
        isSaving,
        isButtonDisabled,

        // Actions
        setSelectedOption,
        setInputValue,
        handleCheckAnswer,
        handleRevealAnswer,
        handleSelfEvaluate,
        handleNext,
        handleFinishSession
    };
}
