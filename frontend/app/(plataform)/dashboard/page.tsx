'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Trophy,
  Flame,
  Target,
  Zap,
  Heart,
  BookOpen,
  Dna,
  CalendarDays,
  ArrowRight,
  TrendingUp,
  MoreHorizontal,
  AlertTriangle,
  Lock,
  Calendar as CalendarIcon
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"

import { getDashboardData, type DashboardData } from "./actions"

// --- COMPONENTES AUXILIARES ---

function StatsCard({ icon: Icon, value, label, subtext, colorClass, pending }: any) {
  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
      {pending && (
        <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <span className="bg-slate-200 dark:bg-slate-800 text-[10px] uppercase font-bold px-2 py-1 rounded text-slate-500">Em Breve</span>
        </div>
      )}
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
          <Icon size={24} className={`text-current opacity-90`} />
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
              {value}
            </span>
            {subtext && (
              <span className="text-xs font-bold text-emerald-500 flex items-center">
                {subtext}
              </span>
            )}
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityCalendar({ dates }: { dates: string[] }) {
  // Dates comes as ["2024-01-10", "2024-01-09"]
  // We need to convert strings to Date objects for the Calendar component
  // Defensive check: Ensure dates is an array
  const safeDates = Array.isArray(dates) ? dates : [];

  const activeDates = safeDates.map(d => {
    const [year, month, day] = d.split('-').map(Number);
    return new Date(year, month - 1, day);
  });

  return (
    <Card className="border-slate-200 dark:border-slate-800">
      <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800/50">
        <CardTitle className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
          <CalendarIcon size={16} />
          Constância
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 flex justify-center">
        <Calendar
          mode="multiple"
          selected={[]} // Force empty selection to avoid default black style
          className="rounded-md border-0 w-full flex justify-center p-0"
          modifiers={{
            active: activeDates
          }}
          modifiersClassNames={{
            active: "bg-purple-600 text-white font-bold hover:bg-purple-700 rounded-full"
          }}
          classNames={{
            day: "pointer-events-none" // Desabilita clique nos dias, mas mantém navegação do cabeçalho
          }}
        // Disable navigation to keep it simple or allow it
        // showOutsideDays={false}
        />
      </CardContent>
    </Card>
  )
}

function HeartTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Format: 1h 30m or 45m
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimer(); // Run immediately
    const interval = setInterval(updateTimer, 60000); // Update every minute is enough for H:M

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <span className="text-xs font-bold text-rose-500 bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 rounded-full ml-1">
      +1 em {timeLeft}
    </span>
  );
}

function Greeting() {
  const hour = new Date().getHours()
  let text = "Bom dia"
  if (hour >= 12 && hour < 18) text = "Boa tarde"
  else if (hour >= 18) text = "Boa noite"

  return <span className="opacity-80">{text}</span>
}

