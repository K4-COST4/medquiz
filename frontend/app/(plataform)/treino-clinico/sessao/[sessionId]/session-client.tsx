'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Send,
    FileText,
    FlaskConical,
    ChevronDown,
    ChevronRight,
    Copy,
    Check,
    Loader2,
    Star,
    AlertTriangle,
    CheckCircle2,
    BookOpen,
    Stethoscope,
    X,
    RefreshCw,
    History,
    ChevronLeft,
    ChevronUp,
    Maximize2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
    sendQuestion,
    requestExam,
    submitAnamnesis,
    gradeAnamnesis,
    getModelAnamnesis,
    performPhysicalExam,
    resetSession,
} from '@/app/actions/clinical-training';
import type {
    SessionSummary,
} from '@/app/actions/clinical-training';
import type {
    CaseBlueprint,
    CaseMessage,
    BlueprintExam,
    ExamRequest,
    GradeResult,
    ExamCategory,
    CaseEnvironment,
    PhysicalExamSystem,
    PerformPhysicalExamResult,
} from '@/types/clinical-training';
import { PHYSICAL_EXAM_LABELS } from '@/types/clinical-training';
import { FormattedText } from '@/components/ui/formatted-text';

// ==============================================================================
// TYPES
// ==============================================================================

interface SessionClientProps {
    sessionId: string;
    caseId: string;
    stem: string;
    environment: CaseEnvironment;
    availableExams: BlueprintExam[];
    initialMessages: CaseMessage[];
    initialExams: ExamRequest[];
    initialPhysicalFindings: PerformPhysicalExamResult[];
    initialAnamnesis: string;
    sessionStatus: string;
    initialGrade?: GradeResult | null;
    caseSessions: SessionSummary[];
    currentSessionId: string;
}

// ==============================================================================
// CONSTANTS
// ==============================================================================

const ENV_LABELS: Record<CaseEnvironment, string> = {
    ambulatorio: '🏥 Ambulatório',
    pronto_socorro: '🚨 Pronto-Socorro',
    enfermaria: '🛏️ Enfermaria',
    uti: '⚡ UTI',
    telemedicina: '💻 Telemedicina',
    domiciliar: '🏠 Domiciliar',
};

const CATEGORY_LABELS: Record<ExamCategory, string> = {
    lab: '🧪 Laboratoriais',
    imagem: '📷 Imagem',
    ecg: '💓 ECG',
    eco: '🫀 Ecocardiograma',
    micro: '🦠 Microbiologia',
    outro: '📋 Outros',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    in_progress: { label: 'Em andamento', color: 'text-blue-500' },
    submitted: { label: 'Submetido', color: 'text-amber-500' },
    graded: { label: 'Avaliado', color: 'text-emerald-500' },
};

// ==============================================================================
// EXAM DETAIL MODAL
// ==============================================================================

