
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { BookOpen, Activity, Heart, Stethoscope, Microscope, Brain, Syringe, Baby, LucideIcon } from "lucide-react";

// Mapeamento visual para os ícones
const AREA_METADATA: Record<string, { color: string, icon: LucideIcon }> = {
    "Ciências Básicas": { color: "bg-emerald-500", icon: Microscope },
    "Clínica Médica": { color: "bg-violet-600", icon: Stethoscope },
    "Cirurgia Geral": { color: "bg-rose-600", icon: Activity },
    "Pediatria": { color: "bg-amber-500", icon: Baby },
    "Ginecologia e Obstetrícia": { color: "bg-pink-500", icon: Heart },
    "Medicina Preventiva": { color: "bg-teal-500", icon: BookOpen },
    "Psiquiatria": { color: "bg-indigo-600", icon: Brain },
    "Infectologia": { color: "bg-lime-600", icon: Syringe },
    "Default": { color: "bg-slate-500", icon: BookOpen }
};

const getVisuals = (title: string, parentTitle?: string) => {
    // Tenta encontrar pelo título do pai ou do próprio nó
    const searchString = parentTitle || title;
    const key = Object.keys(AREA_METADATA).find(k => searchString.includes(k)) || "Default";
    return AREA_METADATA[key];
};

export async function OfficialTracksList() {
    const supabase = await createClient();

    // 1. Fetch themes (Official Tracks)
    const { data: themes, error } = await supabase
        .from("study_nodes")
        .select("id, title, description, node_type, parent_id")
        .eq("node_type", "theme")
        .limit(20);

    if (error) {
        console.error("Erro ao buscar trilhas oficiais:", error);
        return <p className="text-sm text-red-500">Erro ao carregar acervo.</p>;
    }

    if (!themes || themes.length === 0) {
        return <p className="text-sm text-slate-500">Nenhum conteúdo oficial encontrado.</p>;
    }

    // 2. Extract parent IDs manually to avoid complex self-joining queries that might fail
    const parentIds = Array.from(new Set(themes.map(t => t.parent_id).filter(Boolean)));

    // 3. Fetch parents if there are any
    let parentsMap: Record<string, string> = {};
    if (parentIds.length > 0) {
        const { data: parents } = await supabase
            .from("study_nodes")
            .select("id, title")
            .in("id", parentIds);

        if (parents) {
            parents.forEach(p => {
                parentsMap[p.id] = p.title;
            });
        }
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {themes.map((track) => {
                const parentTitle = track.parent_id ? parentsMap[track.parent_id] : undefined;
                const visuals = getVisuals(track.title, parentTitle);

                return (
                    <Link
                        key={track.id}
                        href={`/trilha/${track.id}`}
                        className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-violet-300 transition-all"
                    >
                        <div className={`h-2 w-full ${visuals.color}`} />
                        <div className="p-4 flex flex-col h-full">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <div className={`p-2 rounded-lg ${visuals.color} bg-opacity-10 text-${visuals.color.split('-')[1]}-600`}>
                                    <visuals.icon size={16} className={visuals.color.replace("bg-", "text-")} />
                                </div>
                            </div>
                            <h4 className="font-bold text-slate-700 text-sm leading-tight mb-1 group-hover:text-violet-700 transition-colors">
                                {track.title}
                            </h4>
                            {parentTitle && (
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide line-clamp-1">
                                    {parentTitle}
                                </p>
                            )}
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
