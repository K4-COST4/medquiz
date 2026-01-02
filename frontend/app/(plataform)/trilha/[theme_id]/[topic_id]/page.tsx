"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import {
    Check, Star, Lock, Trophy, Zap, Flame,
    ChevronLeft, ChevronRight, BookOpen, Crown,
    Shield, Gem, Loader2, Skull, AlertTriangle, Swords, Info
} from "lucide-react";
import Link from "next/link";


// --- CONFIGURAÇÃO SUPABASE ---
const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- TIPAGEM DO BANCO DE DADOS ---
interface StudyNode {
    id: string;
    title: string;
    description: string;
    node_type: string; // 'topic', 'objective', 'subdivision', 'boss', 'module_boss'
    order_index: number;
    parent_id: string;
    is_boss: boolean;        // Flag do banco
    is_module_boss: boolean; // Flag do banco
    // Dados unidos do progresso
    is_locked?: boolean;
    progress?: {
        current_level: number; // 0 a 3
        is_completed: boolean;
    };
}

// Estrutura Visual: Um Objetivo agrupa várias Subdivisões (Aulas)
interface ObjectiveSection {
    id: string;
    title: string;
    order_index: number;
    nodes: StudyNode[];
}

// O Tópico (Unidade) com suas cores
interface TopicWithVisuals extends StudyNode {
    visuals: {
        bg: string;
        btn: string;
        shadow: string;
        text: string;
    }
}

// --- PALETA CÍCLICA DE CORES (Para os Tópicos) ---
const TOPIC_PALETTES = [
    { bg: "bg-emerald-500", btn: "bg-emerald-600", shadow: "shadow-emerald-700", text: "text-emerald-600" },
    { bg: "bg-violet-600", btn: "bg-violet-700", shadow: "shadow-violet-800", text: "text-violet-600" },
    { bg: "bg-rose-500", btn: "bg-rose-600", shadow: "shadow-rose-700", text: "text-rose-600" },
    { bg: "bg-amber-500", btn: "bg-amber-600", shadow: "shadow-amber-700", text: "text-amber-600" },
    { bg: "bg-sky-500", btn: "bg-sky-600", shadow: "shadow-sky-700", text: "text-sky-600" },
];