// --- PÁGINA PRINCIPAL ---

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      const res = await getDashboardData()
      if (res.success && res.data) {
        setData(res.data)
      } else {
        setError(res.error || "Erro desconhecido ao carregar dados.")
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="grid grid-cols-3 gap-4 h-24">
          <div className="bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="p-4 bg-red-100 text-red-600 rounded-full">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Não foi possível carregar o dashboard</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md bg-slate-100 dark:bg-slate-900 p-2 rounded font-mono text-xs">
          {error}
        </p>
        <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pb-20">

      {/* HEADER & GREETING */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            <Greeting />, {data.user.name.split(' ')[0]}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            Vamos evoluir sua medicina hoje?
          </p>
        </div>
      </header>

      {/* STATS BAR */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCard
          icon={Flame}
          value={data.stats.streak}
          label="Ofensiva (Dias)"
          colorClass="text-orange-500 bg-orange-500"
          subtext={data.stats.streak > 0 ? "Ativo" : "Comece!"}
        />
        <StatsCard
          icon={Heart}
          value={data.stats.hearts}
          label="Vidas Disponíveis"
          colorClass="text-rose-500 bg-rose-500"
          subtext={
            data.stats.hearts < 5 && data.stats.next_heart_at ? (
              <HeartTimer targetDate={data.stats.next_heart_at} />
            ) : (
              data.stats.hearts < 5 ? "+1 em Breve" : "Cheio"
            )
          }
        />
        <StatsCard
          icon={Trophy}
          value={data.stats.elo}
          label="Rating MedQuiz"
          colorClass="text-yellow-500 bg-yellow-500"
          pending={true} // Marked as Em Breve
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* COLUNA PRINCIPAL (ESQUERDA + CENTRO) */}
        <div className="xl:col-span-2 space-y-8">

          {/* HERO SECTION */}
          {data.is_new_user ? (
            <Card className="border-0 bg-gradient-to-br from-indigo-600 to-violet-800 text-white shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-12 opacity-10">
                <Dna size={200} />
              </div>
              <CardContent className="p-8 md:p-12 relative z-10 flex flex-col gap-6 items-start">
                <div>
                  <Badge className="bg-white/20 hover:bg-white/30 text-indigo-100 border-0 mb-3 text-xs uppercase tracking-widest font-bold">
                    Bem-vindo ao MedQuiz
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-bold mb-2">Sua jornada começa agora.</h2>
                  <p className="text-indigo-100 text-lg max-w-lg leading-relaxed">
                    Domine a medicina através de prática ativa. Escolha uma trilha e comece seus estudos de forma inteligente.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold h-14 px-8 text-base shadow-sm"
                  onClick={() => router.push('/trilhas')}
                >
                  <Zap className="mr-2" size={20} fill="currentColor" />
                  Iniciar Jornada
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/10 shadow-lg shadow-indigo-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-950 dark:text-indigo-100">
                  <Target className="text-indigo-600" />
                  Foco Atual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {data.progress ? (
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl w-full md:w-2/3 border border-indigo-100 dark:border-indigo-900 shadow-sm">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 line-clamp-1">
                          {data.progress.last_module_title}
                        </h3>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                          {Math.round(data.progress.last_module_progress)}%
                        </span>
                      </div>
                      <Progress value={data.progress.last_module_progress} className="h-3 bg-indigo-100 dark:bg-indigo-950" indicatorClassName="bg-indigo-600" />
                      <p className="text-xs text-slate-400 mt-2 font-medium uppercase tracking-wider">
                        Última atividade: {data.stats.last_activity ? new Date(data.stats.last_activity).toLocaleDateString() : 'Hoje'}
                      </p>
                    </div>
                    <div className="w-full md:w-1/3">
                      <Button
                        className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none shadow-lg transition-all"
                        onClick={() => router.push(`/praticar/${data.progress!.last_module_id}`)}
                      >
                        Continuar <ArrowRight className="ml-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-500 mb-4">Você ainda não iniciou nenhum módulo recentemente.</p>
                    <Button variant="outline" onClick={() => router.push('/trilhas')}>Ver Trilhas Disponíveis</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* PRACTICE ACTIONS GRID (SHORTCUTS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Card 1: Flashcards (Antes Simulado Rápido) */}
            <Card
              className="bg-gradient-to-b from-white to-amber-50/50 dark:from-slate-900 dark:to-amber-950/10 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-900 transition-colors cursor-pointer group"
              onClick={() => router.push('/praticar/flashcard')} // MUDADO PARA FLASHCARDS
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-slate-700 dark:text-slate-200 group-hover:text-amber-600 transition-colors">Flashcards</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-4">Memorize conceitos chave com repetição espaçada.</p>
                <div className="w-8 h-8 rounded-full bg-amber-100 group-hover:bg-amber-500 dark:bg-amber-900/30 dark:group-hover:bg-amber-900 flex items-center justify-center pt-0 transition-all">
                  <Zap size={16} className="text-amber-500 group-hover:text-white transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Prova Oficial (Link Atualizado) */}
            <Card
              className="bg-gradient-to-b from-white to-blue-50/50 dark:from-slate-900 dark:to-blue-950/10 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-900 transition-colors cursor-pointer group"
              onClick={() => router.push('/praticar/provas')} // MUDADO PARA /praticar/provas
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors">Provas Oficiais</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-4">Simule as condições reais de prova da sua faculdade.</p>
                <div className="w-8 h-8 rounded-full bg-blue-100 group-hover:bg-blue-500 dark:bg-blue-900/30 dark:group-hover:bg-blue-900 flex items-center justify-center pt-0 transition-all">
                  <BookOpen size={16} className="text-blue-500 group-hover:text-white transition-colors" />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Revisar Erros (EM BREVE) */}
            <Card
              className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed group relative overflow-hidden"
            // onClick desabilitado
            >
              <div className="absolute inset-0 z-10 bg-white/50 dark:bg-black/20 flex items-center justify-center">
                <span className="text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Em Breve</span>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-slate-500 dark:text-slate-400">Revisar Erros</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400 mb-4">Fortaleça seus pontos fracos revendo questões que você errou.</p>
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center pt-0">
                  <Lock size={14} className="text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* COLUNA LATERAL (DIREITA) */}
        <div className="xl:col-span-1 space-y-8">

          {/* CALENDÁRIO REAL */}
          <ActivityCalendar dates={data.activity_dates || []} />

          {/* RANKING AMIGOS (EM BREVE) */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center text-center p-6">
              <div className="bg-slate-200 dark:bg-slate-800 p-3 rounded-full mb-3">
                <Trophy className="text-slate-400" size={24} />
              </div>
              <h3 className="font-bold text-slate-600 dark:text-slate-300">Ranking em Breve</h3>
              <p className="text-xs text-slate-400 max-w-[200px] mt-1">Logo você poderá competir com seus amigos e ver quem domina o ranking.</p>
            </div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 opacity-50">
              <CardTitle className="text-sm font-bold uppercase text-slate-500">Ranking Amigos</CardTitle>
              <MoreHorizontal size={16} className="text-slate-400" />
            </CardHeader>
            <CardContent className="p-0 opacity-50">
              {[1, 2, 3].map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-4 border-b last:border-0">
                  <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                    <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ADS SLOT */}
          <div className="w-full h-[300px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-400 text-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at center, #94a3b8 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
            <span className="bg-slate-200 dark:bg-slate-800 text-[10px] px-2 py-1 rounded absolute top-2 right-2 font-bold uppercase tracking-wider">Ads</span>
            <p className="text-sm font-bold">Espaço Publicitário</p>
          </div>

        </div>

      </div>
    </div>
  )
}