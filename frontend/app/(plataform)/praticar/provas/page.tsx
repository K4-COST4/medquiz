'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, GraduationCap, Brain, Heart, Activity, Microscope, Eye, Stethoscope, Baby, Bone, FileText,
  Clock, Zap, Flag, Shuffle, PauseCircle, Settings2, CheckCircle2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"

// AQUI ESTÁ A CORREÇÃO: Importamos as funções de catálogo, não de prova
import { getInstitutions, getPeriodsAndModules, getExamList } from "./actions"

const PERIOD_ICONS: Record<string, any> = {
  '1': Microscope, '2': Brain, '3': Heart, '4': Activity, 
  '5': Bone, '6': Baby, '7': Eye, '8': Stethoscope
}

export default function ProvasVisualPage() {
  const router = useRouter()
  
  // -- ESTADOS DE DADOS --
  const [selectedInst, setSelectedInst] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedModule, setSelectedModule] = useState("")
  const [institutions, setInstitutions] = useState<string[]>([])
  const [periodsGrid, setPeriodsGrid] = useState<Record<string, string[]>>({})
  const [examsList, setExamsList] = useState<any[]>([])

  // -- ESTADOS DE UI --
  const [step, setStep] = useState(1)
  const [configOpen, setConfigOpen] = useState(false)
  const [selectedExamToPlay, setSelectedExamToPlay] = useState<any>(null)

  // -- CONFIGURAÇÃO DA PROVA --
  const [feedbackMode, setFeedbackMode] = useState<'IMMEDIATE' | 'END' | 'PEEK'>('IMMEDIATE')
  const [timerEnabled, setTimerEnabled] = useState(true)
  const [examDuration, setExamDuration] = useState([80]) // Tempo total em minutos
  const [pauseOnExplanation, setPauseOnExplanation] = useState(true)
  const [randomize, setRandomize] = useState(false)

  // 1. Carregar Instituições
  useEffect(() => {
    getInstitutions().then(setInstitutions)
  }, [])

  // 2. Selecionar Instituição
  const handleInstSelect = async (inst: string) => {
    setSelectedInst(inst)
    const grid = await getPeriodsAndModules(inst)
    if (Object.keys(grid).length === 0) {
       // Fallback se não tiver dados
       setPeriodsGrid({ '1': ['SOI I', 'HAM I'], '5': ['SOI V', 'HAM V'] })
    } else {
       setPeriodsGrid(grid)
    }
    setStep(2)
  }

  // 3. Selecionar Módulo
  const handleModuleClick = async (period: string, moduleName: string) => {
    setSelectedPeriod(period)
    setSelectedModule(moduleName)
    const exams = await getExamList(selectedInst, period, moduleName)
    setExamsList(exams)
    setStep(3)
  }

  // 4. Abrir Configuração (Calcula tempo sugerido)
  const openConfig = (exam: any) => {
    setSelectedExamToPlay(exam)
    setConfigOpen(true)
    setTimerEnabled(true)

    // Regra: 15 questões = 80 min (aprox 5.33 min/questão)
    const baseTime = (exam.questionCount * 80) / 15
    const suggestedTime = Math.max(30, Math.min(150, Math.round(baseTime)))
    
    setExamDuration([suggestedTime])
  }

  // 5. Iniciar Prova
  const startExam = () => {
    const query = new URLSearchParams({
        inst: selectedInst,
        subject: selectedModule,
        year: selectedExamToPlay.year.toString(),
        exam_title: selectedExamToPlay.title,
        
        mode: feedbackMode,
        timer: timerEnabled.toString(),
        time_limit: (examDuration[0] * 60).toString(), // Envia em SEGUNDOS
        
        randomize: randomize.toString(),
        pause_on_expl: pauseOnExplanation.toString()
    }).toString()
    
    router.push(`/exam/start?${query}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      
      {/* HEADER NAV */}
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Link href="/praticar">
                <Button variant="ghost" size="icon"><ArrowLeft /></Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    {step === 1 && "Selecione a Instituição"}
                    {step === 2 && `${selectedInst} - Grade Curricular`}
                    {step === 3 && `${selectedModule} (${selectedPeriod}º P)`}
                </h1>
                <p className="text-slate-500 text-sm">Passo {step} de 3</p>
            </div>
         </div>
         {step > 1 && (
             <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>
         )}
      </div>

      {/* STEP 1: INSTITUTION */}
      {step === 1 && (
        <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-slate-900 rounded-2xl border shadow-xl text-center">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="text-indigo-600" size={32} />
            </div>
            <h2 className="text-xl font-bold mb-6">Qual sua faculdade?</h2>
            <Select onValueChange={handleInstSelect}>
                <SelectTrigger className="h-12 text-lg"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                    {institutions.length > 0 ? institutions.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>) : <SelectItem value="AFYA">AFYA</SelectItem>}
                </SelectContent>
            </Select>
        </div>
      )}

      {/* STEP 2: GRID */}
      {step === 2 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.entries(periodsGrid).sort().map(([periodNum, modules]) => {
                const Icon = PERIOD_ICONS[periodNum] || GraduationCap
                return (
                    <div key={periodNum} className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Icon size={20} />
                                <h3 className="font-bold text-lg">{periodNum}º Período</h3>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">{modules.length} matérias</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {modules.map((mod) => (
                                <div key={mod} className="bg-white text-black p-3 rounded-xl flex flex-col justify-between items-center text-center gap-3 shadow-md hover:scale-[1.05] transition-transform">
                                    <span className="font-black text-sm uppercase tracking-wide mt-1">{mod}</span>
                                    <Button size="sm" className="w-full bg-slate-950 text-white hover:bg-slate-800 text-[10px] h-7 font-bold rounded-lg" onClick={() => handleModuleClick(periodNum, mod)}>VER</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
      )}

      {/* STEP 3: EXAM LIST */}
      {step === 3 && (
        <div className="max-w-4xl mx-auto space-y-4 animate-in slide-in-from-bottom-8">
            {examsList.length === 0 ? <div className="text-center p-10 text-slate-500">Nenhuma prova encontrada.</div> : 
                examsList.map((exam) => (
                    <div key={exam.id} className="bg-white dark:bg-slate-900 border p-6 rounded-xl flex items-center justify-between shadow-sm hover:border-indigo-500 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-xl text-indigo-600">
                                <FileText size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{exam.title}</h3>
                                <div className="flex gap-2 mt-2">
                                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">{exam.questionCount} Questões</Badge>
                                    <Badge variant="outline">{exam.year}</Badge>
                                </div>
                            </div>
                        </div>
                        <Button size="lg" className="font-bold bg-indigo-600 hover:bg-indigo-700" onClick={() => openConfig(exam)}>Fazer Prova</Button>
                    </div>
                ))
            }
        </div>
      )}

      {/* MODAL CONFIG */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
            
            {/* Header Fixo */}
            <DialogHeader className="p-6 bg-indigo-600 text-white shrink-0">
                <DialogTitle className="text-2xl font-bold uppercase tracking-tight">
                    {selectedExamToPlay?.title}
                </DialogTitle>
                <DialogDescription className="text-indigo-100 mt-1 opacity-90 font-medium">
                    {selectedExamToPlay?.questionCount} Questões selecionadas
                </DialogDescription>
            </DialogHeader>

            {/* Corpo com Scroll */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                
                {/* Modos */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Settings2 className="text-slate-500" size={20} />
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Modo de Prática</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div onClick={() => setFeedbackMode('IMMEDIATE')} className={`p-4 rounded-xl border-2 cursor-pointer ${feedbackMode === 'IMMEDIATE' ? 'bg-indigo-50 border-indigo-600 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800'}`}>
                            <Zap size={24} className={feedbackMode === 'IMMEDIATE' ? 'text-indigo-600' : 'text-slate-400'} />
                            <h4 className="font-bold mt-2">Interativo</h4>
                            <p className="text-xs text-slate-500">Gabarito a cada questão.</p>
                        </div>
                        <div onClick={() => setFeedbackMode('END')} className={`p-4 rounded-xl border-2 cursor-pointer ${feedbackMode === 'END' ? 'bg-indigo-50 border-indigo-600 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800'}`}>
                            <Flag size={24} className={feedbackMode === 'END' ? 'text-indigo-600' : 'text-slate-400'} />
                            <h4 className="font-bold mt-2">Simulado</h4>
                            <p className="text-xs text-slate-500">Gabarito ao final.</p>
                        </div>
                        <div onClick={() => { setFeedbackMode('PEEK'); setTimerEnabled(false); }} className={`p-4 rounded-xl border-2 cursor-pointer ${feedbackMode === 'PEEK' ? 'bg-indigo-50 border-indigo-600 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-800'}`}>
                            <Eye size={24} className={feedbackMode === 'PEEK' ? 'text-indigo-600' : 'text-slate-400'} />
                            <h4 className="font-bold mt-2">Estudo</h4>
                            <p className="text-xs text-slate-500">Sem tempo, com respostas.</p>
                        </div>
                    </div>
                </section>

                <div className="h-[1px] bg-slate-200 dark:bg-slate-800 w-full" />

                {/* Slider */}
                <section className="space-y-6">
                    <div className="flex items-center gap-2">
                        <Clock className="text-slate-500" size={20} />
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Tempo de Prova</h3>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">Usar Cronômetro</p>
                            <p className="text-xs text-slate-500">Define um limite para finalizar.</p>
                        </div>
                        <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} disabled={feedbackMode === 'PEEK'} />
                    </div>

                    {timerEnabled && (
                        <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-indigo-600 uppercase">Duração Total</span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">{examDuration[0]} minutos</span>
                            </div>
                            <Slider value={examDuration} onValueChange={setExamDuration} min={30} max={150} step={5} className="cursor-pointer py-4" />
                            <div className="flex justify-between items-center pt-2 text-sm border-t border-slate-200 dark:border-slate-800 mt-2">
                                <span className="text-slate-500">Estimativa:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {selectedExamToPlay ? (examDuration[0] / selectedExamToPlay.questionCount).toFixed(1) : 0} min/questão
                                </span>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                        <div className="max-w-[80%]">
                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Pausar timer ao ler resposta</p>
                            <p className="text-xs text-slate-500">Apenas no modo Interativo.</p>
                        </div>
                        <Switch checked={pauseOnExplanation} onCheckedChange={setPauseOnExplanation} disabled={!timerEnabled || feedbackMode !== 'IMMEDIATE'} />
                    </div>
                </section>
            </div>

            {/* Footer Fixo */}
            <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
                <Button onClick={startExam} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-lg transition-all hover:scale-[1.02]">
                    INICIAR PROVA <ArrowLeft className="rotate-180 ml-2" />
                </Button>
            </div>

        </DialogContent>
      </Dialog>
    </div>
  )
}