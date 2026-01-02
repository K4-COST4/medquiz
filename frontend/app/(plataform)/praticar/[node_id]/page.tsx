"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, AlertCircle, Heart, X, CheckCircle2, 
  Brain, ArrowRight, BookOpen, Stethoscope 
} from "lucide-react";
import { QuizSummary, SessionSummaryProps } from "@/components/quiz/quiz-summary"; // <--- ADICIONE ISSO

// --- CONFIGURAÇÃO SUPABASE ---
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- TIPAGEM ---
type Difficulty = 'easy' | 'medium' | 'hard';
type QuestionType = 'multiple_choice' | 'true_false' | 'fill_gap' | 'open_ended';

interface Question {
  id: string;
  statement: string;
  q_type: QuestionType;
  content: any;
  commentary: string;
  difficulty: Difficulty;
  xp_reward: number;
}

// --- COMPONENTE DE FORMATAÇÃO DE TEXTO ---
function FormattedText({ text, className = "" }: { text: string, className?: string }) {
  if (!text) return null;

  let processed = text.replace(/\$([^\$]+)\$/g, (match, content) => {
    content = content.replace(/\^\{([^\}]+)\}/g, "<sup>$1</sup>");
    content = content.replace(/_\{([^\}]+)\}/g, "<sub>$1</sub>");
    content = content.replace(/\^([0-9\+\-]+)/g, "<sup>$1</sup>");
    return `<span class="font-serif italic">${content}</span>`;
  });

  processed = processed
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");

  return (
    <span 
      className={className}
      dangerouslySetInnerHTML={{ __html: processed }} 
    />
  );
}

// --- LÓGICA DE MAESTRIA ---
const MASTERY_RULES = {
  0: { easy: 5, medium: 0, hard: 0 },
  1: { easy: 0, medium: 5, hard: 0 },
  2: { easy: 0, medium: 3, hard: 2 },
  3: { easy: 0, medium: 2, hard: 3 }, // Revisão Dourada
};

function getIdealSessionStructure(level: 0 | 1 | 2 | 3): Difficulty[] {
  const rule = MASTERY_RULES[level] || MASTERY_RULES[0];
  const structure: Difficulty[] = [];
  for (let i = 0; i < rule.easy; i++) structure.push('easy');
  for (let i = 0; i < rule.medium; i++) structure.push('medium');
  for (let i = 0; i < rule.hard; i++) structure.push('hard');
  return structure.sort(() => Math.random() - 0.5);
}

// --- WIDGET FILL GAP (Coloque ACIMA do "export default function QuizPage") ---
import React, { useMemo } from 'react'; // Certifique-se de importar useMemo lá em cima

