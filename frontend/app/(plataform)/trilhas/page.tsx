
import { Suspense } from "react";
import Link from "next/link";
import { UserTracksList } from "@/components/tracks/user-tracks-list";
import { OfficialTracksList } from "@/components/tracks/official-tracks-list";
import { Brain, Target, Sparkles, Plus } from "lucide-react";

export const metadata = {
  title: "Central de Estudos | MedQuiz",
  description: "Gerencie seus objetivos do PBL e acesse conteúdos complementares.",
};

export default function TrilhasPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-violet-100 selection:text-violet-900 pb-20">

      {/* 1. CABEÇALHO (HERO) */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-10 md:py-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-bold uppercase tracking-wider mb-4 border border-violet-100">
              <Sparkles size={12} />
              <span>Study Hub</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight mb-4">
              Central de Estudos
            </h1>
            <p className="text-lg text-slate-500 leading-relaxed">
              Gerencie seus objetivos do PBL e acesse conteúdos complementares para dominar a medicina.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-16">

        {/* 2. SEÇÃO PRINCIPAL: MEUS ESTUDOS PBL */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Brain className="text-violet-600" size={28} />
                Meus Estudos PBL
              </h2>
              <p className="text-slate-500 mt-2">
                Trilhas personalizadas criadas pela IA baseadas nos seus objetivos.
              </p>
            </div>

            <Link
              href="/trilhas/custom"
              className="hidden md:flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-violet-200 hover:shadow-violet-300 transform hover:-translate-y-0.5"
            >
              <Plus size={20} />
              Criar Nova Trilha
            </Link>
          </div>

          <Suspense
            fallback={
              <div className="w-full h-40 bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center text-slate-400">
                Carregando seus estudos...
              </div>
            }
          >
            <UserTracksList />
          </Suspense>

          <div className="mt-6 md:hidden">
            <Link
              href="/trilhas/custom"
              className="flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-md"
            >
              <Plus size={20} />
              Criar Nova Trilha
            </Link>
          </div>
        </section>


        {/* 3. SEÇÃO SECUNDÁRIA: ACERVO COMPLEMENTAR */}
        <section className="pt-8 border-t border-slate-200">
          <div className="mb-8">
            <h2 className="text-xl font-black text-slate-700 flex items-center gap-3 mb-2">
              <Target className="text-emerald-500" size={24} />
              Acervo Complementar
            </h2>
            <p className="text-sm text-slate-500">
              Cursos e trilhas oficiais curadas pela plataforma para reforço técnico.
            </p>
          </div>

          <Suspense
            fallback={
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            }
          >
            <OfficialTracksList />
          </Suspense>
        </section>

      </main>
    </div>
  );
}