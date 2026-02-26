"use client";

import { useState, useTransition, useEffect } from "react";
import {
    ChevronDown,
    Gamepad2,
    BookOpen,
    Layers,
    Headphones,
    Network,
    Play,
    Lock,
    CheckCircle2,
    Circle,
    Loader2,
    Trophy,
    Crown,
    RotateCcw,
    AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { getDeckByLessonId } from "@/app/actions/flashcards";
import { getLessonMistakeCount } from "@/app/(plataform)/praticar/actions";
import { getUsageQuotas } from "@/app/actions/medai-core";

// --- ÍCONES DINÂMICOS ---
// (Mapeamento opcional se quiser usar o icon_url da lesson também, 
// mas aqui usaremos fixos para as ações)

interface LessonAccordionProps {
    lesson: {
        id: string;
        title: string;
        icon_url?: string;
        ai_context?: string;
        // Adicione outros campos se necessário (ex: status de conclusão)
        is_completed?: boolean;
    };
    index: number;
}

export function LessonAccordion({ lesson, index }: LessonAccordionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoadingDeck, setIsLoadingDeck] = useState(false);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [mistakeCount, setMistakeCount] = useState(0);
    const [generalQuota, setGeneralQuota] = useState<number | null>(null);
    const [summaryQuota, setSummaryQuota] = useState<{ remaining: number; limit: number } | null>(null);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;
        // Parallel fetching
        Promise.all([
            getLessonMistakeCount(lesson.id),
            getUsageQuotas()
        ]).then(([count, quotas]) => {
            if (isMounted) {
                setMistakeCount(count);
                if (quotas) {
                    setGeneralQuota(quotas.general.remaining);
                    setSummaryQuota({ remaining: quotas.summary.remaining, limit: quotas.summary.limit });
                }
            }
        });
        return () => { isMounted = false; };
    }, [lesson.id]);

    const toggleOpen = () => setIsOpen(!isOpen);

    const handleFlashcardClick = async () => {
        setIsLoadingDeck(true);
        try {
            const deckId = await getDeckByLessonId(lesson.id);
            if (deckId) {
                router.push(`/praticar/flashcard/${deckId}`);
            } else {
                router.push(`/praticar/flashcard/novo?nodeId=${lesson.id}`);
            }
        } catch (error) {
            toast.error("Erro ao verificar deck");
            router.push(`/praticar/flashcard/novo?nodeId=${lesson.id}`);
        } finally {
            setIsLoadingDeck(false); // Only useful if stays on page
        }
    }

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white transition-all duration-300 hover:shadow-md">
            {/* HEADER (Linha da Aula) */}
            <div
                onClick={toggleOpen}
                className={cn(
                    "flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none",
                    isOpen && "bg-slate-50 border-b border-slate-100"
                )}
            >
                <div className="flex items-center gap-4">
                    {/* Status Icon */}
                    <div className={cn("text-slate-300", lesson.is_completed && "text-emerald-500")}>
                        {lesson.is_completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </div>

                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                            Aula {index + 1}
                        </span>
                        <h3 className={cn("font-bold text-slate-700 text-lg", isOpen && "text-violet-700")}>
                            {lesson.title}
                        </h3>
                    </div>
                </div>

                <ChevronDown
                    className={cn(
                        "text-slate-400 transition-transform duration-300",
                        isOpen && "rotate-180 text-violet-600"
                    )}
                />
            </div>

            {/* BODY (Painel de Ferramentas) */}
            <div
                className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isOpen ? "grid-rows-[1fr] opacity-100 p-4" : "grid-rows-[0fr] opacity-0 p-0"
                )}
            >
                <div className="overflow-hidden min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* 1. QUIZ (Principal) */}
                        {/* 1. QUIZ (Principal) */}
                        {(() => {
                            // CONEXÃO COM DADOS REAIS
                            // Agora o userLevel vem do banco via props da lesson
                            const level = (lesson as any).userLevel ?? 0;

                            const isMaster = level >= 3;

                            // Configurações visuais baseadas no nível
                            const theme = isMaster ? {
                                bg: "bg-amber-50",
                                border: "border-amber-100",
                                hoverBorder: "hover:border-amber-300",
                                iconBg: "bg-white",
                                iconColor: "text-amber-600",
                                badgeBg: "bg-amber-100",
                                badgeText: "text-amber-700",
                                badgeLabel: "DOMINADO",
                                titleColor: "text-amber-900",
                                descColor: "text-amber-600/80",
                                barBg: "bg-slate-100",
                                barFill: "bg-amber-500",
                                btnClass: "bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-lg shadow-amber-200",
                                btnText: "Modo Revisão",
                                btnIcon: Crown
                            } : {
                                bg: "bg-violet-50",
                                border: "border-violet-100",
                                hoverBorder: "hover:border-violet-300",
                                iconBg: "bg-white",
                                iconColor: "text-violet-600",
                                badgeBg: "bg-violet-200",
                                badgeText: "text-violet-800",
                                badgeLabel: "PRÁTICA",
                                titleColor: "text-violet-900",
                                descColor: "text-violet-600/80",
                                barBg: "bg-slate-100",
                                barFill: "bg-violet-600",
                                btnClass: "bg-violet-600 hover:bg-violet-700 text-white",
                                btnText: level === 0 ? "Iniciar Quiz" : `Continuar Nível ${level}`,
                                btnIcon: Play
                            };

                            // Cálculo da barra de progresso
                            const progressMap = [5, 33, 66, 100]; // 5% no nível 0 para incentivo visual
                            const progressPct = progressMap[level] || 0;

                            const Icon = theme.btnIcon;

                            return (
                                <div className={cn(
                                    "rounded-xl p-4 border flex flex-col gap-3 group transition-all duration-300 relative overflow-hidden",
                                    theme.bg, theme.border, theme.hoverBorder,
                                    isMaster && "shadow-sm"
                                )}>
                                    {/* Efeito de brilho para Mestre */}
                                    {isMaster && (
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                                    )}

                                    <div className="flex items-start justify-between relative z-10">
                                        <div className={cn("p-2 rounded-lg shadow-sm", theme.iconBg, theme.iconColor)}>
                                            {isMaster ? <Trophy size={20} /> : <Gamepad2 size={20} />}
                                        </div>
                                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", theme.badgeBg, theme.badgeText)}>
                                            {theme.badgeLabel}
                                        </span>
                                    </div>

                                    <div className="relative z-10">
                                        <h4 className={cn("font-bold", theme.titleColor)}>Quiz Interativo</h4>
                                        <p className={cn("text-xs mt-1", theme.descColor)}>
                                            {isMaster ? "Você dominou este tópico! Mantenha a memória fresca." : "Teste seus conhecimentos para avançar."}
                                        </p>
                                    </div>

                                    {/* Barra de Progresso */}
                                    <div className={cn("w-full h-2 rounded-full overflow-hidden mt-1", theme.barBg)}>
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-500 ease-out", theme.barFill)}
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>

                                    <Link href={`/praticar/${lesson.id}`} className="mt-auto relative z-10">
                                        <button className={cn(
                                            "w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-transform active:scale-95",
                                            theme.btnClass
                                        )}>
                                            <Icon size={16} fill={isMaster ? "currentColor" : "currentColor"} />
                                            {theme.btnText}
                                        </button>
                                    </Link>
                                </div>
                            );
                        })()}

                        {/* 2. RESUMO (IA) */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex flex-col gap-3 group hover:border-blue-300 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm">
                                    <BookOpen size={20} />
                                </div>
                                <span className="bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    TEORIA
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-blue-900">Resumo Inteligente</h4>
                                    {summaryQuota !== null && (
                                        <span className={cn(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                            summaryQuota.remaining > 0 ? "bg-white text-blue-600 border-blue-200" : "bg-red-100 text-red-600 border-red-200"
                                        )}>
                                            {summaryQuota.remaining}/{summaryQuota.limit} sem
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-blue-600/80 mt-1">
                                    Explicação concisa e didática gerada por IA.
                                </p>
                            </div>

                            {/* Link para Página de Leitura */}
                            <div className="mt-auto">
                                <button
                                    onClick={() => {
                                        if (summaryQuota !== null && summaryQuota.remaining <= 0) {
                                            toast.error(`Limite semanal de resumos atingido (${summaryQuota.limit}/semana).`);
                                            return;
                                        }
                                        setIsLoadingSummary(true);
                                        router.push(`/resumo/${lesson.id}`);
                                    }}
                                    disabled={isLoadingSummary || (summaryQuota !== null && summaryQuota.remaining <= 0)}
                                    className="w-full py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoadingSummary ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Gerando Resumo...
                                        </>
                                    ) : (
                                        <>
                                            <BookOpen size={14} />
                                            {summaryQuota !== null && summaryQuota.remaining <= 0 ? "Limite Semanal Atingido" : "Ler Resumo"}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* 3. FLASHCARDS */}
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 flex flex-col gap-3 group hover:border-amber-300 transition-colors">
                            <div className="flex items-start justify-between">
                                <div className="p-2 bg-white rounded-lg text-amber-600 shadow-sm">
                                    <Layers size={20} />
                                </div>
                                <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    REVISÃO
                                </span>
                            </div>
                            <div>
                                <h4 className="font-bold text-amber-900">Flashcards</h4>
                                <p className="text-xs text-amber-600/80 mt-1">
                                    Crie decks de memorização para este tópico.
                                </p>
                            </div>
                            <div className="mt-auto">
                                <button
                                    onClick={handleFlashcardClick}
                                    disabled={isLoadingDeck}
                                    className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-wait"
                                >
                                    {isLoadingDeck ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        "Acessar Deck"
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* 3.1 REVISÃO DE ERROS (Novo) */}
                        {(() => {
                            const hasMistakes = mistakeCount > 0;

                            return (
                                <div className={cn(
                                    "rounded-xl p-4 border flex flex-col gap-3 group transition-colors",
                                    hasMistakes
                                        ? "bg-rose-50 border-rose-200 hover:border-rose-300"
                                        : "bg-slate-50 border-slate-100 opacity-70"
                                )}>
                                    <div className="flex items-start justify-between">
                                        <div className={cn(
                                            "p-2 rounded-lg shadow-sm",
                                            hasMistakes ? "bg-white text-rose-600" : "bg-white text-slate-400"
                                        )}>
                                            {hasMistakes ? <RotateCcw size={20} /> : <CheckCircle2 size={20} />}
                                        </div>
                                        {hasMistakes && (
                                            <span className="bg-rose-200 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                ATENÇÃO
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className={cn("font-bold", hasMistakes ? "text-rose-900" : "text-slate-700")}>
                                            {hasMistakes ? "Correção de Erros" : "Sem Erros Pendentes"}
                                        </h4>
                                        <p className={cn("text-xs mt-1", hasMistakes ? "text-rose-600/80" : "text-slate-500")}>
                                            {hasMistakes
                                                ? `Você tem ${mistakeCount} questões para corrigir neste tópico.`
                                                : "Parabéns! Você não tem questões pendentes de correção aqui."}
                                        </p>
                                    </div>

                                    {hasMistakes ? (
                                        <Link href={`/praticar/${lesson.id}?mode=review`} className="mt-auto">
                                            <button className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                                                <RotateCcw size={14} />
                                                Revisar {mistakeCount} Erros
                                            </button>
                                        </Link>
                                    ) : (
                                        <button disabled className="mt-auto w-full py-2 bg-slate-200 text-slate-400 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                                            <CheckCircle2 size={14} />
                                            Tudo Limpo
                                        </button>
                                    )}
                                </div>
                            );
                        })()}

                        {/* 4. ÁUDIO (Coming Soon) */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-3 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed">
                            <div className="flex items-start justify-between">
                                <div className="p-2 bg-white rounded-lg text-slate-400 shadow-sm">
                                    <Headphones size={20} />
                                </div>
                                <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    EM BREVE
                                </span>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-700">Resumo em Áudio</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Ouça o conteúdo enquanto faz outras coisas.
                                </p>
                            </div>
                            <button disabled className="mt-auto w-full py-2 bg-slate-200 text-slate-400 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                                <Lock size={14} />
                                Indisponível
                            </button>
                        </div>

                        {/* 5. MAPA MENTAL (Coming Soon) */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col gap-3 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed hidden md:flex">
                            <div className="flex items-start justify-between">
                                <div className="p-2 bg-white rounded-lg text-slate-400 shadow-sm">
                                    <Network size={20} />
                                </div>
                                <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    EM BREVE
                                </span>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-700">Mapa Mental</h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Visualize as conexões entre os conceitos.
                                </p>
                            </div>
                            <button disabled className="mt-auto w-full py-2 bg-slate-200 text-slate-400 rounded-lg font-bold text-sm flex items-center justify-center gap-2">
                                <Lock size={14} />
                                Indisponível
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div >
    );
}
