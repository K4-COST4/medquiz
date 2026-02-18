'use client'

import { useRouter } from "next/navigation"
import {
  Map,
  FileText,
  Zap,
  Swords,
  Target,
  Stethoscope,
} from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { motion } from "framer-motion"

export default function PraticarPage() {
  const router = useRouter()

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  const gameModes = [
    {
      id: "trilhas",
      title: "Trilhas de Estudo",
      description: "O método clássico gamificado. Avance por módulos (Cardio, Pediatria) estilo Duolingo.",
      icon: Map,
      color: "text-blue-600",
      iconBg: "bg-blue-100",
      href: "/trilhas",
      status: "active"
    },
    {
      id: "provas",
      title: "Simular Provas",
      description: "Ambiente real de prova. Escolha a instituição (USP, SUS-SP) e teste seu tempo.",
      icon: FileText,
      color: "text-emerald-600",
      iconBg: "bg-emerald-100",
      href: "/praticar/provas",
      status: "active"
    },
    {
      id: "flashcards",
      title: "Flashcards AI",
      description: "Estudo ativo com repetição espaçada (SRS) para memorizar doses e critérios.",
      icon: Zap,
      color: "text-amber-600",
      iconBg: "bg-amber-100",
      href: "/praticar/flashcard",
      status: "active"
    },
    {
      id: "treino-clinico",
      title: "Treino Clínico",
      description: "Converse com pacientes virtuais, pratique anamnese e receba avaliação com rubrica de semiologia.",
      icon: Stethoscope,
      color: "text-teal-600",
      iconBg: "bg-teal-100",
      href: "/treino-clinico",
      status: "active"
    },
    {
      id: "live",
      title: "Batalha Live",
      description: "Crie uma sala e desafie seus amigos em tempo real. Ideal para grupos.",
      icon: Swords,
      color: "text-slate-400",
      iconBg: "bg-slate-200",
      href: "/live/create",
      status: "coming_soon"
    },
  ]

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">

      {/* 1. Limpeza e Header */}
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <Target className="w-8 h-8 text-indigo-600" />
          Central de Prática
        </h1>
        <p className="text-slate-500 text-lg">
          Escolha um modo de estudo para fortalecer seu conhecimento hoje.
        </p>
      </div>

      {/* 2. Grid de Cards com Animação */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {gameModes.map((mode) => {
          if (mode.status === "active") {
            return (
              <motion.div key={mode.id} variants={item}>
                <Link href={mode.href} className="block h-full">
                  <Card className="h-full hover:shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/50 cursor-pointer group border-slate-200 dark:border-slate-800">
                    <CardHeader>
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 transition-colors ${mode.iconBg}`}>
                        <mode.icon className={`w-6 h-6 ${mode.color}`} />
                      </div>
                      <CardTitle className="text-xl font-bold group-hover:text-blue-700 transition-colors">
                        {mode.title}
                      </CardTitle>
                      <CardDescription className="text-slate-500 mt-2">
                        {mode.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>
            )
          } else {
            // 3. Tratamento do "Live Game" (Em Breve)
            return (
              <motion.div key={mode.id} variants={item}>
                <Card className="h-full bg-slate-50 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 opacity-75 cursor-not-allowed relative">
                  <Badge className="absolute top-4 right-4 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none shadow-none">
                    EM BREVE
                  </Badge>
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-slate-200 dark:bg-slate-800`}>
                      <mode.icon className="w-6 h-6 text-slate-400" />
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-400">
                      {mode.title}
                    </CardTitle>
                    <CardDescription className="text-slate-400 mt-2">
                      {mode.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            )
          }
        })}
      </motion.div>
    </div>
  )
}