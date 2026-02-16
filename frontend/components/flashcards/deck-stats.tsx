'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { getSRSStats, type SRSStats } from '@/app/actions/srs';

interface DeckStatsProps {
    deckId: string;
    totalCards: number;
    approvalRate?: number;
}

export function DeckStats({ deckId, totalCards, approvalRate }: DeckStatsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [srsStats, setSrsStats] = useState<SRSStats | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && !srsStats) {
            loadStats();
        }
    }, [isOpen]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const stats = await getSRSStats(deckId);
            setSrsStats(stats);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <Card className="border-indigo-200 dark:border-indigo-800">
                <CollapsibleTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full flex items-center justify-between p-4 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                    >
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-semibold text-indigo-900 dark:text-indigo-100">
                                Estatísticas do Deck
                            </span>
                        </div>
                        {isOpen ? (
                            <ChevronUp className="h-5 w-5 text-indigo-600" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-indigo-600" />
                        )}
                    </Button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 space-y-4">
                        {/* Estatísticas Básicas */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-indigo-50 dark:bg-indigo-950 rounded-lg p-3">
                                <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                                    Total de Cards
                                </div>
                                <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                                    {totalCards}
                                </div>
                            </div>

                            {approvalRate !== undefined && (
                                <div className="bg-emerald-50 dark:bg-emerald-950 rounded-lg p-3">
                                    <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                        <TrendingUp className="h-4 w-4" />
                                        Taxa de Aprovação
                                    </div>
                                    <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                                        {approvalRate.toFixed(1)}%
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Estatísticas SRS */}
                        {loading && (
                            <div className="text-center text-sm text-gray-500 py-4">
                                Carregando estatísticas SRS...
                            </div>
                        )}

                        {!loading && srsStats && (
                            <div className="space-y-3">
                                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    Repetição Espaçada (SRS)
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
                                        <div className="text-xs text-blue-600 dark:text-blue-400">Novos</div>
                                        <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                                            {srsStats.new}
                                        </div>
                                    </div>

                                    <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3">
                                        <div className="text-xs text-yellow-600 dark:text-yellow-400">Aprendendo</div>
                                        <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
                                            {srsStats.learning}
                                        </div>
                                    </div>

                                    <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                                        <div className="text-xs text-green-600 dark:text-green-400">Em Revisão</div>
                                        <div className="text-xl font-bold text-green-900 dark:text-green-100">
                                            {srsStats.review}
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 dark:bg-orange-950 rounded-lg p-3">
                                        <div className="text-xs text-orange-600 dark:text-orange-400">Devidos Hoje</div>
                                        <div className="text-xl font-bold text-orange-900 dark:text-orange-100">
                                            {srsStats.dueToday}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Barra de Progresso */}
                        {srsStats && totalCards > 0 && (
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Progresso Geral
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500"
                                        style={{
                                            width: `${((srsStats.learning + srsStats.review) / totalCards) * 100}%`
                                        }}
                                    />
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                                    {srsStats.learning + srsStats.review} / {totalCards} cards estudados
                                </div>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
