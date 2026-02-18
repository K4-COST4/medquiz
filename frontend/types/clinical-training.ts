// ==============================================================================
// Clinical Training Module — Types
// ==============================================================================

export type CaseEnvironment =
    | 'ambulatorio'
    | 'pronto_socorro'
    | 'enfermaria'
    | 'uti'
    | 'telemedicina'
    | 'domiciliar';

export type CaseEnvironmentOrRandom = CaseEnvironment | 'aleatorio';

export type CaseMode = 'track' | 'standalone';
export type CaseDifficulty = 'easy' | 'medium' | 'hard';
export type CaseDetailLevel = 'low' | 'medium' | 'high';
export type SessionStatus = 'in_progress' | 'submitted' | 'graded';
export type ExamCategory = 'lab' | 'imagem' | 'ecg' | 'eco' | 'micro' | 'outro';
export type MessageRole = 'user' | 'patient' | 'system';

export type PhysicalExamSystem =
    | 'geral'          // Estado geral, sinais vitais
    | 'cardiovascular'  // Ausculta cardíaca, pulsos, perfusão
    | 'respiratorio'    // Ausculta pulmonar, padrão respiratório
    | 'abdominal'       // Palpação, ausculta, percussão abdome
    | 'neurologico'     // Consciência, pares cranianos, motor, sensibilidade
    | 'musculoesqueletico' // Articulações, coluna, marcha
    | 'pele_mucosas'    // Pele, mucosas, edemas, linfonodos
    | 'cabeca_pescoco'  // Tireoide, JVD, orofaringe
    | 'geniturinario';  // Punho-percussão, globo vesical

// --- Blueprint (case_builder output) ---

export interface BlueprintExam {
    code: string;
    category: ExamCategory;
    name: string;
    result_summary: string;
}

export interface BlueprintExamPolicy {
    release_only_on_request: boolean;
    if_not_available: string;
}

export interface CaseBlueprint {
    environment: CaseEnvironment;
    stem: string;
    patient_profile: {
        age: number;
        sex: string;
        context: string;
    };
    history_truth: {
        chief_complaint: string;
        hpi: string;
        pmh: string;
        meds: string;
        allergies: string;
        fh: string;
        sh: string;
        ros: string;
    };
    ground_truth: {
        primary_diagnosis: string;
        top_differentials: { dx: string; why: string }[];
        red_flags: string[];
        key_questions_expected: string[];
    };
    disclosure_rules: {
        spontaneous: string[];
        only_if_asked: string[];
        unknown_default: string;
    };
    physical_exam: {
        vitals: string;
        systems: Record<PhysicalExamSystem, string>;
    };
    exam_policy: BlueprintExamPolicy;
    available_exams: BlueprintExam[];
}

// --- Database rows ---

export interface ClinicalCase {
    id: string;
    created_at: string;
    user_id: string;
    mode: CaseMode;
    title: string;
    topics: string[];
    difficulty: CaseDifficulty;
    detail_level: CaseDetailLevel;
    environment: CaseEnvironment;
    environment_source: 'user' | 'random';
    stem: string | null;
    blueprint_json: CaseBlueprint;
    track_id: string | null;
    module_id: string | null;
    source: string;
}

export interface CaseSession {
    id: string;
    user_id: string;
    case_id: string;
    created_at: string;
    submitted_at: string | null;
    status: SessionStatus;
    environment: CaseEnvironment;
    final_anamnesis_text: string | null;
    score_total: number | null;
    score_breakdown: GradeBreakdown | null;
    feedback_json: GradeFeedback | null;
}

export interface CaseMessage {
    id: string;
    session_id: string;
    role: MessageRole;
    content: string;
    created_at: string;
}

export interface ExamRequest {
    id: string;
    session_id: string;
    exam_code: string;
    exam_name: string;
    exam_category: ExamCategory;
    requested_at: string;
    result_text: string | null;
    status: 'requested' | 'returned';
}

// --- Grading ---

export interface GradeCriterion {
    name: string;
    weight: number;       // 0-100
    score: number;        // 0-100
    feedback: string;
}

export interface GradeBreakdown {
    criteria: GradeCriterion[];
}

export interface GradeFeedback {
    overall_feedback: string;
    missing_points: string[];
    strengths: string[];
    next_questions_suggested: string[];
    model_note?: string;  // populated only when getModelAnamnesis is called
}

export interface GradeResult {
    score_total: number;
    score_breakdown: GradeBreakdown;
    feedback: GradeFeedback;
}

// --- Action params ---

export interface StartTrainingParams {
    mode: CaseMode;
    topics: string[];
    difficulty: CaseDifficulty;
    detail_level: CaseDetailLevel;
    environment: CaseEnvironmentOrRandom;
    // Track mode only
    track_id?: string;
    module_id?: string;
    ai_context_digest?: string;
}

export interface StartTrainingResult {
    sessionId: string;
    stem: string;
    environment: CaseEnvironment;
    availableExams: BlueprintExam[];
}

export interface SendQuestionResult {
    patientResponse: string;
    messageId: string;
}

export interface RequestExamResult {
    exam_code: string;
    exam_name: string;
    exam_category: ExamCategory;
    result_text: string;
    status: 'returned' | 'unavailable';
}

export interface SubmitAnamnesisResult {
    success: boolean;
    error?: string;
}

export interface GradeAnamnesisResult {
    success: boolean;
    gradeResult?: GradeResult;
    error?: string;
}

export interface ModelAnamnesisResult {
    success: boolean;
    modelNote?: string;
    error?: string;
}

export interface PerformPhysicalExamResult {
    system: PhysicalExamSystem;
    system_label: string;
    findings: string;
}

export const PHYSICAL_EXAM_LABELS: Record<PhysicalExamSystem, string> = {
    geral: 'Estado Geral',
    cardiovascular: 'Cardiovascular',
    respiratorio: 'Respiratório',
    abdominal: 'Abdominal',
    neurologico: 'Neurológico',
    musculoesqueletico: 'Musculoesquelético',
    pele_mucosas: 'Pele e Mucosas',
    cabeca_pescoco: 'Cabeça e Pescoço',
    geniturinario: 'Geniturinário',
};