function ExamModal({
    exam,
    onClose,
}: {
    exam: ExamRequest | PerformPhysicalExamResult | null;
    onClose: () => void;
}) {
    useEffect(() => {
        function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    if (!exam) return null;

    const isPhysical = 'findings' in exam;
    const title = isPhysical ? (exam as PerformPhysicalExamResult).system_label : (exam as ExamRequest).exam_name;
    const category = isPhysical ? 'Exame Físico' : (CATEGORY_LABELS[(exam as ExamRequest).exam_category] || (exam as ExamRequest).exam_category);
    const content = isPhysical ? (exam as PerformPhysicalExamResult).findings : (exam as ExamRequest).result_text;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal header */}
                <div className={`px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3 ${isPhysical ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                    <div>
                        <div className="flex items-center gap-2">
                            {isPhysical ? <Stethoscope className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <FlaskConical className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                            <span className={`text-xs font-semibold ${isPhysical ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>{category}</span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{title}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors flex-shrink-0">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                {/* Modal body */}
                <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {content || 'Sem resultado disponível.'}
                    </p>
                </div>
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ==============================================================================
// EXAM CARD (compact, opens modal)
// ==============================================================================

function ExamCard({
    label,
    badge,
    badgeColor,
    summary,
    isNew,
    onClick,
}: {
    label: string;
    badge: string;
    badgeColor: string;
    summary: string;
    isNew?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm group ${isNew
                ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'}`}
        >
            <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{label}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isNew && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500 text-white">NOVO</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badgeColor}`}>{badge}</span>
                    <Maximize2 className="w-3 h-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{summary}</p>
        </button>
    );
}

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

export default function SessionClient({
    sessionId,
    caseId,
    stem,
    environment,
    availableExams,
    initialMessages,
    initialExams,
    initialPhysicalFindings,
    initialAnamnesis,
    sessionStatus,
    initialGrade,
    caseSessions,
}: SessionClientProps) {
    // --- State ---
    const [messages, setMessages] = useState<CaseMessage[]>(initialMessages);
    const [exams, setExams] = useState<ExamRequest[]>(initialExams);
    const [question, setQuestion] = useState('');
    const [anamnesis, setAnamnesis] = useState(initialAnamnesis);
    const [status, setStatus] = useState(sessionStatus);
    const [gradeResult, setGradeResult] = useState<GradeResult | null>(initialGrade || null);
    const [modelNote, setModelNote] = useState<string | null>(null);
    const [newExamIds, setNewExamIds] = useState<Set<string>>(new Set());
    const [showExamDropdown, setShowExamDropdown] = useState(false);
    const [showPhysExamDropdown, setShowPhysExamDropdown] = useState(false);
    const [physExamFindings, setPhysExamFindings] = useState<PerformPhysicalExamResult[]>(initialPhysicalFindings);
    const [examTab, setExamTab] = useState<'complementar' | 'fisico'>('complementar');
    const [modalExam, setModalExam] = useState<ExamRequest | PerformPhysicalExamResult | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [isResetting, startResetting] = useTransition();

    const [isSending, startSending] = useTransition();
    const [isRequestingExam, startRequestingExam] = useTransition();
    const [isSubmitting, startSubmitting] = useTransition();
    const [isGrading, startGrading] = useTransition();
    const [isGeneratingModel, startGeneratingModel] = useTransition();
    const [isPerformingExam, startPerformingExam] = useTransition();

    const chatEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Close dropdowns when clicking outside
    const closeDropdowns = useCallback(() => {
        setShowExamDropdown(false);
        setShowPhysExamDropdown(false);
    }, []);

    // --- Handlers ---

    function handleSendQuestion() {
        if (!question.trim() || isSending) return;
        const q = question.trim();
        setQuestion('');
        closeDropdowns();

        const optimisticUserMsg: CaseMessage = {
            id: `temp-${Date.now()}`,
            session_id: sessionId,
            role: 'user',
            content: q,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticUserMsg]);

        startSending(async () => {
            const result = await sendQuestion(sessionId, q);
            if ('error' in result) {
                setMessages(prev => prev.filter(m => m.id !== optimisticUserMsg.id));
                toast.error('Erro ao enviar mensagem.');
                return;
            }
            const patientMsg: CaseMessage = {
                id: `patient-${Date.now()}`,
                session_id: sessionId,
                role: 'patient',
                content: result.patientResponse,
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, patientMsg]);
        });
    }

    function handleRequestExam(exam: BlueprintExam) {
        setShowExamDropdown(false);
        startRequestingExam(async () => {
            const result = await requestExam(sessionId, exam.code);
            if ('error' in result) return;

            const newExam: ExamRequest = {
                id: `exam-${Date.now()}`,
                session_id: sessionId,
                exam_code: result.exam_code,
                exam_name: result.exam_name,
                exam_category: result.exam_category,
                requested_at: new Date().toISOString(),
                result_text: result.result_text,
                status: 'returned',
            };
            setExams(prev => [...prev, newExam]);
            setNewExamIds(prev => new Set(prev).add(newExam.id));
            setExamTab('complementar');

            const sysMsg: CaseMessage = {
                id: `sys-${Date.now()}`,
                session_id: sessionId,
                role: 'system',
                content: `📋 Resultado de "${result.exam_name}" disponível na aba Exames.`,
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, sysMsg]);
            toast.success(`${result.exam_name} solicitado com sucesso.`);
        });
    }

    function handlePerformPhysExam(system: PhysicalExamSystem) {
        setShowPhysExamDropdown(false);
        if (physExamFindings.some(f => f.system === system)) return;

        startPerformingExam(async () => {
            const result = await performPhysicalExam(sessionId, system);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            setPhysExamFindings(prev => [...prev, result]);
            setExamTab('fisico');

            const sysMsg: CaseMessage = {
                id: `sys-phys-${Date.now()}`,
                session_id: sessionId,
                role: 'system',
                content: `🩺 Exame físico realizado: ${result.system_label}.`,
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, sysMsg]);
            toast.success(`${result.system_label} examinado.`);
        });
    }

    function handleSubmitAnamnesis() {
        if (!anamnesis.trim() || isSubmitting) return;
        startSubmitting(async () => {
            const result = await submitAnamnesis(sessionId, anamnesis.trim());
            if (result.success) setStatus('submitted');
        });
    }

    function handleGrade() {
        startGrading(async () => {
            const result = await gradeAnamnesis(sessionId);
            if (result.success && result.gradeResult) {
                setGradeResult(result.gradeResult);
                setStatus('graded');
            }
        });
    }

    function handleGenerateModel() {
        startGeneratingModel(async () => {
            const result = await getModelAnamnesis(sessionId);
            if (result.success && result.modelNote) {
                setModelNote(result.modelNote);
            }
        });
    }

    function handleReset() {
        startResetting(async () => {
            const result = await resetSession(caseId, environment);
            if ('error' in result) {
                toast.error(result.error);
                return;
            }
            router.push(`/treino-clinico/sessao/${result.sessionId}`);
        });
    }

    // Group available exams by category
    const examsByCategory = availableExams.reduce((acc, exam) => {
        if (!acc[exam.category]) acc[exam.category] = [];
        acc[exam.category].push(exam);
        return acc;
    }, {} as Record<ExamCategory, BlueprintExam[]>);

    const physExamSystems = Object.entries(PHYSICAL_EXAM_LABELS || {}) as [PhysicalExamSystem, string][];
    const isActive = status === 'in_progress';
    const isGraded = status === 'graded';
    const totalExams = exams.length + physExamFindings.length;

    return (
        <>
            {/* Exam/Physical detail modal */}
            {modalExam && <ExamModal exam={modalExam} onClose={() => setModalExam(null)} />}

            <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
                {/* ===== HEADER ===== */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Stethoscope className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                            Treino Clínico
                        </h1>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex-shrink-0">
                            {ENV_LABELS[environment]}
                        </span>
                        {caseSessions.length > 1 && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 flex-shrink-0">
                                Tentativa #{caseSessions.find(s => s.id === sessionId)?.attempt_number ?? caseSessions.length}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Session history */}
                        {caseSessions.length > 1 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <History className="w-3.5 h-3.5" />
                                    Histórico ({caseSessions.length})
                                    {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {showHistory && (
                                    <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-30 overflow-hidden">
                                        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tentativas anteriores</p>
                                        </div>
                                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                            {caseSessions.map(s => {
                                                const isCurrent = s.id === sessionId;
                                                const st = STATUS_LABELS[s.status] || { label: s.status, color: 'text-slate-500' };
                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => { setShowHistory(false); if (!isCurrent) router.push(`/treino-clinico/sessao/${s.id}`); }}
                                                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${isCurrent ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                                    >
                                                        <div>
                                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                                Tentativa #{s.attempt_number}
                                                                {isCurrent && <span className="ml-1 text-emerald-500">← atual</span>}
                                                            </span>
                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                                                {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-[11px] font-medium ${st.color}`}>{st.label}</p>
                                                            {s.score_total !== null && (
                                                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{Math.round(s.score_total)}/100</p>
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Repeat training button */}
                        {isGraded && (
                            <button
                                onClick={handleReset}
                                disabled={isResetting}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                            >
                                {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                Repetir Treino
                            </button>
                        )}

                        <button
                            onClick={() => router.push('/treino-clinico')}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Novo Caso
                        </button>
                    </div>
                </div>

                {/* ===== 3-COLUMN LAYOUT ===== */}
                <div className="flex flex-1 overflow-hidden" onClick={closeDropdowns}>

                    {/* ===== COLUMN 1: CHAT (40%) ===== */}
                    <div className="flex flex-col border-r border-slate-200 dark:border-slate-800" style={{ width: '40%' }}>
                        {/* Column header */}
                        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                            <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                💬 Chat com o Paciente
                            </h2>
                        </div>

                        {/* Messages scroll area */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                            {/* Case stem */}
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">📋 Cenário Clínico</p>
                                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{stem}</p>
                            </div>

                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[88%] px-3 py-2 rounded-xl text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-emerald-500 text-white rounded-br-sm'
                                            : msg.role === 'system'
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs italic border border-slate-200 dark:border-slate-700 rounded-lg'
                                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {isSending && (
                                <div className="flex justify-start">
                                    <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input area (fixed at column bottom) */}
                        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2">
                            {/* Textarea + send */}
                            <div className="flex gap-2 items-end">
                                <textarea
                                    value={question}
                                    onChange={e => setQuestion(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendQuestion();
                                        }
                                    }}
                                    onClick={e => e.stopPropagation()}
                                    placeholder={isActive ? 'Pergunte ao paciente... (Enter para enviar)' : 'Sessão finalizada'}
                                    disabled={!isActive || isSending}
                                    rows={2}
                                    className="flex-1 resize-none p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                                />
                                <button
                                    onClick={handleSendQuestion}
                                    disabled={!question.trim() || isSending || !isActive}
                                    className="flex-shrink-0 p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Exam action buttons */}
                            <div className="flex gap-2">
                                {/* Complementary exam dropdown */}
                                <div className="relative flex-1">
                                    <button
                                        onClick={e => { e.stopPropagation(); setShowPhysExamDropdown(false); setShowExamDropdown(!showExamDropdown); }}
                                        disabled={!isActive || isRequestingExam}
                                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50 transition-colors"
                                    >
                                        {isRequestingExam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
                                        Solicitar Exame
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                    {showExamDropdown && (
                                        <div onClick={e => e.stopPropagation()} className="absolute bottom-full left-0 right-0 mb-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-30">
                                            {Object.entries(examsByCategory).map(([category, categoryExams]) => (
                                                <div key={category}>
                                                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 sticky top-0">
                                                        {CATEGORY_LABELS[category as ExamCategory] || category}
                                                    </div>
                                                    {categoryExams.map(exam => {
                                                        const alreadyRequested = exams.some(e => e.exam_code === exam.code);
                                                        return (
                                                            <button
                                                                key={exam.code}
                                                                onClick={() => handleRequestExam(exam)}
                                                                disabled={alreadyRequested}
                                                                className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {exam.name}
                                                                {alreadyRequested && <span className="ml-2 text-xs text-emerald-500">✓</span>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Physical exam dropdown */}
                                <div className="relative flex-1">
                                    <button
                                        onClick={e => { e.stopPropagation(); setShowExamDropdown(false); setShowPhysExamDropdown(!showPhysExamDropdown); }}
                                        disabled={!isActive || isPerformingExam}
                                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-50 transition-colors"
                                    >
                                        {isPerformingExam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stethoscope className="w-3.5 h-3.5" />}
                                        Exame Físico
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                    {showPhysExamDropdown && (
                                        <div onClick={e => e.stopPropagation()} className="absolute bottom-full left-0 right-0 mb-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-30">
                                            {physExamSystems.map(([system, label]) => {
                                                const alreadyDone = physExamFindings.some(f => f.system === system);
                                                return (
                                                    <button
                                                        key={system}
                                                        onClick={() => handlePerformPhysExam(system)}
                                                        disabled={alreadyDone}
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        🩺 {label}
                                                        {alreadyDone && <span className="ml-2 text-xs text-emerald-500">✓ Realizado</span>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ===== COLUMN 2: ANAMNESIS (35%) ===== */}
                    <div className="flex flex-col border-r border-slate-200 dark:border-slate-800" style={{ width: '35%' }}>
                        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                            <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                📝 {isGraded ? 'Resultado da Avaliação' : 'Escrever Anamnese'}
                            </h2>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {!isGraded ? (
                                <>
                                    <textarea
                                        value={anamnesis}
                                        onChange={e => setAnamnesis(e.target.value)}
                                        placeholder="Escreva sua anamnese aqui: identificação do paciente, queixa principal, HDA, antecedentes, revisão de sistemas, hipóteses diagnósticas..."
                                        disabled={status === 'submitted'}
                                        className="w-full min-h-[calc(100vh-20rem)] resize-none p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-60 leading-relaxed"
                                    />
                                    {status === 'in_progress' && (
                                        <button
                                            onClick={handleSubmitAnamnesis}
                                            disabled={!anamnesis.trim() || isSubmitting}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                                        >
                                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                            Enviar Anamnese
                                        </button>
                                    )}
                                    {status === 'submitted' && (
                                        <button
                                            onClick={handleGrade}
                                            disabled={isGrading}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                                        >
                                            {isGrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                                            Avaliar Anamnese
                                        </button>
                                    )}
                                </>
                            ) : (
                                gradeResult && (
                                    <div className="space-y-4">
                                        {/* Score total */}
                                        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
                                            <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{Math.round(gradeResult.score_total)}</p>
                                            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">Pontuação Total / 100</p>
                                        </div>

                                        {/* Score breakdown */}
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Detalhamento por Critério</h3>
                                            {gradeResult.score_breakdown?.criteria?.map((c, i) => (
                                                <div key={i} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{c.name} ({c.weight}%)</span>
                                                        <span className={`text-xs font-bold ${c.score >= 70 ? 'text-emerald-500' : c.score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>{c.score}/100</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${c.score >= 70 ? 'bg-emerald-500' : c.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${c.score}%` }} />
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.feedback}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Feedback */}
                                        {gradeResult.feedback && (
                                            <div className="space-y-3">
                                                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                                    <p className="text-sm text-blue-800 dark:text-blue-300">{gradeResult.feedback.overall_feedback}</p>
                                                </div>
                                                {gradeResult.feedback.strengths?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Pontos Fortes
                                                        </h4>
                                                        <ul className="space-y-1">
                                                            {gradeResult.feedback.strengths.map((s, i) => (
                                                                <li key={i} className="text-xs text-slate-600 dark:text-slate-400 pl-4 relative before:content-['✓'] before:absolute before:left-0 before:text-emerald-500">{s}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {gradeResult.feedback.missing_points?.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                                                            <AlertTriangle className="w-3.5 h-3.5" /> Pontos Ausentes
                                                        </h4>
                                                        <ul className="space-y-1">
                                                            {gradeResult.feedback.missing_points.map((p, i) => (
                                                                <li key={i} className="text-xs text-slate-600 dark:text-slate-400 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-amber-500">{p}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Model anamnesis */}
                                        {!modelNote ? (
                                            <button
                                                onClick={handleGenerateModel}
                                                disabled={isGeneratingModel}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white text-sm font-medium disabled:opacity-50 transition-all"
                                            >
                                                {isGeneratingModel ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                                                Gerar Anamnese Modelo
                                            </button>
                                        ) : (
                                            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800">
                                                <h4 className="text-sm font-semibold text-violet-700 dark:text-violet-400 mb-2 flex items-center gap-1.5">
                                                    <BookOpen className="w-4 h-4" /> Anamnese Modelo
                                                </h4>
                                                <div className="text-xs text-slate-700 dark:text-slate-300">
                                                    <FormattedText text={modelNote} className="!text-xs" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* ===== COLUMN 3: EXAMS (25%) ===== */}
                    <div className="flex flex-col" style={{ width: '25%' }}>
                        {/* Column header with tabs */}
                        <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                            <div className="px-3 pt-2 pb-0">
                                <h2 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
                                    🔬 Exames ({totalExams})
                                </h2>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setExamTab('complementar')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${examTab === 'complementar' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Complementares {exams.length > 0 && `(${exams.length})`}
                                    </button>
                                    <button
                                        onClick={() => setExamTab('fisico')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${examTab === 'fisico' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Físico {physExamFindings.length > 0 && `(${physExamFindings.length}/9)`}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Exam content */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {examTab === 'complementar' ? (
                                exams.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-center">
                                        <FlaskConical className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                                        <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum exame solicitado</p>
                                        <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-0.5">Use o botão no chat</p>
                                    </div>
                                ) : (
                                    exams.map(exam => (
                                        <ExamCard
                                            key={exam.id}
                                            label={exam.exam_name}
                                            badge={exam.exam_category}
                                            badgeColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                            summary={exam.result_text || 'Resultado disponível'}
                                            isNew={newExamIds.has(exam.id)}
                                            onClick={() => { setNewExamIds(prev => { const n = new Set(prev); n.delete(exam.id); return n; }); setModalExam(exam); }}
                                        />
                                    ))
                                )
                            ) : (
                                physExamFindings.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-center">
                                        <Stethoscope className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                                        <p className="text-xs text-slate-400 dark:text-slate-500">Nenhum sistema examinado</p>
                                        <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-0.5">Use "Exame Físico" no chat</p>
                                    </div>
                                ) : (
                                    physExamFindings.map(finding => (
                                        <ExamCard
                                            key={finding.system}
                                            label={finding.system_label}
                                            badge="Físico"
                                            badgeColor="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                                            summary={finding.findings.slice(0, 80) + (finding.findings.length > 80 ? '...' : '')}
                                            onClick={() => setModalExam(finding)}
                                        />
                                    ))
                                )
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}
