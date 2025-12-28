'use client'

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  Clock, ChevronRight, ChevronLeft, AlertCircle, Bot, CheckCircle2, XCircle, 
  Send, Loader2, Home, PauseCircle, PlayCircle, Eye, ArrowLeft, Lock, Users
} from "lucide-react"
import Markdown from 'markdown-to-jsx' 

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// --- IMPORTS DAS AÇÕES ---
import { fetchExamQuestions } from "./actions"
import { chatWithMedAI, getRemainingDailyUses } from "./ai-action"
import { updateStreak } from "@/app/actions/streak" // <--- 1. IMPORTADO O STREAK

// --- TIPOS ---
type QuestionType = 'MULTIPLE_CHOICE' | 'DISCURSIVE'
type FeedbackMode = 'IMMEDIATE' | 'END' | 'PEEK'

interface Question {
  id: string
  type: QuestionType
  text: string
  alternatives?: { id: string; text: string }[]
  correctAnswer: string 
  explanation: string 
  isCanceled?: boolean
}

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
}

interface Participant {
  id: string
  name: string
  initials: string
  isOnline: boolean
}

// --- COMPONENTE INTERNO ---
function ExamContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  // -- CONFIGURAÇÕES --
  const inst = searchParams.get('inst') || ""
  const subject = searchParams.get('subject') || ""
  const year = searchParams.get('year') || ""
  const examTitle = searchParams.get('exam_title') || ""
  const mode = (searchParams.get('mode') as FeedbackMode) || 'IMMEDIATE'
  const isTimerEnabled = searchParams.get('timer') === 'true'
  const timeLimitSeconds = parseInt(searchParams.get('time_limit') || '3600')
  const shouldPauseOnExpl = searchParams.get('pause_on_expl') === 'true'

  // -- DADOS --
  const [questions, setQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // -- ESTADOS DA PROVA --
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({}) 
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds) 
  const [isFinished, setIsFinished] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false) // <--- 2. TRAVA DE SUBMISSÃO
  
  // -- UI --
  const [showAnswer, setShowAnswer] = useState(mode === 'PEEK') 
  const [aiOpen, setAiOpen] = useState(false) 
  
  // -- CHAT AI & LIMITES --
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [usesLeft, setUsesLeft] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // -- MULTIPLAYER --
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'me', name: 'Você', initials: 'EU', isOnline: true }
  ])

  // 1. CARREGAR DADOS
  useEffect(() => {
    async function loadData() {
      if (!inst || !subject || !year) { /* Fallback */ }

      try {
        const [questionsData, usageCount] = await Promise.all([
            fetchExamQuestions({ institution: inst, subject, year, exam_title: examTitle }),
            getRemainingDailyUses()
        ])

        if (questionsData.length === 0) {
           toast({ variant: "destructive", title: "Vazio", description: "Nenhuma questão encontrada." })
        }
        setQuestions(questionsData)
        setUsesLeft(usageCount)
      } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Falha ao carregar prova." })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [inst, subject, year, examTitle, toast])

  // Scroll Chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatMessages, aiOpen])

  // Vars
  const currentQuestion = questions[currentQIndex]
  const totalQuestions = questions.length
  const progress = totalQuestions > 0 ? ((currentQIndex + 1) / totalQuestions) * 100 : 0

  // -- TIMER --
  useEffect(() => {
    if (!isTimerEnabled || isFinished || isLoading) return
    if (showAnswer && shouldPauseOnExpl && mode === 'IMMEDIATE') return 

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          finishExam() // Chama a finalização quando o tempo acaba
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isTimerEnabled, isFinished, isLoading, showAnswer, shouldPauseOnExpl, mode])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // -- HANDLERS --
  const handleAnswerSelect = (value: string) => {
    if (showAnswer && mode !== 'PEEK') return 
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }))
  }

  const handleNext = () => {
    if (mode === 'IMMEDIATE') {
        if (!showAnswer) {
            setShowAnswer(true)
            return
        }
        advanceQuestion()
    } else {
        advanceQuestion()
    }
  }

  const advanceQuestion = () => {
    if (currentQIndex < totalQuestions - 1) {
      setCurrentQIndex(prev => prev + 1)
      setShowAnswer(mode === 'PEEK') 
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      finishExam() // Fim das questões
    }
  }

  const handleExit = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/praticar/provas')
    }
  }

  // --- 3. FUNÇÃO FINALIZAR BLINDADA ---
  const finishExam = async () => {
    // Se já estiver enviando ou já finalizou, aborta para não duplicar
    if (isSubmitting || isFinished) return
    
    setIsSubmitting(true) // Ativa a trava
    setIsFinished(true)   // Para o timer visualmente
    
    // a. Tenta atualizar o foguinho (Sem travar o resto se falhar)
    try {
        await updateStreak()
    } catch (error) {
        console.error("Erro ao atualizar streak:", error)
    }

    // b. Calcula estatísticas
    const usedTime = timeLimitSeconds - timeLeft

    const resultPayload = {
        questions: questions,
        answers: answers,
        timeSpent: usedTime,
        examTitle: examTitle || subject,
        date: new Date().toISOString()
    }

    // c. Salva e Notifica
    localStorage.setItem('last_exam_result', JSON.stringify(resultPayload))
    toast({ title: "Prova Finalizada! 🔥", description: "Gerando seu relatório..." })
    
    // d. Redireciona
    setTimeout(() => {
        router.push('/exam/result')
    }, 1000)
  }

  // -- AI HANDLER --
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!chatInput.trim() || isAiLoading) return
    
    if (usesLeft !== null && usesLeft <= 0) {
        toast({ variant: "destructive", title: "Limite atingido", description: "Assine para continuar usando." })
        return
    }

    const userMsg = chatInput
    setChatInput("") 
    setIsAiLoading(true)

    const newMessages = [...chatMessages, { role: 'user', content: userMsg } as ChatMessage]
    setChatMessages(newMessages)

    // @ts-ignore
    const result = await chatWithMedAI(newMessages, currentQuestion, userMsg)

    if (result.success) {
      setChatMessages(prev => [...prev, { role: 'ai', content: result.message }])
      if (typeof result.usesLeft === 'number') setUsesLeft(result.usesLeft)
    } else {
      if (result.limitReached) {
        setChatMessages(prev => [...prev, { role: 'ai', content: "🔒 **Limite diário atingido.**" }])
        setUsesLeft(0)
      } else {
        toast({ variant: "destructive", title: "Erro", description: result.message })
      }
    }
    setIsAiLoading(false)
  }

  // -- LOADING SCREEN --
  if (isLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 animate-pulse">Montando sua prova...</p>
      </div>
    )
  }

  if (!isLoading && questions.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
        <AlertCircle className="h-10 w-10 text-slate-400" />
        <h2 className="text-xl font-bold">Nenhuma questão encontrada</h2>
        <Button onClick={handleExit} variant="outline">Voltar</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4 w-full max-w-6xl mx-auto">
           
           <div className="flex items-center gap-2">
               <Button variant="ghost" size="icon" onClick={handleExit} className="text-slate-500 hover:text-slate-900" title="Sair da Prova">
                  <ArrowLeft size={20} />
               </Button>
               
               <div className="hidden sm:flex items-center -space-x-2 border-l pl-4 ml-2 border-slate-200 dark:border-slate-700 h-8">
                  {participants.map((p) => (
                      <div key={p.id} className="relative group cursor-help" title={`${p.name} (Online)`}>
                          <div className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-bold text-indigo-700">
                              {p.initials}
                          </div>
                          {p.isOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                          )}
                      </div>
                  ))}
                  <button className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border-2 border-white dark:border-slate-900 flex items-center justify-center text-slate-500 transition-colors" title="Convidar amigo (Em breve)">
                      <Users size={14} />
                  </button>
               </div>
           </div>

           <div className="flex-1 flex items-center gap-3 justify-center md:justify-start">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap hidden md:inline">
                Questão {currentQIndex + 1} / {totalQuestions}
              </span>
              <Progress value={progress} className="h-2 w-24 md:w-[200px]" />
           </div>

           <div className="flex items-center gap-3">
              {isTimerEnabled && (
                <div className={`
                    flex items-center gap-2 font-mono text-lg font-bold px-3 py-1 rounded-lg transition-colors
                    ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'text-slate-700 dark:text-slate-200'}
                    ${(shouldPauseOnExpl && showAnswer && mode === 'IMMEDIATE') ? 'opacity-50' : ''}
                `}>
                    {(shouldPauseOnExpl && showAnswer && mode === 'IMMEDIATE') ? <PauseCircle size={18} /> : <Clock size={18} />}
                    {formatTime(timeLeft)}
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAiOpen(true)}
                className="hidden md:flex gap-2 text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
              >
                <Bot size={18} /> MedAI 
                {usesLeft !== null && (
                    <span className={`text-xs ml-1 px-1.5 py-0.5 rounded-full ${usesLeft > 0 ? 'bg-indigo-200 text-indigo-800' : 'bg-red-100 text-red-600'}`}>
                        {usesLeft}/5
                    </span>
                )}
              </Button>
           </div>
        </div>
      </header>

      {/* ÁREA DA QUESTÃO */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-6">
        {mode === 'PEEK' && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm justify-center">
                <Eye size={16} /> Modo Estudo Ativo
            </div>
        )}

        <Card className="border-none shadow-lg overflow-hidden">
          <CardContent className="p-6 md:p-10 space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 mb-2">
                 <Badge variant="outline" className="uppercase">{currentQuestion.type === 'MULTIPLE_CHOICE' ? 'Objetiva' : 'Discursiva'}</Badge>
                 <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200">{subject}</Badge>
                 {currentQuestion.isCanceled && <Badge variant="destructive">ANULADA</Badge>}
              </div>
              <p className="text-lg md:text-xl leading-relaxed text-slate-800 dark:text-slate-100 font-medium whitespace-pre-line">
                {currentQuestion.text}
              </p>
            </div>

            {currentQuestion.type === 'MULTIPLE_CHOICE' && (
              <RadioGroup value={answers[currentQuestion.id] || ""} onValueChange={handleAnswerSelect} className="space-y-3">
                {currentQuestion.alternatives?.map((alt) => {
                  let styles = "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                  let icon = null
                  const isSelected = answers[currentQuestion.id] === alt.id
                  const isCorrect = alt.id === currentQuestion.correctAnswer

                  if (showAnswer) {
                     if (isCorrect) {
                        styles = "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100 ring-1 ring-emerald-500"
                        icon = <CheckCircle2 size={20} className="text-emerald-600" />
                     } else if (isSelected) {
                        styles = "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 ring-1 ring-red-500"
                        icon = <XCircle size={20} className="text-red-500" />
                     } else {
                        styles = "opacity-50 grayscale"
                     }
                  } else if (isSelected) {
                     styles = "border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                  }

                  return (
                    <div key={alt.id} onClick={() => handleAnswerSelect(alt.id)} className={`flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all ${styles}`}>
                      <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-indigo-600' : 'border-slate-400'}`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full" />}
                      </div>
                      <div className="flex-1 flex justify-between gap-2">
                        <span className="text-base leading-snug">{alt.text}</span>
                        {icon}
                      </div>
                    </div>
                  )
                })}
              </RadioGroup>
            )}

            {currentQuestion.type === 'DISCURSIVE' && (
              <div className="space-y-4">
                <Textarea 
                  placeholder="Digite sua resposta..." 
                  className="min-h-[150px] text-lg p-4 bg-slate-50 dark:bg-slate-900 border-slate-200 focus:border-indigo-500 resize-none"
                  value={answers[currentQuestion.id]?.text || answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                  disabled={showAnswer && mode !== 'PEEK'}
                />
                {showAnswer && (
                  <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 animate-in fade-in">
                     <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase text-xs tracking-wider">Gabarito Oficial</h4>
                     <p className="text-slate-600 dark:text-slate-400 italic mb-6 border-l-4 border-indigo-500 pl-4">"{currentQuestion.correctAnswer}"</p>
                  </div>
                )}
              </div>
            )}
            
            {showAnswer && (
               <div className="mt-8 bg-emerald-50/50 dark:bg-emerald-950/10 p-6 rounded-xl border border-emerald-100 dark:border-emerald-900/50 animate-in fade-in">
                  <h4 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                    <CheckCircle2 size={20}/> Comentário do Professor
                  </h4>
                  <div className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line text-sm md:text-base">
                    {currentQuestion.explanation}
                  </div>
               </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* FOOTER */}
      <footer className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
           <Button variant="outline" onClick={() => setAiOpen(true)} className="md:hidden gap-2 text-indigo-600 border-indigo-200">
             <Bot size={18} /> IA {usesLeft !== null && `(${usesLeft}/5)`}
           </Button>
           <div className="flex gap-3 ml-auto">
              <Button variant="ghost" onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))} disabled={currentQIndex === 0}>
                <ChevronLeft className="mr-1" size={18} /> Anterior
              </Button>
              
              {/* BOTÃO FINALIZAR PROTEGIDO */}
              <Button 
                 size="lg" 
                 onClick={handleNext} 
                 disabled={isSubmitting} // <--- BLOQUEIO VISUAL
                 className={`
                    min-w-[140px] font-bold text-white shadow-lg transition-all active:scale-95 
                    ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''} 
                    ${showAnswer || mode !== 'IMMEDIATE' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                 `}
              >
                {isSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                ) : (
                    mode === 'IMMEDIATE' && !showAnswer ? (<>CORRIGIR <PlayCircle size={18} className="ml-2" /></>) : (currentQIndex === totalQuestions - 1 ? (<>FINALIZAR <CheckCircle2 size={18} className="ml-2" /></>) : (<>PRÓXIMA <ChevronRight size={18} className="ml-2" /></>))
                )}
              </Button>
           </div>
        </div>
      </footer>

      {/* SHEET DA IA (Mantido igual) */}
      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0">
          <SheetHeader className="p-6 border-b bg-indigo-50/50 dark:bg-indigo-900/10">
            <SheetTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300"><Bot size={24} /> MedAI Tutor</SheetTitle>
            <SheetDescription>Tire dúvidas sobre a questão atual.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950" ref={scrollRef}>
             {chatMessages.length === 0 && (
                <div className="text-center text-slate-400 mt-10 text-sm p-4">
                   <p className="mb-2">Olá Dr(a)! 👋</p>
                   <p>Estou pronto para discutir esta questão.</p>
                </div>
             )}
             {chatMessages.map((msg, idx) => (
               <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 border border-indigo-200"><Bot size={16} className="text-indigo-600"/></div>}
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none'}`}>
                     {msg.role === 'ai' ? <Markdown>{msg.content}</Markdown> : msg.content}
                  </div>
               </div>
             ))}
             {isAiLoading && <div className="flex gap-3 justify-start animate-pulse"><div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"/><div className="bg-slate-200 h-10 w-32 rounded-xl"/></div>}
          </div>
          <div className="p-4 border-t bg-white dark:bg-slate-900">
             <div className="mb-2 flex justify-between items-center px-1">
                 <span className="text-xs font-medium text-slate-500">
                     {usesLeft !== null ? (usesLeft > 0 ? `${usesLeft}/5 requisições restantes hoje` : <span className="text-red-500 flex items-center gap-1"><Lock size={12}/> Limite diário atingido</span>) : "Carregando..."}
                 </span>
             </div>
             <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input placeholder={usesLeft === 0 ? "Volte amanhã para mais perguntas" : "Digite sua dúvida..."} value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={isAiLoading || usesLeft === 0} className="flex-1"/>
                <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-700" disabled={isAiLoading || !chatInput.trim() || usesLeft === 0}>
                    {isAiLoading ? <Loader2 className="animate-spin" size={18}/> : <Send size={18} />}
                </Button>
             </form>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  )
}

export default function ExamEnginePage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950"><Loader2 className="h-10 w-10 animate-spin text-indigo-600" /></div>}>
      <ExamContent />
    </Suspense>
  )
}