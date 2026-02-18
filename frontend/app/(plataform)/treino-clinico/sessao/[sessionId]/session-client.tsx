'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
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
    BadgeInfo,

    X,
} from 'lucide-react';
import { toast } from "sonner";
import {
    sendQuestion,
    requestExam,
    submitAnamnesis,
    gradeAnamnesis,
    getModelAnamnesis,
    performPhysicalExam,
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
    stem: string;
    environment: CaseEnvironment;
    availableExams: BlueprintExam[];
    initialMessages: CaseMessage[];
    initialExams: ExamRequest[];
    sessionStatus: string;
    initialGrade?: GradeResult | null;
}

// ==============================================================================
// ENVIRONMENT DISPLAY
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

// ==============================================================================
// MAIN COMPONENT
// ==============================================================================

export default function SessionClient({
    sessionId,
    stem,
    environment,
    availableExams,
    initialMessages,
    initialExams,
    sessionStatus,
    initialGrade,
}: SessionClientProps) {
    // --- State ---
    const [messages, setMessages] = useState<CaseMessage[]>(initialMessages);
    const [exams, setExams] = useState<ExamRequest[]>(initialExams);
    const [question, setQuestion] = useState('');
    const [anamnesis, setAnamnesis] = useState('');
    const [status, setStatus] = useState(sessionStatus);
    const [gradeResult, setGradeResult] = useState<GradeResult | null>(initialGrade || null);
    const [modelNote, setModelNote] = useState<string | null>(null);
    const [showExamPanel, setShowExamPanel] = useState(false);
    const [showExamDropdown, setShowExamDropdown] = useState(false);
    const [newExamIds, setNewExamIds] = useState<Set<string>>(new Set());
    const [copiedExam, setCopiedExam] = useState<string | null>(null);
    const [showPhysExamDropdown, setShowPhysExamDropdown] = useState(false);
    const [physExamFindings, setPhysExamFindings] = useState<PerformPhysicalExamResult[]>([]);

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

    // --- Handlers ---

    function handleSendQuestion() {
        if (!question.trim() || isSending) return;
        const q = question.trim();
        setQuestion('');

        // Optimistic: add user message immediately
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
                // Remove optimistic message on error
                setMessages(prev => prev.filter(m => m.id !== optimisticUserMsg.id));
                return;
            }
            // Add patient response
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
                status: result.status === 'unavailable' ? 'returned' : 'returned',
            };
            setExams(prev => [...prev, newExam]);
            setNewExamIds(prev => new Set(prev).add(newExam.id));
            setShowExamPanel(true);

            // Add system message to chat
            const sysMsg: CaseMessage = {
                id: `sys-${Date.now()}`,
                session_id: sessionId,
                role: 'system',
                content: `📋 Resultado de "${result.exam_name}" disponível na aba Exames Solicitados.`,
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, sysMsg]);
        });
    }

    function handleSubmitAnamnesis() {
        if (!anamnesis.trim() || isSubmitting) return;
        startSubmitting(async () => {
            const result = await submitAnamnesis(sessionId, anamnesis.trim());
            if (result.success) {
                setStatus('submitted');
            }
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

    function copyToClipboard(text: string, id: string) {
        navigator.clipboard.writeText(text);
        setCopiedExam(id);
        setTimeout(() => setCopiedExam(null), 2000);
    }

    // Group available exams by category
    const examsByCategory = availableExams.reduce((acc, exam) => {
        if (!acc[exam.category]) acc[exam.category] = [];
        acc[exam.category].push(exam);
        return acc;
    }, {} as Record<ExamCategory, BlueprintExam[]>);

    // Physical exam systems list
    const physExamSystems = Object.entries(PHYSICAL_EXAM_LABELS || {}) as [PhysicalExamSystem, string][];

    function handlePerformPhysExam(system: PhysicalExamSystem) {
        setShowPhysExamDropdown(false);
        // Skip if already examined
        if (physExamFindings.some(f => f.system === system)) return;

        startPerformingExam(async () => {
            const result = await performPhysicalExam(sessionId, system);

            if ('error' in result) {
                toast.error(result.error);
                return;
            }

            setPhysExamFindings(prev => [...prev, result]);
            setShowExamPanel(true);
            toast.success(`Exame de ${result.system_label} realizado com sucesso.`);

            // Add system message in chat
            const sysMsg: CaseMessage = {
                id: `sys-phys-${Date.now()}`,
                session_id: sessionId,
                role: 'system',
                content: `🩺 Exame físico realizado: ${result.system_label}. Achados disponíveis na aba Exame Físico.`,
                created_at: new Date().toISOString(),
            };
            setMessages(prev => [...prev, sysMsg]);
        });
    }

    const isActive = status === 'in_progress';
    const isGraded = status === 'graded';

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                    <Stethoscope className="w-5 h-5 text-emerald-500" />
                    <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Treino Clínico
                    </h1>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        {ENV_LABELS[environment]}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowExamPanel(!showExamPanel)}
                        className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                        <FlaskConical className="w-4 h-4" />
                        Exames ({exams.length})
                        {newExamIds.size > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold flex items-center justify-center rounded-full bg-red-500 text-white">
                                {newExamIds.size}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowExamPanel(!showExamPanel)}
                        className="relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                        <Stethoscope className="w-4 h-4" />
                        Exame Físico ({physExamFindings.length})
                    </button>
                </div>
            </div>

            {/* Main 3-column layout */}
            <div className="flex flex-1 overflow-hidden">
                {/* Column 1: Chat */}
                <div className="flex flex-col w-1/3 border-r border-slate-200 dark:border-slate-800">
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <BadgeInfo className="w-4 h-4 text-blue-500" />
                            Chat com Paciente
                        </h2>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {/* Stem */}
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">📋 Caso Clínico</p>
                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{stem}</p>
                        </div>

                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${msg.role === 'user'
                                        ? 'bg-emerald-500 text-white rounded-br-sm'
                                        : msg.role === 'system'
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {isSending && (
                            <div className="flex justify-start">
                                <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>
                </div>

                {/* Column 2: Question Input */}
                <div className="flex flex-col w-1/3 border-r border-slate-200 dark:border-slate-800">
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Send className="w-4 h-4 text-emerald-500" />
                            Perguntar ao Paciente
                        </h2>
                    </div>

                    <div className="flex-1 flex flex-col p-3 gap-3">
                        {/* Question textarea */}
                        <div className="flex-1 flex flex-col">
                            <textarea
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendQuestion();
                                    }
                                }}
                                placeholder={isActive ? "Ex: Quando começaram os sintomas? Tem alguma doença crônica?..." : "Sessão finalizada"}
                                disabled={!isActive}
                                className="flex-1 resize-none p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                            />
                            <button
                                onClick={handleSendQuestion}
                                disabled={!question.trim() || isSending || !isActive}
                                className="mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Enviar Pergunta
                            </button>
                        </div>

                        {/* Exam request dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowExamDropdown(!showExamDropdown)}
                                disabled={!isActive || isRequestingExam}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                            >
                                {isRequestingExam ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <FlaskConical className="w-4 h-4" />
                                )}
                                Solicitar Exame
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            {showExamDropdown && (
                                <div className="absolute bottom-full left-0 right-0 mb-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-20">
                                    {Object.entries(examsByCategory).map(([category, categoryExams]) => (
                                        <div key={category}>
                                            <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 sticky top-0">
                                                {CATEGORY_LABELS[category as ExamCategory] || category}
                                            </div>
                                            {categoryExams.map((exam) => {
                                                const alreadyRequested = exams.some(e => e.exam_code === exam.code);
                                                return (
                                                    <button
                                                        key={exam.code}
                                                        onClick={() => handleRequestExam(exam)}
                                                        disabled={alreadyRequested}
                                                        className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {exam.name}
                                                        {alreadyRequested && (
                                                            <span className="ml-2 text-xs text-emerald-500">✓ Solicitado</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Physical exam dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowPhysExamDropdown(!showPhysExamDropdown)}
                                disabled={!isActive || isPerformingExam}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                            >
                                {isPerformingExam ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Stethoscope className="w-4 h-4" />
                                )}
                                Realizar Exame Físico
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            {showPhysExamDropdown && (
                                <div className="absolute bottom-full left-0 right-0 mb-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-20">
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
                                                {alreadyDone && (
                                                    <span className="ml-2 text-xs text-emerald-500">✓ Realizado</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column 3: Anamnesis Editor */}
                <div className="flex flex-col w-1/3">
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-violet-500" />
                            {isGraded ? 'Resultado da Avaliação' : 'Escrever Anamnese'}
                        </h2>
                    </div>

                    <div className="flex-1 flex flex-col p-3 gap-3 overflow-y-auto">
                        {/* Editor or Feedback */}
                        {!isGraded ? (
                            <>
                                <textarea
                                    value={anamnesis}
                                    onChange={(e) => setAnamnesis(e.target.value)}
                                    placeholder="Escreva sua anamnese aqui. Identifique o paciente, descreva a queixa principal, HDA, antecedentes, revisão de sistemas, hipóteses diagnósticas..."
                                    disabled={status === 'submitted'}
                                    className="flex-1 resize-none p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 min-h-[200px]"
                                />

                                {status === 'in_progress' && (
                                    <button
                                        onClick={handleSubmitAnamnesis}
                                        disabled={!anamnesis.trim() || isSubmitting}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                        Enviar Anamnese
                                    </button>
                                )}

                                {status === 'submitted' && (
                                    <button
                                        onClick={handleGrade}
                                        disabled={isGrading}
                                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                                    >
                                        {isGrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                                        Avaliar Anamnese
                                    </button>
                                )}
                            </>
                        ) : (
                            /* Graded feedback */
                            gradeResult && (
                                <div className="space-y-4">
                                    {/* Score total */}
                                    <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800">
                                        <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                                            {Math.round(gradeResult.score_total)}
                                        </p>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">Pontuação Total</p>
                                    </div>

                                    {/* Score breakdown */}
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Detalhamento por Critério</h3>
                                        {gradeResult.score_breakdown?.criteria?.map((c, i) => (
                                            <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                        {c.name} ({c.weight}%)
                                                    </span>
                                                    <span className={`text-xs font-bold ${c.score >= 70 ? 'text-emerald-500' : c.score >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                                                        {c.score}/100
                                                    </span>
                                                </div>
                                                <div className="mt-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${c.score >= 70 ? 'bg-emerald-500' : c.score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${c.score}%` }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.feedback}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Feedback */}
                                    {gradeResult.feedback && (
                                        <div className="space-y-3">
                                            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                                                <p className="text-sm text-blue-800 dark:text-blue-300">
                                                    {gradeResult.feedback.overall_feedback}
                                                </p>
                                            </div>

                                            {gradeResult.feedback.strengths?.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Pontos Fortes
                                                    </h4>
                                                    <ul className="space-y-1">
                                                        {gradeResult.feedback.strengths.map((s, i) => (
                                                            <li key={i} className="text-xs text-slate-600 dark:text-slate-400 pl-4 relative before:content-['✓'] before:absolute before:left-0 before:text-emerald-500">
                                                                {s}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {gradeResult.feedback.missing_points?.length > 0 && (
                                                <div>
                                                    <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                                                        <AlertTriangle className="w-3.5 h-3.5" /> Pontos Ausentes
                                                    </h4>
                                                    <ul className="space-y-1">
                                                        {gradeResult.feedback.missing_points.map((p, i) => (
                                                            <li key={i} className="text-xs text-slate-600 dark:text-slate-400 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-amber-500">
                                                                {p}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Generate Model button */}
                                    {!modelNote ? (
                                        <button
                                            onClick={handleGenerateModel}
                                            disabled={isGeneratingModel}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white text-sm font-medium disabled:opacity-50 transition-all"
                                        >
                                            {isGeneratingModel ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <BookOpen className="w-4 h-4" />
                                            )}
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

                {/* Exams Panel (drawer) */}
                {showExamPanel && (
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-30 flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <FlaskConical className="w-4 h-4 text-blue-500" />
                                Exames Solicitados
                            </h2>
                            <button
                                onClick={() => {
                                    setShowExamPanel(false);
                                    setNewExamIds(new Set());
                                }}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {exams.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-6">
                                    Nenhum exame solicitado ainda.
                                </p>
                            ) : (
                                exams.map((exam) => (
                                    <ExamCard
                                        key={exam.id}
                                        exam={exam}
                                        isNew={newExamIds.has(exam.id)}
                                        copiedId={copiedExam}
                                        onCopy={(text) => copyToClipboard(text, exam.id)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Physical Exam Findings */}
                        {physExamFindings.length > 0 && (
                            <>
                                <div className="px-3 py-2 border-t border-b border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-900/10">
                                    <h3 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                        <Stethoscope className="w-3.5 h-3.5" />
                                        Exame Físico ({physExamFindings.length}/9 sistemas)
                                    </h3>
                                </div>
                                <div className="p-3 space-y-2">
                                    {physExamFindings.map((finding) => (
                                        <div
                                            key={finding.system}
                                            className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10"
                                        >
                                            <div className="px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-b border-emerald-200 dark:border-emerald-800">
                                                🩺 {finding.system_label}
                                            </div>
                                            <div className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {finding.findings}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ==============================================================================
// EXAM CARD SUB-COMPONENT
// ==============================================================================

function ExamCard({
    exam,
    isNew,
    copiedId,
    onCopy,
}: {
    exam: ExamRequest;
    isNew: boolean;
    copiedId: string | null;
    onCopy: (text: string) => void;
}) {
    const [expanded, setExpanded] = useState(isNew);

    return (
        <div className={`rounded-lg border transition-all ${isNew
            ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
            }`}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-left"
            >
                <div className="flex items-center gap-2">
                    {isNew && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500 text-white">
                            NOVO
                        </span>
                    )}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {exam.exam_name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        {exam.exam_category}
                    </span>
                </div>
                {expanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
            </button>

            {expanded && exam.result_text && (
                <div className="px-3 pb-3">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {exam.result_text}
                    </div>
                    <button
                        onClick={() => onCopy(exam.result_text || '')}
                        className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                        {copiedId === exam.id ? (
                            <><Check className="w-3 h-3" /> Copiado!</>
                        ) : (
                            <><Copy className="w-3 h-3" /> Copiar laudo</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
