'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { Heart, Zap, Clock } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface HeartsWidgetProps {
    hearts: number
    maxHearts?: number
    triggerShake?: boolean
    onStartPractice: () => void
}

export default function HeartsWidget({
    hearts = 5,
    maxHearts = 5,
    triggerShake = false,
    onStartPractice
}: HeartsWidgetProps) {
    const pathname = usePathname()
    // A barra só deve aparecer se a rota começar com "/trilha" (cobre /trilhas e /trilha/id)
    const isTrilhaSection = pathname?.startsWith('/trilha')

    const controls = useAnimation()
    // Estado local para garantir feedback visual imediato se necessário, 
    // embora o ideal seja via props. O triggerShake ajuda a sincronizar.

    // Efeito de Shake quando o trigger é ativado
    useEffect(() => {
        if (triggerShake) {
            controls.start({
                x: [0, -10, 10, -10, 10, 0],
                color: ['#ef4444', '#ef4444', '#ef4444'], // Vermelho durante o shake
                transition: { duration: 0.4 }
            })
        }
    }, [triggerShake, controls])

    if (!isTrilhaSection) return null;

    return (
        <>
            {/* Widget de Vidas */}
            <motion.div
                animate={controls}
                className="flex items-center gap-1 bg-white dark:bg-slate-900 px-3 py-2 rounded-full shadow-sm border border-slate-200 dark:border-slate-800"
            >
                <div className="flex gap-1">
                    {Array.from({ length: maxHearts }).map((_, i) => {
                        const isFilled = i < hearts
                        return (
                            <motion.div
                                key={i}
                                initial={false}
                                animate={{
                                    scale: isFilled ? 1 : 0.9,
                                    opacity: isFilled ? 1 : 0.5
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                                <Heart
                                    size={20}
                                    // A propriedade 'weight' foi removida pois não existe no Lucide
                                    strokeWidth={2.5}
                                    className={`
                                            transition-colors duration-300
                                            ${isFilled
                                            ? "fill-red-500 text-red-500" // Preenche de vermelho e borda vermelha
                                            : "fill-slate-100 text-slate-300 dark:fill-slate-800 dark:text-slate-600" // Fundo cinza claro e borda cinza
                                        }
                                    `}
                                />
                            </motion.div>
                        )
                    })}
                </div>
                {/* Contador numérico opcional para Mobile */}
                <span className="ml-2 font-bold text-slate-700 dark:text-slate-200 text-sm hidden md:block">
                    {hearts}
                </span>
            </motion.div>

            {/* Modal de Game Over */}
            <AnimatePresence>
                {hearts === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border-4 border-slate-100 dark:border-slate-800 text-center"
                        >
                            {/* Ícone de Coração Quebrado */}
                            <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6 relative">
                                <Heart size={48} className="text-red-500 fill-red-500" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-1 bg-white dark:bg-slate-900 rotate-45 transform translate-y-1"></div>
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
                                Você está exausto!
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
                                Suas vidas acabaram. Descanse ou pratique para recuperar.
                            </p>

                            <div className="space-y-3">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onStartPractice}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 text-lg"
                                >
                                    <Zap size={20} className="fill-white" />
                                    Praticar Erros (+1 ❤️)
                                </motion.button>

                                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 font-medium py-2">
                                    <Clock size={16} />
                                    Ou espere recarregar (4h)
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
