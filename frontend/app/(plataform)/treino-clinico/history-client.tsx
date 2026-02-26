'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Search,
    Trash2,
    ChevronDown,
    Loader2,
    X,
} from 'lucide-react';
import { toast } from 'sonner';
import { deleteSession } from '@/app/actions/clinical-training';
import type { RecentSession } from '@/app/actions/clinical-training';

// ==============================================================================
// CONSTANTS
// ==============================================================================

const PAGE_SIZE = 5;

const ENV_LABELS: Record<string, string> = {
    ambulatorio: '🏥 Ambulatório',
    pronto_socorro: '🚨 PS',
    enfermaria: '🛏️ Enfermaria',
    uti: '⚡ UTI',
    telemedicina: '💻 Telemed.',
    domiciliar: '🏠 Domiciliar',
};

const DIFF_LABELS: Record<string, { label: string; color: string }> = {
    easy: { label: 'Fácil', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
    medium: { label: 'Médio', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' },
    hard: { label: 'Difícil', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string }> = {
    in_progress: { label: 'Em andamento', dot: 'bg-blue-500', bg: 'bg-blue-50/60 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' },
    submitted: { label: 'Submetido', dot: 'bg-amber-500', bg: 'bg-amber-50/60 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' },
    graded: { label: 'Avaliado', dot: 'bg-emerald-500', bg: 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700' },
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

// ==============================================================================
// SEMANTIC SEARCH (no LLM — local token scoring)
// ==============================================================================

/**
 * Normalise text: lowercase, remove accents, punctuation → plain tokens.
 */
function normalise(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // strip diacritics
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenise(text: string): string[] {
    return normalise(text).split(' ').filter(Boolean);
}

/**
 * Score a session against query tokens.
 * Returns a number 0–1 (proportion of query tokens found in session text).
 */
function scoreSession(session: RecentSession, queryTokens: string[]): number {
    if (queryTokens.length === 0) return 1;

    // Build a searchable string from all relevant session fields
    const corpus = normalise([
        session.title,
        ...session.topics,
        session.environment,
        ENV_LABELS[session.environment] ?? '',
        session.difficulty,
        DIFF_LABELS[session.difficulty]?.label ?? '',
        STATUS_CONFIG[session.status]?.label ?? '',
        session.status,
    ].join(' '));

    const matched = queryTokens.filter(qt => corpus.includes(qt)).length;
    return matched / queryTokens.length;
}

// ==============================================================================
// SESSION CARD
// ==============================================================================

function SessionCard({
    session,
    onDelete,
    isDeleting,
}: {
    session: RecentSession;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const st = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.in_progress;
    const diff = DIFF_LABELS[session.difficulty] ?? DIFF_LABELS.medium;

    return (
        <div className={`group relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:shadow-md ${st.bg}`}>
            {/* Status dot */}
            <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${st.dot}`} />

            {/* Main content — link to session */}
            <Link
                href={`/treino-clinico/sessao/${session.session_id}`}
                className="flex-1 min-w-0 block"
            >
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {session.topics.length > 0
                            ? session.topics.slice(0, 3).join(' · ')
                            : session.title}
                    </p>
                    <span className={`flex-shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded-full border ${diff.color}`}>
                        {diff.label}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span>{ENV_LABELS[session.environment] ?? session.environment}</span>
                    <span className="opacity-40">·</span>
                    <span>{formatDate(session.created_at)}</span>
                    <span className="opacity-40">·</span>
                    <span className="font-medium">{st.label}</span>
                </div>
            </Link>

            {/* Score badge */}
            {session.status === 'graded' && session.score_total !== null ? (
                <div className="flex-shrink-0 min-w-[44px] text-center">
                    <p className={`text-lg font-bold leading-none ${session.score_total >= 70 ? 'text-emerald-600 dark:text-emerald-400' : session.score_total >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        {Math.round(session.score_total)}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5">/100</p>
                </div>
            ) : (
                <span className="flex-shrink-0 text-xs text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    Continuar →
                </span>
            )}

            {/* Delete button / confirm */}
            <div className="flex-shrink-0 flex items-center gap-1">
                {!confirmDelete ? (
                    <button
                        onClick={() => setConfirmDelete(true)}
                        disabled={isDeleting}
                        title="Apagar sessão"
                        className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1">
                        <span className="text-xs font-medium text-red-600 dark:text-red-400 whitespace-nowrap">Apagar?</span>
                        <button
                            onClick={() => { onDelete(session.session_id); setConfirmDelete(false); }}
                            disabled={isDeleting}
                            className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 px-1"
                        >
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sim'}
                        </button>
                        <button
                            onClick={() => setConfirmDelete(false)}
                            className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ==============================================================================
// MAIN HISTORY CLIENT
// ==============================================================================

export default function SessionHistoryClient({ initialSessions }: { initialSessions: RecentSession[] }) {
    const router = useRouter();
    const [sessions, setSessions] = useState<RecentSession[]>(initialSessions);
    const [query, setQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [, startDelete] = useTransition();

    // --- Semantic search ---
    const queryTokens = useMemo(() => tokenise(query), [query]);

    const filtered = useMemo(() => {
        if (queryTokens.length === 0) return sessions;
        return sessions
            .map(s => ({ s, score: scoreSession(s, queryTokens) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score)
            .map(({ s }) => s);
    }, [sessions, queryTokens]);

    const inProgress = useMemo(() => filtered.filter(s => s.status === 'in_progress'), [filtered]);
    const completed = useMemo(() => filtered.filter(s => s.status !== 'in_progress'), [filtered]);

    const completedVisible = completed.slice(0, visibleCount);
    const hasMore = completed.length > visibleCount;

    function handleDelete(sessionId: string) {
        setDeletingId(sessionId);
        startDelete(async () => {
            const result = await deleteSession(sessionId);
            setDeletingId(null);
            if (!result.success) {
                toast.error(result.error ?? 'Erro ao apagar sessão.');
                return;
            }
            setSessions(prev => prev.filter(s => s.session_id !== sessionId));
            toast.success('Sessão apagada.');
            router.refresh();
        });
    }

    if (sessions.length === 0) return null;

    return (
        <section>
            {/* Section header + search */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">📂 Treinos Anteriores</h2>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {filtered.length}
                    </span>
                </div>

                {/* Search box */}
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
                        placeholder="Buscar por patologia, ambiente, dificuldade..."
                        className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {filtered.length === 0 ? (
                <p className="text-sm text-center text-slate-400 dark:text-slate-500 py-6">
                    Nenhuma sessão encontrada para "{query}".
                </p>
            ) : (
                <div className="space-y-5">
                    {/* In-progress */}
                    {inProgress.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                                🔵 Em andamento — clique para continuar
                            </p>
                            <div className="space-y-2">
                                {inProgress.map(s => (
                                    <SessionCard
                                        key={s.session_id}
                                        session={s}
                                        onDelete={handleDelete}
                                        isDeleting={deletingId === s.session_id}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed (paginated) */}
                    {completedVisible.length > 0 && (
                        <div>
                            {inProgress.length > 0 && (
                                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                                    Concluídos
                                </p>
                            )}
                            <div className="space-y-2">
                                {completedVisible.map(s => (
                                    <SessionCard
                                        key={s.session_id}
                                        session={s}
                                        onDelete={handleDelete}
                                        isDeleting={deletingId === s.session_id}
                                    />
                                ))}
                            </div>

                            {/* Show more */}
                            {hasMore && (
                                <button
                                    onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                    Mostrar mais ({completed.length - visibleCount} restantes)
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
