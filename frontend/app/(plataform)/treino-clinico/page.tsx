'use client';

import { useState, useTransition, useRef, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
    Stethoscope,
    Play,
    Loader2,
    X,
    Hospital,
    Siren,
    BedDouble,
    Zap,
    Monitor,
    Home,
    Shuffle,
} from 'lucide-react';
import { startTrainingSession } from '@/app/actions/clinical-training';
import type { CaseEnvironmentOrRandom, CaseDifficulty, CaseDetailLevel } from '@/types/clinical-training';

// ==============================================================================
// CONSTANTS
// ==============================================================================

const ENVIRONMENTS: { value: CaseEnvironmentOrRandom; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'aleatorio', label: 'Aleatório', icon: <Shuffle className="w-5 h-5" />, desc: 'Sistema escolhe o melhor ambiente' },
    { value: 'ambulatorio', label: 'Ambulatório', icon: <Hospital className="w-5 h-5" />, desc: 'Consultas eletivas e acompanhamento' },
    { value: 'pronto_socorro', label: 'Pronto-Socorro', icon: <Siren className="w-5 h-5" />, desc: 'Emergências e urgências' },
    { value: 'enfermaria', label: 'Enfermaria', icon: <BedDouble className="w-5 h-5" />, desc: 'Pacientes internados' },
    { value: 'uti', label: 'UTI', icon: <Zap className="w-5 h-5" />, desc: 'Terapia intensiva' },
    { value: 'telemedicina', label: 'Telemedicina', icon: <Monitor className="w-5 h-5" />, desc: 'Consulta remota' },
    { value: 'domiciliar', label: 'Domiciliar', icon: <Home className="w-5 h-5" />, desc: 'Atendimento domiciliar' },
];

const DIFFICULTIES: { value: CaseDifficulty; label: string; emoji: string; desc: string }[] = [
    { value: 'easy', label: 'Fácil', emoji: '🟢', desc: 'Caso claro, poucos diferenciais' },
    { value: 'medium', label: 'Médio', emoji: '🟡', desc: 'Nuances clínicas, diagnóstico diferencial' },
    { value: 'hard', label: 'Difícil', emoji: '🔴', desc: 'Complexo, múltiplas comorbidades' },
];

const DETAIL_LEVELS: { value: CaseDetailLevel; label: string; desc: string }[] = [
    { value: 'low', label: 'Baixo', desc: 'Paciente dá respostas curtas' },
    { value: 'medium', label: 'Médio', desc: 'Respostas razoáveis com detalhes' },
    { value: 'high', label: 'Alto', desc: 'Respostas ricas e detalhadas' },
];

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

export default function StandaloneSelector() {
    const [topics, setTopics] = useState<string[]>([]);
    const [topicInput, setTopicInput] = useState('');
    const [environment, setEnvironment] = useState<CaseEnvironmentOrRandom>('aleatorio');
    const [difficulty, setDifficulty] = useState<CaseDifficulty>('medium');
    const [detailLevel, setDetailLevel] = useState<CaseDetailLevel>('medium');
    const [isStarting, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    function addTopic(raw: string) {
        const trimmed = raw.trim();
        if (!trimmed) return;
        if (topics.some(t => t.toLowerCase() === trimmed.toLowerCase())) return;
        setTopics(prev => [...prev, trimmed]);
        setTopicInput('');
    }

    function removeTopic(topic: string) {
        setTopics(prev => prev.filter(t => t !== topic));
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTopic(topicInput);
        }
        if (e.key === 'Backspace' && topicInput === '' && topics.length > 0) {
            setTopics(prev => prev.slice(0, -1));
        }
    }

    function handleStart() {
        // If user left text in the input, add it as a topic before starting
        if (topicInput.trim()) {
            addTopic(topicInput);
        }
        const finalTopics = topicInput.trim() && !topics.some(t => t.toLowerCase() === topicInput.trim().toLowerCase())
            ? [...topics, topicInput.trim()]
            : topics;

        if (finalTopics.length === 0) {
            setError('Digite pelo menos uma patologia.');
            return;
        }
        setError(null);

        startTransition(async () => {
            const result = await startTrainingSession({
                mode: 'standalone',
                topics: finalTopics,
                difficulty,
                detail_level: detailLevel,
                environment,
            });

            if ('error' in result) {
                setError(result.error);
                return;
            }

            router.push(`/treino-clinico/sessao/${result.sessionId}`);
        });
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-8">
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

            {/* Topics — free-text input with tags */}
            <section className="mb-8">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    1. Patologias / Objetivos
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                    Digite uma patologia e pressione <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">Enter</kbd> para adicionar. Pode adicionar várias.
                </p>

                <div
                    onClick={() => inputRef.current?.focus()}
                    className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-text min-h-[48px] focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-400 transition-all"
                >
                    {topics.map(topic => (
                        <span
                            key={topic}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        >
                            {topic}
                            <button
                                onClick={(e) => { e.stopPropagation(); removeTopic(topic); }}
                                className="hover:text-red-500 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    ))}
                    <input
                        ref={inputRef}
                        type="text"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={topics.length === 0 ? 'Ex: Pneumonia, Insuficiência Cardíaca...' : 'Adicionar mais...'}
                        className="flex-1 min-w-[180px] bg-transparent outline-none text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400"
                    />
                </div>
            </section>

            {/* Environment */}
            <section className="mb-8">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    2. Ambiente do Caso
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ENVIRONMENTS.map(env => (
                        <button
                            key={env.value}
                            onClick={() => setEnvironment(env.value)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${environment === env.value
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400 shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-300'
                                }`}
                        >
                            {env.icon}
                            <span className="text-xs font-medium">{env.label}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Difficulty + Detail Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <section>
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        3. Dificuldade
                    </h2>
                    <div className="space-y-2">
                        {DIFFICULTIES.map(d => (
                            <button
                                key={d.value}
                                onClick={() => setDifficulty(d.value)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${difficulty === d.value
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 shadow-sm'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                                    }`}
                            >
                                <span className="text-lg">{d.emoji}</span>
                                <div>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.label}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{d.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                        4. Nível de Detalhe do Paciente
                    </h2>
                    <div className="space-y-2">
                        {DETAIL_LEVELS.map(d => (
                            <button
                                key={d.value}
                                onClick={() => setDetailLevel(d.value)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${detailLevel === d.value
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 shadow-sm'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                                    }`}
                            >
                                <div>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{d.label}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{d.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* Start button */}
            <button
                onClick={handleStart}
                disabled={isStarting || (topics.length === 0 && !topicInput.trim())}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20"
            >
                {isStarting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Gerando caso clínico...
                    </>
                ) : (
                    <>
                        <Play className="w-5 h-5" />
                        Iniciar Caso Clínico
                    </>
                )}
            </button>
        </div>
    );
}
