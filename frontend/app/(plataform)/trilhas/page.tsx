"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, Play, Activity, Stethoscope, Brain, Heart, 
  Syringe, Baby, Microscope, ArrowRight, X, Sparkles, Lock,
  ChevronRight,
  LucideIcon
} from "lucide-react";

// --- CONFIGURAÇÃO SUPABASE ---
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- TIPAGEM ---
interface StudyNode {
  id: string;
  title: string;
  description: string;
  node_type: 'area' | 'theme';
  parent_title?: string;
  progress?: {
    current_level: number;
    percentage: number; // <--- CORREÇÃO: Descomentei aqui para o TypeScript aceitar
    is_completed: boolean;
  }
}

// --- DICIONÁRIO VISUAL ---
const AREA_METADATA: Record<string, { color: string, icon: LucideIcon }> = {
  "Ciências Básicas": { color: "bg-emerald-500", icon: Microscope },
  "Clínica Médica": { color: "bg-violet-600", icon: Stethoscope },
  "Cirurgia Geral": { color: "bg-rose-600", icon: Activity },
  "Pediatria": { color: "bg-amber-500", icon: Baby },
  "Ginecologia e Obstetrícia": { color: "bg-pink-500", icon: Heart },
  "Medicina Preventiva": { color: "bg-teal-500", icon: BookOpen },
  "Psiquiatria": { color: "bg-indigo-600", icon: Brain },
  "Infectologia": { color: "bg-lime-600", icon: Syringe },
  "Default": { color: "bg-slate-500", icon: BookOpen }
};

const getVisuals = (title: string) => {
  const key = Object.keys(AREA_METADATA).find(k => title.includes(k)) || "Default";
  return AREA_METADATA[key];
};

