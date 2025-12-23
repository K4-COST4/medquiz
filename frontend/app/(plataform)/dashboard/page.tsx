'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Trophy, 
  Flame, 
  Brain, 
  ArrowRight, 
  History, 
  Play, 
  Search,
  TrendingUp,
  MoreHorizontal,
  Target,
  AlertCircle,
  FileText,
  Lock, // Adicionado
  Zap   // Adicionado
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"

export default function DashboardPage() {
  const router = useRouter()
  const [aiQuery, setAiQuery] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())

  const userStats = {
    elo: 1240,
    rank: "R1 - Residente Jr.",
    streak: 5,
    dailyAiUses: 2,
    maxAiUses: 5
  }

  // Dados Mockados para o Histórico (Restaurado)
  const recentHistory = [
    { id: 1, title: "Homem, 65 anos, dor torácica típica...", result: "Acerto", date: "2h atrás" },
    { id: 2, title: "Criança com febre e exantema...", result: "Erro", date: "Ontem" },
    { id: 3, title: "Gestante, 32 semanas, PA 160/110...", result: "Acerto", date: "Ontem" },
  ]

  const handleAiSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (aiQuery.trim()) {
      router.push(`/med-ai?q=${encodeURIComponent(aiQuery)}`)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* =========================================================
            COLUNA CENTRAL (MAIN CONTENT)
           ========================================================= */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* 1. HERO IA (Estilo ChatGPT) */}
          <section className="space-y-4">
            <div className="text-center space-y-2 mb-6">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Olá, Dr(a). Como posso ajudar?
                </h1>
                <p className="text-slate-500">Tire dúvidas clínicas, discuta casos ou solicite ajuda.</p>
            </div>

            <Card className="border-indigo-200 dark:border-indigo-800 shadow-lg shadow-indigo-500/10 overflow-hidden">
              <CardContent className="p-0">
                <form onSubmit={handleAiSearch} className="relative">
                  <div className="p-4">
                    <div className="relative">
                        <textarea
                            placeholder="Ex: Paciente com dispneia súbita e dor pleurítica. O que investigar?" 
                            className="w-full min-h-[100px] resize-none bg-transparent border-none text-lg focus:ring-0 focus:outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                            value={aiQuery}
                            onChange={(e) => setAiQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAiSearch(e);
                                }
                            }}
                        />
                    </div>
                  </div>
                  
                  {/* Barra de Ferramentas do Chat */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                     <div className="flex gap-2">
                        {/* Tags opcionais aqui se quiser voltar com elas */}
                     </div>
                     <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg px-6">
                        Enviar <ArrowRight size={16} className="ml-2" />
                     </Button>
                  </div>
                </form>
              </CardContent>
              {/* Contador de usos */}
              <div className="bg-indigo-50 dark:bg-indigo-950/30 px-4 py-1 text-center border-t border-indigo-100 dark:border-indigo-900">
                 <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    Você usou {userStats.dailyAiUses} de {userStats.maxAiUses} perguntas diárias gratuitas.
                 </p>
              </div>
            </Card>
          </section>

          {/* 2. ESPAÇO PUBLICITÁRIO (ALTA VISIBILIDADE) */}
          <div className="w-full h-24 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center relative overflow-hidden group">
            <span className="text-xs font-mono text-slate-400 z-10">Publicidade em Destaque (Google AdSense)</span>
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>

          {/* 3. AÇÕES DE ESTUDO (3 SUGESTÕES VERTICAIS) */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Play className="text-indigo-500" fill="currentColor" /> 
                Hora de Praticar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Ação 1: Revisar Erros */}
                <Card 
                    onClick={() => router.push('/praticar?mode=errors')}
                    className="cursor-pointer hover:border-red-400 hover:shadow-md transition-all group border-t-4 border-t-red-500"
                >
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-between">
                        <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                            <AlertCircle size={32} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Revisar Erros</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                Você tem 12 questões pendentes de revisão.
                            </p>
                        </div>
                        <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50">Começar</Button>
                    </CardContent>
                </Card>

                {/* Ação 2: Trilhas (Principal) */}
                <Card 
                    onClick={() => router.push('/trilhas')}
                    className="cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group border-t-4 border-t-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/10"
                >
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-between">
                        <div className="bg-indigo-100 dark:bg-indigo-900/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                            <Target size={32} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-indigo-900 dark:text-indigo-100">Continuar Trilha</h3>
                            <p className="text-sm text-indigo-700/80 dark:text-indigo-300 mt-2">
                                Módulo: <b>Cardiologia</b><br/>
                                <span className="text-xs">65% concluído</span>
                            </p>
                        </div>
                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">Jogar</Button>
                    </CardContent>
                </Card>

                {/* Ação 3: Simulados/Provas */}
                <Card 
                    onClick={() => router.push('/praticar?mode=exam')}
                    className="cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group border-t-4 border-t-emerald-500"
                >
                    <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full justify-between">
                        <div className="bg-emerald-100 dark:bg-emerald-900/20 p-4 rounded-full group-hover:scale-110 transition-transform">
                            <FileText size={32} className="text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Realizar Prova</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                Simule sua prova da sua faculdade. Treine e se prepare.
                            </p>
                        </div>
                        <Button variant="ghost" className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">Configurar</Button>
                    </CardContent>
                </Card>

            </div>
          </section>

           {/* 4. HISTÓRICO & FLASHCARDS (RESTAURADOS) */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Histórico Recente */}
              <Card className="h-full">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History size={18} className="text-slate-400"/> Histórico
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => router.push('/perfil#historico')}>Ver tudo</Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentHistory.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => router.push('/perfil#historico')}
                      className="text-sm p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                    >
                      <div className="flex justify-between mb-1">
                        <Badge variant={item.result === "Acerto" ? "default" : "destructive"} className="h-5 text-[10px] px-1.5">
                          {item.result}
                        </Badge>
                        <span className="text-xs text-slate-400">{item.date}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 line-clamp-1 font-medium">
                        {item.title}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Flashcards (Em breve) */}
              <Card className="relative overflow-hidden h-full">
                 <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-4">
                    <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2 mb-2">
                      <Lock size={14} className="text-slate-500" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Em Breve</span>
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Crie seus próprios flashcards de revisão.</p>
                 </div>
                 
                 {/* Conteúdo "falso" no fundo para dar efeito visual */}
                 <CardHeader className="opacity-50">
                   <CardTitle className="text-lg flex items-center gap-2">
                     <Zap size={18} className="text-yellow-500" fill="currentColor" />
                     Flashcards
                   </CardTitle>
                   <CardDescription>Baralho de Cardiologia</CardDescription>
                 </CardHeader>
                 <CardContent className="opacity-50 space-y-2">
                   <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <span className="text-slate-300">Frente do Cartão</span>
                   </div>
                 </CardContent>
              </Card>

           </div>

        </div>


        {/* =========================================================
            COLUNA DA DIREITA (CALENDÁRIO & SOCIAL)
           ========================================================= */}
        <div className="xl:col-span-1 space-y-6">
          
          {/* 1. CALENDÁRIO + STREAK (Topo da Direita) */}
          <Card className="overflow-hidden border-orange-200 dark:border-orange-900/50">
             <div className="bg-orange-50 dark:bg-orange-950/20 p-4 flex items-center justify-between border-b border-orange-100 dark:border-orange-900/30">
                <div className="flex items-center gap-2">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                        <Flame size={20} fill="currentColor"/>
                    </div>
                    <div>
                        <p className="text-2xl font-black text-orange-600 dark:text-orange-500 leading-none">{userStats.streak}</p>
                        <p className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Dias seguidos</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-500">Meta Diária</p>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                    </div>
                </div>
             </div>
             
             <div className="p-4 flex justify-center bg-white dark:bg-slate-950">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md border shadow-sm w-full flex justify-center"
                />
             </div>
          </Card>

          {/* 2. PUBLICIDADE (SKYSCRAPER) */}
          <div className="w-full h-[350px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 text-center p-4 relative">
             <span className="bg-slate-200 dark:bg-slate-800 text-[10px] px-2 py-1 rounded absolute top-2 right-2">Ads</span>
             <p className="text-sm font-medium">Anúncio Vertical</p>
          </div>

          {/* 3. ELO (RATING) */}
          <Card className="bg-slate-900 text-white border-slate-800 overflow-hidden relative">
             <div className="absolute top-0 right-0 p-8 opacity-5">
               <Trophy size={140} />
             </div>
             <CardHeader className="pb-2">
               <CardTitle className="text-slate-400 text-xs font-bold uppercase tracking-wider">Seu Rating (MedElo)</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="flex items-end gap-3 mb-2">
                 <span className="text-5xl font-black text-white tracking-tighter">{userStats.elo}</span>
                 <span className="text-emerald-400 text-xs font-bold flex items-center mb-2">
                     <TrendingUp size={12} className="mr-1" /> +12
                 </span>
               </div>
               <p className="text-slate-400 text-xs">Top 15% da plataforma.</p>
             </CardContent>
          </Card>

          {/* 4. RANKING */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold uppercase text-slate-500">Ranking Amigos</CardTitle>
              <MoreHorizontal size={16} className="text-slate-400 cursor-pointer" />
            </CardHeader>
            <CardContent className="p-0">
               {[
                 { name: "Ana Clara", points: 1350, pos: 1, avatar: "AC" },
                 { name: "Você", points: 1240, pos: 2, avatar: null },
                 { name: "Lucas M.", points: 1100, pos: 3, avatar: "LM" },
               ].map((friend, index) => (
                 <div key={index} className={`flex items-center gap-3 p-3 border-b last:border-0 ${friend.name === "Você" ? "bg-indigo-50/50 dark:bg-indigo-900/10" : ""}`}>
                    <div className="w-4 text-center font-bold text-slate-400 text-xs">{friend.pos}</div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-slate-200 text-slate-600 text-xs font-bold">{friend.avatar || "VC"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{friend.name}</p>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{friend.points}</span>
                 </div>
               ))}
            </CardContent>
          </Card>

        </div>

      </div>
    </div>
  )
}