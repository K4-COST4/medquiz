"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";

// Components
import { QuizHeader } from "./components/quiz-header";
import { QuestionCard } from "./components/question-card";
import { QuizFeedback } from "./components/quiz-feedback";
import { QuizSummary } from "@/components/quiz/quiz-summary";
import { useQuizLogic } from "./components/use-quiz-logic";

export default function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ node_id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);

  // Use the Custom Hook
  const {
    status,
    loadingMessage,
    errorDetails,
    questions,
    currentQIndex,
    lives,
    selectedOption,
    inputValue,
    isAnswered,
    isCorrect,
    showFlashcardAnswer,
    correctAnswersCount,
    isBoss,
    showSummary,
    isSaving,
    score,
    isButtonDisabled,

    // Actions
    setSelectedOption,
    setInputValue,
    handleCheckAnswer,
    handleRevealAnswer,
    handleSelfEvaluate,
    handleNext,
    handleFinishSession
  } = useQuizLogic(resolvedParams.node_id, (resolvedSearchParams.mode as 'standard' | 'review') || 'standard');


  // --- RENDERING: LOADING STATE ---
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

  // --- RENDERING: ERROR STATE ---
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
              onClick={() => router.push('/trilha')}
              className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Voltar para Trilhas
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING: EMPTY STATE (Safety Check) ---
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  // --- CRITICAL GUARD: UNDEFINED QUESTION ---
  if (!currentQ) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-6">
          <Loader2 className="w-10 h-10 text-violet-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Sincronizando próxima questão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* 1. Header */}
      <QuizHeader
        currentQIndex={currentQIndex}
        totalQuestions={questions.length}
        difficulty={currentQ.difficulty}
        lives={lives}
        onExit={() => router.back()}
      />

      {/* 2. Main Card (Dispatcher) */}
      <QuestionCard
        question={currentQ}
        isAnswered={isAnswered}
        selectedOption={selectedOption}
        inputValue={inputValue}
        showFlashcardAnswer={showFlashcardAnswer}
        onSelectOption={setSelectedOption}
        onInputChange={setInputValue}
        onRevealAnswer={handleRevealAnswer}
        onSelfEvaluate={handleSelfEvaluate}
        isCorrect={isCorrect}
      />

      {/* 3. Feedback Sheet */}
      {isAnswered && !showFlashcardAnswer && (
        <QuizFeedback
          isCorrect={isCorrect}
          commentary={currentQ.commentary}
          onNext={handleNext}
        />
      )}

      {/* 4. Bottom Action Bar (Verify Button) */}
      {!isAnswered && !showFlashcardAnswer && (
        <div className="fixed bottom-16 md:bottom-0 left-0 w-full p-4 border-t border-slate-100 bg-white z-30">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleCheckAnswer}
              disabled={isButtonDisabled}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-xl shadow-violet-200 transition-all active:scale-95"
            >
              VERIFICAR
            </button>
          </div>
        </div>
      )}

      {/* 5. Summary Modal */}
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

    </div>
  );
}
