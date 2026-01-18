import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Folder, BookOpen, Clock, Activity, Brain, Dna, Tablet, Heart, Stethoscope, Syringe, FileText, ChevronRight, GraduationCap, MessageSquareDashed } from "lucide-react";
import { LessonAccordion } from "@/components/tracks/lesson-accordion";
import { TrackTimeline } from "@/components/tracks/track-timeline";
import { ModuleReviewCard } from "@/components/tracks/module-review-card";

// --- ÍCONES ---
const ICON_MAP: Record<string, any> = {
    activity: Activity,
    heart: Heart,
    brain: Brain,
    dna: Dna,
    tablets: Tablet,
    folder: Folder,
    book: BookOpen,
    file: FileText,
    stethoscope: Stethoscope,
    syringe: Syringe,
};

export default async function TrackDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const trackId = resolvedParams.id;
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // 2. Buscar Trilha (Pai)
    const { data: track, error: trackError } = await supabase
        .from("study_nodes")
        .select("*")
        .eq("id", trackId)
        .single();

    if (trackError || !track) {
        notFound();
    }

    // 3. Buscar Módulos (Filhos)
    const { data: modules, error: modulesError } = await supabase
        .from("study_nodes")
        .select("*")
        .eq("parent_id", trackId)
        .eq("node_type", "module")
        .order("order_index", { ascending: true });

    // 4. Buscar Aulas (Netos) - Busca otimizada com IN
    // Primeiro pegamos os IDs dos módulos para filtrar as aulas
    const moduleIds = modules?.map((m) => m.id) || [];

    let lessons: any[] = [];
    if (moduleIds.length > 0) {
        const { data: lessonsData } = await supabase
            .from("study_nodes")
            .select("*")
            .in("parent_id", moduleIds)
            .eq("node_type", "objective")
            .order("order_index", { ascending: true });

        // 5. [NEW] Buscar Progresso do Usuário para estas aulas
        let lessonsWithProgress = lessonsData || [];

        if (lessonsData && lessonsData.length > 0) {
            const lessonIds = lessonsData.map(l => l.id);
            const { data: progressData } = await supabase
                .from("user_node_progress")
                .select("node_id, current_level, is_completed")
                .eq("user_id", user.id)
                .in("node_id", lessonIds);

            // Merge progress into lessons
            lessonsWithProgress = lessonsData.map(lesson => {
                const progress = progressData?.find(p => p.node_id === lesson.id);
                return {
                    ...lesson,
                    userLevel: progress?.current_level ?? 0,
                    is_completed: progress?.is_completed ?? false
                };
            });
        }

        lessons = lessonsWithProgress;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32">
            {/* HEADER HERO */}
            <div className="bg-white border-b border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-violet-50 rounded-full blur-[100px] opacity-60 -mr-20 -mt-20 pointer-events-none"></div>

                <div className="max-w-5xl mx-auto px-4 py-10 relative z-10">
                    <Link href="/trilhas/custom" className="inline-flex items-center text-slate-400 hover:text-violet-600 mb-6 transition-colors font-medium">
                        <ChevronLeft size={20} />
                        Voltar para Minhas Trilhas
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                        <div className="w-20 h-20 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                            <BookOpen size={40} />
                        </div>

                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-2">
                                {track.title}
                            </h1>
                            <p className="text-slate-500 text-lg leading-relaxed max-w-2xl">
                                {track.description || "Plano de estudos personalizado gerado por IA."}
                            </p>

                            <div className="flex items-center gap-4 mt-6 text-sm text-slate-400 font-medium">
                                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                                    <Folder size={14} />
                                    {modules?.length || 0} Módulos
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full">
                                    <Clock size={14} />
                                    Ritmo Livre
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTEÚDO DA TRILHA */}
            <div className="max-w-4xl mx-auto px-4 mt-8 pb-32">
                {!modules || modules.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-sm">
                        <Folder className="mx-auto mb-4 text-slate-200" size={48} />
                        <h3 className="font-bold text-slate-600">Trilha Vazia</h3>
                        <p className="text-sm">Esta trilha parece não ter módulos ainda. Tente gerar novamente.</p>
                    </div>
                ) : (
                    <>
                        <TrackTimeline modules={modules} lessons={lessons} />

                        {/* --- FOOTER: DESAFIOS AVANÇADOS --- */}
                        <div className="mt-16 border-t border-slate-200 pt-10">
                            <h4 className="text-slate-400 font-medium uppercase tracking-wider text-sm mb-6">
                                Desafios Avançados
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* CARD 0: FLASHCARD GERAL DO MÓDULO (NOVO) */}
                                <ModuleReviewCard trackId={track.id} />

                                {/* CARD 1: PROVA GERAL */}
                                <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl p-6 relative opacity-60 cursor-not-allowed group hover:bg-slate-50 transition-colors">
                                    <div className="absolute top-4 right-4 bg-slate-200 text-slate-500 text-xs font-bold px-2 py-1 rounded-md">
                                        EM BREVE
                                    </div>

                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 text-slate-400 grayscale">
                                        <GraduationCap size={24} />
                                    </div>

                                    <h3 className="font-bold text-slate-700 mb-1">Prova Geral da Trilha</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        Teste cumulativo. Junte todos os conhecimentos adquiridos em uma prova final.
                                    </p>
                                </div>

                                {/* CARD 2: OSCE AI */}
                                <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl p-6 relative opacity-60 cursor-not-allowed group hover:bg-slate-50 transition-colors">
                                    <div className="absolute top-4 right-4 bg-slate-200 text-slate-500 text-xs font-bold px-2 py-1 rounded-md">
                                        EM BREVE
                                    </div>

                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 text-slate-400 grayscale">
                                        <MessageSquareDashed size={24} />
                                    </div>

                                    <h3 className="font-bold text-slate-700 mb-1">Simulação OSCE (IA)</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        Converse com pacientes virtuais e treine sua anamnese e raciocínio clínico.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
