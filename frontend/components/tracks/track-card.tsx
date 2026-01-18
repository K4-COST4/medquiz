"use client";

import Link from "next/link";
import { Activity, Book, Brain, Dna, FileText, Folder, Heart, Stethoscope, Syringe, Tablet, Trash2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteCustomTrack } from "@/app/(plataform)/trilhas/custom/actions";

// Mapeamento de strings de ícones para componentes Lucide
const ICON_MAP: Record<string, any> = {
    activity: Activity,
    heart: Heart,
    brain: Brain,
    dna: Dna,
    tablets: Tablet,
    folder: Folder,
    book: Book,
    file: FileText,
    stethoscope: Stethoscope,
    syringe: Syringe,
};

interface TrackCardProps {
    id: string;
    title: string;
    description?: string;
    slug?: string;
    icon_url?: string;
    progress?: number; // 0 a 100
}

export function TrackCard({ id, title, description, icon_url, progress = 0 }: TrackCardProps) {
    // Resolve o ícone (fallback para Folder)
    const IconComponent = icon_url && ICON_MAP[icon_url] ? ICON_MAP[icon_url] : Folder;
    const [isDeleting, startTransition] = useTransition();

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault(); // Evita navegar para o link
        e.stopPropagation();

        if (confirm("Tem certeza que deseja excluir esta trilha? Esta ação não pode ser desfeita.")) {
            startTransition(async () => {
                const result = await deleteCustomTrack(id);
                if (result.success) {
                    toast.success("Trilha excluída.");
                } else {
                    toast.error(result.message);
                }
            });
        }
    };

    return (
        <div className="relative group">
            <Link
                href={`/trilhas/${id}`}
                className={`
                    block bg-white rounded-2xl border-b-[4px] border border-slate-200 
                    hover:border-violet-200 active:border-b-2 active:translate-y-[2px] 
                    p-5 flex items-start gap-4 transition-all hover:shadow-lg hover:shadow-violet-100
                    ${isDeleting ? 'opacity-50 pointer-events-none' : ''}
                `}
            >
                {/* Ícone */}
                <div className="bg-violet-50 text-violet-600 p-3 rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                    <IconComponent size={24} strokeWidth={2.5} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-700 group-hover:text-violet-700 truncate text-lg mb-1 pr-8">
                        {title}
                    </h3>
                    <p className="text-slate-400 text-sm line-clamp-2 mb-4 leading-relaxed">
                        {description || "Sem descrição definida."}
                    </p>

                    {/* Barra de Progresso */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-amber-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex justify-end mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{progress}% Concluído</span>
                    </div>
                </div>
            </Link>

            {/* Botão de Excluir (Posicionado Absolutamente) */}
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors z-10"
                title="Excluir Trilha"
            >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
            </button>
        </div>
    );
}
