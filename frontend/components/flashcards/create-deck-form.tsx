"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
    Loader2,
    Wand2,
    BookOpen,
    List,
    FileText,
    Plus,
    X,
    UploadCloud,
    FileType
} from "lucide-react";
import { createDeckWithContext } from "@/app/actions/flashcards";
import { getTrackDescription } from "@/app/(plataform)/trilha/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { getUsageQuotas } from "@/app/actions/medai-core";

type InputMode = "structured" | "free";

export function CreateDeckForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const nodeId = searchParams.get("nodeId");

    const [mode, setMode] = useState<InputMode>("structured");
    const [isPending, startTransition] = useTransition();
    const [isLoadingContext, setIsLoadingContext] = useState(false);

    // Form States
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [freeText, setFreeText] = useState("");
    const [objectives, setObjectives] = useState<string[]>([""]);

    // File State
    const [file, setFile] = useState<File | null>(null);

    // Node Type State (for correct linking)
    const [nodeType, setNodeType] = useState<string | null>(null);

    // Rate Limit State
    const [flashQuota, setFlashQuota] = useState<{ remaining: number, limit: number } | null>(null);

    useEffect(() => {
        getUsageQuotas().then(q => {
            if (q) setFlashQuota(q.flashcard);
        });
    }, []);

    // 1. Auto-Detect NodeID (Context)
    useEffect(() => {
        if (nodeId) {
            async function fetchContext() {
                setIsLoadingContext(true);
                try {
                    // Reutiliza a logic de trilhas para pegar o contexto
                    const data = await getTrackDescription(nodeId as string);
                    if (data && !data.error) {
                        setTitle(`Estudo: ${data.title}`);

                        // Formatação Pedida: Contexto: [ai_context]. Resumo Inteligente: [ai_description]
                        const contextPart = data.ai_context ? `Contexto: ${data.ai_context}.\n\n` : "";
                        const summaryPart = data.description ? `Resumo Inteligente: ${data.description}` : "";

                        setFreeText(`${contextPart}${summaryPart}`);
                        setNodeType(data.node_type); // Save node type

                        setMode("free"); // Switch to free text
                        toast.success("Contexto da aula importado!");
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoadingContext(false);
                }
            }
            fetchContext();
        }
    }, [nodeId]);

    // HANDLERS (Structured Mode)
    const addObjective = () => setObjectives([...objectives, ""]);

    const removeObjective = (index: number) => {
        const newObjectives = objectives.filter((_, i) => i !== index);
        setObjectives(newObjectives);
    };

    const updateObjective = (index: number, value: string) => {
        const newObjectives = [...objectives];
        newObjectives[index] = value;
        setObjectives(newObjectives);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (selected.size > 10 * 1024 * 1024) return toast.error("Máximo 10MB");
            if (selected.type !== "application/pdf") return toast.error("Apenas PDF");
            setFile(selected);
        }
    };

    const handleCreate = async () => {
        if (!title.trim()) return toast.error("O título é obrigatório");

        // Prepare Study Objective
        let studyObjective = "";
        if (mode === "free") {
            if (!freeText.trim() && !file) return toast.error("Defina um objetivo ou anexe um arquivo.");
            studyObjective = freeText;
        } else {
            const valid = objectives.filter(o => o.trim() !== "");
            if (valid.length === 0 && !file) return toast.error("Adicione objetivos ou anexe um arquivo.");
            studyObjective = valid.join("\n");
        }

        startTransition(async () => {
            try {
                let uploadedPath = null;

                // 1. Upload File to Supabase Storage (if present)
                if (file) {
                    const supabase = createClient();
                    const fileName = `${Date.now()}-${file.name}`;
                    const { data, error } = await supabase.storage
                        .from('deck-attachments')
                        .upload(fileName, file);

                    if (error) {
                        throw new Error("Erro no upload: " + error.message);
                    }
                    uploadedPath = data.path;
                }

                // 2. Create Deck in DB
                const result = await createDeckWithContext({
                    title,
                    description,
                    study_objective: studyObjective,
                    temp_file_path: uploadedPath || undefined,
                    original_filename: file ? file.name : undefined,
                    lesson_id: (nodeType !== 'module' && nodeType !== 'custom_track') && nodeId ? nodeId : undefined,
                    module_id: (nodeType === 'module' || nodeType === 'custom_track') && nodeId ? nodeId : undefined
                });

                if (result.success && result.deck_id) {
                    toast.success("Baralho criado com inteligência!");
                    router.push(`/praticar/flashcard/${result.deck_id}`);
                } else {
                    toast.error(result.error || "Erro ao criar baralho.");
                }

            } catch (error: any) {
                toast.error(error.message || "Ocorreu um erro inesperado.");
            }
        });
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">

            {flashQuota && flashQuota.remaining <= 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
                    <div className="p-2 bg-white rounded-full text-orange-600 shadow-sm shrink-0">
                        <Wand2 size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-orange-800 text-sm">Limite Diário de Criação Atingido</h4>
                        <p className="text-orange-700/80 text-xs mt-1">
                            Você já criou o deck do dia. Continue seus estudos revisando os decks existentes ou volte amanhã para criar mais!
                        </p>
                    </div>
                </div>
            )}

            {/* 1. BASIC INFO */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-base font-semibold text-slate-700">Título do Estudo</Label>
                    <Input
                        placeholder="Ex: Cardiologia - Revisão de Arritmias"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="h-12 text-lg bg-white"
                        disabled={isPending || isLoadingContext}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-500">Descrição (Opcional)</Label>
                    <Input
                        placeholder="Ex: Revisão para a prova de residência..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="bg-white"
                        disabled={isPending}
                    />
                </div>
            </div>

            {/* 2. CONTEXT INPUT (Tabs) */}
            <div className="space-y-4">
                <Label className="text-base font-semibold text-slate-700 flex items-center gap-2">
                    <BookOpen size={18} className="text-violet-600" />
                    O que você quer aprender?
                </Label>

                <div className="bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <div className="flex p-1 bg-white rounded-lg shadow-sm mb-4">
                        <button
                            onClick={() => setMode("structured")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${mode === "structured"
                                ? "bg-violet-100 text-violet-700"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            <List size={16} />
                            Tópicos / Objetivos
                        </button>
                        <button
                            onClick={() => setMode("free")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${mode === "free"
                                ? "bg-violet-100 text-violet-700"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            <FileText size={16} />
                            Texto Livre / Resumo
                        </button>
                    </div>

                    <div className="px-2 pb-2">
                        {mode === "free" ? (
                            <Textarea
                                placeholder="Cole aqui seu resumo, anotações de aula ou descreva o que quer estudar..."
                                className="min-h-[150px] border-slate-200 focus-visible:ring-violet-500 bg-white"
                                value={freeText}
                                onChange={(e) => setFreeText(e.target.value)}
                                disabled={isPending}
                            />
                        ) : (
                            <div className="space-y-3">
                                {objectives.map((obj, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                                            {index + 1}
                                        </div>
                                        <Input
                                            value={obj}
                                            onChange={(e) => updateObjective(index, e.target.value)}
                                            placeholder={`Objetivo ${index + 1}`}
                                            className="flex-1 bg-white"
                                            disabled={isPending}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && index === objectives.length - 1) addObjective();
                                            }}
                                        />
                                        {objectives.length > 1 && (
                                            <button onClick={() => removeObjective(index)} className="text-slate-400 hover:text-rose-500">
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <Button variant="ghost" size="sm" onClick={addObjective} className="text-violet-600 hover:text-violet-700 hover:bg-violet-50">
                                    <Plus size={14} className="mr-1" /> Adicionar Tópico
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. FILE UPLOAD */}
            <div className="space-y-4">
                <Label className="text-base font-semibold text-slate-700 flex items-center gap-2">
                    <UploadCloud size={18} className="text-violet-600" />
                    Material de Referência (PDF)
                </Label>

                <div className={`
                    border-2 border-dashed rounded-xl p-6 transition-colors text-center cursor-pointer group relative
                    ${file ? "border-emerald-400 bg-emerald-50/30" : "border-slate-300 hover:border-violet-400 hover:bg-slate-50"}
                `}>
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isPending}
                    />

                    {file ? (
                        <div className="flex flex-col items-center gap-2 text-emerald-700">
                            <div className="bg-emerald-100 p-3 rounded-full">
                                <FileType size={32} />
                            </div>
                            <span className="font-bold text-lg">{file.name}</span>
                            <span className="text-sm opacity-80">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            <p className="text-xs mt-2 text-emerald-600">Clique para substituir</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                            <div className="bg-slate-100 p-3 rounded-full group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                                <UploadCloud size={32} />
                            </div>
                            <span className="font-medium text-lg text-slate-700 group-hover:text-violet-700">Clique para adicionar PDF</span>
                            <span className="text-sm">ou arraste e solte o arquivo aqui</span>
                            <p className="text-xs mt-2 text-slate-400">Máximo 10MB. Validade de 7 dias.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* FOOTER ACTION */}
            <div className="flex justify-end pt-6 border-t">
                <Button
                    onClick={handleCreate}
                    disabled={isPending || (flashQuota !== null && flashQuota.remaining <= 0)}
                    size="lg"
                    className="w-full md:w-auto px-8 bg-violet-600 hover:bg-violet-700 text-lg font-bold shadow-lg shadow-violet-200 transition-all hover:scale-105"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Criando Inteligência...
                        </>
                    ) : (
                        <>
                            <Wand2 className="mr-2 h-5 w-5" />
                            Criar Deck Inteligente
                        </>
                    )}
                </Button>
            </div>

        </div>
    );
}
