'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowLeft, 
  GraduationCap, 
  Brain, 
  Heart, 
  Activity,
  Microscope,
  Eye,
  Stethoscope, 
  Baby, 
  Bone,
  FileText
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

import { getInstitutions, getPeriodsAndModules, getExamList } from "./actions"

// Mapeamento de ícones (igual ao seu)
const PERIOD_ICONS: Record<string, any> = {
  '1': Microscope, '2': Brain, '3': Heart, '4': Activity, 
  '5': Bone, '6': Baby, '7': Eye, '8': Stethoscope
}

export default function ProvasVisualPage() {
  const router = useRouter()
  
  const [selectedInst, setSelectedInst] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [selectedModule, setSelectedModule] = useState("")
  
  const [institutions, setInstitutions] = useState<string[]>([])
  const [periodsGrid, setPeriodsGrid] = useState<Record<string, string[]>>({})
  const [examsList, setExamsList] = useState<any[]>([])

  const [step, setStep] = useState(1)
  const [configOpen, setConfigOpen] = useState(false)
  const [selectedExamToPlay, setSelectedExamToPlay] = useState<any>(null)
  const [timerEnabled, setTimerEnabled] = useState(true)
  const [instantFeedback, setInstantFeedback] = useState(false)

  // 1. Load Institutions
  useEffect(() => {
    getInstitutions().then(setInstitutions)
  }, [])

  // 2. Select Institution
  const handleInstSelect = async (inst: string) => {
    setSelectedInst(inst)
    const grid = await getPeriodsAndModules(inst)
    
    // Fallback Visual (Mock) se o banco estiver vazio
    if (Object.keys(grid).length === 0) {
       setPeriodsGrid({
         '1': ['SOI I', 'HAM I', 'IESC I'],
         '5': ['SOI V', 'HAM V', 'IESC V', 'MCM V', 'INTEGRA V'],
       })
    } else {
       setPeriodsGrid(grid)
    }
    setStep(2)
  }

  // 3. Select Module
  const handleModuleClick = async (period: string, moduleName: string) => {
    setSelectedPeriod(period)
    setSelectedModule(moduleName)
    
    const exams = await getExamList(selectedInst, period, moduleName)
    setExamsList(exams)
    setStep(3)
  }

  // 4. Config Modal
  const openConfig = (exam: any) => {
    setSelectedExamToPlay(exam)
    setConfigOpen(true)
  }

  const startExam = () => {
    const query = new URLSearchParams({
        inst: selectedInst,
        subject: selectedModule,
        year: selectedExamToPlay.year.toString(),
        // Passamos também o nome exato da prova (ex: N1) se quiser filtrar mais preciso no futuro
        exam_title: selectedExamToPlay.title, 
        timer: timerEnabled.toString(),
        feedback: instantFeedback.toString()
    }).toString()
    router.push(`/exam/start?${query}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      
      {/* HEADER */}
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
                <p className="text-slate-500 text-sm">
                    {step === 1 && "Escolha onde você estuda."}
                    {step === 2 && "Escolha o módulo para ver as provas."}
                    {step === 3 && "Lista de provas disponíveis."}
                </p>
            </div>
         </div>
         {step > 1 && (
             <Button variant="outline" onClick={() => setStep(step - 1)}>
                Voltar
             </Button>
         )}
      </div>

      {/* STEP 1: INSTITUTION */}
      {step === 1 && (
        <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-xl text-center">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="text-indigo-600" size={32} />
            </div>
            <h2 className="text-xl font-bold mb-6">Qual sua faculdade?</h2>
            <Select onValueChange={handleInstSelect}>
                <SelectTrigger className="h-12 text-lg"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                    {institutions.length > 0 
                        ? institutions.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)
                        : <SelectItem value="AFYA">AFYA (Exemplo)</SelectItem>
                    }
                </SelectContent>
            </Select>
        </div>
      )}

      {/* STEP 2: GRID (Igual imagem) */}
      {step === 2 && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.entries(periodsGrid).sort().map(([periodNum, modules]) => {
                const Icon = PERIOD_ICONS[periodNum] || GraduationCap
                return (
                    <div key={periodNum} className="bg-black text-white p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Icon size={20} className="text-white" />
                                <h3 className="font-bold text-lg">{periodNum}º Período</h3>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">{modules.length} matérias</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {modules.map((mod) => (
                                <div key={mod} className="bg-white text-black p-3 rounded-xl flex flex-col justify-between items-center text-center gap-3 shadow-md hover:scale-[1.02] transition-transform">
                                    <span className="font-black text-sm uppercase tracking-wide mt-1">{mod}</span>
                                    <Button size="sm" className="w-full bg-black text-white hover:bg-slate-800 text-[10px] h-7 font-bold rounded-lg" onClick={() => handleModuleClick(periodNum, mod)}>VER</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
      )}

      {/* STEP 3: LISTA DE PROVAS (Atualizado) */}
      {step === 3 && (
        <div className="max-w-4xl mx-auto space-y-4 animate-in slide-in-from-bottom-8 duration-500">
            {examsList.length === 0 ? (
                 <div className="text-center p-10 text-slate-500">Nenhuma prova encontrada neste filtro.</div>
            ) : (
                examsList.map((exam) => (
                    <div key={exam.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex items-center justify-between shadow-sm hover:border-indigo-500 hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                                <FileText size={24} />
                            </div>
                            <div>
                                {/* AQUI: O título já vem formatado do actions.ts (Ex: N1 SOI V 2025.1) */}
                                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">
                                    {exam.title}
                                </h3>
                                <div className="flex gap-2 mt-2">
                                    <Badge variant="secondary" className="text-slate-500 bg-slate-100">
                                        {exam.questionCount} Questões
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <Button size="lg" className="font-bold bg-indigo-600 hover:bg-indigo-700" onClick={() => openConfig(exam)}>
                            Fazer Prova
                        </Button>
                    </div>
                ))
            )}
        </div>
      )}

      {/* MODAL CONFIG */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Configurar Simulado</DialogTitle>
                <DialogDescription>Prova: <span className="font-bold text-indigo-600">{selectedExamToPlay?.title}</span></DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex items-center justify-between border p-3 rounded-lg">
                    <Label>Modo Cronometrado</Label>
                    <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
                </div>
                <div className="flex items-center justify-between border p-3 rounded-lg">
                    <Label>Feedback Imediato</Label>
                    <Switch checked={instantFeedback} onCheckedChange={setInstantFeedback} />
                </div>
            </div>
            <DialogFooter>
                <Button onClick={startExam} className="w-full font-bold bg-indigo-600 text-white">Começar Agora</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}