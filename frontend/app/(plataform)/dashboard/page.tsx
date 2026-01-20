import { getDashboardData } from "./actions";
import {
    BookOpen,
    Brain,
    Calendar as CalendarIcon,
    ChevronRight,
    Flame,
    GraduationCap,
    Heart,
    LayoutDashboard,
    Library,
    MoreHorizontal,
    Play,
    PlusCircle,
    Sparkles,
    Star,
    Target,
    Trophy,
    Zap
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Calendar } from "@/components/ui/calendar"; // Removed to avoid RSC error
import { DashboardOmnibox } from "./dashboard-omnibox";
import { redirect } from "next/navigation";
// import { ptBR } from "date-fns/locale"; // Removed to avoid RSC error
import { DashboardCalendar } from "./dashboard-calendar";

export default async function DashboardPage() {
    const { success, data, error } = await getDashboardData();

    if (!success || !data) {
        // Fallback or Redirect if auth fails (though middleware should catch it)
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-destructive font-medium">{error || "Erro ao carregar dashboard"}</p>
            </div>
        );
    }

    const { user, stats, progress, activeTracks, userDecks, is_new_user, activity_dates } = data;

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* 1. HEADER SEÇÃO (Boas vindas + Stats) */}
                <header className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                            <LayoutDashboard className="text-indigo-500" />
                            Olá, {user.name.split(' ')[0]}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            {is_new_user ? "Comece sua jornada de aprendizado hoje!" : "Pronto para continuar evoluindo?"}
                        </p>
                    </div>

                    {/* Stats Cards (Compacto) */}
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex flex-col items-center px-4 border-r border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ofensiva</span>
                            <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-100">
                                <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                                {stats.streak}
                            </div>
                        </div>
                        <div className="flex flex-col items-center px-4 border-r border-slate-100 dark:border-slate-800 opacity-70" title="Em Breve">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vidas</span>
                            <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-100">
                                <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
                                {stats.hearts}
                            </div>
                        </div>
                        <div className="flex flex-col items-center px-4 opacity-70" title="Em Breve">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rating</span>
                            <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-100">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                {stats.elo}
                            </div>
                        </div>
                    </div>
                </header>

                {/* 2. LAYOUT "BENTO GRID" */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* COLUNA PRINCIPAL (Esquerda - 8 cols) */}
                    <div className="lg:col-span-8 space-y-6">

                        {/* A. MEDAI OMNIBOX */}
                        <section className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden group">
                            {/* Background decoration */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/20 transition-all duration-700" />

                            <div className="relative z-10 max-w-2xl">
                                <div className="flex items-center gap-2 mb-3 text-indigo-100 font-medium">
                                    <Sparkles className="h-4 w-4" />
                                    <span>MedAI Assistant</span>
                                </div>
                                <h2 className="text-2xl font-bold mb-6">O que você quer aprender ou revisar hoje?</h2>

                                <DashboardOmnibox />
                            </div>
                        </section>

                        {/* B. MINHAS TRILHAS (Custom Tracks) */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-indigo-500" />
                                    Minhas Trilhas
                                </h3>
                                <Link href="/trilhas" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                    Ver todas <ChevronRight size={14} />
                                </Link>
                            </div>

                            {activeTracks && activeTracks.length > 0 ? (
                                <div className="space-y-3">
                                    {activeTracks.slice(0, 5).map((track) => (
                                        <div key={track.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-lg bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                                    <Brain className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                                        {track.title}
                                                    </h4>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <CalendarIcon className="h-3 w-3" />
                                                            {new Date(track.last_accessed).toLocaleDateString()}
                                                        </span>
                                                        {track.progress > 0 && (
                                                            <span className="font-medium text-indigo-600">{Math.round(track.progress)}% concluído</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className="w-full sm:w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full"
                                                        style={{ width: `${track.progress}%` }}
                                                    />
                                                </div>
                                                <Button asChild size="sm" className="shrink-0 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold hover:bg-indigo-600 dark:hover:bg-indigo-400 dark:hover:text-white transition-colors rounded-full px-6">
                                                    <Link href={`/trilhas/${track.id}`}>
                                                        {track.progress > 0 ? "Continuar" : "Iniciar"}
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    <Button asChild variant="outline" className="w-full border-dashed border-2 py-6 hover:border-indigo-500 hover:text-indigo-600 dark:hover:border-indigo-400 dark:hover:text-indigo-400 transition-all text-slate-500">
                                        <Link href="/trilhas/custom" className="flex items-center gap-2 justify-center">
                                            <PlusCircle className="h-5 w-5" />
                                            Criar Nova Trilha
                                        </Link>
                                    </Button>
                                </div>
                            ) : (
                                <Card className="border-dashed shadow-none bg-slate-50/50 dark:bg-slate-900/50">
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="bg-white dark:bg-slate-800 p-3 rounded-full mb-3 shadow-sm">
                                            <Brain className="h-8 w-8 text-slate-400" />
                                        </div>
                                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">Nenhuma trilha personalizada</h4>
                                        <p className="text-sm text-slate-500 max-w-xs mt-1 mb-4">Crie sua própria trilha de estudos com IA.</p>
                                        <Button asChild variant="outline">
                                            <Link href="/trilhas/custom">Criar Trilha</Link>
                                        </Button>
                                    </div>
                                </Card>
                            )}
                        </section>

                        {/* C. FLASHCARDS & QUICK ACTIONS (Grid 2 cols) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* C1. Flashcards */}
                            <section className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <Library className="h-5 w-5 text-violet-500" />
                                        Meus Flashcards
                                    </h3>
                                    <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-50 p-0 px-2">
                                        <Link href="/praticar/flashcard">Gerenciar</Link>
                                    </Button>
                                </div>
                                <div className="space-y-3 flex-1">
                                    {userDecks && userDecks.length > 0 ? (
                                        <>
                                            {userDecks.slice(0, 3).map(deck => (
                                                <Link key={deck.id} href={`/praticar/flashcard/${deck.id}`}>
                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-violet-500 dark:hover:border-violet-500 transition-colors cursor-pointer group">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-slate-800 flex items-center justify-center shrink-0 text-violet-600 font-bold text-xs ring-2 ring-transparent group-hover:ring-violet-100 transition-all">
                                                                {deck.card_count}
                                                            </div>
                                                            <span className="font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-violet-600 transition-colors">
                                                                {deck.title}
                                                            </span>
                                                        </div>
                                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500" />
                                                    </div>
                                                </Link>
                                            ))}
                                            {userDecks.length > 3 && (
                                                <Link href="/praticar/flashcard" className="block text-center text-xs font-semibold text-slate-400 hover:text-violet-600 p-2">
                                                    Ver todos ({userDecks.length})
                                                </Link>
                                            )}
                                        </>
                                    ) : (
                                        <div className="h-full min-h-[150px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center p-4 text-center bg-slate-50/50">
                                            <p className="text-sm text-slate-500 mb-3">Você ainda não criou nenhum baralho.</p>
                                            <Button asChild size="sm" variant="secondary" className="text-xs">
                                                <Link href="/praticar/flashcard">Criar Baralho</Link>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* C2. Ações Rápidas */}
                            <section className="flex flex-col h-full">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-500" />
                                    Ações Rápidas
                                </h3>
                                <div className="grid grid-rows-2 gap-3 h-full">
                                    {/* Review Errors */}
                                    <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-center opacity-70 cursor-not-allowed group">
                                        <div className="absolute right-0 top-0 p-2">
                                            <Badge variant="outline" className="text-[10px] bg-slate-50">Em Breve</Badge>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center">
                                                <Target size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200">Revisar Erros</h4>
                                                <p className="text-xs text-slate-500">Foque no que precisa melhorar.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mock Exams */}
                                    <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-center opacity-70 cursor-not-allowed group">
                                        <div className="absolute right-0 top-0 p-2">
                                            <Badge variant="outline" className="text-[10px] bg-slate-50">Em Breve</Badge>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                                <GraduationCap size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-200">Simulado Oficial</h4>
                                                <p className="text-xs text-slate-500">Treine com provas reais.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                        </div>

                    </div>

                    {/* COLUNA LATERAL (Direita - 4 cols) */}
                    <div className="lg:col-span-4 space-y-6">

                        {/* CALENDÁRIO */}
                        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 py-3 px-4 border-b border-slate-100 dark:border-slate-800">
                                <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center bg-transparent">
                                    <CalendarIcon className="mr-2 h-4 w-4" /> Constância
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 flex justify-center">
                                {/* Real Calendar Component (Client Wrapper) */}
                                <DashboardCalendar activityDates={activity_dates} />
                            </CardContent>
                        </Card>

                        {/* RANKING (Coming Soon) */}
                        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 relative overflow-hidden">
                            <div className="absolute inset-0 bg-slate-50/50 dark:bg-slate-900/80 z-10 flex flex-col items-center justify-center backdrop-blur-[1px]">
                                <Badge variant="secondary" className="mb-2">Em Breve</Badge>
                                <span className="text-sm font-medium text-slate-500">Ranking & Amigos</span>
                            </div>
                            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 opacity-50">
                                <CardTitle className="text-sm font-semibold flex items-center">
                                    <Trophy className="mr-2 h-4 w-4 text-yellow-500" /> Ranking
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 opacity-50">
                                <div className="space-y-4">
                                    {[1, 2, 3].map((pos) => (
                                        <div key={pos} className="flex items-center gap-3">
                                            <div className={`
                                                h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold
                                                ${pos === 1 ? 'bg-yellow-100 text-yellow-700' :
                                                    pos === 2 ? 'bg-slate-200 text-slate-700' :
                                                        'bg-orange-100 text-orange-700'}
                                             `}>
                                                {pos}
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-slate-200" />
                                            <div className="h-3 w-20 bg-slate-100 rounded" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Footer decorative */}
                        <div className="text-center">
                            <p className="text-xs text-slate-400">© 2026 MedQuiz Platform</p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