const FillGapWidget = ({ question, isAnswered, selectedOption, setSelectedOption, inputValue, setInputValue, isCorrect }: any) => {
  const content = question.content;
  const hasOptions = content.options && content.options.length > 0;

  // Memoriza a ordem embaralhada para não pular quando clicar
  const shuffledOptions = useMemo(() => {
    if (hasOptions) return shuffleArray(content.options);
    return [];
  }, [question.id]); // Só reembaralha se mudar de questão

  // CASO 1: Questão Antiga (Input de Texto)
  if (!hasOptions) {
    return (
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 text-lg font-medium leading-relaxed">
        <FormattedText text={content.text_start} />
        <input 
          type="text" 
          disabled={isAnswered} 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          placeholder="..."
          className={`mx-2 border-b-2 outline-none px-1 text-center font-bold min-w-[100px] w-auto inline-block ${
             isAnswered ? (isCorrect ? "border-emerald-500 text-emerald-600" : "border-rose-500 text-rose-600") : "border-slate-300 focus:border-violet-500 focus:bg-violet-50"
          }`}
        />
        <FormattedText text={content.text_end} />
        {isAnswered && !isCorrect && <div className="mt-4 text-sm font-bold text-emerald-600">Resposta: {content.correct_answer}</div>}
      </div>
    );
  }

  // CASO 2: Questão Nova (Botões estilo Duolingo)
  return (
    <div className="flex flex-col gap-6">
      {/* Frase com destaque visual no buraco */}
      <div className="bg-white p-6 rounded-2xl border-2 border-slate-200 text-lg md:text-xl font-medium leading-relaxed text-center shadow-sm">
        <FormattedText text={content.text_start} />
        <span className={`inline-block mx-2 px-3 py-1 border-b-4 rounded-t min-w-[100px] font-bold transition-colors ${
           isAnswered 
             ? (isCorrect ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "border-rose-500 text-rose-700 bg-rose-50")
             : (selectedOption ? "border-violet-500 text-violet-700 bg-violet-50" : "border-slate-300 bg-slate-50 text-slate-400")
        }`}>
           {/* Mostra o que o usuário clicou, ou a resposta certa se já acabou, ou sublinhado vazio */}
           {isAnswered ? (selectedOption || content.correct_answer) : (selectedOption || "_____")}
        </span>
        <FormattedText text={content.text_end} />
      </div>

      {/* Grid de Opções */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shuffledOptions.map((opt: string, idx: number) => {
           const isSelected = selectedOption === opt;
           const isTheCorrectOne = opt === content.correct_answer;
           
           let btnStyle = "bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-slate-50"; // Padrão
           
           if (isAnswered) {
             if (isTheCorrectOne) btnStyle = "bg-emerald-100 border-emerald-500 text-emerald-800"; // Gabarito
             else if (isSelected && !isTheCorrectOne) btnStyle = "bg-rose-100 border-rose-500 text-rose-800 opacity-60"; // Erro
             else btnStyle = "opacity-40 border-slate-100"; // Resto
           } else if (isSelected) {
             btnStyle = "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200 scale-[1.02]"; // Selecionado
           }

           return (
             <button
               key={idx}
               disabled={isAnswered}
               onClick={() => setSelectedOption(opt)}
               className={`p-4 rounded-xl border-2 font-bold text-lg transition-all active:scale-95 ${btnStyle}`}
             >
               {opt}
             </button>
           );
        })}
      </div>
    </div>
  );
};
export default function QuizPage({ params }: { params: Promise<{ node_id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  
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

  // NOVOS ESTADOS PARA O RESUMO E LÓGICA
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0); // Para contar acertos puros
  const [isBoss, setIsBoss] = useState(false); // Para saber se é fase de chefe
  const [redirectPath, setRedirectPath] = useState<string>('/trilhas'); // <--- MUDOU (Padrão: Raiz))
  const [showSummary, setShowSummary] = useState(false); // Controla visibilidade do Modal
  const [isSaving, setIsSaving] = useState(false); // Loading do botão continuar

  // Função auxiliar para achar o "Bisavô" (Theme)
  const findThemeAncestor = async (startNodeId: string): Promise<string | null> => {
    let currentId = startNodeId;
    let depth = 0;
    
    // Limite de segurança para não rodar infinito (5 níveis)
    while (depth < 5) {
      const { data, error } = await supabase
        .from('study_nodes')
        .select('id, parent_id, node_type')
        .eq('id', currentId)
        .maybeSingle();

      if (error || !data) return null;

      // SE ACHOU O TEMA, RETORNA O ID DELE
      if (data.node_type === 'theme') {
        return data.id;
      }

      // Se chegou no topo (sem pai) e não é theme, para.
      if (!data.parent_id) return null;

      // Sobe mais um nível
      currentId = data.parent_id;
      depth++;
    }
    return null;
  };
  // 1. CARREGAMENTO INTELIGENTE (COM RPC)
  useEffect(() => {
    async function initializeSession() {
      try {
        console.log('🎯 INICIANDO SESSÃO - Node ID:', resolvedParams.node_id);
        
        // A. Verificar Autenticação
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('❌ Erro de autenticação:', authError);
          throw new Error(`Erro de autenticação: ${authError.message}`);
        }
        
        if (!session) {
          console.warn('⚠️ Usuário não logado. Redirecionando...');
          router.push('/login');
          return;
        }
        
        console.log('✅ Usuário autenticado:', session.user.id);

        // B. Buscar Dados do Nó
        setLoadingMessage("Carregando informações do módulo...");
        const { data: nodeData, error: nodeError } = await supabase
          .from('study_nodes')
          .select('title, ai_context, is_boss, parent_id') // parent_id ainda é útil para referência
          .eq('id', resolvedParams.node_id)
          .single();

        if (nodeError) throw new Error(`Erro ao buscar nó: ${nodeError.message}`);
        
        setIsBoss(nodeData?.is_boss || false);
        console.log('📚 Nó:', nodeData?.title);

        // --- LÓGICA DE REDIRECIONAMENTO (BUSCAR O BISAVÔ/THEME) ---
        // Não bloqueia o carregamento das questões (faz em paralelo/background)
        findThemeAncestor(resolvedParams.node_id).then((themeId) => {
          if (themeId) {
            console.log('📍 Redirecionamento definido para o Tema (Bisavô):', themeId);
            setRedirectPath(`/trilha/${themeId}`);
          } else {
            console.warn('⚠️ Tema pai não encontrado, definindo rota para raiz.');
            setRedirectPath('/trilha');
          }
        });

        // C. Buscar Progresso do Usuário
        setLoadingMessage("Verificando seu progresso...");
        const { data: progressData, error: progressError } = await supabase
          .from('user_node_progress')
          .select('current_level')
          .eq('user_id', session.user.id)
          .eq('node_id', resolvedParams.node_id)
          .maybeSingle(); // maybeSingle permite null sem erro

        if (progressError) {
          console.error('❌ Erro ao buscar progresso:', progressError);
          // Não é crítico, podemos continuar
        }

        const currentLevel = (progressData?.current_level || 0) as 0 | 1 | 2 | 3;
        console.log('📊 Nível atual do usuário:', currentLevel);
        
        // D. BUSCAR QUESTÕES VIA RPC
        setLoadingMessage("Buscando questões personalizadas...");
        console.log('🔄 Chamando RPC get_adaptive_session...');
        
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_adaptive_session', { 
            p_node_id: resolvedParams.node_id 
          });

        if (rpcError) {
          console.error('❌ Erro no RPC:', rpcError);
          throw new Error(`Erro ao buscar questões: ${rpcError.message}`);
        }

        console.log('📦 RPC retornou:', rpcData);
        console.log('📊 Quantidade de questões:', rpcData?.length || 0);

        // E. VALIDAR RETORNO DO RPC
        if (!rpcData) {
          console.error('❌ RPC retornou null');
          throw new Error('RPC retornou null. Verifique se a função existe no Supabase.');
        }

        if (!Array.isArray(rpcData)) {
          console.error('❌ RPC não retornou array:', typeof rpcData);
          throw new Error('RPC retornou formato inválido (esperado: array)');
        }

        // F. PROCESSAR QUESTÕES
        let dbPool = [...rpcData] as Question[];
        let sessionQuestions: Question[] = [];

        const idealStructure = getIdealSessionStructure(currentLevel);
        console.log('🎯 Estrutura ideal para nível', currentLevel, ':', idealStructure);
        
        const missingDifficulties: Difficulty[] = [];

        // Preenche a sessão com o que veio da RPC
        for (const neededDiff of idealStructure) {
          const foundIndex = dbPool.findIndex(q => q.difficulty === neededDiff);
          
          if (foundIndex !== -1) {
            sessionQuestions.push(dbPool[foundIndex]);
            dbPool.splice(foundIndex, 1); 
          } else {
            missingDifficulties.push(neededDiff);
          }
        }
        
        console.log('✅ Questões do banco:', sessionQuestions.length);
        console.log('⚠️ Questões faltando:', missingDifficulties.length);

        // G. GERAÇÃO JUST-IN-TIME (Se necessário)
        if (missingDifficulties.length > 0) {
          setStatus('generating');
          setLoadingMessage(`Criando ${missingDifficulties.length} questões inéditas...`);
          
          console.log('🤖 Gerando questões com IA...');

          const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nodeId: resolvedParams.node_id,
              topic: nodeData?.title,
              aiContext: nodeData?.ai_context,
              neededDifficulties: missingDifficulties
            })
          });

          if (!response.ok) {
            console.error('❌ API de geração falhou:', response.status);
            throw new Error(`API retornou status ${response.status}`);
          }

          const result = await response.json();
          console.log('🤖 Resultado da IA:', result);
          
          if (result.success && result.data) {
            sessionQuestions = [...sessionQuestions, ...result.data];
            console.log('✅ Questões geradas adicionadas:', result.data.length);
          } else {
            console.warn('⚠️ Geração falhou mas continuando com o que temos');
          }
        }

        // H. VALIDAÇÃO FINAL
        if (sessionQuestions.length === 0) {
          console.error('❌ Nenhuma questão disponível');
          throw new Error("Nenhuma questão disponível para este módulo. Entre em contato com o suporte.");
        }

        // Embaralhar
        sessionQuestions = sessionQuestions.sort(() => Math.random() - 0.5);
        console.log('🎲 Questões embaralhadas:', sessionQuestions.length);

        setQuestions(sessionQuestions);
        setStatus('ready');
        console.log('✅ Sessão pronta!');

      } catch (error) {
        console.error('💥 ERRO FATAL:', error);
        
        // Extrair mensagem do erro
        let errorMessage = "Erro desconhecido";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else {
          errorMessage = JSON.stringify(error);
        }
        
        setErrorDetails(errorMessage);
        setStatus('error');
      }
    }

    initializeSession();
  }, [resolvedParams.node_id, router]);


  // 2. SALVAR HISTÓRICO (Fire and Forget)
  const saveUserHistory = async (questionId: string, isCorrect: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ Usuário não encontrado ao salvar histórico');
        return;
      }

      console.log('💾 Salvando histórico:', { questionId, isCorrect });

      const { error } = await supabase
        .from('user_question_history')
        .insert({
          user_id: user.id,
          question_id: questionId,
          is_correct: isCorrect
        });

      if (error) {
        console.error("❌ Erro ao salvar histórico:", error);
      } else {
        console.log('✅ Histórico salvo com sucesso');
      }
    } catch (error) {
      console.error('💥 Exceção ao salvar histórico:', error);
    }
  };


  // 3. INTERAÇÃO E VALIDAÇÃO
  const handleCheckAnswer = () => {
    const currentQ = questions[currentQIndex];
    let correct = false;

    // ... (Mantenha a lógica de verificação existente para multiple_choice, true_false, fill_gap) ...
    if (currentQ.q_type === 'multiple_choice') {
      const option = currentQ.content.options.find((o: any) => o.id === selectedOption);
      correct = option?.isCorrect || false;
    } 
    else if (currentQ.q_type === 'true_false') {
      correct = selectedOption === currentQ.content.isTrue;
    }
    else if (currentQ.q_type === 'fill_gap') {
      const answer = currentQ.content.correct_answer.toLowerCase().trim();
      
      // Lógica Híbrida:
      // Se tiver opções (novo), valida pelo botão selecionado (selectedOption)
      // Se não tiver (velho), valida pelo input digitado (inputValue)
      if (currentQ.content.options && currentQ.content.options.length > 0) {
         correct = selectedOption === currentQ.content.correct_answer; // Comparação exata (Case sensitive da string do botão)
      } else {
         const input = inputValue.toLowerCase().trim();
         correct = input === answer;
      }
    }
    else if (currentQ.q_type === 'open_ended') {
      correct = true; 
      setShowFlashcardAnswer(true);
      setIsAnswered(true);
      setCorrectAnswersCount(prev => prev + 1); // Flashcard conta como acerto se revelou
      saveUserHistory(currentQ.id, true);
      return; 
    }

    // SALVA NO BANCO IMEDIATAMENTE
    saveUserHistory(currentQ.id, correct);

    setIsCorrect(correct);
    setIsAnswered(true);

    if (correct) {
      setScore(s => s + currentQ.xp_reward);
      setCorrectAnswersCount(prev => prev + 1); // <--- INCREMENTA ACERTOS
    } else {
      // LÓGICA DE VIDAS E GAME OVER
      const newLives = lives - 1;
      setLives(newLives);
      
      if (newLives <= 0) {
        // Game Over Imediato (espera um pouco para o usuário ver o erro)
        setTimeout(() => {
           setShowSummary(true);
        }, 1500); 
      }
    }
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      // Se vidas acabaram, não avança, o Game Over já foi acionado no checkAnswer
      if (lives <= 0) return; 

      setCurrentQIndex(prev => prev + 1);
      setIsAnswered(false);
      setIsCorrect(false);
      setSelectedOption(null);
      setInputValue("");
      setShowFlashcardAnswer(false);
    } else {
      // Fim das questões -> Mostra Resumo
      setShowSummary(true);
    }
  };

  // --- NOVA FUNÇÃO: PERSISTÊNCIA DE DADOS ---
  const handleFinishSession = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. Calcular Resultado
      const totalQuestions = questions.length;
      const finalScorePct = Math.round((correctAnswersCount / totalQuestions) * 100);
      
      // Regra de Aprovação:
      // Se NÃO é Boss: Passou se chegou ao fim (lives > 0)
      // Se É Boss: Passou se chegou ao fim E nota >= 70%
      let passed = false;
      if (lives > 0) {
         passed = isBoss ? finalScorePct >= 70 : true;
      }

      console.log('💾 Salvando Sessão. Passed:', passed, 'XP:', score);

      // 2. Atualizar XP do Usuário (Se ganhou algo)
      if (score > 0) {
         // FIX: Usar maybeSingle() para evitar erro 406 se o perfil ainda não existir
         const { data: profile } = await supabase
            .from('profiles')
            .select('xp')
            .eq('id', user.id)
            .maybeSingle(); 

         if (profile) {
            await supabase.from('profiles').update({ xp: profile.xp + score }).eq('id', user.id);
         } else {
            console.warn("⚠️ Perfil não encontrado. O XP não pôde ser salvo.");
            // Opcional: Aqui você poderia criar o perfil se ele não existir
         }
      }

      // 3. Atualizar Progresso do Nó
      if (passed) {
        if (isBoss) {
            // Se passou no Boss, chama a RPC de desbloqueio retroativo
            const { error: rpcError } = await supabase.rpc('complete_until_checkpoint', { 
                node_id: resolvedParams.node_id 
            });
            if (rpcError) console.error('Erro no complete_until_checkpoint:', rpcError);
        } else {
            // Se é ilha normal, incrementa nível (Max 3)
            const { data: currentProgress } = await supabase
                .from('user_node_progress')
                .select('current_level')
                .eq('user_id', user.id)
                .eq('node_id', resolvedParams.node_id)
                .maybeSingle();
            
            const currentLevel = currentProgress?.current_level || 0;
            const newLevel = Math.min(currentLevel + 1, 3);

            await supabase.from('user_node_progress').upsert({
                user_id: user.id,
                node_id: resolvedParams.node_id,
                current_level: newLevel,
                last_practiced_at: new Date().toISOString()
            }, { onConflict: 'user_id, node_id' });
        }
      }

      // 4. Redirecionar
      console.log('Navigating to:', redirectPath);
      router.push(redirectPath); 
      router.refresh();

    } catch (error) {
      console.error("Erro ao salvar progresso:", error);
      alert("Erro ao salvar progresso. Verifique sua conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- UI ---
  if (status === 'checking' || status === 'generating') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="mb-6">
          <Loader2 className="w-12 h-12 text-violet-600" />
        </motion.div>
        <h2 className="text-xl font-black text-slate-800 mb-2">Preparando Sessão</h2>
        <p className="text-slate-500 font-medium animate-pulse">{loadingMessage}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Erro ao Carregar</h2>
          <p className="text-slate-600 mb-6 text-sm leading-relaxed">{errorDetails}</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 transition-colors"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={() => router.push('/trilha')} // <--- MUDADO DE router.back() PARA router.push('/trilha')
              className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Voltar para Trilhas
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
      </div>
    );
  }

  const currentQ = questions[currentQIndex];
