'use client'

import { useRouter } from "next/navigation"
import { 
  Map, 
  FileText, 
  Zap, 
  Users, 
  ArrowRight, 
  Trophy,
  Swords,
  GraduationCap
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function PraticarPage() {
  const router = useRouter()

  const gameModes = [
    {
      id: "trilhas",
      title: "Trilhas de Estudo",
      description: "O método clássico gamificado. Avance por módulos (Cardio, Pediatria) estilo Duolingo.",
      icon: Map,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "hover:border-blue-500",
      href: "/trilhas",
      status: "active"
    },
    {
      id: "provas",
      title: "Simular Provas",
      description: "Ambiente real de prova. Escolha a instituição (USP, UNIFESP, SUS-SP) e teste seu tempo.",
      icon: FileText,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "hover:border-emerald-500",
      href: "/praticar/provas", // Rota que faremos depois
      status: "active"
    },
    {
      id: "battle",
      title: "Desafio 1v1",
      description: "Convide um amigo ou jogue contra um aleatório. Quem acerta mais rápido vence.",
      icon: Swords,
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      border: "hover:border-violet-500",
      href: "/praticar/multiplayer", // Rota futura
      status: "active"
    },
    {
      id: "flashcards",
      title: "Flashcards",
      description: "Repetição espaçada (SRS) para memorizar doses, critérios e tríades clínicas.",
      icon: Zap,
      color: "text-yellow-500",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "hover:border-yellow-500",
      href: "#",
      status: "coming_soon"
    }
  ]

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Trophy className="text-yellow-500" /> Arena de Prática
          </h1>
          <p className="text-slate-500 mt-2">
            Escolha seu modo de jogo e comece a subir seu MedElo.
          </p>
        </div>
        
        {/* Resumo rápido do usuário */}
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase">Nível Atual</p>
                <p className="font-bold text-indigo-600">R1 - Residente Jr.</p>
            </div>
            <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
            <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase">Questões Hoje</p>
                <p className="font-bold text-emerald-600">12 / 50</p>
            </div>
        </div>
      </div>

      {/* GRID DE MODOS DE JOGO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gameModes.map((mode) => (
          <Card 
            key={mode.id}
            onClick={() => mode.status === "active" && router.push(mode.href)}
            className={`
              relative overflow-hidden transition-all duration-300 border-2
              ${mode.status === "active" 
                ? `cursor-pointer hover:scale-[1.02] hover:shadow-xl ${mode.border}` 
                : "opacity-70 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
              }
            `}
          >
            <CardHeader className="flex flex-row items-start gap-4 pb-2">
              <div className={`p-4 rounded-2xl ${mode.bg} ${mode.color} transition-transform group-hover:scale-110`}>
                <mode.icon size={32} strokeWidth={2.5} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold">{mode.title}</CardTitle>
                    {mode.status === "coming_soon" && (
                        <Badge variant="secondary" className="text-xs font-bold bg-slate-200 text-slate-600">
                            Em breve
                        </Badge>
                    )}
                     {mode.id === "trilhas" && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                            Popular
                        </Badge>
                    )}
                </div>
                <CardDescription className="text-base leading-relaxed">
                  {mode.description}
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent>
               {mode.status === "active" ? (
                 <Button variant="ghost" className={`w-full justify-between group mt-2 ${mode.color} hover:${mode.bg} hover:${mode.color}`}>
                    <span className="font-bold">Jogar Agora</span>
                    <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                 </Button>
               ) : (
                 <Button disabled variant="ghost" className="w-full justify-start mt-2 text-slate-400">
                    <span className="font-medium">Disponível na próxima atualização</span>
                 </Button>
               )}
            </CardContent>

            {/* Efeito decorativo de fundo */}
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 ${mode.bg.split(' ')[0].replace('/20','')}`} />
          </Card>
        ))}
      </div>

    </div>
  )
}