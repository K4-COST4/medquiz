'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, CheckCircle2, XCircle, Clock, 
  RotateCcw, ChevronDown, ChevronUp, Bot, FileText,
  Trophy, Crown, Home
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/utils/supabase/client" // Importante para pegar o nome real

export default function ExamResultPage() {
  const router = useRouter()
  const [resultData, setResultData] = useState<any>(null)
  const [userName, setUserName] = useState("Usuário") // Estado para o nome
  const [userInitials, setUserInitials] = useState("EU")
  
  const [filter, setFilter] = useState<'ALL' | 'CORRECT' | 'WRONG'>('ALL')
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
        // 1. Carrega dados da prova
        const stored = localStorage.getItem('last_exam_result')
        if (!stored) {
          router.push('/praticar/provas')
          return
        }
        setResultData(JSON.parse(stored))

        // 2. Carrega nome do usuário real
        const fetchUser = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Tenta pegar do metadata (Google/Github) ou usa o email
                const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "Usuário"
                setUserName(name)
                setUserInitials(name.substring(0, 2).toUpperCase())
            }
        }
        fetchUser()
    }
  }, [router])

  if (!resultData) return null

  const { questions, answers, timeSpent } = resultData
  const total = questions.length
  
  let correctCount = 0
  const processedQuestions = questions.map((q: any) => {
    const userAnswer = answers[q.id]
    const isCorrect = String(userAnswer).toUpperCase() === String(q.correctAnswer).toUpperCase()
    if (isCorrect) correctCount++
    return { ...q, userAnswer, isCorrect }
  })

  const scorePercent = Math.round((correctCount / total) * 100)
  const wrongCount = total - correctCount

  // --- LISTA DE PARTICIPANTES (AGORA REALISTA) ---
  // Apenas o usuário atual por enquanto
  const participants = [
    { 
        id: 'me', 
        name: userName, // Nome real do usuário
        initials: userInitials, 
        score: scorePercent, 
        isMe: true 
    }
  ]

  const filteredQuestions = processedQuestions.filter((q: any) => {
    if (filter === 'CORRECT') return q.isCorrect
    if (filter === 'WRONG') return !q.isCorrect
    return true
  })

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const toggleExpand = (id: string) => {
    setExpandedQuestions(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* HEADER DE AÇÃO */}
        <div className="flex items-center justify-between">
           <Button variant="ghost" onClick={() => router.push('/praticar/provas')} className="gap-2">
             <ArrowLeft size={18} /> Voltar ao Catálogo
           </Button>
           <h1 className="text-lg font-bold text-slate-500 uppercase tracking-wider hidden md:block">Relatório de Desempenho</h1>
        </div>

        {/* 1. DASHBOARD DE RESULTADO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CARD NOTA */}
            <Card className="md:col-span-2 border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden relative">
                <div className={`absolute top-0 left-0 w-2 h-full ${scorePercent >= 70 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8 justify-between">
                    <div>
                        <h2 className="text-slate-500 font-bold uppercase tracking-wider mb-2">Desempenho Geral</h2>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-6xl font-black ${scorePercent >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {scorePercent}%
                            </span>
                            <span className="text-slate-400 font-medium text-xl">de acerto</span>
                        </div>
                        <p className="text-slate-500 mt-2 max-w-md">
                            {scorePercent >= 70 
                                ? "Excelente! Você domina bem este conteúdo." 
                                : "Bom treino. Foque nos erros para evoluir."}
                        </p>
                    </div>

                    <div className="relative w-32 h-32 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-slate-100 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                            <path 
                                className={`${scorePercent >= 70 ? 'text-emerald-500' : 'text-rose-500'} transition-all duration-1000 ease-out`}
                                strokeDasharray={`${scorePercent}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none" stroke="currentColor" strokeWidth="3" 
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                             <span>{correctCount}/{total}</span>
                             <span className="font-normal text-[10px] text-slate-400">Questões</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* CARD ESTATÍSTICAS */}
            <Card className="border-none shadow-lg bg-white dark:bg-slate-900 flex flex-col justify-center">
                <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Tempo Total</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatTime(timeSpent)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Acertos</p>
                            <p className="text-xl font-bold text-emerald-600">{correctCount} Questões</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-rose-600">
                            <XCircle size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold">Erros</p>
                            <p className="text-xl font-bold text-rose-600">{wrongCount} Questões</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* 2. RANKING DA SESSÃO (AGORA LIMPO) */}
        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg border border-slate-800">
             <div className="flex items-center gap-3 mb-6">
                <Trophy className="text-yellow-400" />
                <div>
                   <h3 className="font-bold text-lg">Ranking da Sessão</h3>
                   <p className="text-xs text-slate-400">Resultados desta prova</p>
                </div>
             </div>

             <div className="space-y-4">
                {participants.map((p, index) => (
                   <div key={p.id} className={`flex items-center gap-4 p-3 rounded-lg ${p.isMe ? 'bg-indigo-600/20 border border-indigo-500/50' : 'bg-white/5 border border-transparent'}`}>
                      <div className="font-bold text-slate-500 w-4 text-center">{index + 1}º</div>
                      
                      <Avatar className="h-10 w-10 border-2 border-white/10">
                          <AvatarFallback className={`${p.isMe ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                              {p.initials}
                          </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                             <span className={`font-bold ${p.isMe ? 'text-indigo-400' : 'text-white'}`}>
                                {p.name} {p.isMe && <span className="opacity-70 font-normal ml-1">(Você)</span>}
                             </span>
                             {index === 0 && <Crown size={16} className="text-yellow-400" />}
                          </div>
                          <Progress value={p.score} className="h-2 bg-slate-800" />
                      </div>

                      <div className="font-mono font-bold text-lg w-12 text-right">
                          {p.score}%
                      </div>
                   </div>
                ))}
             </div>
        </div>

        {/* 3. ÁREA DE REVISÃO DETALHADA */}
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <FileText className="text-indigo-600" /> Revisão Detalhada
                </h3>
                
                <Tabs 
                    defaultValue="ALL" 
                    onValueChange={(v: string) => setFilter(v as 'ALL' | 'CORRECT' | 'WRONG')} 
                    className="w-full md:w-auto"
                >
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="ALL">Todas</TabsTrigger>
                        <TabsTrigger value="WRONG" className="data-[state=active]:text-rose-600">Erros</TabsTrigger>
                        <TabsTrigger value="CORRECT" className="data-[state=active]:text-emerald-600">Acertos</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="space-y-4">
                {filteredQuestions.map((q: any, index: number) => (
                    <Card key={q.id} className={`border-l-4 overflow-hidden ${q.isCorrect ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
                        <div 
                            className="p-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            onClick={() => toggleExpand(q.id)}
                        >
                            <div className="mt-1">
                                {q.isCorrect 
                                    ? <CheckCircle2 className="text-emerald-500" size={24} /> 
                                    : <XCircle className="text-rose-500" size={24} />
                                }
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm md:text-base pr-8">
                                        Questão {index + 1} - <span className="text-slate-500 font-normal truncate">{q.text.substring(0, 80)}...</span>
                                    </h4>
                                    {expandedQuestions[q.id] ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                                </div>
                                
                                {!expandedQuestions[q.id] && (
                                    <div className="flex gap-4 mt-2 text-xs">
                                        <span className={q.isCorrect ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                                            Sua resposta: {q.userAnswer || "Em branco"}
                                        </span>
                                        <span className="text-slate-500">
                                            Gabarito: {q.correctAnswer}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {expandedQuestions[q.id] && (
                            <div className="bg-slate-50 dark:bg-slate-900/30 p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                <p className="text-slate-800 dark:text-slate-200 mb-6 font-medium whitespace-pre-line">
                                    {q.text}
                                </p>

                                <div className="grid gap-2 mb-6">
                                    {q.alternatives?.map((alt: any) => {
                                        let style = "border-slate-200 opacity-70"
                                        if (alt.id === q.correctAnswer) style = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 font-bold opacity-100 ring-1 ring-emerald-500"
                                        else if (alt.id === q.userAnswer && !q.isCorrect) style = "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-800 font-bold opacity-100 ring-1 ring-rose-500"
                                        
                                        return (
                                            <div key={alt.id} className={`p-3 rounded-lg border flex gap-3 text-sm ${style}`}>
                                                <span className="w-6 font-bold">{alt.id})</span>
                                                <span>{alt.text}</span>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                    <h5 className="text-indigo-600 font-bold flex items-center gap-2 mb-2">
                                        <Bot size={18} /> Explicação
                                    </h5>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-line">
                                        {q.explanation}
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center pt-8 pb-12">
                <Button 
                    variant="outline"
                    size="lg" 
                    onClick={() => router.push('/praticar')} 
                    className="font-bold px-8 h-12 text-lg border-slate-300 dark:border-slate-700"
                >
                    <Home className="mr-2" size={20} /> Voltar ao Início
                </Button>

                <Button 
                    size="lg" 
                    onClick={() => router.push('/praticar/provas')} 
                    className="font-bold px-8 h-12 text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                >
                    <RotateCcw className="mr-2" size={20} /> Realizar Nova Prova
                </Button>
            </div>
        </div>

      </div>
    </div>
  )
}