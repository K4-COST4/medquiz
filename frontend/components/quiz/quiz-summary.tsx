'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  Zap, 
  RotateCcw, 
  ArrowRight, 
  XCircle, 
  CheckCircle2 
} from 'lucide-react';
import confetti from 'canvas-confetti'; // Remova se não instalou a lib

// --- Tipagem Estrita (Baseada no seu Contexto) ---
export interface SessionSummaryProps {
  score: number;          // Ex: 85 (%)
  xpEarned: number;       // Ex: 20
  correctCount: number;   // Ex: 17
  totalQuestions: number; // Ex: 20
  isBoss: boolean;        // Define se é Boss Challenge
  passed: boolean;        // Se o usuário "venceu" a sessão
  onContinue: () => void; // Função para salvar e voltar ao mapa
  onRetry: () => void;    // Função para reiniciar a sessão
  isSaving?: boolean;     // Estado de loading do botão continuar
}

export function QuizSummary({
  score,
  xpEarned,
  correctCount,
  totalQuestions,
  isBoss,
  passed,
  onContinue,
  onRetry,
  isSaving = false
}: SessionSummaryProps) {

  // Efeito de Confete ao montar, se passou
  useEffect(() => {
    if (passed) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // Confetti vindo de posições aleatórias
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    }
  }, [passed]);

  // Configurações visuais baseadas no estado
  const feedback = passed
    ? {
        title: isBoss ? 'Chefão Derrotado!' : 'Sessão Concluída!',
        subtitle: isBoss ? 'Você provou sua maestria.' : 'Ótimo progresso na trilha.',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: isBoss ? Trophy : CheckCircle2,
      }
    : {
        title: 'Não foi dessa vez...',
        subtitle: 'Revise o conteúdo e tente novamente.',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: XCircle,
      };

  const IconComponent = feedback.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Container Principal com Animação de Entrada */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl border border-zinc-200 dark:border-zinc-800"
      >
        
        {/* Header Colorido */}
        <div className={`flex flex-col items-center justify-center py-8 ${feedback.bgColor} border-b ${feedback.borderColor}`}>
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
            className={`rounded-full p-4 bg-white dark:bg-zinc-800 shadow-lg mb-4`}
          >
            <IconComponent className={`w-12 h-12 ${feedback.color}`} strokeWidth={2.5} />
          </motion.div>
          
          <h2 className={`text-2xl font-bold ${feedback.color} mb-1`}>
            {feedback.title}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">
            {feedback.subtitle}
          </p>
        </div>

        {/* Corpo com Estatísticas */}
        <div className="p-6 space-y-6">
          
          {/* Grid de Stats */}
          <div className="grid grid-cols-2 gap-4">
            {/* Card de XP */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50"
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">XP Ganho</span>
              </div>
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                +{passed ? xpEarned : 0}
              </span>
            </motion.div>

            {/* Card de Precisão */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col items-center p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700"
            >
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Precisão</span>
              </div>
              <span className={`text-3xl font-black ${score >= 70 ? 'text-green-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {score}%
              </span>
            </motion.div>
          </div>

          {/* Resumo de Questões */}
          <div className="flex justify-between items-center px-2 text-sm text-zinc-500 dark:text-zinc-400">
            <span>Total de Questões</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {correctCount} <span className="text-zinc-400 font-normal">/ {totalQuestions}</span>
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-3 pt-2">
            <button
              onClick={onContinue}
              disabled={isSaving}
              className={`
                group relative w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-lg transition-all shadow-lg active:scale-[0.98]
                ${passed 
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-500/20' 
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white shadow-zinc-500/20'}
                disabled:opacity-70 disabled:cursor-not-allowed
              `}
            >
               {isSaving ? (
                <span className="animate-pulse">Salvando progresso...</span>
              ) : (
                <>
                  {passed ? 'Continuar' : 'Voltar ao Mapa'}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            {!passed && (
              <button
                onClick={onRetry}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Tentar Novamente
              </button>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}