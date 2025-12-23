'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Brain, 
  Flame, 
  Swords, 
  Trophy, 
  ArrowRight, 
  CheckCircle2, 
  Activity 
} from 'lucide-react'

// --- COMPONENTE 1: O WIDGET DE QUESTÃO (A ISCA) ---
// UX: Simula uma questão real. Ao clicar, dá o feedback visual mas pede login para continuar.
const DemoQuestionCard = () => {
  const [selected, setSelected] = useState<string | null>(null)

  const handleSelect = (id: string) => {
    setSelected(id)
    // Aqui poderíamos abrir um Modal de Login após 500ms
    // setTimeout(() => router.push('/login'), 800) 
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header do Card - Estilo Jogo */}
      <div className="bg-slate-800/50 p-4 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
            Emergência
          </span>
          <span className="text-slate-400 text-xs font-mono">ID: #8291</span>
        </div>
        <div className="flex items-center gap-1 text-yellow-500">
          <Flame size={16} fill="currentColor" />
          <span className="text-xs font-bold">Hard</span>
        </div>
      </div>

      {/* Corpo da Questão */}
      <div className="p-6 space-y-4">
        <p className="text-slate-200 text-sm leading-relaxed">
          Paciente, 45 anos, chega ao PS com dor torácica súbita e dispneia. 
          ECG demonstra supradesnivelamento do segmento ST em V1-V4. 
          Qual a conduta imediata prioritária (MONA)?
        </p>

        {/* Alternativas Interativas */}
        <div className="space-y-2 mt-4">
          {[
            { id: 'A', text: 'Solicitar Raio-X de Tórax' },
            { id: 'B', text: 'Administrar AAS e Oxigênio', correct: true },
            { id: 'C', text: 'Realizar Ecocardiograma' },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 border flex items-center justify-between group
                ${selected === option.id 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-900'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold border
                   ${selected === option.id ? 'border-white/30 bg-white/20' : 'border-slate-700 bg-slate-900'}
                `}>
                  {option.id}
                </span>
                {option.text}
              </div>
              
              {/* O "Hook": Botão bloqueado ou seta convidativa */}
              {selected === option.id && (
                <Link href="/login" className="text-xs bg-white text-indigo-600 px-2 py-1 rounded font-bold hover:scale-105 transition-transform">
                  Ver Resultado
                </Link>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Rodapé do Card */}
      <div className="bg-slate-950 p-3 text-center border-t border-slate-800">
        <p className="text-xs text-slate-500">
          Responda para ganhar <span className="text-emerald-400 font-bold">+15 XP</span>
        </p>
      </div>
    </motion.div>
  )
}

// --- PÁGINA PRINCIPAL ---

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30">
      
      {/* NAVBAR */}
      <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Activity className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight">MedQuiz</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link 
              href="/login" 
              className="bg-slate-100 text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              Começar Agora
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 lg:pt-48 overflow-hidden">
        {/* Background Gradients (Ambientação) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-600/20 blur-[120px] rounded-full -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* LADO ESQUERDO: COPYWRITING */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 text-xs font-bold uppercase tracking-wide">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                Nova Era do Ensino Médico
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]">
                Aflore sua <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
                  curiosidade.
                </span>
              </h1>
              
              <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                Menos ansiedade, mais dopamina. Transforme casos clínicos complexos em 
                jogos rápidos. Junte-se a amigos, suba de nível e domine a medicina 
                sem perceber que está estudando.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link 
                  href="/login"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_4px_0_rgb(55,48,163)] hover:shadow-[0_2px_0_rgb(55,48,163)] hover:translate-y-[2px]"
                >
                  Jogar Agora
                  <ArrowRight size={20} />
                </Link>
                <button className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-slate-300 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all">
                  Ver Demonstração
                </button>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-500 pt-4">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-xs">
                      💊
                    </div>
                  ))}
                </div>
                <p>Junte-se a <span className="text-white font-bold">2.400+</span> estudantes</p>
              </div>
            </motion.div>

            {/* LADO DIREITO: DEMO INTERATIVA */}
            <div className="relative flex justify-center lg:justify-end">
                {/* Elementos decorativos de fundo */}
                <div className="absolute top-10 right-10 w-20 h-20 bg-emerald-500/20 blur-2xl rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full" />
                
                <DemoQuestionCard />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION (BENTO GRID) */}
      <section className="py-24 bg-slate-950 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-white mb-4">Estude como um profissional</h2>
                <p className="text-slate-400">Tudo o que você precisa para destruir na prova de residência.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Feature 1: Gamificação */}
                <motion.div 
                    whileHover={{ y: -5 }}
                    className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 p-8 rounded-3xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Trophy size={120} />
                    </div>
                    <div className="bg-indigo-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6 text-indigo-400">
                        <Swords size={24} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Battle Mode & Ranking</h3>
                    <p className="text-slate-400 max-w-md">
                        Compita com seus amigos ou estudantes de todo o país. 
                        Suba no ranking global e ganhe badges exclusivas.
                        Prove quem tem o melhor raciocínio clínico.
                    </p>
                </motion.div>

                {/* Feature 2: Streak */}
                <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-slate-900 border border-slate-800 p-8 rounded-3xl relative overflow-hidden"
                >
                     <div className="bg-orange-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6 text-orange-400">
                        <Flame size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Mantenha o Foco</h3>
                    <p className="text-slate-400 text-sm">
                        Crie o hábito diário de estudos. O sistema de ofensiva (Streak) não te deixa procrastinar.
                    </p>
                </motion.div>

                {/* Feature 3: IA */}
                <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-slate-900 border border-slate-800 p-8 rounded-3xl"
                >
                    <div className="bg-emerald-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6 text-emerald-400">
                        <Brain size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">IA Mentor</h3>
                    <p className="text-slate-400 text-sm">
                        Não entendeu a resposta? Nossa IA explica o mecanismo fisiopatológico na hora.
                    </p>
                </motion.div>

                {/* Feature 4: Novidades */}
                <motion.div 
                    whileHover={{ y: -5 }}
                    className="md:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-3xl flex items-center justify-between"
                >
                    <div>
                        <h3 className="text-xl font-bold mb-2">Conteúdo Atualizado Semanalmente</h3>
                        <p className="text-slate-400 text-sm max-w-sm">
                            Novos casos clínicos, diretrizes da SBC/AMIB atualizadas e trilhas especiais.
                        </p>
                    </div>
                    <div className="hidden md:block">
                        <button className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition">
                            Ver Roadmap
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
      </section>

      {/* FOOTER SIMPLES */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 text-center text-slate-600 text-sm">
        <p>&copy; 2024 MedQuiz. Feito por estudantes, para estudantes.</p>
      </footer>
    </div>
  )
}