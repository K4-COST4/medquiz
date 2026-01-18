"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Layers, Loader2 } from "lucide-react";
import { getDeckByModuleId } from "@/app/actions/flashcards";

interface ModuleReviewCardProps {
    trackId: string; // Using trackId as the identifier for "Entire Module/Track"
}

export function ModuleReviewCard({ trackId }: ModuleReviewCardProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleReviewClick = async () => {
        setIsLoading(true);
        try {
            // Check if deck exists for this "Module" (Track)
            const deckId = await getDeckByModuleId(trackId);
            if (deckId) {
                router.push(`/praticar/flashcard/${deckId}`);
            } else {
                // If not, redirect to create with nodeId (which will be the Track ID)
                // The backend and frontend logic handles nodeId generally
                router.push(`/praticar/flashcard/novo?nodeId=${trackId}`);
            }
        } catch (error) {
            toast.error("Erro ao verificar baralho");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            onClick={!isLoading ? handleReviewClick : undefined}
            className={`
                bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl p-6 relative group transition-all
                ${isLoading ? "opacity-70 cursor-wait" : "hover:bg-slate-50 hover:border-violet-300 cursor-pointer hover:-translate-y-1 hover:shadow-md"}
            `}
        >
            <div className="absolute top-4 right-4 bg-violet-200 text-violet-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                NOVO
            </div>

            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-4 text-violet-500 shadow-sm group-hover:scale-110 transition-transform">
                {isLoading ? <Loader2 className="animate-spin" /> : <Layers size={24} />}
            </div>

            <h3 className="font-bold text-slate-700 mb-1 group-hover:text-violet-700 transition-colors">
                Flashcard Geral do Módulo
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
                Revise todo o conteúdo da trilha de uma vez. A IA seleciona os pontos mais importantes de todas as aulas.
            </p>
        </div>
    );
}
