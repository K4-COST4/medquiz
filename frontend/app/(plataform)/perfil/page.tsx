"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, LogOut, Zap, User, 
  Brain, Shield, Award, Flame, Target, Settings, Crown,
  Activity, Stethoscope, Edit2, Check, X, Copy, Hash
} from "lucide-react";

// --- CONFIGURAÇÃO ---
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Nova Cor Primária (Roxo MedQuiz)
const COR_PRIMARIA = "#8b5cf6"; // Violet-500

// --- COMPONENTE: CARD DE ESTATÍSTICA ---
function StatCard({ icon: Icon, label, value, color, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-1 group"
    >
      <div className={`p-3 rounded-2xl ${color.bg} ${color.text} group-hover:scale-110 transition-transform`}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
      <div>
        <div className="text-2xl font-black text-slate-800 tracking-tight">{value}</div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
      </div>
    </motion.div>
  )
}

// --- LÓGICA DE TÍTULOS (Hierarquia Médica) ---
function getTitulo(xp: number) {
  // Mantive cores distintas para os cargos para dar senso de progressão, 
  // mas o tema geral do site agora é roxo.
  if (xp < 500) return { titulo: "Estudante", cor: "text-slate-500", bg: "bg-slate-100", icon: Brain };
  if (xp < 1500) return { titulo: "Interno", cor: "text-blue-500", bg: "bg-blue-100", icon: Activity };
  if (xp < 3000) return { titulo: "Residente R1", cor: "text-emerald-500", bg: "bg-emerald-100", icon: Stethoscope };
  if (xp < 5000) return { titulo: "Especialista", cor: "text-violet-500", bg: "bg-violet-100", icon: Shield };
  return { titulo: "Staff", cor: "text-amber-500", bg: "bg-amber-100", icon: Crown };
}

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados de Edição
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) { 
        router.push("/login"); 
        return; 
      }
      
      setUser(session.user);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // Fallback robusto
      const perfilData = data || { 
        xp: 0, 
        nome: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        streak: 0,
        precisao: 0
      };

      setPerfil(perfilData);
      setTempName(perfilData.nome); 
      setLoading(false);
    }
    getData();
  }, [router]);

  // Função para salvar o novo nome NO SUPABASE
  async function salvarNome() {
    if (!tempName.trim()) return;
    setIsSaving(true);

    // Atualiza no Banco de Dados
    const { error } = await supabase
      .from('profiles')
      .update({ nome: tempName })
      .eq('id', user.id);

    if (!error) {
      // Atualiza na tela (Optimistic UI)
      setPerfil({ ...perfil, nome: tempName });
      setIsEditing(false);
    } else {
      alert("Erro ao salvar nome. Tente novamente.");
    }
    setIsSaving(false);
  }

  const copiarID = () => {
    navigator.clipboard.writeText(user?.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin"></div>
       </div>
    );
  }

  const xpAtual = perfil?.xp || 0;
  const nivel = Math.floor(xpAtual / 1000) + 1;
  const xpProximoNivel = nivel * 1000;
  const progressoNivel = ((xpAtual % 1000) / 1000) * 100;
  
  const tituloInfo = getTitulo(xpAtual);
  const TituloIcon = tituloInfo.icon;
  const streakAtual = perfil?.streak || 0;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 selection:bg-violet-100 selection:text-violet-900">
      
      {/* HEADER ROXO/MEDQUIZ */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 shadow-sm">
         <div className="max-w-4xl mx-auto px-6 h-full flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push("/")}>
               <div className="bg-violet-600 p-1.5 rounded-lg shadow-lg shadow-violet-200 group-hover:scale-105 transition-transform">
                 <Brain className="text-white w-4 h-4"/>
               </div>
               <span className="text-lg font-extrabold text-slate-700 tracking-tight">Med<span className="text-violet-600">Quiz</span></span>
            </div>
            <button onClick={() => router.push("/")} className="text-slate-400 font-bold text-xs hover:text-violet-600 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-full hover:bg-violet-50">
                <ArrowLeft size={14} strokeWidth={3}/> VOLTAR
            </button>
         </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        
        {/* CARTÃO DE PERFIL */}
        <motion.div 
          initial={{opacity: 0, y: 10}} animate={{opacity: 1, y: 0}}
          className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-xl shadow-slate-200/60 mb-6 relative overflow-hidden"
        >
            {/* Background Decorativo Roxo */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-violet-100 to-fuchsia-50 rounded-full blur-3xl opacity-60"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
                
                {/* Avatar com Gradiente Roxo */}
                <div className="relative group">
                    <div className="w-28 h-28 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200 rotate-3 group-hover:rotate-0 transition-all duration-300">
                        <span className="text-4xl font-black text-white uppercase select-none">
                            {perfil?.nome?.[0] || user?.email?.[0]}
                        </span>
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded-lg border-2 border-white shadow-sm">
                        Lvl.{nivel}
                    </div>
                </div>

                <div className="flex-1 w-full text-center md:text-left">
                    
                    {/* Tags */}
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${tituloInfo.bg} ${tituloInfo.cor} flex items-center gap-1.5`}>
                           <TituloIcon size={12} /> {tituloInfo.titulo}
                        </span>
                    </div>
                    
                    {/* Nome Editável */}
                    <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                        {isEditing ? (
                            <div className="flex items-center gap-2 w-full max-w-xs">
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="text-2xl font-black text-slate-800 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-violet-500"
                                />
                                <button onClick={salvarNome} disabled={isSaving} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                                    <Check size={18} />
                                </button>
                                <button onClick={() => { setIsEditing(false); setTempName(perfil.nome); }} className="p-2 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl font-black text-slate-800 truncate max-w-[250px] md:max-w-md">
                                    {perfil?.nome}
                                </h1>
                                <button onClick={() => setIsEditing(true)} className="text-slate-300 hover:text-violet-500 transition-colors p-1">
                                    <Edit2 size={16} />
                                </button>
                            </>
                        )}
                    </div>

                    {/* ID */}
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-5">
                        <div 
                           onClick={copiarID}
                           className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full cursor-pointer hover:bg-slate-100 transition-colors group"
                        >
                            <Hash size={12} className="text-slate-400"/>
                            <span className="text-xs font-mono font-medium text-slate-500">
                                {copiedId ? "Copiado!" : `ID: ${user?.id.slice(0, 8)}...`}
                            </span>
                            {!copiedId && <Copy size={10} className="text-slate-300 group-hover:text-violet-500"/>}
                        </div>
                    </div>

                    {/* Barra de Progresso Roxa */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Progresso Atual</span>
                            <span>{Math.round(progressoNivel)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progressoNivel}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full" 
                            />
                        </div>
                        <div className="text-right text-[10px] font-bold text-slate-400">
                            {xpProximoNivel - xpAtual} XP para o próximo nível
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <StatCard 
               icon={Zap} 
               label="Total de XP" 
               value={xpAtual.toLocaleString()} 
               color={{bg: "bg-amber-50", text: "text-amber-500"}} 
               delay={0.1}
            />
            <StatCard 
               icon={Flame} 
               label="Sequência (Dias)" 
               value={streakAtual} 
               color={{bg: "bg-rose-50", text: "text-rose-500"}} 
               delay={0.2}
            />
            <StatCard 
               icon={Target} 
               label="Precisão" 
               value={`${perfil?.precisao || 0}%`} 
               color={{bg: "bg-emerald-50", text: "text-emerald-500"}} 
               delay={0.3}
            />
        </div>

        {/* BOTÕES DE AÇÃO */}
        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.4}} className="flex flex-col gap-3">
             <button 
                className="w-full bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between text-slate-600 font-bold hover:bg-slate-50 transition-colors group"
             >
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500 group-hover:text-violet-600 transition-colors"><Settings size={20}/></div>
                    <span>Configurações da Conta</span>
                </div>
                <ArrowLeft size={16} className="rotate-180 text-slate-300"/>
             </button>

             <button 
                onClick={sair} 
                className="w-full bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center justify-center gap-2 text-rose-500 font-bold hover:bg-rose-100 transition-colors"
             >
                <LogOut size={18}/> Encerrar Sessão
            </button>
        </motion.div>
        
        <div className="mt-8 text-center">
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">MedQuiz ID: {user?.id.slice(0,6)}</p>
        </div>

      </main>
    </div>
  );
}