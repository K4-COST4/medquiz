"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Save, Trash2, GripVertical, CheckCircle, ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { updateRoomContent } from "../../actions";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";

// --- TIPOS ---
interface Question {
    id: string;
    statement: string;
    q_type: 'multiple_choice' | 'true_false' | 'fill_gap_select';
    difficulty: 'easy' | 'medium' | 'hard';
    time_limit: number;
    // Flattened structure
    options?: any[];
    is_true?: boolean;
    text_start?: string;
    text_end?: string;
    correct_answer?: string;
}

// --- COMPONENTE PRINCIPAL ---
export default function PowerEditorPage({ params }: { params: Promise<{ room_id: string }> }) {
    const { room_id } = use(params);
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [roomTitle, setRoomTitle] = useState("");
    const [roomTopic, setRoomTopic] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // Auto-Save States
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // AI Modal States
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    const supabase = createClient();

    // 1. CARREGAMENTO INICIAL
    useEffect(() => {
        const fetchRoom = async () => {
            const { data, error } = await supabase
                .from("kahoot_rooms")
                .select("*")
                .eq("id", room_id)
                .single();

            if (error || !data) {
                router.push("/live");
                return;
            }
            setRoomTitle(data.title);
            setRoomTopic(data.title);

            // Map legacy content structure to new flat structure if needed
            const loadedQuestions = (data.game_data || []).map((q: any) => {
                if (q.content) {
                    return {
                        ...q,
                        options: q.content.options || q.options,
                        is_true: q.content.isTrue ?? q.is_true,
                        text_start: q.content.text_start || q.text_start,
                        text_end: q.content.text_end || q.text_end,
                        correct_answer: q.content.correct_answer || q.correct_answer
                    };
                }
                return q;
            });

            setQuestions(loadedQuestions);
            setIsLoading(false);
        };
        fetchRoom();
    }, [room_id]);

    // 2. AUTO-SAVE LOGIC
    useEffect(() => {
        if (isLoading) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        setIsSaving(true);
        saveTimeoutRef.current = setTimeout(async () => {
            await updateRoomContent(room_id, questions);
            setIsSaving(false);
            setLastSaved(new Date());
        }, 2000);

        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [questions]);

    // --- CRUD OPERATIONS ---

    const addManualQuestion = () => {
        const newCtx: Question = {
            id: crypto.randomUUID(),
            statement: "Nova Questão",
            q_type: 'multiple_choice',
            difficulty: 'medium',
            time_limit: 30,
            options: [
                { id: 'a', text: "Opção A", isCorrect: false },
                { id: 'b', text: "Opção B", isCorrect: true },
                { id: 'c', text: "Opção C", isCorrect: false },
                { id: 'd', text: "Opção D", isCorrect: false },
            ]
        };
        setQuestions(prev => [...prev, newCtx]);
    };

    const updateQuestion = (index: number, field: string, value: any) => {
        const newQ = [...questions];
        newQ[index] = { ...newQ[index], [field]: value };
        setQuestions(newQ);
    };

    const updateOption = (qIndex: number, optIndex: number, text: string) => {
        const newQuestions = [...questions];
        const newOptions = [...(newQuestions[qIndex].options || [])];

        // Handle object options (multiple_choice)
        if (typeof newOptions[optIndex] === 'object') {
            newOptions[optIndex] = { ...newOptions[optIndex], text };
        } else {
            // Should not happen for multiple_choice but safety check
            newOptions[optIndex] = text;
        }

        newQuestions[qIndex] = {
            ...newQuestions[qIndex],
            options: newOptions
        };
        setQuestions(newQuestions);
    };

    const removeQuestion = (index: number) => {
        const newQ = questions.filter((_, i) => i !== index);
        setQuestions(newQ);
    };

    const publishGame = async () => {
        await updateRoomContent(room_id, questions);
        const { error } = await supabase.from("kahoot_rooms").update({ status: 'waiting' }).eq("id", room_id);
        if (!error) router.push(`/live/${room_id}/host`);
    };

    // --- AI GENERATION LOGIC ---
    const { register: registerAI, handleSubmit: handleSubmitAI, watch: watchAI } = useForm();
    const currentQuestionsCount = questions.length;

    const handleGenerateValues = async (data: any) => {
        if (currentQuestionsCount + Number(data.count) > 20) {
            alert("O limite total é de 20 questões por sala.");
            return;
        }

        setAiLoading(true);

        const recipe: string[] = [];
        const selectedDiff = data.difficulty || 'mixed';

        for (let i = 0; i < data.count; i++) {
            if (selectedDiff === 'mixed') {
                const r = Math.random();
                if (r < 0.3) recipe.push('easy');
                else if (r < 0.7) recipe.push('medium');
                else recipe.push('hard');
            } else {
                recipe.push(selectedDiff);
            }
        }

        const types = [];
        if (data.type_multi) types.push('multiple_choice');
        if (data.type_tf) types.push('true_false');
        if (data.type_gap) types.push('fill_gap_select');

        let finalContext = data.context || "";
        if (data.reference) {
            finalContext += `\n\nTexto de Referência:\n${data.reference}`;
        }

        try {
            const response = await fetch("/api/generate-live-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic: roomTopic,
                    aiContext: finalContext,
                    neededDifficulties: recipe,
                    forcedTypes: types.length > 0 ? types : ['multiple_choice']
                })
            });
            const json = await response.json();

            if (json.success && json.data) {
                // Map API response to flattened structure
                const newItems = json.data.map((q: any) => ({
                    ...q,
                    id: crypto.randomUUID(),
                    time_limit: 30,
                    options: q.content?.options || q.options,
                    is_true: q.content?.isTrue ?? q.is_true,
                    text_start: q.content?.text_start || q.text_start,
                    text_end: q.content?.text_end || q.text_end,
                    correct_answer: q.content?.correct_answer || q.correct_answer,
                    content: undefined // Remove content key
                }));
                setQuestions(prev => [...prev, ...newItems]);
                setAiModalOpen(false);
            }
        } catch (e) {
            alert("Erro na IA: " + e);
        }
        setAiLoading(false);
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950">

            {/* HEADER FIXO */}
            <header className="border-b bg-white dark:bg-slate-900 p-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/live')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="font-bold text-lg">{roomTitle}</h1>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{questions.length} / 20 questões</span>
                            {isSaving ? (
                                <span className="flex items-center text-yellow-600"><Loader2 className="w-3 h-3 animate-spin mr-1" /> Salvando...</span>
                            ) : (
                                <span className="flex items-center text-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Salvo</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50" disabled={questions.length >= 20}>
                                <Sparkles className="w-4 h-4" /> IA Mágica
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Gerador de Questões Inteligente</DialogTitle>
                                <DialogDescription>Configure como a IA deve criar suas questões.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmitAI(handleGenerateValues)} className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tópico / Contexto</Label>
                                        <Textarea placeholder="Ex: Cardiologia, Regra de 3, etc." {...registerAI('context')} className="h-24" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Texto de Referência (Opcional)</Label>
                                        <Textarea placeholder="Cole um texto para a IA se basear..." {...registerAI('reference')} className="h-24" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Quantidade (Máx: {20 - questions.length})</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={20 - questions.length}
                                            defaultValue={Math.min(3, 20 - questions.length)}
                                            {...registerAI('count')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Dificuldade</Label>
                                        <select {...registerAI('difficulty')} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                            <option value="mixed">Misturado (Recomendado)</option>
                                            <option value="easy">Fácil</option>
                                            <option value="medium">Médio</option>
                                            <option value="hard">Difícil</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Tipos de Questão</Label>
                                    <div className="flex gap-4 flex-wrap">
                                        <div className="flex items-center gap-2 border p-2 rounded-md">
                                            <Switch defaultChecked id="tm" {...registerAI('type_multi')} /> <Label htmlFor="tm">Múltipla Escolha</Label>
                                        </div>
                                        <div className="flex items-center gap-2 border p-2 rounded-md">
                                            <Switch id="tf" {...registerAI('type_tf')} /> <Label htmlFor="tf">Verdadeiro/Falso</Label>
                                        </div>
                                        <div className="flex items-center gap-2 border p-2 rounded-md">
                                            <Switch id="tg" {...registerAI('type_gap')} /> <Label htmlFor="tg">Lacunas</Label>
                                        </div>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={aiLoading}>
                                    {aiLoading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                    {aiLoading ? "Gerando..." : "Gerar Questões"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Button onClick={addManualQuestion} variant="secondary" className="gap-2">
                        <Plus className="w-4 h-4" /> Manual
                    </Button>

                    <Button onClick={publishGame} className="bg-green-600 hover:bg-green-700 gap-2">
                        <Save className="w-4 h-4" /> Finalizar & Jogar
                    </Button>
                </div>
            </header>

            {/* EDITOR AREA */}
            <ScrollArea className="flex-1 p-8">
                <div className="max-w-3xl mx-auto space-y-6 pb-20">
                    {questions.map((q, idx) => (
                        <Card key={q.id} className="group relative border-2 border-transparent hover:border-slate-200 transition-colors">
                            <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-move text-slate-400">
                                <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100">
                                <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => removeQuestion(idx)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            <CardContent className="p-6 pl-10 space-y-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <select
                                        value={q.q_type}
                                        onChange={(e) => updateQuestion(idx, 'q_type', e.target.value)}
                                        className="h-6 text-[10px] uppercase font-bold border rounded bg-slate-100 px-1"
                                    >
                                        <option value="multiple_choice">Múltipla Escolha</option>
                                        <option value="true_false">V / F</option>
                                        <option value="fill_gap_select">Lacunas</option>
                                    </select>

                                    <select
                                        value={q.difficulty}
                                        onChange={(e) => updateQuestion(idx, 'difficulty', e.target.value)}
                                        className={`h-6 text-[10px] uppercase font-bold border rounded px-1 text-white ${q.difficulty === 'hard' ? 'bg-red-500 border-red-600' :
                                            q.difficulty === 'medium' ? 'bg-yellow-500 border-yellow-600' :
                                                'bg-green-500 border-green-600'
                                            }`}
                                    >
                                        <option value="easy" className="text-black">Fácil</option>
                                        <option value="medium" className="text-black">Médio</option>
                                        <option value="hard" className="text-black">Difícil</option>
                                    </select>
                                </div>

                                <Textarea
                                    value={q.statement}
                                    onChange={(e) => updateQuestion(idx, 'statement', e.target.value)}
                                    className="text-lg font-medium border-none shadow-none resize-none bg-transparent p-0 focus-visible:ring-0 min-h-[60px]"
                                    placeholder="Digite o enunciado da questão..."
                                />

                                {/* Renderização Condicional de Conteúdo */}
                                {q.q_type === 'multiple_choice' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {q.options?.map((opt: any, optIdx: number) => (
                                            <div key={optIdx} className={`flex items-center p-2 rounded-md border transition-colors ${opt.isCorrect ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                                                <button
                                                    onClick={() => {
                                                        const newOpts = q.options?.map((o: any, i: number) => ({ ...o, isCorrect: i === optIdx }));
                                                        updateQuestion(idx, 'options', newOpts);
                                                    }}
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 text-xs font-bold ring-offset-1 transition-all hover:ring-2 ${opt.isCorrect ? 'bg-green-500 text-white ring-green-400' : 'bg-slate-300 text-slate-600 ring-slate-300'}`}
                                                    title="Marcar como correta"
                                                >
                                                    {['A', 'B', 'C', 'D'][optIdx]}
                                                </button>
                                                <Input
                                                    value={opt.text}
                                                    onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                                                    className="h-8 border-none bg-transparent shadow-none focus-visible:ring-0"
                                                    placeholder={`Opção ${optIdx + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {q.q_type === 'true_false' && (
                                    <div className="flex gap-4">
                                        <Button
                                            className={`flex-1 h-12 text-lg ${q.is_true === true ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                            onClick={() => updateQuestion(idx, 'is_true', true)}
                                        >
                                            Verdadeiro
                                        </Button>
                                        <Button
                                            className={`flex-1 h-12 text-lg ${q.is_true === false ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                            onClick={() => updateQuestion(idx, 'is_true', false)}
                                        >
                                            Falso
                                        </Button>
                                    </div>
                                )}

                                {q.q_type === 'fill_gap_select' && (
                                    <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Texto Antes</Label>
                                                <Input
                                                    value={q.text_start || ''}
                                                    onChange={(e) => updateQuestion(idx, 'text_start', e.target.value)}
                                                    className="bg-white"
                                                    placeholder="O miocárdio é..."
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Texto Depois</Label>
                                                <Input
                                                    value={q.text_end || ''}
                                                    onChange={(e) => updateQuestion(idx, 'text_end', e.target.value)}
                                                    className="bg-white"
                                                    placeholder="...pelo tecido muscular."
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Opções (A primeira é a correta na criação, embaralhada no jogo)</Label>
                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                {q.options?.map((opt: any, optIdx: number) => (
                                                    <div key={optIdx} className="flex items-center gap-2">
                                                        <Badge variant={optIdx === 0 ? "default" : "outline"} className={optIdx === 0 ? "bg-green-500" : ""}>
                                                            {optIdx === 0 ? "Correta" : "Distrator"}
                                                        </Badge>
                                                        <Input
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const newQ = [...questions];
                                                                const newOpts = [...(newQ[idx].options || [])];
                                                                newOpts[optIdx] = e.target.value;
                                                                newQ[idx] = { ...newQ[idx], options: newOpts };
                                                                // Atualiza correct_answer se for o indice 0
                                                                if (optIdx === 0) newQ[idx].correct_answer = e.target.value;
                                                                setQuestions(newQ);
                                                            }}
                                                            className="h-8 bg-white"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {questions.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <Sparkles className="w-12 h-12 mx-auto mb-4" />
                            <p>Sua sala está vazia. Adicione questões manualmente ou use a IA.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

        </div>
    );
}
