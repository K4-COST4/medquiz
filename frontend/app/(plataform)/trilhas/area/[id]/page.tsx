"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Search, BookOpen, Brain, Heart, 
  Activity, Stethoscope, Microscope, Baby, Syringe,
  PlayCircle, Lock, LucideIcon
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
  progress?: {
    current_level: number;
    percentage: number;
    is_completed: boolean;
  };
  // Propriedade visual calculada no front
  visuals?: {
    color: string;
    text_color: string;
    icon: LucideIcon;
  }
}

// --- DICIONÁRIO VISUAL (Consistência com a Home) ---
const AREA_METADATA: Record<string, { color: string, text_color: string, icon: LucideIcon }> = {
  "Ciências Básicas": { color: "bg-emerald-500", text_color: "text-emerald-600", icon: Microscope },
  "Clínica Médica": { color: "bg-violet-600", text_color: "text-violet-600", icon: Stethoscope },
  "Cirurgia Geral": { color: "bg-rose-600", text_color: "text-rose-600", icon: Activity },
  "Pediatria": { color: "bg-amber-500", text_color: "text-amber-600", icon: Baby },
  "Ginecologia e Obstetrícia": { color: "bg-pink-500", text_color: "text-pink-600", icon: Heart },
  "Medicina Preventiva": { color: "bg-teal-500", text_color: "text-teal-600", icon: BookOpen },
  "Psiquiatria": { color: "bg-indigo-600", text_color: "text-indigo-600", icon: Brain },
  "Infectologia": { color: "bg-lime-600", text_color: "text-lime-600", icon: Syringe },
  "Default": { color: "bg-slate-500", text_color: "text-slate-600", icon: BookOpen }
};

const getVisuals = (title: string) => {
  const key = Object.keys(AREA_METADATA).find(k => title.includes(k)) || "Default";
  return AREA_METADATA[key];
};

