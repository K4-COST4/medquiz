"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Wand2, BookOpen, List, FileText, Plus, Trash2, X, AlertCircle, Sparkles } from "lucide-react";
import { generateCustomTrack } from "@/app/(plataform)/trilhas/custom/actions";
import { getUsageQuotas } from "@/app/actions/medai-core";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type InputMode = "structured" | "free";

export function CreateTrackForm() {
    const [mode, setMode] = useState<InputMode>("structured");

    // State para Modo Livre
    const [freeText, setFreeText] = useState("");

    // State para Modo Estruturado
    const [objectives, setObjectives] = useState<string[]>([""]);

    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Rate Limit State
    const [quota, setQuota] = useState<{ available: boolean, daysUntilNext: number } | null>(null);

    useEffect(() => {
        getUsageQuotas().then(q => {
            if (q) setQuota(q.track);
        });
    }, []);

    // HANDLERS (Structured Mode)
    const addObjective = () => {
        setObjectives([...objectives, ""]);
    };

    const removeObjective = (index: number) => {
        const newObjectives = objectives.filter((_, i) => i !== index);
        setObjectives(newObjectives);
    };

    const updateObjective = (index: number, value: string) => {
        const newObjectives = [...objectives];
        newObjectives[index] = value;
        setObjectives(newObjectives);
    };

    const handleGenerate = () => {
        // Validate input based on mode
        if (mode === "free") {
            if (!freeText.trim()) {
                toast.error("Por favor, descreva seus objetivos de estudo.");
                return;
            }
        } else {
            const validObjectives = objectives.filter(o => o.trim() !== "");
            if (validObjectives.length === 0) {
                toast.error("Adicione pelo menos um objetivo válido.");
                return;
            }
        }

        startTransition(async () => {
            try {
                // Construct new payload with explicit mode
                const payload = mode === "free"
                    ? { mode: "FREE_TEXT" as const, user_input: freeText }
                    : { mode: "OBJECTIVES" as const, user_input: objectives.filter(o => o.trim() !== "") };

                const result = await generateCustomTrack(payload);

                if (result.success && result.track_id) {
                    toast.success("Trilha criada com sucesso!");
                    router.push(`/trilhas/${result.track_id}`);
                } else {
                    toast.error(result.message || "Erro ao criar trilha.");
                }
            } catch (error) {
                toast.error("Ocorreu um erro inesperado.");
                console.error(error);
            }
        });
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">

            {/* TABS HEADER */}
            {/* STATUS BANNER */}
            {quota && (
                <div className={`border rounded-xl p-4 flex items-start gap-4 mb-6 animate-in slide-in-from-top-2 transition-colors ${quota.available
                    ? "bg-emerald-50 border-emerald-100"
                    : "bg-amber-50 border-amber-200"
                    }`}>
                    <div className={`p-2 rounded-full shrink-0 ${quota.available ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                        }`}>
                        {quota.available ? <Sparkles size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${quota.available ? "text-emerald-800" : "text-amber-800"
                            }`}>
                            {quota.available ? "Criação de Trilhas Disponível" : "Limite Semanal Atingido"}
                        </h4>

                        {quota.available ? (
                            <p className="text-emerald-700/80 text-xs mt-1">
                                Você tem <strong>1 crédito semanal</strong> disponível para gerar uma nova trilha de estudos personalizada. Aproveite!
                            </p>
                        ) : (
                            <div className="mt-2">
                                <p className="text-amber-700/80 text-xs">
                                    A criação de novas trilhas será liberada em:
                                </p>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <div className="bg-white/50 px-3 py-1 rounded-md text-amber-900 font-mono font-bold text-sm border border-amber-200/50 inline-block">
                                        {quota.daysUntilNext} {quota.daysUntilNext === 1 ? 'dia' : 'dias'}
                                    </div>
                                    <span className="text-[10px] text-amber-600/70 uppercase font-semibold tracking-wider">para o reset</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                <button
                    onClick={() => setMode("structured")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === "structured"
                        ? "bg-white text-violet-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <List size={18} />
                    Por Objetivos
                </button>
                <button
                    onClick={() => setMode("free")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === "free"
                        ? "bg-white text-violet-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <FileText size={18} />
                    Texto Livre
                </button>
            </div>

            {/* INPUT AREA */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 min-h-[250px] transition-all">

                {mode === "free" ? (
                    <Textarea
                        placeholder="Ex: Quero aprender sobre Insuficiência Cardíaca, Fisiopatologia da Hipertensão e tratamento do Diabetes Tipo 2..."
                        className="w-full min-h-[200px] border-0 focus-visible:ring-0 resize-none text-lg p-0 text-slate-700 placeholder:text-slate-400 bg-transparent"
                        value={freeText}
                        onChange={(e) => setFreeText(e.target.value)}
                        disabled={isPending}
                    />
                ) : (
                    <div className="space-y-3">
                        {objectives.map((obj, index) => (
                            <div key={index} className="flex items-center gap-2 group animate-in slide-in-from-left-2 duration-300">
                                <div className="h-8 w-8 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                                    {index + 1}
                                </div>
                                <Input
                                    value={obj}
                                    onChange={(e) => updateObjective(index, e.target.value)}
                                    placeholder={`Objetivo ${index + 1} (ex: Tratamento de IA)`}
                                    className="flex-1 border-slate-200 focus-visible:ring-violet-500"
                                    disabled={isPending}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && index === objectives.length - 1) {
                                            addObjective();
                                        }
                                    }}
                                    autoFocus={index === objectives.length - 1 && index > 0}
                                />
                                {objectives.length > 1 && (
                                    <button
                                        onClick={() => removeObjective(index)}
                                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                        disabled={isPending}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                            </div>
                        ))}

                        <button
                            onClick={addObjective}
                            disabled={isPending}
                            className="flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-700 hover:bg-violet-50 px-4 py-2 rounded-lg transition-colors mt-2"
                        >
                            <Plus size={16} />
                            Adicionar Objetivo
                        </button>
                    </div>
                )}
            </div>

            {/* ACTION BUTTON */}
            <div className="flex justify-end">
                <Button
                    onClick={handleGenerate}
                    disabled={isPending || (mode === 'free' ? !freeText.trim() : !objectives.some(o => o.trim())) || (quota !== null && !quota.available)}
                    size="lg"
                    className="rounded-xl px-8 py-6 text-base font-bold bg-violet-600 hover:bg-violet-700 shadow-xl shadow-violet-600/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Criando sua trilha...
                        </>
                    ) : (
                        <>
                            <Wand2 className="mr-2 h-5 w-5" />
                            Gerar Trilha com IA
                        </>
                    )}
                </Button>
            </div>

            {isPending && (
                <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <p className="text-slate-500 font-medium animate-pulse flex items-center justify-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        Consultando diretrizes médicas e montando cronograma...
                    </p>
                </div>
            )}
        </div>
    );
}