export default function TrilhasPage() {
  const router = useRouter();
  const [showAllAreas, setShowAllAreas] = useState(false);
  
  const [areas, setAreas] = useState<StudyNode[]>([]);
  const [activeTracks, setActiveTracks] = useState<StudyNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. BUSCAR ÁREAS
        const { data: areasData } = await supabase
          .from('study_nodes')
          .select('*')
          .eq('node_type', 'area')
          .order('order_index', { ascending: true });

        if (areasData) {
          setAreas(areasData as any);
        }

        // 2. BUSCAR TRILHAS EM ANDAMENTO
        const { data: progressData } = await supabase
          .from('user_node_progress')
          .select(`
            current_level,
            is_completed,
            node_id,
            study_nodes!inner (
              id,
              title,
              description,
              node_type,
              parent_id
            )
          `)
          .eq('user_id', session.user.id)
          .gt('current_level', 0)
          .eq('study_nodes.node_type', 'theme')
          .limit(3);

        if (progressData) {
          const tracksWithParents = await Promise.all(progressData.map(async (item: any) => {
            const node = item.study_nodes;
            
            let parentTitle = "Geral";
            if (node.parent_id) {
              const { data: parent } = await supabase
                .from('study_nodes')
                .select('title')
                .eq('id', node.parent_id)
                .single();
              if (parent) parentTitle = parent.title;
            }

            return {
              id: node.id,
              title: node.title,
              description: node.description,
              node_type: node.node_type,
              parent_title: parentTitle,
              progress: {
                current_level: item.current_level,
                is_completed: item.is_completed,
                percentage: item.current_level * 33 // Aqui calculamos a porcentagem que estava dando erro
              }
            } as StudyNode;
          }));

          setActiveTracks(tracksWithParents);
        }

      } catch (error) {
        console.error("Erro ao carregar trilhas:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const displayedAreas = areas.slice(0, 5);
  const hasMoreAreas = areas.length > 5;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans selection:bg-violet-100 selection:text-violet-900">
      
      <header className="px-6 py-8 md:py-10 max-w-5xl mx-auto">
        
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
            Biblioteca de Estudos
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Explore as trilhas ou continue de onde parou.
          </p>
        </motion.div>

        {activeTracks.length > 0 ? (
          <section className="mb-10">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={14} className="text-violet-500"/> Continue Estudando
            </h2>
            
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide snap-x">
                {activeTracks.map((track, i) => {
                    const visuals = getVisuals(track.parent_title || track.title);
                    return (
                        <motion.div 
                            key={track.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => router.push(`/trilha/${track.id}`)}
                            className="min-w-[85%] md:min-w-[380px] bg-white rounded-3xl p-5 border border-slate-200 shadow-lg shadow-slate-200/50 relative overflow-hidden group cursor-pointer hover:border-violet-300 transition-all snap-center"
                        >
                            <div className={`absolute -right-10 -top-10 w-40 h-40 ${visuals.color} rounded-full blur-[60px] opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-500`}>
                                        {track.parent_title}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 ${visuals.color} rounded-xl flex items-center justify-center text-white shadow-md`}>
                                        <visuals.icon size={24} strokeWidth={2.5}/>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 leading-tight">{track.title}</h3>
                                        <p className="text-xs text-slate-400 font-medium mt-0.5">Nível Atual: {track.progress?.current_level}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                        <span>Progresso do Módulo</span>
                                        {/* AGORA O TYPESCRIPT VAI ACEITAR ISSO */}
                                        <span>{track.progress?.percentage}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full ${visuals.color}`} 
                                          style={{ width: `${track.progress?.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="mt-4 flex justify-end">
                                    <span className="text-xs font-bold text-violet-600 flex items-center gap-1 group-hover:underline">
                                        Continuar <Play size={10} fill="currentColor"/>
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
          </section>
        ) : null}

        <section className="mb-10">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500"/> Recomendado para você
            </h2>
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl shadow-violet-200">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 text-amber-300 border border-white/10">
                            <Lock size={10} /> Em Breve
                        </div>
                        <h3 className="text-2xl font-black mb-2">Descubra seu perfil de estudo</h3>
                        <p className="text-indigo-100 text-sm font-medium leading-relaxed max-w-md">
                            Estamos criando uma IA que analisará suas dificuldades para recomendar as trilhas perfeitas.
                        </p>
                    </div>
                    <button disabled className="bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-xl font-bold text-sm cursor-not-allowed opacity-70">
                        Aguarde Novidades
                    </button>
                </div>
            </div>
        </section>

        <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BookOpen size={14} className="text-emerald-500"/> Explorar Áreas
            </h2>

            {areas.length > 0 ? (
              <div className="space-y-3">
                  {displayedAreas.map((area, index) => {
                      const visuals = getVisuals(area.title);
                      return (
                        <motion.div 
                            key={area.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + (index * 0.05) }}
                            className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
                            onClick={() => router.push(`/trilhas/area/${area.id}`)}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 ${visuals.color} bg-opacity-10 rounded-xl flex items-center justify-center text-white shadow-sm`}>
                                    <visuals.icon size={20} className={visuals.color.replace("bg-", "text-")} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-700">{area.title}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Grande Área</p>
                                </div>
                            </div>
                            <ChevronRight className="text-slate-300 group-hover:text-slate-500 transition-colors w-5 h-5" />
                        </motion.div>
                      );
                  })}
              </div>
            ) : (
               <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-slate-400">
                  <p>Nenhuma área cadastrada no sistema ainda.</p>
               </div>
            )}

            {hasMoreAreas && (
                <button 
                    onClick={() => setShowAllAreas(true)}
                    className="w-full mt-4 py-3 text-sm font-bold text-slate-500 hover:text-violet-600 transition-colors border-t border-slate-100 flex items-center justify-center gap-2"
                >
                    Ver todas as {areas.length} áreas <ArrowRight size={14} />
                </button>
            )}
        </section>

      </header>

      <AnimatePresence>
        {showAllAreas && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setShowAllAreas(false)}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative z-10 overflow-hidden max-h-[80vh] flex flex-col"
                >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                        <h3 className="text-xl font-black text-slate-800">Todas as Áreas</h3>
                        <button onClick={() => setShowAllAreas(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                        <div className="grid grid-cols-1 gap-3">
                            {areas.map((area) => {
                                const visuals = getVisuals(area.title);
                                return (
                                  <div 
                                      key={area.id}
                                      className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-slate-100"
                                      onClick={() => router.push(`/trilhas/area/${area.id}`)}
                                  >
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${visuals.color} bg-opacity-20`}>
                                          <visuals.icon size={20} className={visuals.color.replace("bg-", "text-")} />
                                      </div>
                                      <span className="font-bold text-slate-700">{area.title}</span>
                                  </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
}