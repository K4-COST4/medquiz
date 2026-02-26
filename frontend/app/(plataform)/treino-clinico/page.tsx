import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Stethoscope } from 'lucide-react';
import StandaloneSelectorClient from './selector-client';
import SessionHistoryClient from './history-client';
import { getRecentCaseSessions } from '@/app/actions/clinical-training';

export default async function TreinoClinicoPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    const recentSessions = await getRecentCaseSessions(50);

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 mb-4">
                    <Stethoscope className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Treino de Raciocínio Clínico
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
                    Converse com um paciente virtual, escreva sua anamnese e receba avaliação com rubrica de semiologia.
                </p>
            </div>

            {/* Session history (search + pagination + delete) */}
            <SessionHistoryClient initialSessions={recentSessions} />

            {/* Divider */}
            {recentSessions.length > 0 && (
                <div className="relative flex items-center gap-4">
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        Novo Caso Clínico
                    </span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>
            )}

            {/* New session form */}
            <StandaloneSelectorClient />
        </div>
    );
}
