'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDueCards, type DueCard } from '@/app/actions/srs';
import { SRSReview } from '@/components/flashcards/srs-review';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Calendar, CheckCircle2, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RevisaoDoDiaPage() {
    const router = useRouter();
    const [dueCards, setDueCards] = useState<DueCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isReviewing, setIsReviewing] = useState(false);

    useEffect(() => {
        loadDueCards();
    }, []);

    const loadDueCards = async () => {
        setIsLoading(true);
        try {
            const cards = await getDueCards(); // Global - all decks
            setDueCards(cards);
        } catch (error) {
            console.error('Error loading due cards:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartReview = () => {
        setIsReviewing(true);
    };

    const handleComplete = () => {
        confetti({
            particleCount: 200,
            spread: 120,
            origin: { y: 0.6 }
        });
        setIsReviewing(false);
        loadDueCards(); // Reload to show updated stats
    };

    const handleBack = () => {
        setIsReviewing(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Brain className="h-16 w-16 text-indigo-600 animate-pulse mx-auto" />
                    <p className="text-gray-600 dark:text-gray-400">Carregando suas revisões...</p>
                </div>
            </div>
        );
    }

    if (isReviewing) {
        return (
            <div className="container mx-auto p-4 md:p-6 min-h-screen">
                <SRSReview
                    dueCards={dueCards}
                    onComplete={handleComplete}
                    onBack={handleBack}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-4xl min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/dashboard')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar ao Dashboard
                </Button>

                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Revisão do Dia</h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            Sistema de Repetição Espaçada (SRS)
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Cards Devidos Hoje
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-indigo-600">{dueCards.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Decks Ativos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">
                            {new Set(dueCards.map(c => c.deckId)).size}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-semibold text-emerald-600 flex items-center gap-2">
                            {dueCards.length === 0 ? (
                                <>
                                    <CheckCircle2 className="h-5 w-5" />
                                    Em dia!
                                </>
                            ) : (
                                <>
                                    <Brain className="h-5 w-5" />
                                    Pendente
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            {dueCards.length === 0 ? (
                <Card className="border-2 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <CheckCircle2 className="h-20 w-20 text-emerald-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Parabéns! 🎉</h2>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
                            Você está em dia com todas as suas revisões. Continue assim!
                        </p>
                        <Button
                            onClick={() => router.push('/praticar/flashcard')}
                            variant="outline"
                        >
                            Ver Meus Decks
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Pronto para revisar?</CardTitle>
                        <CardDescription>
                            Você tem {dueCards.length} {dueCards.length === 1 ? 'card' : 'cards'} aguardando revisão de {new Set(dueCards.map(c => c.deckId)).size} {new Set(dueCards.map(c => c.deckId)).size === 1 ? 'deck' : 'decks'} diferentes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Deck breakdown */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                Por Deck:
                            </h3>
                            <div className="space-y-2">
                                {Array.from(new Set(dueCards.map(c => c.deckTitle))).map(deckTitle => {
                                    const count = dueCards.filter(c => c.deckTitle === deckTitle).length;
                                    return (
                                        <div
                                            key={deckTitle}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                                        >
                                            <span className="font-medium">{deckTitle}</span>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {count} {count === 1 ? 'card' : 'cards'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <Button
                            onClick={handleStartReview}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                            size="lg"
                        >
                            <Brain className="mr-2 h-5 w-5" />
                            Começar Revisão
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
