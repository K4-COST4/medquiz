import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { deductHeart, updateUserStreak } from "../../../user/actions";
import { getStudentSession, saveQuestionHistory } from "../../actions";
import { generateQuestionsService } from "@/app/actions/generate-questions-service";

// Tipos locais ou importados
type Question = any; // Idealmente importar de types/medai.ts se disponível, mas seguiremos o page.tsx original por enquanto

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useQuizLogic(node_id: string) {
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

                const response = await getStudentSession(node_id);

                if (!response.success || !response.data) {
                    throw new Error(response.error || "Erro desconhecido ao iniciar sessão.");
                }

                const { data } = response;

                // --- CORREÇÃO DE LOOP INFINITO (EMPTY STATE TRIGGER) ---
                if (data.questions.length === 0) {
                    console.warn("⚠️ Banco vazio detectado. Detectando falha de geração automática.");

                    if (retryCount < 2) { // Tenta gerar ativamente 2 vezes
                        console.log("⚡ INICIANDO GERAÇÃO FORÇADA...");
                        setLoadingMessage(`Maestro: Criando novas questões... (Tentativa ${retryCount + 1})`);
                        setStatus('generating');

                        try {
                            // CHAMADA EXPLÍCITA AO GERADOR
                            await generateQuestionsService({
                                nodeId: node_id,
                                topic: data.nodeTitle, // Pegamos do retorno parcial
                                aiContext: "Geração de emergência (Retry Trigger)", // Contexto simplificado ou nulo
                                mode: data.isBoss ? 'boss' : 'standard',
                                neededDifficulties: ['easy', 'medium', 'medium', 'hard', 'hard'] // Receita Padrão Hardcoded para emergência
                            });
                            console.log("✅ Geração forçada concluída via Hook.");
                        } catch (genErr) {
                            console.error("❌ Falha na geração forçada:", genErr);
                        }

                        retryCount++;
                        setTimeout(initializeSession, 1000); // Retry imediato após gerar
                        return; // Sai desta execução
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

                    // Busca o Avô (Tópico)
                    const { data: parentNode } = await supabase
                        .from('study_nodes')
                        .select('parent_id')
                        .eq('id', parentId)
                        .single();

                    const grandParentId = parentNode?.parent_id;

                    if (grandParentId) { // T e m a  >  M o d u l o  >  A u l a (Nó atual)
                        const themeId = await findThemeAncestor(grandParentId);
                        // Se o avô existe, o themeId dele deve ser o próprio theme raiz se a estrutura for T > M > A
                        // Mas na estrutura padrão: Trilha > Tema > Tópico > Aula (Nó)
                        // Ajuste para estrutura padrão do MedQuiz
                        setRedirectPath(themeId ? `/trilha/${themeId}/${grandParentId}` : '/trilha');
                    } else {
                        // Fallback: Se não tiver avô, talvez seja um nó de nível superior
                        const themeId = await findThemeAncestor(parentId);
                        setRedirectPath(themeId ? `/trilha/${themeId}/${parentId}` : '/trilha');
                    }
                } else {
                    setRedirectPath('/trilha');
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
            const answer = currentQ.content.correct_answer.toLowerCase().trim();
            if (currentQ.content.options && currentQ.content.options.length > 0) {
                correct = selectedOption === currentQ.content.correct_answer;
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
            setLives(newLives);
            await deductHeart();
            if (newLives <= 0) {
                setTimeout(() => setShowSummary(true), 1500);
            }
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
            if (lives <= 0) return;
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
