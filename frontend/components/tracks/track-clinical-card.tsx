'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Loader2, ChevronDown } from 'lucide-react';
import { startTrainingSession } from '@/app/actions/clinical-training';
import type { CaseEnvironmentOrRandom, CaseDifficulty } from '@/types/clinical-training';

interface TrackClinicalCardProps {
    trackId: string;
    topics: string[];
    aiContextDigest: string;
}

const ENVS: { value: CaseEnvironmentOrRandom; label: string }[] = [
    { value: 'aleatorio', label: '🎲 Aleatório' },
    { value: 'ambulatorio', label: '🏥 Ambulatório' },
    { value: 'pronto_socorro', label: '🚨 Pronto-Socorro' },
    { value: 'enfermaria', label: '🛏️ Enfermaria' },
    { value: 'uti', label: '⚡ UTI' },
];

const DIFFS: { value: CaseDifficulty; label: string }[] = [
    { value: 'easy', label: '🟢 Fácil' },
    { value: 'medium', label: '🟡 Médio' },
    { value: 'hard', label: '🔴 Difícil' },
];

export function TrackClinicalCard({ trackId, topics, aiContextDigest }: TrackClinicalCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [env, setEnv] = useState<CaseEnvironmentOrRandom>('aleatorio');
    const [diff, setDiff] = useState<CaseDifficulty>('medium');
    const [isStarting, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    function handleStart() {
        setError(null);
        startTransition(async () => {
            const result = await startTrainingSession({
                mode: 'track',
                topics,
                difficulty: diff,
                detail_level: 'medium',
                environment: env,
                track_id: trackId,
                ai_context_digest: aiContextDigest,
            });

            if ('error' in result) {
                setError(result.error);
                return;
            }
            router.push(`/treino-clinico/sessao/${result.sessionId}`);
        });
    }

    if (!expanded) {
        return (
            <button
                onClick={() => setExpanded(true)}
                className="bg-white border-2 border-emerald-200 rounded-2xl p-6 text-left group hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
            >
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                    <Stethoscope size={24} className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-700 mb-1">Treino de Raciocínio Clínico</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                    Converse com pacientes virtuais usando o contexto de todas as aulas desta trilha.
                </p>
            </button>
        );
    }

    return (
        <div className="bg-white border-2 border-emerald-300 rounded-2xl p-6 shadow-md col-span-full">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Stethoscope size={20} className="text-emerald-600" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-700">Treino de Raciocínio Clínico</h3>
                    <p className="text-xs text-slate-400">Contexto: {topics.slice(0, 3).join(', ')}{topics.length > 3 ? ` +${topics.length - 3}` : ''}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Environment */}
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Ambiente</label>
                    <select
                        value={env}
                        onChange={(e) => setEnv(e.target.value as CaseEnvironmentOrRandom)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                        {ENVS.map(e => (
                            <option key={e.value} value={e.value}>{e.label}</option>
                        ))}
                    </select>
                </div>

                {/* Difficulty */}
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Dificuldade</label>
                    <select
                        value={diff}
                        onChange={(e) => setDiff(e.target.value as CaseDifficulty)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                        {DIFFS.map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <p className="text-xs text-red-500 mb-3">{error}</p>
            )}

            <div className="flex gap-2">
                <button
                    onClick={handleStart}
                    disabled={isStarting}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                >
                    {isStarting ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Gerando caso...</>
                    ) : (
                        <><Stethoscope className="w-4 h-4" /> Iniciar Treino</>
                    )}
                </button>
                <button
                    onClick={() => setExpanded(false)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}
