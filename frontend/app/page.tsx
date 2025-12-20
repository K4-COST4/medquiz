"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, Activity, ChevronRight, LogOut, Zap, User, 
  AlertTriangle, ArrowLeft, Stethoscope, Microscope, 
  Dna, LayoutGrid, Lock, Star, Skull, CheckCircle,
  PlayCircle, Award, ShoppingBag, Flame
} from "lucide-react";

// --- CONFIGURAÇÃO SUPABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const COR_PRINCIPAL = "#0cb7f2"; 

// --- COMPONENTE: NÓ DO MAPA (BOLINHAS) ---
function CheckpointNode({ index, total, onClick, unlocked, completed }: any) {
  const isBoss = index === total - 1;
  const zigzag = (index % 2 === 0) ? 0 : (index % 4 === 1 ? 50 : -50); 
  
  let baseColor = "bg-blue-500 border-blue-400 shadow-blue-200 ring-4 ring-blue-50"; 
  let iconColor = "text-white";
  let size = "w-[80px] h-[80px]";
  
  if (index >= 2 && !isBoss) baseColor = "bg-amber-400 border-amber-300 shadow-amber-200 ring-4 ring-amber-50";
  if (isBoss) {
      baseColor = "bg-rose-500 border-rose-400 shadow-rose-200 ring-4 ring-rose-50";
      size = "w-[100px] h-[100px]";
  }

  let finalClass = `shadow-xl ${baseColor} cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300`;
  let icon = <Star className="w-8 h-8 text-white fill-white/20" />;
  
  if (!unlocked) {
      finalClass = "bg-slate-200 border-slate-300 shadow-none cursor-not-allowed grayscale opacity-60 ring-4 ring-slate-100";
      icon = <Lock className="w-6 h-6 text-slate-400" />;
  } else if (completed) {
      icon = <CheckCircle className="w-8 h-8 text-white font-bold" />;
      finalClass += " brightness-110";
  }

  if (isBoss && unlocked) icon = <Skull className="w-10 h-10 text-white animate-pulse" />;

  return (
    <div className="flex justify-center w-full relative h-[130px] items-center" style={{ transform: `translateX(${zigzag}px)` }}>
        <div className="relative group z-10">
            {/* Tooltip */}
            {unlocked && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="absolute bottom-[120%] left-1/2 -translate-x-1/2 bg-slate-800 text-white p-3 rounded-xl shadow-2xl w-48 text-center z-50 pointer-events-none"
                >
                    <div className="font-bold text-sm mb-1">{isBoss ? "BOSS FINAL" : `Nível ${index + 1}`}</div>
                    
                    {/* --- AQUI ESTÁ A MUDANÇA --- */}
                    <div className="text-[10px] font-bold tracking-wider text-[#0cb7f2] uppercase">
                        {isBoss ? "Meta: 7/10 • +15 XP Bônus" : "Meta: 4/5 Acertos"}
                    </div>
                    {/* --------------------------- */}

                    <div className="absolute top-full left-1/2 -ml-2 border-[8px] border-transparent border-t-slate-800"></div>
                </motion.div>
            )}

            {/* Linha Conectora */}
            {index < total - 1 && (
                <div className="absolute top-1/2 left-1/2 w-1 h-[140px] -z-10 border-l-[3px] border-dashed border-slate-300 origin-top" 
                     style={{ transform: index % 2 === 0 ? "rotate(-22deg)" : "rotate(22deg)" }}></div>
            )}

            <button 
                onClick={() => unlocked && onClick(index, isBoss)}
                className={`relative ${size} rounded-full flex items-center justify-center border-[5px] border-white ${finalClass}`}
            >
                {icon}
                {/* Brilho interno se desbloqueado */}
                {unlocked && !completed && <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>}
            </button>
        </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  
  // --- ESTADOS GERAIS ---
  const [user, setUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [xpGanhoSessao, setXpGanhoSessao] = useState(0);

  // --- NAVEGAÇÃO ---
  const [areas, setAreas] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [disciplinas, setDisciplinas] = useState([]);
  const [topicos, setTopicos] = useState([]);
  const [mapaProgresso, setMapaProgresso] = useState<Record<number, number>>({});

  const [selectedArea, setSelectedArea] = useState<any>(null);
  const [selectedSystem, setSelectedSystem] = useState<any>(null);
  const [selectedDisciplina, setSelectedDisciplina] = useState<any>(null);
  const [selectedTopico, setSelectedTopico] = useState<any>(null);

  // --- QUIZ & SESSÃO ---
  const [modoQuiz, setModoQuiz] = useState(false);
  const [filaQuestoes, setFilaQuestoes] = useState<any[]>([]);
  const [indiceQuestao, setIndiceQuestao] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sessaoConcluida, setSessaoConcluida] = useState(false);
  const [scoreSessao, setScoreSessao] = useState(0);
  const [nivelJogando, setNivelJogando] = useState(0); // Qual bolinha clicou

  const questaoAtual = filaQuestoes[indiceQuestao];

  // --- INICIALIZAÇÃO BLINDADA ---
  useEffect(() => {
    async function init() {
      // 1. Pega Sessão
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        
        // 2. Carrega Perfil e Progresso EM PARALELO
        await Promise.all([
            atualizarPerfil(session.user.id),
            carregarProgresso(session.user.id) // <--- Isso aqui tem que rodar!
        ]);
      }

      // 3. Carrega Áreas
      try {
        const res = await fetch("process.env.NEXT_PUBLIC_API_URL/areas");
        if (res.ok) setAreas(await res.json());
      } catch(e) { console.error("API Offline"); }
      
      setLoading(false);
    }
    
    init();
  }, []);

  // Função dedicada para garantir que o XP esteja sempre syncado
  async function atualizarPerfil(userId: string) {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data) setPerfil(data);
  }

  async function carregarProgresso(userId: string) {
      try {
          const res = await fetch(`process.env.NEXT_PUBLIC_API_URL/progresso/${userId}`);
          const data = await res.json();
          setMapaProgresso(data);
      } catch (e) { console.error(e); }
  }

  // --- FUNÇÕES DE NAVEGAÇÃO ---
  async function selArea(item: any) { setSelectedArea(item); const res = await fetch(`process.env.NEXT_PUBLIC_API_URL/sistemas/${item.id}`); setSistemas(await res.json()); }
  async function selSistema(item: any) { setSelectedSystem(item); const res = await fetch(`process.env.NEXT_PUBLIC_API_URL/trilhas/${item.id}`); setDisciplinas(await res.json()); }
  async function selDisciplina(item: any) { setSelectedDisciplina(item); const res = await fetch(`process.env.NEXT_PUBLIC_API_URL/ilhas/${item.id}`); setTopicos(await res.json()); }
  function selTopico(item: any) { setSelectedTopico(item); }

  function resetArea() { setSelectedArea(null); setSelectedSystem(null); setSelectedDisciplina(null); setSelectedTopico(null); }
  function resetSistema() { setSelectedSystem(null); setSelectedDisciplina(null); setSelectedTopico(null); }
  function resetDisciplina() { setSelectedDisciplina(null); setSelectedTopico(null); }
  function resetTopico() { setSelectedTopico(null); }

  async function sair() { await supabase.auth.signOut(); window.location.reload(); }

  // --- LÓGICA DO JOGO (CHECKPOINTS) ---
  async function iniciarCheckpoint(index: number, isBoss: boolean) {
      if (!user) return;
      setNivelJogando(index);
      setLoading(true);
      setSessaoConcluida(false);
      setScoreSessao(0);
      setIndiceQuestao(0);
      setFeedback(null);
      setXpGanhoSessao(0); // Reseta o XP visual da sessão

      // --- ALTERAÇÃO AQUI ---
      let diff = "Fácil";
      let qtd = 5; 

      if (index >= 2) diff = "Médio";
      
      // Configuração do Boss
      if (isBoss) { 
          diff = "Difícil"; 
          qtd = 10; // Boss exige 10 questões
      }
      // ----------------------

      // Dentro de async function iniciarCheckpoint...

      try {
          // --- ALTERAÇÃO AQUI: Adicionei o user_id na URL ---
          const url = `process.env.NEXT_PUBLIC_API_URL/praticar/session/${selectedTopico.id}?user_id=${user.id}&quantidade=${qtd}&dificuldade=${diff}`;
          // --------------------------------------------------
          const res = await fetch(url);
          let lista = await res.json();

          // Fallback se backend falhar
          if (!lista || lista.length === 0) {
             const resB = await fetch(`process.env.NEXT_PUBLIC_API_URL/praticar/ilha/${selectedTopico.id}`);
             if(resB.ok) lista = [await resB.json()];
          }

          if (lista && lista.length > 0) {
              setFilaQuestoes(lista);
              setModoQuiz(true);
          } else {
              alert("A IA está gerando questões. Tente em 5 segundos.");
          }
      } catch (e) {
          alert("Erro de conexão com o servidor.");
      } finally {
          setLoading(false);
      }
  }

  async function verificarResposta(alternativa: string) {
      const correta = questaoAtual.correta?.trim().toUpperCase();
      const userResp = alternativa.trim().toUpperCase();
      const acertou = correta === userResp;

      // --- LÓGICA DE XP ESCALONADO ---
      let xpQuestao = 0;
      const dif = questaoAtual.dificuldade; // Certifique-se que o backend manda isso

      if (acertou) {
          if (dif === "Fácil") xpQuestao = 1;
          else if (dif === "Médio") xpQuestao = 3;
          else if (dif === "Difícil") xpQuestao = 5;
          else xpQuestao = 1; // Padrão se não vier nada

          setFeedback(`✅ Correto! (+${xpQuestao} XP) ` + questaoAtual.explicacao);
          setScoreSessao(s => s + 1);
          setXpGanhoSessao(s => s + xpQuestao); // Acumula para mostrar no final

          // Atualiza visualmente na hora
          if (perfil) setPerfil({ ...perfil, xp: perfil.xp + xpQuestao });
      } else {
          setFeedback(`❌ Incorreto. Correta: ${questaoAtual.correta}.\n\n${questaoAtual.explicacao}`);
      }
      // ---------------------------------

      if (user) {
          // Salva histórico
          await fetch("process.env.NEXT_PUBLIC_API_URL/historico", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: user.id, question_id: questaoAtual.id, is_correct: acertou })
          });
          
          // Salva XP no banco
          if (acertou && xpQuestao > 0) {
              await supabase.rpc("increment_xp", { quantidade: xpQuestao });
          }
      }
  }

  // --- FUNÇÃO QUE FALTAVA ---
  async function avancarQuestao() {
      setFeedback(null);
      // Se ainda tem questões na fila, avança o índice
      if (indiceQuestao + 1 < filaQuestoes.length) {
          setIndiceQuestao(i => i + 1);
      } else {
          // Se acabou, chama a finalização
          await finalizarSessao();
      }
  }
 // --- FINALIZAR SESSÃO, APLICAR REGRAS E SALVAR ---
  async function finalizarSessao() {
      setSessaoConcluida(true);
      
      // 1. Identifica se é Boss e define a Meta
      const isBoss = nivelJogando === 4; // Índice 4 = Quinto nível (Boss)
      const meta = isBoss ? 7 : 4;       // Boss exige 7/10, Checkpoint exige 4/5
      
      const aprovado = scoreSessao >= meta;

      if (aprovado && user && selectedTopico) {
          const novoNivel = nivelJogando + 1;
          console.log(`✅ Aprovado! Salvando progresso... Ilha ${selectedTopico.id} -> Nível ${novoNivel}`);

          // 2. Bônus de XP do Boss (Se venceu o Boss)
          if (isBoss) {
              try {
                  await supabase.rpc("increment_xp", { quantidade: 15 });
                  // Atualiza visualmente o XP bônus
                  setXpGanhoSessao(prev => prev + 15);
                  if (perfil) setPerfil((p: any) => ({ ...p, xp: p.xp + 15 }));
              } catch (e) { console.error("Erro ao dar bônus:", e); }
          }

          try {
              // 3. Envia para o Backend (Persistência)
              const res = await fetch("process.env.NEXT_PUBLIC_API_URL/progresso", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                      user_id: user.id,
                      lesson_id: selectedTopico.id,
                      nivel_novo: novoNivel
                  })
              });
              
              if (res.ok) {
                  console.log("Progresso salvo no banco!");
                  
                  // 4. Atualiza LOCALMENTE (Para desbloquear o próximo cadeado na hora)
                  setMapaProgresso((prev) => {
                      const antigo = prev[selectedTopico.id] || 0;
                      return {
                          ...prev,
                          [selectedTopico.id]: Math.max(antigo, novoNivel)
                      };
                  });
              } else {
                  console.error("Erro no backend ao salvar progresso");
              }

              // 5. Atualiza XP Total do Perfil
              await atualizarPerfil(user.id);

          } catch (e) { console.error("Erro de rede:", e); }
      }
  }
  function fecharQuiz() {
      setModoQuiz(false);
      setFilaQuestoes([]);
  }

  // --- UI: QUIZ MODAL ---
  if (modoQuiz && questaoAtual) {
     return (
        <div className="fixed inset-0 z-[100] bg-slate-100/90 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-screen flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                    
                    {/* Header do Quiz */}
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <button onClick={fecharQuiz} className="flex items-center gap-2 text-slate-400 hover:text-red-500 font-bold text-xs uppercase tracking-wider transition-colors">
                            <ArrowLeft size={16}/> Sair
                        </button>
                        <div className="flex gap-1">
                            {filaQuestoes.map((_, i) => (
                                <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${i < indiceQuestao ? "bg-emerald-400" : i === indiceQuestao ? "bg-[#0cb7f2]" : "bg-slate-200"}`}></div>
                            ))}
                        </div>
                    </div>

                    {sessaoConcluida ? (
                        <div className="p-12 text-center">
                             <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${scoreSessao >= 3 ? "bg-emerald-100 text-emerald-500" : "bg-red-100 text-red-500"}`}>
                                 {scoreSessao >= 3 ? <Award size={48}/> : <AlertTriangle size={48}/>}
                             </div>
                             <h2 className="text-3xl font-black text-slate-800 mb-2">{scoreSessao >= 3 ? "Vitória!" : "Não foi dessa vez"}</h2>
                             <p className="text-slate-500 mb-8">Você acertou {scoreSessao} de {filaQuestoes.length}. {scoreSessao >= 3 ? "Progresso salvo!" : "Tente novamente para desbloquear."}</p>
                             <button onClick={fecharQuiz} className="bg-[#0cb7f2] hover:brightness-110 text-white font-bold py-4 px-10 rounded-2xl shadow-lg shadow-blue-200 transition-all">Continuar</button>
                        </div>
                    ) : (
                        <div className="p-6 md:p-10">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase text-white mb-6 inline-block ${questaoAtual.dificuldade === "Fácil" ? "bg-blue-400" : questaoAtual.dificuldade === "Médio" ? "bg-amber-400" : "bg-rose-500"}`}>
                                {questaoAtual.dificuldade || "Geral"}
                            </span>
                            
                            <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-relaxed">{questaoAtual.enunciado}</h2>
                            
                            <div className="space-y-3">
                                {['A','B','C','D'].map((op) => {
                                    let style = "bg-white border-2 border-slate-100 hover:border-[#0cb7f2] hover:bg-blue-50/30 text-slate-600";
                                    if (feedback) {
                                        if (op === questaoAtual.correta) style = "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold ring-1 ring-emerald-500";
                                        else style = "opacity-40 pointer-events-none border-slate-100";
                                    }
                                    return (
                                        <button key={op} onClick={() => verificarResposta(op)} disabled={!!feedback} className={`w-full p-5 rounded-2xl text-left transition-all ${style} flex gap-4`}>
                                            <span className="font-bold">{op})</span>
                                            <span>{questaoAtual[`alternativa_${op.toLowerCase()}`]}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <AnimatePresence>
                                {feedback && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden mt-6">
                                        <div className={`p-6 rounded-2xl ${feedback.includes("✅") ? "bg-emerald-50 border border-emerald-100 text-emerald-800" : "bg-rose-50 border border-rose-100 text-rose-800"}`}>
                                            <div className="font-bold text-lg mb-2">{feedback.includes("✅") ? "Resposta Correta!" : "Explicação:"}</div>
                                            <p className="text-sm opacity-90 leading-relaxed">{feedback.replace("✅ Correto! ", "").replace(/❌ Incorreto.*?\n\n/, "")}</p>
                                            <button onClick={avancarQuestao} className={`mt-4 w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${feedback.includes("✅") ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}>
                                                {indiceQuestao + 1 < filaQuestoes.length ? "Próxima Questão" : "Ver Resultados"}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
     );
  }

  // --- UI PRINCIPAL ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-32">
      
      {/* HEADER DESKTOP */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 shadow-sm">
         <div className="max-w-6xl mx-auto px-6 h-full flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.location.reload()}>
               <div className="bg-[#0cb7f2] p-2 rounded-xl shadow-lg shadow-blue-200"><Brain className="text-white w-5 h-5"/></div>
               <span className="text-xl font-extrabold text-slate-700 tracking-tight">Medi<span style={{color: COR_PRINCIPAL}}>Lingo</span></span>
            </div>

            {/* Menu Central Desktop */}
            <div className="hidden md:flex items-center gap-8 font-bold text-sm text-slate-400">
                <button onClick={resetArea} className="hover:text-[#0cb7f2] transition-colors flex items-center gap-2"><LayoutGrid size={18}/> APRENDER</button>
                <button onClick={() => router.push("/erros")} className="hover:text-rose-500 transition-colors flex items-center gap-2"><AlertTriangle size={18}/> ERROS</button>
                <button onClick={() => router.push("/perfil")} className="hover:text-[#0cb7f2] transition-colors flex items-center gap-2"><User size={18}/> PERFIL</button>
            </div>

            {user ? (
               <div className="flex gap-4 items-center">
                   <div className="hidden sm:flex items-center gap-2 text-amber-500 font-extrabold bg-amber-50 px-4 py-1.5 rounded-full border border-amber-100 shadow-sm">
                       <Zap size={18} fill="currentColor"/> {perfil?.xp || 0}
                   </div>
                   <div className="hidden sm:flex items-center gap-2 text-rose-500 font-extrabold bg-rose-50 px-4 py-1.5 rounded-full border border-rose-100 shadow-sm">
                       <Flame size={18} fill="currentColor"/> 3
                   </div>
                   <button onClick={sair} className="text-slate-300 hover:text-slate-500 ml-2" title="Sair"><LogOut size={20}/></button>
               </div>
            ) : <button onClick={() => router.push("/login")} className="text-[#0cb7f2] font-bold">ENTRAR</button>}
         </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-4xl mx-auto w-full px-6 py-10">
        
        {loading && (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-[#0cb7f2] rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 font-bold text-sm">SINCRONIZANDO...</p>
            </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* NÍVEL 1: ÁREAS */}
          {!selectedArea && !loading && (
             <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
               <div className="flex items-end justify-between">
                   <h2 className="text-2xl font-black text-slate-800">Ciclo Básico</h2>
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selecione uma área</span>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {areas.map((area: any) => (
                     <button key={area.id} onClick={() => selArea(area)} className="group bg-white p-6 rounded-3xl border border-slate-200 hover:border-[#0cb7f2] hover:shadow-xl hover:-translate-y-1 transition-all text-left flex gap-5 items-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-[#0cb7f2] transition-colors duration-300 shadow-inner">
                            <Microscope className="text-slate-400 group-hover:text-white w-8 h-8 transition-colors"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-700 group-hover:text-[#0cb7f2]">{area.nome}</h3>
                            <p className="text-xs text-slate-400 font-medium mt-1">Clique para explorar</p>
                        </div>
                     </button>
                   ))}
               </div>
             </motion.div>
          )}

          {/* NÍVEL 2: SISTEMAS */}
          {selectedArea && !selectedSystem && (
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
               <button onClick={resetArea} className="text-slate-400 font-bold text-xs mb-6 flex items-center gap-1 hover:text-[#0cb7f2] transition-colors"><ArrowLeft size={14}/> VOLTAR PARA ÁREAS</button>
               <h2 className="text-3xl font-black text-[#0cb7f2] mb-8">{selectedArea.nome}</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sistemas.map((sis:any) => (
                      <button key={sis.id} onClick={() => selSistema(sis)} className="bg-white p-6 rounded-3xl border-2 border-slate-100 hover:border-[#0cb7f2] text-left group transition-all shadow-sm hover:shadow-md">
                          <Dna className="text-slate-300 w-8 h-8 mb-4 group-hover:text-[#0cb7f2] transition-colors"/>
                          <h3 className="font-bold text-slate-700 text-lg group-hover:text-slate-900">{sis.nome}</h3>
                      </button>
                  ))}
               </div>
             </motion.div>
          )}

          {/* NÍVEL 3: DISCIPLINAS */}
          {selectedSystem && !selectedDisciplina && (
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={resetSistema} className="text-slate-400 font-bold text-xs mb-6 flex items-center gap-1 hover:text-[#0cb7f2] transition-colors"><ArrowLeft size={14}/> VOLTAR PARA SISTEMAS</button>
                <h2 className="text-3xl font-black text-slate-800 mb-2">{selectedSystem.nome}</h2>
                <p className="text-slate-400 mb-8 font-medium">Escolha uma disciplina para visualizar os tópicos.</p>
                <div className="space-y-4">
                   {disciplinas.map((disc:any) => (
                       <button key={disc.id} onClick={() => selDisciplina(disc)} className="w-full bg-white p-6 rounded-2xl border border-slate-200 hover:border-[#0cb7f2] hover:shadow-lg transition-all flex justify-between items-center group">
                           <div className="flex items-center gap-6">
                               <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 transition-colors"><Stethoscope className="text-slate-400 group-hover:text-[#0cb7f2] w-6 h-6"/></div>
                               <span className="font-bold text-xl text-slate-700 group-hover:text-[#0cb7f2]">{disc.nome}</span>
                           </div>
                           <ChevronRight className="text-slate-300 group-hover:text-[#0cb7f2]"/>
                       </button>
                   ))}
                </div>
             </motion.div>
          )}

          {/* NÍVEL 4: LISTA DE TÓPICOS (COM BARRA DE PROGRESSO) */}
          {selectedDisciplina && !selectedTopico && (
             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <button onClick={resetDisciplina} className="text-slate-400 font-bold text-xs mb-6 flex items-center gap-1 hover:text-[#0cb7f2] transition-colors"><ArrowLeft size={14}/> VOLTAR PARA DISCIPLINAS</button>
                <h2 className="text-2xl font-black text-[#0cb7f2] mb-8">{selectedDisciplina.nome}</h2>
                <div className="space-y-4">
                    {topicos.map((topico: any) => {
                        const nivel = mapaProgresso[topico.id] || 0;
                        const pct = (nivel / 5) * 100;
                        return (
                            <button key={topico.id} onClick={() => selTopico(topico)} className="w-full bg-white p-5 rounded-2xl border border-slate-200 hover:border-[#0cb7f2] hover:shadow-md transition-all text-left group relative overflow-hidden">
                                <div className="flex justify-between items-center mb-3 relative z-10">
                                    <span className="font-bold text-slate-700 text-lg group-hover:text-[#0cb7f2]">{topico.titulo}</span>
                                    <PlayCircle className="text-slate-300 group-hover:text-[#0cb7f2] transition-colors"/>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative z-10">
                                    <div className="bg-[#0cb7f2] h-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }}></div>
                                </div>
                                <div className="flex justify-between mt-2 relative z-10">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{pct}% CONCLUÍDO</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NÍVEL {nivel}/5</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
             </motion.div>
          )}

          {/* NÍVEL 5: MAPA (CHECKPOINTS) */}
          {selectedTopico && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative flex flex-col items-center">
                <div className="fixed top-20 md:top-24 z-30 bg-white/90 backdrop-blur-xl px-6 py-3 rounded-full border border-slate-200 shadow-xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                    <button onClick={resetTopico} className="text-slate-400 hover:text-slate-800 transition-colors"><ArrowLeft/></button>
                    <span className="w-px h-4 bg-slate-300"></span>
                    <h2 className="font-black text-slate-800 text-sm max-w-[200px] truncate">{selectedTopico.titulo}</h2>
                </div>

                <div className="flex flex-col items-center w-full max-w-md gap-4 pb-32 pt-32 relative">
                    {/* Linha de Fundo */}
                    <div className="absolute top-32 bottom-20 w-3 bg-slate-100 rounded-full -z-20"></div>
                    
                    {[0,1,2,3,4].map((idx) => {
                        const progressoAtual = mapaProgresso[selectedTopico.id] || 0;
                        return (
                            <CheckpointNode 
                                key={idx} 
                                index={idx} 
                                total={5} 
                                onClick={iniciarCheckpoint}
                                unlocked={progressoAtual >= idx}
                                completed={progressoAtual > idx}
                            />
                        );
                    })}
                    <div className="mt-8 text-4xl opacity-50 grayscale">🏁</div>
                    
                </div>
             </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* MENU INFERIOR MOBILE FIXO */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 h-20 flex justify-around items-center z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe">
          <button onClick={resetArea} className="flex flex-col items-center gap-1 text-[#0cb7f2] w-16">
              <LayoutGrid size={24} className="stroke-[2.5]"/>
              <span className="text-[9px] font-extrabold uppercase tracking-wide">Aprender</span>
          </button>
          <button onClick={() => router.push("/erros")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-rose-500 w-16 transition-colors">
              <AlertTriangle size={24} className="stroke-[2.5]"/>
              <span className="text-[9px] font-extrabold uppercase tracking-wide">Erros</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-amber-500 w-16 transition-colors">
              <Award size={24} className="stroke-[2.5]"/>
              <span className="text-[9px] font-extrabold uppercase tracking-wide">Rank</span>
          </button>
          <button onClick={() => router.push("/perfil")} className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#0cb7f2] w-16 transition-colors">
              <User size={24} className="stroke-[2.5]"/>
              <span className="text-[9px] font-extrabold uppercase tracking-wide">Perfil</span>
          </button>
      </nav>

    </div>
  );
}