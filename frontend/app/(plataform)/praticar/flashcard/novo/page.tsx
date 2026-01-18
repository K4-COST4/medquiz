
import { CreateDeckForm } from "@/components/flashcards/create-deck-form";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewDeckPage() {
    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            <div className="max-w-4xl mx-auto px-4 pt-8 space-y-8">

                {/* NAV */}
                <Link
                    href="/praticar/flashcard"
                    className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-violet-600 transition-colors"
                >
                    <ArrowLeft size={16} className="mr-1" /> Voltar para Biblioteca
                </Link>

                {/* HEADER */}
                <div className="text-center space-y-4 mb-10">
                    <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-2">
                        <Sparkles size={14} />
                        Flashcards 2.0
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                        Configure seu <span className="text-violet-600">Estudo</span>
                    </h1>
                    <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
                        Defina o contexto ou anexe um material de referência. Nossa IA criará as perguntas perfeitas para você.
                    </p>
                </div>

                {/* FORM */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-10">
                    <CreateDeckForm />
                </div>
            </div>
        </div>
    );
}
