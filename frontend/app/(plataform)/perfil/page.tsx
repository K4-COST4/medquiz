"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, LogOut, Zap, User, 
  Brain, Shield, Award, Flame, Target, Settings, Crown
} from "lucide-react";

// --- CONFIGURAÇÃO SUPABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const COR_PRINCIPAL = "#0cb7f2"; 

// --- COMPONENTE DE ESTATÍSTICA ---
function StatCard({ icon: Icon, label, value, color, delay }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
    >
      <div className={`p-4 rounded-2xl ${color.bg} ${color.text}`}>
        <Icon size={24} />
      </div>
      <div>
        <div className="text-2xl font-black text-slate-800">{value}</div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      </div>
    </motion.div>
  )
}

// --- FUNÇÃO PARA CALCULAR TÍTULO MÉDICO ---
function getTitulo(xp: number) {
  if (xp < 500) return { titulo: "Estudante de Medicina", cor: "text-slate-500", icon: Brain };
  if (xp < 1500) return { titulo: "Interno", cor: "text-blue-500", icon: Activity };
  if (xp < 3000) return { titulo: "Residente R1", cor: "text-emerald-500", icon: Stethoscope };
  if (xp < 5000) return { titulo: "Residente R3", cor: "text-purple-500", icon: Shield };
  return { titulo: "Chefe de Plantão", cor: "text-amber-500", icon: Crown };
}

// Importando ícones extras para usar na função acima se necessário, 
// mas como Stethoscope/Activity não estão importados no topo, vou usar genéricos.
// Ajuste rápido:
import { Activity, Stethoscope } from "lucide-react"; 

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setUser(session.user);
      
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
      setPerfil(data || { xp: 0, nome: session.user.email?.split('@')[0] });
      setLoading(false);
    }
    getData();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
       <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0cb7f2] rounded-full animate-spin"></div>
       </div>
    );
  }

  // Cálculos de Nível
  const xpAtual = perfil?.xp || 0;
  const nivel = Math.floor(xpAtual / 1000) + 1;
  const xpProximoNivel = nivel * 1000;
  const progressoNivel = ((xpAtual % 1000) / 1000) * 100;
  
  const tituloInfo = getTitulo(xpAtual);
  const TituloIcon = tituloInfo.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* HEADER FIXO */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 shadow-sm">
         <div className="max-w-4xl mx-auto px-6 h-full flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
               <div className="bg-[#0cb7f2] p-2 rounded-xl shadow-lg shadow-blue-200"><Brain className="text-white w-5 h-5"/></div>
               <span className="text-xl font-extrabold text-slate-700 tracking-tight">Medi<span style={{color: COR_PRINCIPAL}}>Lingo</span></span>
            </div>
            <button onClick={() => router.push("/")} className="text-slate-400 font-bold text-sm hover:text-[#0cb7f2] flex items-center gap-1 transition-colors">
                <ArrowLeft size={16}/> VOLTAR
            </button>
         </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        
        {/* CARTÃO DE PERFIL PRINCIPAL */}
        <motion.div 
          initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}}
          className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-xl shadow-slate-200/50 mb-8 relative overflow-hidden"
        >
            {/* Background Decorativo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                {/* Avatar */}
                <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-[#0cb7f2] to-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-300 ring-8 ring-blue-50">
                    <span className="text-5xl font-black text-white uppercase">
                        {perfil?.nome?.[0] || "U"}
                    </span>
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 ${tituloInfo.cor} flex items-center gap-1`}>
                           <TituloIcon size={12} /> {tituloInfo.titulo}
                        </span>
                        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-600 border border-amber-200">
                           Nível {nivel}
                        </span>
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-1">{perfil?.nome || "Estudante"}</h1>
                    <p className="text-slate-400 font-medium mb-6">{user?.email}</p>

                    {/* Barra de XP */}
                    <div className="w-full max-w-md bg-slate-100 h-4 rounded-full overflow-hidden relative">
                        <div 
                          className="bg-gradient-to-r from-[#0cb7f2] to-blue-500 h-full rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${progressoNivel}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between max-w-md mt-2 text-xs font-bold text-slate-400">
                        <span>{xpAtual} XP</span>
                        <span>{xpProximoNivel} XP (Próx. Nível)</span>
                    </div>
                </div>
                
                {/* Botão de Config (Decorativo) */}
                <div className="absolute top-6 right-6">
                    <button className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                        <Settings size={24} />
                    </button>
                </div>
            </div>
        </motion.div>

        {/* GRID DE ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard 
               icon={Zap} 
               label="Total de XP" 
               value={xpAtual} 
               color={{bg: "bg-amber-50", text: "text-amber-500"}} 
               delay={0.1}
            />
            <StatCard 
               icon={Flame} 
               label="Ofensiva (Dias)" 
               value="3" 
               color={{bg: "bg-rose-50", text: "text-rose-500"}} 
               delay={0.2}
            />
            <StatCard 
               icon={Target} 
               label="Precisão Média" 
               value="87%" 
               color={{bg: "bg-emerald-50", text: "text-emerald-500"}} 
               delay={0.3}
            />
        </div>

        {/* CONQUISTAS (VISUAL) */}
        <motion.div initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.4}} className="bg-white rounded-3xl p-8 border border-slate-200">
            <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <Award className="text-amber-500"/> Conquistas Recentes
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 text-center transition-all ${i <= 2 ? "border-slate-100 bg-slate-50" : "border-slate-100 opacity-50 grayscale"}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${i <= 2 ? "bg-white shadow-sm" : "bg-slate-200"}`}>
                            {i === 1 ? "🚀" : i === 2 ? "🔥" : i === 3 ? "🧠" : "🏆"}
                        </div>
                        <div>
                            <div className="font-bold text-slate-700 text-sm">{i === 1 ? "Primeiro Passo" : i === 2 ? "Em Chamas" : "Sabe Tudo"}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{i <= 2 ? "Desbloqueado" : "Bloqueado"}</div>
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>

        {/* BOTÃO SAIR */}
        <div className="mt-12 text-center">
            <button 
               onClick={sair} 
               className="inline-flex items-center gap-2 text-rose-500 hover:text-rose-600 font-bold px-6 py-3 rounded-2xl hover:bg-rose-50 transition-colors"
            >
                <LogOut size={18}/> Encerrar Sessão
            </button>
            <p className="text-slate-300 text-xs mt-4 font-medium">MediLingo v1.0.0 (MVP)</p>
        </div>

      </main>
    </div>
  );
}