// Lógica atualizada: Se for Fill Gap com opções (botões), verifica selectedOption. Se for antigo (input), verifica inputValue.
  const isButtonDisabled = currentQ.q_type === 'fill_gap'
  ? (currentQ.content.options && currentQ.content.options.length > 0 ? selectedOption === null : inputValue.trim() === "")
  : selectedOption === null;
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 p-4 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <X className="text-slate-300 cursor-pointer hover:text-slate-500" onClick={() => router.back()} />
            
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                   className="h-full bg-violet-500 rounded-full"
                   initial={{ width: 0 }}
                   animate={{ width: `${((currentQIndex) / questions.length) * 100}%` }}
                />
            </div>

            <div className="flex items-center gap-2">
                <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase
                    ${currentQ.difficulty === 'easy' ? 'bg-emerald-100 text-emerald-600' : 
                      currentQ.difficulty === 'medium' ? 'bg-amber-100 text-amber-600' : 
                      'bg-rose-100 text-rose-600'}
                `}>
                    {currentQ.difficulty === 'easy' ? 'Fácil' : currentQ.difficulty === 'medium' ? 'Médio' : 'Difícil'}
                </div>
                <div className="flex items-center gap-1 text-rose-500 font-black ml-2">
                    <Heart fill="currentColor" size={20} />
                    <span>{lives}</span>
                </div>
            </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-2xl mx-auto p-6 pt-8">
        <div className="mb-8">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
                <FormattedText text={currentQ.statement} />
            </h1>
        </div>

        <div className="space-y-3">
            {/* MULTIPLE CHOICE */}
            {currentQ.q_type === 'multiple_choice' && (
                <div className="grid gap-3">
                    {currentQ.content.options.map((option: any) => {
                        let btnColor = "bg-white border-slate-200 hover:bg-slate-50";
                        if (isAnswered) {
                            if (option.isCorrect) btnColor = "bg-emerald-100 border-emerald-500 text-emerald-800";
                            else if (selectedOption === option.id && !option.isCorrect) btnColor = "bg-rose-100 border-rose-500 text-rose-800";
                            else btnColor = "opacity-50 border-slate-100";
                        } else if (selectedOption === option.id) {
                            btnColor = "bg-violet-50 border-violet-500 text-violet-700 ring-2 ring-violet-200";
                        }
                        return (
                            <button key={option.id} disabled={isAnswered} onClick={() => setSelectedOption(option.id)}
                                className={`w-full p-4 rounded-2xl border-2 font-bold text-left transition-all ${btnColor}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-black uppercase shrink-0">{option.id}</div>
                                    <FormattedText text={option.text} />
                                </div>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* TRUE FALSE */}
            {currentQ.q_type === 'true_false' && (
                <div className="grid grid-cols-2 gap-4 h-40">
                    <button disabled={isAnswered} onClick={() => setSelectedOption(true)}
                        className={`rounded-2xl border-2 font-black text-lg transition-all ${
                            isAnswered && currentQ.content.isTrue ? "bg-emerald-100 border-emerald-500 text-emerald-700" :
                            isAnswered && selectedOption === true && !currentQ.content.isTrue ? "bg-rose-100 border-rose-500 text-rose-700" :
                            selectedOption === true ? "bg-violet-50 border-violet-500 text-violet-700" : "bg-white border-slate-200 hover:border-violet-300"
                        }`}>VERDADEIRO</button>
                    <button disabled={isAnswered} onClick={() => setSelectedOption(false)}
                        className={`rounded-2xl border-2 font-black text-lg transition-all ${
                            isAnswered && !currentQ.content.isTrue ? "bg-emerald-100 border-emerald-500 text-emerald-700" :
                            isAnswered && selectedOption === false && currentQ.content.isTrue ? "bg-rose-100 border-rose-500 text-rose-700" :
                            selectedOption === false ? "bg-violet-50 border-violet-500 text-violet-700" : "bg-white border-slate-200 hover:border-violet-300"
                        }`}>FALSO</button>
                </div>
            )}

            {/* FILL GAP */}
            {/* FILL GAP (Versão Componentizada) */}
            {currentQ.q_type === 'fill_gap' && (
                <FillGapWidget 
                  question={currentQ}
                  isAnswered={isAnswered}
                  selectedOption={selectedOption}
                  setSelectedOption={setSelectedOption}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  isCorrect={isCorrect}
                />
            )}

            {/* FLASHCARD */}
            {currentQ.q_type === 'open_ended' && (
                <div className="space-y-6">
                    {!showFlashcardAnswer ? (
                        <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-slate-300 text-center py-20">
                            <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold mb-6">Pense na resposta e clique para revelar</p>
                            <button onClick={() => handleCheckAnswer()} className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-violet-200 hover:scale-105 transition-transform">Revelar Resposta</button>
                        </div>
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-3xl border-2 border-emerald-100 shadow-xl shadow-emerald-50">
                            <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Resposta Correta</h3>
                            <p className="text-lg font-medium text-slate-800 mb-6"><FormattedText text={currentQ.content.answer} /></p>
                            <div className="grid grid-cols-3 gap-3">
                                <button onClick={handleNext} className="p-3 bg-rose-100 text-rose-700 font-bold rounded-xl text-sm hover:bg-rose-200">Errei</button>
                                <button onClick={handleNext} className="p-3 bg-amber-100 text-amber-700 font-bold rounded-xl text-sm hover:bg-amber-200">Difícil</button>
                                <button onClick={handleNext} className="p-3 bg-emerald-100 text-emerald-700 font-bold rounded-xl text-sm hover:bg-emerald-200">Fácil</button>
                            </div>
                        </motion.div>
                    )}
                </div>
            )}
        </div>
      </main>

      {/* FOOTER */}
      <AnimatePresence>
        {isAnswered && !showFlashcardAnswer && (
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className={`fixed bottom-0 left-0 w-full p-4 md:p-6 pb-8 border-t-2 z-30 ${isCorrect ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                <div className="max-w-2xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-full ${isCorrect ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>{isCorrect ? <CheckCircle2 size={24} /> : <X size={24} />}</div>
                        <div>
                            <h3 className={`font-black text-lg ${isCorrect ? "text-emerald-800" : "text-rose-800"}`}>{isCorrect ? "Excelente!" : "Resposta Incorreta"}</h3>
                            {!isCorrect && currentQ.commentary && <div className="text-rose-600 text-sm font-medium mt-1 leading-relaxed max-w-lg"><FormattedText text={currentQ.commentary} /></div>}
                        </div>
                    </div>
                    <button onClick={handleNext} className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${isCorrect ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200" : "bg-rose-500 hover:bg-rose-600 shadow-rose-200"}`}>CONTINUAR</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {!isAnswered && !showFlashcardAnswer && (
          <div className="fixed bottom-0 left-0 w-full p-4 border-t border-slate-100 bg-white z-20">
              <div className="max-w-2xl mx-auto">
                  <button onClick={handleCheckAnswer} disabled={isButtonDisabled} className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-xl shadow-violet-200 transition-all active:scale-95">VERIFICAR</button>
              </div>
          </div>
      )}
      {/* --- MODAL DE RESUMO (OVERLAY) --- */}
      {showSummary && (
        <QuizSummary 
          score={Math.round((correctAnswersCount / questions.length) * 100)}
          xpEarned={score}
          correctCount={correctAnswersCount}
          totalQuestions={questions.length}
          isBoss={isBoss}
          passed={lives > 0 && (isBoss ? (correctAnswersCount / questions.length) >= 0.7 : true)}
          onContinue={handleFinishSession}
          onRetry={() => window.location.reload()}
          isSaving={isSaving}
        />
      )}
      
    </div> // Fim da div principal
  );
}
// --- FUNÇÃO AUXILIAR (Coloque no final do arquivo, fora do QuizPage) ---
function shuffleArray(array: any[]) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}