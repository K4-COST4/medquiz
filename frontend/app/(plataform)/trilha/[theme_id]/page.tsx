
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import Link from "next/link";

export default async function ThemeRedirectPage({ params }: { params: Promise<{ theme_id: string }> }) {
    const resolvedParams = await params;
    const themeId = resolvedParams.theme_id;
    const supabase = await createClient();

    // Buscar o primeiro tópico deste tema
    const { data: firstTopic, error } = await supabase
        .from('study_nodes')
        .select('id')
        .eq('parent_id', themeId)
        .eq('node_type', 'topic')
        .order('order_index', { ascending: true })
        .limit(1)
        .single();

    if (error || !firstTopic) {
        // Se não encontrar tópicos, exibe tela de "Vazio"
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <BookOpen className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Conteúdo em Breve</h2>
                <p className="text-slate-400 mt-2 max-w-md">
                    Ainda não há tópicos disponíveis para este módulo.
                </p>
                <Link href="/trilhas" className="mt-6 text-violet-600 font-bold hover:underline">
                    Voltar para Trilhas
                </Link>
            </div>
        );
    }

    // Redireciona para o primeiro tópico encontrado
    return redirect(`/trilha/${themeId}/${firstTopic.id}`);
}
