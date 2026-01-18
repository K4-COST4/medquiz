import { CreateTrackForm } from "@/components/tracks/create-track-form";
import { UserTracksList } from "@/components/tracks/user-tracks-list";
import { Sparkles } from "lucide-react";

export default async function CustomTracksPage() {
    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32">
            <div className="max-w-5xl mx-auto px-4 pt-10 space-y-12">
                {/* HEADER */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                        <Sparkles size={14} />
                        Módulo MedAI
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                        O que você quer <span className="text-violet-600">dominar</span> hoje?
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        Nossa IA cria um plano de estudos personalizado, quebrado em módulos e aulas, com base nas diretrizes médicas mais recentes.
                    </p>
                </div>

                {/* INPUT AREA */}
                <section className="relative z-10">
                    <CreateTrackForm />
                </section>

                {/* LISTA DE TRILHAS EXISTENTES */}
                <section className="pt-10 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-slate-800">Minhas Trilhas</h2>
                    </div>
                    <UserTracksList />
                </section>
            </div>
        </div>
    );
}