export default function AreaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Desembrulha a Promise dos params (Next.js 15+)
  const resolvedParams = use(params); 
  
  const [areaInfo, setAreaInfo] = useState<StudyNode | null>(null);
  const [themes, setThemes] = useState<StudyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. BUSCAR A GRANDE ÁREA (Cabeçalho)
        const { data: areaData, error: areaError } = await supabase
          .from('study_nodes')
          .select('*')
          .eq('id', resolvedParams.id)
          .eq('node_type', 'area')
          .single();

        if (areaError || !areaData) {
          console.error("Área não encontrada", areaError);
          router.push('/trilhas');
          return;
        }

        // Calcula visuais da área
        const areaVisuals = getVisuals(areaData.title);
        setAreaInfo({ ...areaData, visuals: areaVisuals });

        // 2. BUSCAR OS TEMAS FILHOS
        const { data: themesData, error: themesError } = await supabase
          .from('study_nodes')
          .select('*')
          .eq('parent_id', resolvedParams.id) // Busca filhos dessa área
          .eq('node_type', 'theme')
          .order('title', { ascending: true }); // Já traz em ordem alfabética do banco

        if (themesData) {
          // 3. BUSCAR PROGRESSO DO USUÁRIO NESSES TEMAS
          // Precisamos saber quais desses temas o usuário já começou
          const themeIds = themesData.map(t => t.id);
          
          const { data: progressData } = await supabase
            .from('user_node_progress')
            .select('node_id, current_level, is_completed')
            .eq('user_id', session.user.id)
            .in('node_id', themeIds);

          // 4. MERGE (Misturar dados dos temas com o progresso)
          const themesWithProgress = themesData.map(theme => {
            const userProgress = progressData?.find(p => p.node_id === theme.id);
            const currentLevel = userProgress?.current_level || 0;
            
            // Lógica de cálculo de porcentagem baseada no nível (estimativa)
            // Nível 0 = 0%, Nível 1 = 33%, Nível 2 = 66%, Nível 3 = 100%
            let percentage = 0;
            if (userProgress?.is_completed) percentage = 100;
            else if (currentLevel > 0) percentage = Math.min(currentLevel * 33, 90);

            return {
              ...theme,
              progress: {
                current_level: currentLevel,
                is_completed: userProgress?.is_completed || false,
                percentage
              },
              visuals: areaVisuals // Temas herdam a cor da Área Pai
            };
          });

          setThemes(themesWithProgress);
        }

      } catch (error) {
        console.error("Erro ao carregar temas:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [resolvedParams.id]);

  // FILTRO DE BUSCA (Client-side é ok para listas de até ~100 itens)
  const filteredThemes = themes.filter(theme => 
    theme.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!areaInfo) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
            <h1 className="text-xl font-bold text-slate-800">Área não encontrada</h1>
            <button onClick={() => router.back()} className="mt-4 text-emerald-600 font-bold hover:underline">Voltar</button>
        </div>
    )
  }

  const VisualIcon = areaInfo.visuals!.icon;

  return (
    <div className={`min-h-screen bg-slate-50 pb-20 font-sans selection:bg-opacity-30 selection:${areaInfo.visuals!.color}`}>
      
      {/* HEADER DA ÁREA */}
      {/* CORREÇÃO AQUI: Removi 'overflow-hidden' do header principal para a barra não cortar */}
      <header className={`relative ${areaInfo.visuals!.color} text-white pt-10 pb-16 px-6`}>
        
        {/* Container separado com overflow-hidden apenas para o background decorativo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-[80px] -mr-10 -mt-10"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-5 rounded-full blur-[50px] -ml-10 -mb-10"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 text-white/80 hover:text-white font-bold text-sm mb-6 transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={3} /> VOLTAR
          </button>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
              <VisualIcon size={40} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                  Grande Área
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">{areaInfo.title}</h1>
              <p className="text-white/90 text-sm md:text-base font-medium max-w-xl leading-relaxed">
                {areaInfo.description}
              </p>
            </div>
          </div>
        </div>

        {/* BARRA DE PESQUISA (Flutuante no meio da divisa) */}
        <div className="absolute -bottom-7 left-0 w-full px-6 z-20">
            <div className="max-w-2xl mx-auto relative">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search className="text-slate-400" size={20} />
                </div>
                <input 
                    type="text" 
                    placeholder={`Buscar tema em ${areaInfo.title}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-0 shadow-xl shadow-slate-200/50 text-slate-700 font-bold placeholder:text-slate-400 placeholder:font-medium focus:ring-4 focus:ring-black/5 outline-none"
                />
            </div>
        </div>
      </header>

      {/* LISTA DE TEMAS */}
      <main className="max-w-4xl mx-auto px-6 pt-16">
        
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                {filteredThemes.length} Temas Disponíveis
            </h2>
            <div className="text-slate-300 text-[10px] font-bold uppercase">
                Ordem A-Z
            </div>
        </div>

        {filteredThemes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredThemes.map((theme, index) => (
                    <motion.div
                        key={theme.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        // Leva para o Mapa da Trilha
                        onClick={() => router.push(`/trilha/${theme.id}`)}
                        className={`
                            bg-white p-5 rounded-2xl border flex items-center gap-4 transition-all group relative overflow-hidden cursor-pointer
                            border-slate-100 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50
                        `}
                    >
                        {/* Ícone (Usa o ícone da Área para manter o tema, ou um genérico de livro) */}
                        <div className={`
                            w-14 h-14 rounded-xl flex items-center justify-center transition-colors
                            bg-slate-50 text-slate-500 group-hover:${theme.visuals!.color} group-hover:text-white
                        `}>
                            {/* Podemos usar um ícone genérico de 'Book' para temas, já que não temos ícone específico no banco para cada tema ainda */}
                            <BookOpen size={24} strokeWidth={2} />
                        </div>

                        {/* Texto */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-bold text-lg text-slate-800 group-hover:text-slate-900">
                                    {theme.title}
                                </h3>
                            </div>
                            
                            <p className="text-xs text-slate-400 font-medium line-clamp-2 leading-relaxed">
                                {theme.description}
                            </p>

                            {/* Barra de Progresso (Se iniciado) */}
                            {(theme.progress?.percentage || 0) > 0 && (
                                <div className="mt-3 flex items-center gap-2">
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${theme.visuals!.color}`} 
                                            style={{ width: `${theme.progress?.percentage}%` }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-bold ${theme.visuals!.text_color}`}>
                                        {Math.round(theme.progress?.percentage!)}%
                                    </span>
                                </div>
                            )}
                            
                            {/* Call to Action (Hover) se não iniciado */}
                            {(theme.progress?.percentage || 0) === 0 && (
                                <div className={`mt-2 text-[10px] font-bold text-slate-300 group-hover:${theme.visuals!.text_color} transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300`}>
                                    Iniciar Trilha <PlayCircle size={10} />
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4">
                    <Search className="text-slate-300" size={32} />
                </div>
                <h3 className="text-slate-800 font-bold text-lg mb-1">Nenhum tema encontrado</h3>
                <p className="text-slate-400 text-sm">
                    {searchTerm ? `Não achamos nada com "${searchTerm}".` : "Esta área ainda não possui temas cadastrados."}
                </p>
                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm("")}
                        className={`mt-4 px-6 py-2 rounded-xl font-bold text-sm text-white ${areaInfo.visuals!.color}`}
                    >
                        Limpar busca
                    </button>
                )}
            </div>
        )}

      </main>
    </div>
  );
}