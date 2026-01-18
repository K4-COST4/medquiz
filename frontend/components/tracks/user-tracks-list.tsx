import { createClient } from "@/utils/supabase/server";
import { TrackCard } from "./track-card";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export async function UserTracksList() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Busca apenas as trilhas (Nível 1)
    const { data: tracks, error } = await supabase
        .from("study_nodes")
        .select("*")
        .eq("node_type", "custom_track")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao buscar trilhas:", error);
        return (
            <div className="text-center py-10">
                <p className="text-slate-400">Não foi possível carregar suas trilhas.</p>
            </div>
        );
    }

    // EMPTY STATE
    if (!tracks || tracks.length === 0) {
        return (
            <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center bg-slate-50/50">
                <div className="w-16 h-16 bg-violet-100 text-violet-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <PlusCircle size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Sem trilhas ainda</h3>
                <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                    Crie seu primeiro plano de estudos com IA e comece a dominar novos assuntos.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tracks.map((track) => (
                <TrackCard
                    key={track.id}
                    id={track.id}
                    title={track.title}
                    description={track.description}
                    icon_url={track.icon_url}
                    // TODO: Calcular progresso real (future feature). Por enquanto random 0-10 para demo visual ou 0.
                    progress={0}
                />
            ))}
        </div>
    );
}