export default function TopicPage({ params }: { params: Promise<{ theme_id: string; topic_id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);

    // Estados de Dados
    const [loading, setLoading] = useState(true);
    const [topics, setTopics] = useState<TopicWithVisuals[]>([]);
    const [sections, setSections] = useState<ObjectiveSection[]>([]);

    // Estado do Modal Jump Ahead
    const [jumpBoss, setJumpBoss] = useState<StudyNode | null>(null);

    // ---------------------------------------------------------
    // 1. CARREGAR A LISTA DE TÓPICOS IRMÃOS (Para a Navegação)
    // ---------------------------------------------------------
    useEffect(() => {
        async function fetchTopics() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data: topicsData, error } = await supabase
                    .from('study_nodes')
                    .select('*')
                    .eq('parent_id', resolvedParams.theme_id)
                    .eq('node_type', 'topic')
                    .order('order_index', { ascending: true });

                if (error) throw error;

                if (topicsData && topicsData.length > 0) {
                    const formattedTopics = topicsData.map((topic, index) => ({
                        ...topic,
                        is_boss: topic.is_boss || false,
                        is_module_boss: topic.is_module_boss || false,
                        visuals: TOPIC_PALETTES[index % TOPIC_PALETTES.length]
                    }));
                    setTopics(formattedTopics);
                } else {
                    // Se não achou tópicos, não há o que mostrar
                }
            } catch (err) {
                console.error("Erro ao carregar tópicos:", err);
            }
        }
        fetchTopics();
    }, [resolvedParams.theme_id]);

    // ---------------------------------------------------------
    // 2. CARREGAR O CONTEÚDO DO TÓPICO ATUAL (Objetivos + Aulas)
    // ---------------------------------------------------------
    useEffect(() => {
        async function fetchContent() {
            // Espera ter os tópicos para poder renderizar corretamente, 
            // embora pudesse buscar paralelo, vamos manter a lógica simples
            // Mas para evitar travamentos, vamos buscar o conteudo base independente

            setLoading(true);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                // A. Buscar OBJETIVOS (As seções dentro da unidade ATUAL: topic_id)
                const { data: objectivesData } = await supabase
                    .from('study_nodes')
                    .select('*')
                    .eq('parent_id', resolvedParams.topic_id)
                    .eq('node_type', 'objective')
                    .order('order_index', { ascending: true });

                if (!objectivesData || objectivesData.length === 0) {
                    setSections([]);
                    setLoading(false);
                    return;
                }

                // B. Buscar TODAS as Subdivisões/Bosses desses objetivos
                const objectiveIds = objectivesData.map(o => o.id);
                const { data: nodesData } = await supabase
                    .from('study_nodes')
                    .select('*')
                    .in('parent_id', objectiveIds)
                    .order('order_index', { ascending: true });

                // C. Buscar o Progresso do Usuário
                const nodeIds = nodesData?.map(n => n.id) || [];
                const { data: progressData } = await supabase
                    .from('user_node_progress')
                    .select('node_id, current_level, is_completed')
                    .eq('user_id', session.user.id)
                    .in('node_id', nodeIds);

                // D. LÓGICA DE BLOQUEIO
                let previousCompleted = true; // O primeiro nó começa liberado

                const structuredSections = objectivesData.map((objective) => {
                    const myNodes = nodesData?.filter(n => n.parent_id === objective.id) || [];
                    myNodes.sort((a, b) => a.order_index - b.order_index);

                    const processedNodes = myNodes.map(node => {
                        const progress = progressData?.find(p => p.node_id === node.id);
                        const currentLevel = progress?.current_level || 0;
                        const isBoss = node.is_boss || node.is_module_boss;

                        // Maestria = Nível 3 (Dourado)
                        const isMastered = currentLevel >= 3;

                        // REGRA DE BLOQUEIO:
                        // Boss: NUNCA bloqueia (sempre clicável para Jump Ahead)
                        // Ilha normal: Bloqueia se o anterior não foi completado E eu ainda não comecei
                        let isLocked = false;
                        if (!isBoss) {
                            isLocked = !previousCompleted && currentLevel === 0;
                        }

                        // Atualiza para o próximo da fila
                        // O próximo só desbloqueia se este atingir maestria (nível 3)
                        previousCompleted = isMastered;

                        return {
                            ...node,
                            is_boss: node.is_boss || false,
                            is_module_boss: node.is_module_boss || false,
                            is_locked: isLocked,
                            progress: {
                                current_level: currentLevel,
                                is_completed: isMastered
                            }
                        };
                    });

                    return {
                        id: objective.id,
                        title: objective.title,
                        order_index: objective.order_index,
                        nodes: processedNodes
                    };
                });

                setSections(structuredSections);

            } catch (err) {
                console.error("Erro ao carregar mapa:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchContent();
    }, [resolvedParams.topic_id]); // Recarrega se o topic_id mudar

    // ---------------------------------------------------------
    // 3. HANDLERS DE INTERAÇÃO
    // ---------------------------------------------------------

    const handleNodeClick = (node: StudyNode) => {
        const isBoss = node.is_boss || node.is_module_boss;

        // Se estiver desbloqueado -> Joga
        if (!node.is_locked) {
            const mode = isBoss ? 'boss' : 'standard';
            router.push(`/praticar/${node.id}?mode=${mode}`);
            return;
        }

        // Se estiver BLOQUEADO mas for Boss -> Oferece Jump Ahead
        if (node.is_locked && isBoss) {
            setJumpBoss(node);
            return;
        }
    };

    const handleStartJump = () => {
        if (!jumpBoss) return;
        router.push(`/praticar/${jumpBoss.id}?mode=jump_ahead`);
    };

    const getProgressStroke = (level: number) => {
        const circumference = 289;
        const percentage = level / 3; // 33%, 66%, 100%
        return circumference - (circumference * percentage);
    };

    // ---------------------------------------------------------
    // 4. PREPARAÇÃO PARA RENDER (Encontrar Tópico Atual)
    // ---------------------------------------------------------

    // Encontra o tópico atual na lista completa para pegar visuais e posição
    const activeTopicIndex = topics.findIndex(t => t.id === resolvedParams.topic_id);
    const activeTopic = topics[activeTopicIndex];

    // Se ainda estiver carregando os tópicos e não tivermos o atual, mostra loading
    // OU se topics já carregou mas não achou o ID (URL inválida), tratamos depois
    if (!activeTopic && loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
            </div>
        );
    }

    // Se topics carregou e ainda não temos activeTopic -> 404 ou vazio
    if (!activeTopic && !loading && topics.length > 0) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p>Tópico não encontrado.</p>
            </div>
        )
    }

    // Mas se topics for vazio e loading false -> Trilha vazia
    if (topics.length === 0 && !loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Trilha Vazia</h2>
                <p className="text-slate-400 mt-2">Nenhum tópico encontrado.</p>
                <button onClick={() => router.back()} className="mt-6 text-violet-600 font-bold hover:underline">Voltar</button>
            </div>
        );
    }

    // Fallback seguro enquanto não sincroniza
    if (!activeTopic) return null;

    // Next/Prev Logic
    const prevTopic = activeTopicIndex > 0 ? topics[activeTopicIndex - 1] : null;
    const nextTopic = activeTopicIndex < topics.length - 1 ? topics[activeTopicIndex + 1] : null;

    let globalNodeIndex = 0;

    return (
        <div className="min-h-screen bg-white md:bg-slate-50 font-sans pb-32">

            {/* GRID DE LAYOUT */}
            <div className="max-w-[1050px] mx-auto md:pt-6 md:px-4 lg:grid lg:grid-cols-[1fr_360px] gap-8 relative">

                {/* === COLUNA CENTRAL: O MAPA === */}
                <main className="relative">

                    {/* HEADER DA UNIDADE ATUAL */}
                    <motion.div
                        key={activeTopic.id}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${activeTopic.visuals.bg} text-white p-6 rounded-b-3xl md:rounded-3xl shadow-lg mb-10 relative overflow-hidden`}
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-[40px] -mr-10 -mt-10"></div>

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-black tracking-tight">{activeTopic.title}</h2>
                                <p className="text-white/90 font-medium text-sm mt-1 max-w-sm">
                                    {activeTopic.description}
                                </p>
                            </div>
                            <BookOpen className="text-white/30 w-12 h-12 absolute right-4 bottom-2" />
                        </div>
                    </motion.div>

                    {/* AS ILHAS (AULAS) AGRUPADAS POR OBJETIVO */}
                    <div className="flex flex-col items-center gap-2 relative px-4">

                        {loading ? (
                            <div className="py-20"><Loader2 className={`animate-spin ${activeTopic.visuals.text}`} /></div>
                        ) : sections.length > 0 ? (
                            sections.map((section) => (
                                <div key={section.id} className="w-full flex flex-col items-center">

                                    {/* TÍTULO DA SEÇÃO (OBJETIVO) - COM BOTÃO INFO */}
                                    <div className="w-full flex items-center justify-center my-6 group">
                                        {/* Linha decorativa esquerda (reage ao hover) */}
                                        <div className="h-[1px] bg-slate-200 w-10 md:w-16 group-hover:bg-violet-200 transition-colors duration-300"></div>

                                        <Link
                                            href={`/trilha/${resolvedParams.theme_id}/${section.id}/info`}
                                            className="mx-2 flex items-center gap-2 px-4 py-1.5 rounded-full hover:bg-violet-50 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-transparent hover:border-violet-100 hover:shadow-sm"
                                            title="Ver Briefing da Missão"
                                        >
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-violet-600 text-center max-w-[200px] transition-colors">
                                                {section.title}
                                            </h3>
                                            <Info size={14} className="text-slate-300 group-hover:text-violet-500 transition-colors mb-0.5" />
                                        </Link>

                                        {/* Linha decorativa direita */}
                                        <div className="h-[1px] bg-slate-200 w-10 md:w-16 group-hover:bg-violet-200 transition-colors duration-300"></div>
                                    </div>

                                    {/* AS ILHAS DESTA SEÇÃO */}
                                    <div className="flex flex-col items-center gap-6 w-full">
                                        {section.nodes.length > 0 ? (
                                            section.nodes.map((node) => {
                                                // Lógica Visual Zig-Zag
                                                let offsetClass = "";
                                                const position = globalNodeIndex % 4;
                                                if (position === 1) offsetClass = "-ml-16 md:-ml-24";
                                                if (position === 3) offsetClass = "ml-16 md:ml-24";
                                                globalNodeIndex++;

                                                const isLocked = node.is_locked;
                                                const currentLevel = node.progress?.current_level || 0;
                                                const isMastered = node.progress?.is_completed;
                                                const isBoss = node.is_boss || node.is_module_boss;

                                                // Cores Dinâmicas
                                                let buttonStyle = "";
                                                if (isLocked) {
                                                    // Boss travado: Cinza claro mas CLICÁVEL
                                                    if (isBoss) buttonStyle = "bg-slate-100 border-slate-300 text-slate-400 cursor-pointer hover:scale-105 hover:bg-slate-200";
                                                    // Ilha travada: Cinza escuro NÃO clicável
                                                    else buttonStyle = "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed";
                                                } else if (isMastered) {
                                                    // Dourado (Maestria)
                                                    buttonStyle = "bg-amber-400 border-amber-600 text-white shadow-lg shadow-amber-200/50";
                                                } else {
                                                    // Boss desbloqueado ou Ilha em progresso
                                                    buttonStyle = isBoss
                                                        ? "bg-rose-600 border-rose-800 text-white shadow-xl shadow-rose-900/30"
                                                        : `${activeTopic.visuals.btn} ${activeTopic.visuals.shadow} text-white shadow-xl`;
                                                }

                                                return (
                                                    <div key={node.id} className={`relative z-10 ${offsetClass}`}>
                                                        <motion.button
                                                            whileTap={!isLocked || (isLocked && isBoss) ? { scale: 0.9, y: 4 } : {}}
                                                            onClick={() => handleNodeClick(node)}
                                                            disabled={isLocked && !isBoss}
                                                            className={`
                                            relative w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center
                                            border-b-[6px] transition-all duration-200 group
                                            ${buttonStyle}
                                        `}
                                                        >
                                                            {/* Tooltip com Título da Aula */}
                                                            <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20">
                                                                <span className="text-xs font-bold text-slate-600">{node.title}</span>
                                                                {isBoss && <span className="ml-1 text-[10px] text-rose-500 font-black">BOSS</span>}
                                                                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-slate-200 rotate-45"></div>
                                                            </div>

                                                            {/* Ícone */}
                                                            <div className="relative z-10">
                                                                {isBoss ? (
                                                                    isMastered ? <Trophy size={32} strokeWidth={2.5} /> : <Skull size={30} strokeWidth={2.5} />
                                                                ) : isMastered ? (
                                                                    <Crown size={32} fill="white" strokeWidth={2} />
                                                                ) : isLocked ? (
                                                                    <Lock size={24} />
                                                                ) : (
                                                                    <Star size={28} fill={currentLevel > 0 ? "white" : "none"} className={currentLevel === 0 ? "animate-pulse" : ""} />
                                                                )}
                                                            </div>

                                                            {/* Anel de Progresso */}
                                                            {!isLocked && !isMastered && !isBoss && currentLevel > 0 && (
                                                                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                                                                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="6" />
                                                                    <circle
                                                                        cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="6"
                                                                        strokeDasharray="289"
                                                                        strokeDashoffset={getProgressStroke(currentLevel)}
                                                                        strokeLinecap="round"
                                                                    />
                                                                </svg>
                                                            )}

                                                            {/* Brilho */}
                                                            {!isLocked && (
                                                                <div className="absolute top-2 left-3 right-3 h-3 bg-white/20 rounded-full"></div>
                                                            )}
                                                        </motion.button>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p className="text-xs text-slate-300">Sem aulas neste objetivo.</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-slate-400 py-10">
                                <p>Nenhum conteúdo encontrado para esta unidade.</p>
                            </div>
                        )}
                    </div>

                </main>

                {/* === COLUNA DIREITA: WIDGETS === */}
                <aside className="hidden lg:block relative">
                    <div className="sticky top-6 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-700">Liga Bronze</h3>
                                <div className="bg-amber-100 text-amber-600 p-1.5 rounded-lg"><Trophy size={18} /></div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-100 border-dashed">
                                <Shield size={32} className="mx-auto text-slate-300 mb-2" />
                                <p className="text-sm font-bold text-slate-400">Em Breve</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden group cursor-pointer">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[50px] opacity-20"></div>
                            <div className="relative z-10 text-center py-4">
                                <div className="flex items-center justify-center mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-white">Publicidade</span>
                                </div>
                                <Gem size={32} className="mx-auto text-indigo-300 mb-2" />
                                <h3 className="font-black text-lg mb-1">MedQuiz Premium</h3>
                                <p className="text-slate-300 text-xs">Remova anúncios.</p>
                            </div>
                        </div>
                    </div>
                </aside>

            </div>

            {/* === ROLETA INFERIOR (TÓPICOS/UNIDADES) === */}
            <div className="fixed bottom-0 left-0 w-full z-40 px-4 pb-4 md:pb-6 pointer-events-none">
                <div className="max-w-[1050px] mx-auto lg:grid lg:grid-cols-[1fr_360px] gap-8">
                    <div className="lg:col-span-1 pointer-events-auto">
                        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl p-3 flex items-center justify-between max-w-md mx-auto">
                            {/* Botão ANTERIOR - Agora é LINK */}
                            {prevTopic ? (
                                <Link
                                    href={`/trilha/${resolvedParams.theme_id}/${prevTopic.id}`}
                                    className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                                >
                                    <ChevronLeft size={24} strokeWidth={3} />
                                </Link>
                            ) : (
                                <button disabled className="p-3 rounded-xl text-slate-200 cursor-not-allowed">
                                    <ChevronLeft size={24} strokeWidth={3} />
                                </button>
                            )}

                            <div className="text-center">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Módulo Atual</div>
                                <div className={`text-sm font-black ${activeTopic.visuals.text}`}>
                                    {activeTopicIndex + 1} / {topics.length}
                                </div>
                            </div>

                            {/* Botão PRÓXIMO - Agora é LINK */}
                            {nextTopic ? (
                                <Link
                                    href={`/trilha/${resolvedParams.theme_id}/${nextTopic.id}`}
                                    className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                                >
                                    <ChevronRight size={24} strokeWidth={3} />
                                </Link>
                            ) : (
                                <button disabled className="p-3 rounded-xl text-slate-200 cursor-not-allowed">
                                    <ChevronRight size={24} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="hidden lg:block"></div>
                </div>
            </div>

            {/* === MODAL DE JUMP AHEAD === */}
            <AnimatePresence>
                {jumpBoss && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setJumpBoss(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="bg-slate-900 p-6 text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-violet-600/20"></div>
                                <Swords className="w-16 h-16 text-amber-400 mx-auto mb-2 relative z-10" />
                                <h2 className="text-2xl font-black text-white relative z-10">Pular Nível?</h2>
                                <p className="text-slate-300 text-sm relative z-10">Desafie o Chefe da Seção</p>
                            </div>

                            <div className="p-6">
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-6">
                                    <AlertTriangle className="text-amber-500 shrink-0" />
                                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                                        Esta é uma prova difícil (20 questões). Se você passar (70%+), todas as aulas anteriores serão marcadas como <strong>Concluídas (Ouro)</strong> automaticamente.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setJumpBoss(null)}
                                        className="flex-1 py-3.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleStartJump}
                                        className="flex-1 py-3.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-transform active:scale-95"
                                    >
                                        Aceitar Desafio
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
