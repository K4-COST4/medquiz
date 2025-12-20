"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, AlertTriangle, CheckCircle, RefreshCcw, 
  Brain, Activity, Calendar, Layers, ChevronDown, ChevronUp, Zap 
} from "lucide-react";

// --- CONFIGURAÇÃO SUPABASE ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const COR_PRINCIPAL = "#0cb7f2"; 

// --- COMPONENTE: QUIZ DE REVISÃO (ESTILO MODAL NOVO) ---
function QuizRevisao({ 
  questoes, 
  aoFinalizar, 
  aoAcertarQuestao,
  userId 
}: { 
  questoes: any[], 
  aoFinalizar: () => void, 
  aoAcertarQuestao: (id: number) => void,
  userId: string 
}) {
  const [indice, setIndice] = useState(0);
  const [feedback, setFeedback] = useState("");
  const questaoAtual = questoes[indice];

  const verificar = async (letra: string) => {
    const gabaritoBanco = questaoAtual.correta ? questaoAtual.correta.trim().toUpperCase() : "";
    const respostaUsuario = letra.trim().toUpperCase();
    const acertou = respostaUsuario === gabaritoBanco;

    if (acertou) {
      setFeedback("✅ Correto! " + questaoAtual.explicacao);
      if (questaoAtual.id) aoAcertarQuestao(questaoAtual.id);

      // Salva acerto no histórico (Redenção)
      try {
        await fetch("http://127.0.0.1:8000/historico", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userId, question_id: questaoAtual.id, is_correct: true })
        });
      } catch (e) { console.error(e); }

    } else {
      setFeedback(`❌ A correta é ${questaoAtual.correta}.\n\n${questaoAtual.explicacao}`);
    }
  };

  const proxima = () => {
    setFeedback("");
    if (indice + 1 < questoes.length) setIndice(indice + 1); else aoFinalizar();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-100/90 backdrop-blur-sm overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative">
                
                {/* Header do Quiz */}
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                    <button onClick={aoFinalizar} className="flex items-center gap-2 text-slate-400 hover:text-rose-500 font-bold text-xs uppercase tracking-wider transition-colors">
                        <ArrowLeft size={16}/> Sair da Revisão
                    </button>
                    <span className="text-amber-500 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                        <Activity size={14}/> Revisão Intensiva ({indice + 1}/{questoes.length})
                    </span>
                </div>

                <div className="p-6 md:p-10">
                    <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase mb-6 inline-block">
                        Erro Anterior
                    </span>
                    
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-relaxed">{questaoAtual.enunciado}</h2>
                    
                    <div className="space-y-3">
                        {["A", "B", "C", "D"].map((op) => {
                            let style = "bg-white border-2 border-slate-100 hover:border-[#0cb7f2] hover:bg-blue-50/30 text-slate-600";
                            if (feedback) {
                                if (op === questaoAtual.correta) style = "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold ring-1 ring-emerald-500";
                                else style = "opacity-40 pointer-events-none border-slate-100";
                            }
                            return (
                                <button key={op} onClick={() => verificar(op)} disabled={!!feedback} className={`w-full p-5 rounded-2xl text-left transition-all ${style} flex gap-4`}>
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
                                    <div className="font-bold text-lg mb-2">{feedback.includes("✅") ? "Redimido!" : "Atenção:"}</div>
                                    <p className="text-sm opacity-90 leading-relaxed whitespace-pre-wrap">{feedback.replace("✅ Correto! ", "").replace(/❌ A correta.*?./, "")}</p>
                                    <button onClick={proxima} className={`mt-4 w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all ${feedback.includes("✅") ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}`}>
                                        {indice + 1 === questoes.length ? "Finalizar" : "Próxima"}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    </div>
  );
}

// --- PÁGINA PRINCIPAL DE ERROS ---
export default function ErrosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Dados
  const [todosErros, setTodosErros] = useState<any[]>([]);
  const [errosVisiveis, setErrosVisiveis] = useState<any[]>([]);
  const [limite, setLimite] = useState(30);
  const [loading, setLoading] = useState(true);
  
  // Controle
  const [modoRevisao, setModoRevisao] = useState(false);
  const [questoesParaRevisar, setQuestoesParaRevisar] = useState<any[]>([]);
  const [idsRefeitos, setIdsRefeitos] = useState<Set<number>>(new Set()); 
  const [loadingSemelhante, setLoadingSemelhante] = useState(false);

  // Estados de UI (Acordeão)
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  useEffect(() => {
    async function getErros() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      
      setUser(session.user);

      try {
        const res = await fetch(`http://127.0.0.1:8000/erros/${session.user.id}`);
        const data = await res.json();
        setTodosErros(data);
        setErrosVisiveis(data.slice(0, 30));
        
        // Expande o primeiro dia automaticamente
        if (data.length > 0) {
             const primeiraData = new Date(data[0].data_erro).toLocaleDateString();
             setExpandedDate(primeiraData === new Date().toLocaleDateString() ? "Hoje" : primeiraData);
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    getErros();
  }, []);

  useEffect(() => { setErrosVisiveis(todosErros.slice(0, limite)); }, [limite, todosErros]);

  const marcarComoRefeita = (id: number) => {
    setIdsRefeitos(prev => new Set(prev).add(id));
  };

  const praticarSemelhante = async (questaoId: number) => {
    setLoadingSemelhante(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/praticar/semelhante/${questaoId}`);
      if (!res.ok) throw new Error("Erro na IA");
      const novaQuestao = await res.json();
      setQuestoesParaRevisar([novaQuestao]);
      setModoRevisao(true);
    } catch (e) {
      alert("Erro ao gerar questão semelhante.");
    } finally {
      setLoadingSemelhante(false);
    }
  };

  // Agrupamento de Erros
  const errosAgrupados = errosVisiveis.reduce((acc: any, erro) => {
    const dataObj = new Date(erro.data_erro);
    const hoje = new Date();
    const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
    let dataLegivel = dataObj.toLocaleDateString();
    
    if (dataObj.toDateString() === hoje.toDateString()) dataLegivel = "Hoje";
    else if (dataObj.toDateString() === ontem.toDateString()) dataLegivel = "Ontem";

    if (!acc[dataLegivel]) acc[dataLegivel] = {};
    if (!acc[dataLegivel][erro.area]) acc[dataLegivel][erro.area] = {};
    if (!acc[dataLegivel][erro.area][erro.sistema]) acc[dataLegivel][erro.area][erro.sistema] = {};
    if (!acc[dataLegivel][erro.area][erro.sistema][erro.trilha]) acc[dataLegivel][erro.area][erro.sistema][erro.trilha] = [];
    acc[dataLegivel][erro.area][erro.sistema][erro.trilha].push(erro);
    return acc;
  }, {});

  const toggleDate = (date: string) => {
      if (expandedDate === date) setExpandedDate(null);
      else setExpandedDate(date);
  }

  // RENDERIZAÇÃO
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

      {/* OVERLAY DE LOADING (IA GENERATION) */}
      {loadingSemelhante && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur z-[60] flex items-center justify-center flex-col">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-[#0cb7f2] rounded-full animate-spin mb-4"></div>
          <p className="text-[#0cb7f2] animate-pulse font-extrabold tracking-widest text-sm">GERANDO CASO CLÍNICO...</p>
        </div>
      )}

      {/* QUIZ MODAL */}
      {modoRevisao && (
         <QuizRevisao 
            questoes={questoesParaRevisar} 
            aoFinalizar={() => setModoRevisao(false)} 
            aoAcertarQuestao={marcarComoRefeita}
            userId={user?.id} 
         />
      )}

      <main className="max-w-4xl mx-auto px-6 py-10">
        
        {/* CABEÇALHO DA PÁGINA */}
        <div className="mb-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-rose-50 text-rose-500 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase mb-3 border border-rose-100">
                <AlertTriangle size={12} /> Zona de Diagnóstico
            </div>
            <h1 className="text-3xl font-black text-slate-800 mb-2">Seus Erros & Revisões</h1>
            <p className="text-slate-500 max-w-lg">Transforme suas falhas em aprendizado. Revise questões erradas ou peça para a IA criar variações semelhantes.</p>
        </div>

        {loading && (
             <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-[#0cb7f2] rounded-full animate-spin"></div></div>
        )}

        {/* LISTA HIERÁRQUICA MODERNA */}
        <div className="space-y-6">
          {Object.keys(errosAgrupados).map((data) => {
             const isExpanded = expandedDate === data;
             
             return (
            <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} key={data} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              
              {/* Data Header (Acordeão) */}
              <button onClick={() => toggleDate(data)} className="w-full flex items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-400">
                          <Calendar size={20}/>
                      </div>
                      <h2 className="text-lg font-bold text-slate-700">{data}</h2>
                  </div>
                  {isExpanded ? <ChevronUp className="text-slate-400"/> : <ChevronDown className="text-slate-400"/>}
              </button>

              <AnimatePresence>
              {isExpanded && (
                  <motion.div initial={{height:0}} animate={{height:"auto"}} exit={{height:0}} className="overflow-hidden">
                      <div className="p-6 pt-0 space-y-6">
                      
                      {Object.keys(errosAgrupados[data]).map((area) => (
                        <div key={area} className="mt-6">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                             <Layers size={12}/> {area}
                          </h3>
                          
                          {Object.keys(errosAgrupados[data][area]).map((sistema) => (
                            <div key={sistema} className="pl-4 border-l-2 border-slate-100 ml-1">
                              
                              {/* Sistema Header */}
                              <div className="mb-4">
                                  <span className="text-[#0cb7f2] font-bold text-sm bg-blue-50 px-2 py-1 rounded-md">{sistema}</span>
                              </div>

                              {Object.keys(errosAgrupados[data][area][sistema]).map((trilha) => (
                                <div key={trilha} className="mb-6 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                   
                                   {/* Trilha Header */}
                                   <div className="flex justify-between items-center mb-4">
                                      <span className="font-extrabold text-slate-700 text-sm flex items-center gap-2">
                                         <Zap size={14} className="text-amber-500"/> {trilha}
                                      </span>
                                      <button 
                                        onClick={() => { setQuestoesParaRevisar(errosAgrupados[data][area][sistema][trilha].map((e:any) => e.dados_completos)); setModoRevisao(true); }} 
                                        className="text-[10px] bg-white border border-slate-200 hover:border-[#0cb7f2] hover:text-[#0cb7f2] px-3 py-1.5 rounded-full font-bold transition-all shadow-sm flex items-center gap-1"
                                      >
                                        <RefreshCcw size={10}/> REVISAR TUDO
                                      </button>
                                   </div>

                                   {/* Lista de Erros Individuais */}
                                   <div className="space-y-3">
                                      {errosAgrupados[data][area][sistema][trilha].map((erro: any) => {
                                        const jaRefez = erro.resolvida || idsRefeitos.has(erro.id);
                                        return (
                                          <div key={erro.id} className={`group p-4 rounded-xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${jaRefez ? "bg-emerald-50 border-emerald-100 opacity-80" : "bg-white border-slate-200 hover:border-rose-200 hover:shadow-sm"}`}>
                                             
                                             <div className="flex items-start gap-3">
                                                <div className={`mt-1 min-w-[20px] ${jaRefez ? "text-emerald-500" : "text-rose-400"}`}>
                                                    {jaRefez ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                                                </div>
                                                <div>
                                                   <p className={`text-sm font-medium leading-relaxed ${jaRefez ? "text-emerald-700 line-through" : "text-slate-700"}`}>
                                                     {erro.enunciado}
                                                   </p>
                                                   <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">{erro.ilha}</p>
                                                </div>
                                             </div>

                                             {!jaRefez && (
                                                 <button 
                                                   onClick={() => praticarSemelhante(erro.id)}
                                                   className="self-end sm:self-auto text-xs bg-slate-800 hover:bg-[#0cb7f2] text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all flex items-center gap-2 whitespace-nowrap"
                                                 >
                                                   <Brain size={14}/> Semelhante
                                                 </button>
                                             )}
                                          </div>
                                        );
                                      })}
                                   </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                      </div>
                  </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          );
          })}
        </div>
        
        {errosVisiveis.length < todosErros.length && (
          <button onClick={() => setLimite(l => l + 30)} className="w-full bg-white border border-slate-200 py-4 rounded-2xl mt-8 text-slate-400 font-bold hover:text-[#0cb7f2] hover:border-[#0cb7f2] transition-all shadow-sm">
              CARREGAR MAIS HISTÓRICO...
          </button>
        )}

        {todosErros.length === 0 && !loading && (
            <div className="text-center py-20 opacity-50">
                <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4"/>
                <h3 className="text-xl font-bold text-slate-600">Tudo limpo!</h3>
                <p className="text-slate-400">Você não tem erros pendentes. Bom trabalho!</p>
            </div>
        )}
      </main>
    </div>
  );
}