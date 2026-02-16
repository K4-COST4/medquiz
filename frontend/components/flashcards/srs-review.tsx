'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { recordReview, type DueCard } from '@/app/actions/srs';
import { formatInterval } from '@/lib/srs-algorithm';
import Markdown from 'markdown-to-jsx';

interface SRSReviewProps {
    dueCards: DueCard[];
    onComplete: () => void;
    onBack: () => void;
}

export function SRSReview({ dueCards, onComplete, onBack }: SRSReviewProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [nextReviewInfo, setNextReviewInfo] = useState<string | null>(null);

    const currentCard = dueCards[currentIndex];
    const remaining = dueCards.length - currentIndex;

    const handleRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
        if (!currentCard || isReviewing) return;

        setIsReviewing(true);
        try {
            const result = await recordReview(
                currentCard.cardId,
                currentCard.deckId,
                rating
            );

            if (result.success && result.newInterval !== undefined) {
                // Mostrar feedback
                setNextReviewInfo(`Próxima revisão: ${formatInterval(result.newInterval)}`);

                // Aguardar um pouco para mostrar o feedback
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Avançar para próximo card
                if (currentIndex < dueCards.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                    setIsFlipped(false);
                    setNextReviewInfo(null);
                } else {
                    // Completou todas as revisões
                    onComplete();
                }
            }
        } catch (error) {
            console.error('Error recording review:', error);
            alert('Erro ao registrar revisão');
        } finally {
            setIsReviewing(false);
        }
    };

    const toggleFlip = () => {
        if (!isReviewing) {
            setIsFlipped(!isFlipped);
        }
    };

    if (!currentCard) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Nenhum card para revisar</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Você está em dia com suas revisões!
                    </p>
                </div>
                <Button onClick={onBack} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={onBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {remaining} {remaining === 1 ? 'card restante' : 'cards restantes'}
                </div>
            </div>

            {/* Deck indicator */}
            <div className="text-center">
                <p className="text-sm text-gray-500">Revisando: {currentCard.deckTitle}</p>
            </div>

            {/* Card */}
            <div
                className="relative w-full max-w-xl h-[400px] cursor-pointer mx-auto perspective-1000"
                onClick={toggleFlip}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full"
                    >
                        <motion.div
                            className="w-full h-full relative preserve-3d transition-all duration-500"
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.4, type: "spring", stiffness: 260, damping: 20 }}
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            {/* Front */}
                            <Card
                                className="absolute inset-0 w-full h-full border-2 border-indigo-200 dark:border-indigo-800"
                                style={{ backfaceVisibility: 'hidden' }}
                            >
                                <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                                    <span className="text-xs uppercase tracking-widest text-indigo-500 font-bold mb-4">
                                        Pergunta
                                    </span>
                                    <div className="text-lg md:text-xl text-slate-700 dark:text-slate-300 leading-relaxed">
                                        <Markdown>{currentCard.front}</Markdown>
                                    </div>
                                    <div className="mt-auto pt-4 text-xs text-gray-400">
                                        Clique para ver a resposta
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Back */}
                            <Card
                                className="absolute inset-0 w-full h-full border-2 border-emerald-200 dark:border-emerald-800"
                                style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                            >
                                <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                                    <span className="text-xs uppercase tracking-widest text-emerald-500 font-bold mb-4">
                                        Resposta
                                    </span>
                                    <div className="text-lg md:text-xl text-slate-700 dark:text-slate-300 leading-relaxed">
                                        <Markdown>{currentCard.back}</Markdown>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Next review info */}
            {nextReviewInfo && (
                <div className="text-center">
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        ✓ {nextReviewInfo}
                    </p>
                </div>
            )}

            {/* SRS Buttons */}
            {isFlipped && !nextReviewInfo && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                    <Button
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 h-20 flex flex-col"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRating('again');
                        }}
                        disabled={isReviewing}
                    >
                        <span className="font-bold text-lg">Again</span>
                        <span className="text-xs opacity-70">Errei</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 h-20 flex flex-col"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRating('hard');
                        }}
                        disabled={isReviewing}
                    >
                        <span className="font-bold text-lg">Hard</span>
                        <span className="text-xs opacity-70">Difícil</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 h-20 flex flex-col"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRating('good');
                        }}
                        disabled={isReviewing}
                    >
                        <span className="font-bold text-lg">Good</span>
                        <span className="text-xs opacity-70">Bom</span>
                    </Button>

                    <Button
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 h-20 flex flex-col"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRating('easy');
                        }}
                        disabled={isReviewing}
                    >
                        <span className="font-bold text-lg">Easy</span>
                        <span className="text-xs opacity-70">Fácil</span>
                    </Button>
                </div>
            )}

            {/* Instruction */}
            {!isFlipped && (
                <div className="text-center text-sm text-gray-500">
                    Clique no card para ver a resposta e avaliar
                </div>
            )}
        </div>
    );
}
