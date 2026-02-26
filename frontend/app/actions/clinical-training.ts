'use server'

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { askMedAI } from "@/app/actions/medai-core"
import { AI_CONFIG } from "@/lib/ai-config"
import type {
    CaseBlueprint,
    CaseEnvironment,
    CaseEnvironmentOrRandom,
    CaseMode,
    CaseDifficulty,
    CaseDetailLevel,
    ExamCategory,
    StartTrainingParams,
    StartTrainingResult,
    SendQuestionResult,
    RequestExamResult,
    SubmitAnamnesisResult,
    GradeAnamnesisResult,
    ModelAnamnesisResult,
    BlueprintExam,
    CaseMessage,
    ExamRequest,
    PhysicalExamSystem,
    PerformPhysicalExamResult,

} from "@/types/clinical-training"
import { PHYSICAL_EXAM_LABELS } from "@/types/clinical-training"

// ==============================================================================
// ENVIRONMENT RESOLUTION (weighted random — no LLM cost)
// ==============================================================================

const ACUTE_TOPICS = [
    'iam', 'infarto', 'avc', 'choque', 'tep', 'tromboembolismo',
    'sepse', 'cetoacidose', 'cad', 'pneumotórax', 'hemorragia digestiva',
    'anafilaxia', 'edema agudo', 'eap', 'meningite', 'status epiléptico',
    'emergência hipertensiva', 'dissecção aórtica', 'tamponamento',
    'insuficiência respiratória aguda', 'pcr', 'parada cardiorrespiratória',
    'politrauma', 'abdome agudo', 'eclâmpsia', 'crise asmática grave',
];

const CHRONIC_TOPICS = [
    'has', 'hipertensão', 'dm', 'dm2', 'diabetes', 'dislipidemia',
    'hipotireoidismo', 'hipertireoidismo', 'dpoc', 'osteoporose',
    'artrite reumatoide', 'lúpus', 'fibromialgia', 'obesidade',
    'insuficiência cardíaca crônica', 'icc', 'doença renal crônica',
    'drc', 'gota', 'epilepsia', 'depressão', 'ansiedade', 'hepatite crônica',
];

function weightedRandom(weights: Record<CaseEnvironment, number>): CaseEnvironment {
    const entries = Object.entries(weights) as [CaseEnvironment, number][];
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let rand = Math.random() * total;
    for (const [env, weight] of entries) {
        rand -= weight;
        if (rand <= 0) return env;
    }
    return entries[0][0];
}

function resolveEnvironment(
    environment: CaseEnvironmentOrRandom,
    topics: string[]
): { resolved: CaseEnvironment; source: 'user' | 'random' } {
    if (environment !== 'aleatorio') {
        return { resolved: environment, source: 'user' };
    }

    const lowerTopics = topics.map(t => t.toLowerCase());
    const isAcute = lowerTopics.some(t =>
        ACUTE_TOPICS.some(at => t.includes(at))
    );
    const isChronic = lowerTopics.some(t =>
        CHRONIC_TOPICS.some(ct => t.includes(ct))
    );

    let weights: Record<CaseEnvironment, number>;

    if (isAcute) {
        weights = {
            pronto_socorro: 40,
            uti: 30,
            enfermaria: 20,
            ambulatorio: 5,
            telemedicina: 3,
            domiciliar: 2,
        };
    } else if (isChronic) {
        weights = {
            ambulatorio: 50,
            enfermaria: 25,
            pronto_socorro: 10,
            uti: 5,
            telemedicina: 5,
            domiciliar: 5,
        };
    } else {
        weights = {
            ambulatorio: 25,
            pronto_socorro: 25,
            enfermaria: 20,
            uti: 10,
            telemedicina: 10,
            domiciliar: 10,
        };
    }

    return { resolved: weightedRandom(weights), source: 'random' };
}

// ==============================================================================
// HELPERS
// ==============================================================================

async function getAuthUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getSessionData(sessionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: session } = await supabase
        .from('case_sessions')
        .select('*, clinical_cases(*)')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

    return session;
}

export async function getSessionMessages(sessionId: string): Promise<CaseMessage[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('case_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    return (data as CaseMessage[]) || [];
}

export async function getSessionExams(sessionId: string): Promise<ExamRequest[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('case_exam_requests')
        .select('*')
        .eq('session_id', sessionId)
        .order('requested_at', { ascending: true });

    return (data as ExamRequest[]) || [];
}

// ==============================================================================
// 1. START TRAINING SESSION
// ==============================================================================

export async function startTrainingSession(
    params: StartTrainingParams
): Promise<StartTrainingResult | { error: string }> {
    const user = await getAuthUser();
    if (!user) return { error: "Usuário não autenticado." };

    // Resolve environment
    const { resolved: environment, source: environmentSource } = resolveEnvironment(
        params.environment,
        params.topics
    );

    // Build user message for case_builder
    let userMessage = `
GERE UM CASE BLUEPRINT com os seguintes parâmetros:
- Topics/Patologias: ${params.topics.join(', ')}
- Difficulty: ${params.difficulty}
- Detail Level: ${params.detail_level}
- Environment: ${environment}
`;

    if (params.ai_context_digest) {
        userMessage += `\n- Contexto pedagógico da trilha:\n${params.ai_context_digest}`;
    }

    // Generate blueprint via LLM
    const aiResult = await askMedAI({
        contextKey: 'case_builder',
        userMessage,
        responseType: 'json',
        modelName: AI_CONFIG.clinicalBlueprintModel,
        enableThinking: AI_CONFIG.clinicalBlueprintModelThinking,
        skipQuota: false,
        quotaType: 'clinical',
    });

    if (!aiResult.success || !aiResult.data) {
        return { error: aiResult.error || "Erro ao gerar caso clínico." };
    }

    const blueprint = aiResult.data as CaseBlueprint;

    // Force environment in blueprint (safety)
    blueprint.environment = environment;

    // Build title from topics
    const title = params.topics.slice(0, 3).join(' + ');

    // Insert clinical_case + session using admin client (bypasses RLS for insert)
    const adminClient = createAdminClient();

    const { data: caseData, error: caseError } = await adminClient
        .from('clinical_cases')
        .insert({
            user_id: user.id,
            mode: params.mode,
            title,
            topics: params.topics,
            difficulty: params.difficulty,
            detail_level: params.detail_level,
            environment,
            environment_source: environmentSource,
            stem: blueprint.stem,
            blueprint_json: blueprint,
            track_id: params.track_id || null,
            module_id: params.module_id || null,
        })
        .select('id')
        .single();

    if (caseError || !caseData) {
        console.error("Error creating clinical case:", caseError);
        return { error: "Erro ao salvar caso clínico." };
    }

    const { data: sessionData, error: sessionError } = await adminClient
        .from('case_sessions')
        .insert({
            user_id: user.id,
            case_id: caseData.id,
            status: 'in_progress',
            environment,
        })
        .select('id')
        .single();

    if (sessionError || !sessionData) {
        console.error("Error creating session:", sessionError);
        return { error: "Erro ao criar sessão de treino." };
    }

    return {
        sessionId: sessionData.id,
        stem: blueprint.stem,
        environment,
        availableExams: blueprint.available_exams || [],
    };
}

// ==============================================================================
// 2. SEND QUESTION (chat with patient)
// ==============================================================================

export async function sendQuestion(
    sessionId: string,
    userQuestion: string
): Promise<SendQuestionResult | { error: string }> {
    const user = await getAuthUser();
    if (!user) return { error: "Usuário não autenticado." };

    const supabase = await createClient();

    // Load session + blueprint
    const { data: session } = await supabase
        .from('case_sessions')
        .select('id, case_id, status')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

    if (!session) return { error: "Sessão não encontrada." };
    if (session.status !== 'in_progress') return { error: "Sessão já finalizada." };

    const { data: clinicalCase } = await supabase
        .from('clinical_cases')
        .select('blueprint_json')
        .eq('id', session.case_id)
        .single();

    if (!clinicalCase) return { error: "Caso não encontrado." };

    const blueprint = clinicalCase.blueprint_json as CaseBlueprint;

    // Load chat history for context
    const { data: history } = await supabase
        .from('case_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(30);

    // Build Gemini history format:
    // - Exclude 'system' role messages (not valid in Gemini chat turns)
    // - Gemini requires the first entry to be role 'user', so drop any
    //   leading 'model' turns that have no preceding user turn.
    const rawHistory = (history || [])
        .filter((msg: any) => msg.role !== 'system')
        .map((msg: any) => ({
            role: msg.role === 'user' ? 'user' as const : 'model' as const,
            parts: [{ text: msg.content }],
        }));

    // Drop leading model turns (Gemini rejects history that starts with model)
    const firstUserIdx = rawHistory.findIndex(m => m.role === 'user');
    const geminiHistory = firstUserIdx > 0 ? rawHistory.slice(firstUserIdx) : rawHistory;


    // Call patient_responder
    const aiResult = await askMedAI({
        contextKey: 'patient_responder',
        userMessage: userQuestion,
        history: geminiHistory,
        responseType: 'text',
        modelName: AI_CONFIG.clinicalPatientModel,
        systemInstructionArgs: `BLUEPRINT (FONTE DA VERDADE):\n${JSON.stringify(blueprint, null, 2)}`,
        skipQuota: true,
        quotaType: 'unlimited',
    });

    if (!aiResult.success) {
        return { error: aiResult.error || "Erro ao comunicar com paciente." };
    }

    const patientResponse = aiResult.message;

    // Save both messages
    const adminClient = createAdminClient();

    await adminClient.from('case_messages').insert([
        {
            session_id: sessionId,
            role: 'user',
            content: userQuestion,
        },
        {
            session_id: sessionId,
            role: 'patient',
            content: patientResponse,
        },
    ]);

    return {
        patientResponse,
        messageId: sessionId,
    };
}

// ==============================================================================
// 3. REQUEST EXAM
// ==============================================================================

export async function requestExam(
    sessionId: string,
    examCode: string
): Promise<RequestExamResult | { error: string }> {
    const user = await getAuthUser();
    if (!user) return { error: "Usuário não autenticado." };

    const supabase = await createClient();

    // Load session + blueprint
    const { data: session } = await supabase
        .from('case_sessions')
        .select('id, case_id, status')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

    if (!session) return { error: "Sessão não encontrada." };
    if (session.status !== 'in_progress') return { error: "Sessão já finalizada." };

    const { data: clinicalCase } = await supabase
        .from('clinical_cases')
        .select('blueprint_json')
        .eq('id', session.case_id)
        .single();

    if (!clinicalCase) return { error: "Caso não encontrado." };

    const blueprint = clinicalCase.blueprint_json as CaseBlueprint;
    const policy = blueprint.exam_policy;

    // Find exam by code (case-insensitive)
    const exam = (blueprint.available_exams || []).find(
        (e: BlueprintExam) => e.code.toLowerCase() === examCode.toLowerCase()
    );

    const adminClient = createAdminClient();

    if (!exam) {
        // Exam not available in blueprint
        const unavailableMsg = policy?.if_not_available || "Exame não disponível/Não indicado no cenário atual.";

        await adminClient.from('case_exam_requests').insert({
            session_id: sessionId,
            exam_code: examCode,
            exam_name: examCode,
            exam_category: 'outro' as ExamCategory,
            result_text: unavailableMsg,
            status: 'returned',
        });

        return {
            exam_code: examCode,
            exam_name: examCode,
            exam_category: 'outro' as ExamCategory,
            result_text: unavailableMsg,
            status: 'unavailable',
        };
    }

    // Exam found — return result
    await adminClient.from('case_exam_requests').insert({
        session_id: sessionId,
        exam_code: exam.code,
        exam_name: exam.name,
        exam_category: exam.category,
        result_text: exam.result_summary,
        status: 'returned',
    });

    // Also add a system message in chat
    await adminClient.from('case_messages').insert({
        session_id: sessionId,
        role: 'system',
        content: `📋 Resultado de "${exam.name}" disponível na aba Exames Solicitados.`,
    });

    return {
        exam_code: exam.code,
        exam_name: exam.name,
        exam_category: exam.category,
        result_text: exam.result_summary,
        status: 'returned',
    };
}

// ==============================================================================
// 4. SUBMIT ANAMNESIS
// ==============================================================================

export async function submitAnamnesis(
    sessionId: string,
    noteText: string
): Promise<SubmitAnamnesisResult> {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Usuário não autenticado." };

    const supabase = await createClient();

    const { error } = await supabase
        .from('case_sessions')
        .update({
            final_anamnesis_text: noteText,
            submitted_at: new Date().toISOString(),
            status: 'submitted',
        })
        .eq('id', sessionId)
        .eq('user_id', user.id);

    if (error) {
        console.error("Error submitting anamnesis:", error);
        return { success: false, error: "Erro ao enviar anamnese." };
    }

    return { success: true };
}

// ==============================================================================
// 5. GRADE ANAMNESIS
// ==============================================================================

export async function gradeAnamnesis(
    sessionId: string
): Promise<GradeAnamnesisResult> {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Usuário não autenticado." };

    const supabase = await createClient();

    // Load session
    const { data: session } = await supabase
        .from('case_sessions')
        .select('id, case_id, final_anamnesis_text, status, environment')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

    if (!session) return { success: false, error: "Sessão não encontrada." };
    if (!session.final_anamnesis_text) return { success: false, error: "Anamnese não enviada." };

    // Load blueprint
    const { data: clinicalCase } = await supabase
        .from('clinical_cases')
        .select('blueprint_json')
        .eq('id', session.case_id)
        .single();

    if (!clinicalCase) return { success: false, error: "Caso não encontrado." };

    const blueprint = clinicalCase.blueprint_json as CaseBlueprint;

    // Load exams requested
    const { data: exams } = await supabase
        .from('case_exam_requests')
        .select('exam_name, exam_category, result_text, status')
        .eq('session_id', sessionId);

    const examsSummary = (exams || [])
        .map((e: any) => `${e.exam_name} (${e.exam_category}): ${e.result_text || 'aguardando'}`)
        .join('\n');

    // Call grader
    const userMessage = `
AVALIE A ANAMNESE DO ALUNO:

=== BLUEPRINT (FONTE DA VERDADE) ===
${JSON.stringify(blueprint, null, 2)}

=== ENVIRONMENT ===
${session.environment}

=== EXAMES SOLICITADOS PELO ALUNO ===
${examsSummary || 'Nenhum exame solicitado'}

=== ANAMNESE DO ALUNO ===
${session.final_anamnesis_text}
`;

    const aiResult = await askMedAI({
        contextKey: 'anamnesis_grader',
        userMessage,
        responseType: 'json',
        modelName: AI_CONFIG.clinicalGraderModel,
        skipQuota: true,
        quotaType: 'unlimited',
    });

    if (!aiResult.success || !aiResult.data) {
        return { success: false, error: aiResult.error || "Erro ao avaliar anamnese." };
    }

    const gradeResult = aiResult.data;

    // Save grading results
    const adminClient = createAdminClient();
    await adminClient
        .from('case_sessions')
        .update({
            status: 'graded',
            score_total: gradeResult.score_total,
            score_breakdown: gradeResult.score_breakdown,
            feedback_json: gradeResult.feedback,
        })
        .eq('id', sessionId);

    return {
        success: true,
        gradeResult: {
            score_total: gradeResult.score_total,
            score_breakdown: gradeResult.score_breakdown,
            feedback: gradeResult.feedback,
        },
    };
}

// ==============================================================================
// 6. GET MODEL ANAMNESIS (only on explicit request)
// ==============================================================================

export async function getModelAnamnesis(
    sessionId: string
): Promise<ModelAnamnesisResult> {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Usuário não autenticado." };

    const supabase = await createClient();

    // Load session
    const { data: session } = await supabase
        .from('case_sessions')
        .select('id, case_id, status')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

    if (!session) return { success: false, error: "Sessão não encontrada." };
    if (session.status !== 'graded') {
        return { success: false, error: "Envie e avalie a anamnese antes de solicitar o modelo." };
    }

    // Load blueprint
    const { data: clinicalCase } = await supabase
        .from('clinical_cases')
        .select('blueprint_json')
        .eq('id', session.case_id)
        .single();

    if (!clinicalCase) return { success: false, error: "Caso não encontrado." };

    const blueprint = clinicalCase.blueprint_json as CaseBlueprint;

    const userMessage = `
Gere uma ANAMNESE MODELO para o seguinte caso:

=== BLUEPRINT ===
${JSON.stringify(blueprint, null, 2)}
`;

    const aiResult = await askMedAI({
        contextKey: 'model_note_generator',
        userMessage,
        responseType: 'text',
        modelName: AI_CONFIG.clinicalModelNoteModel,
        skipQuota: true,
        quotaType: 'unlimited',
    });

    if (!aiResult.success) {
        return { success: false, error: aiResult.error || "Erro ao gerar anamnese modelo." };
    }

    // Save model_note in feedback_json
    const adminClient = createAdminClient();

    const { data: currentSession } = await supabase
        .from('case_sessions')
        .select('feedback_json')
        .eq('id', sessionId)
        .single();

    const updatedFeedback = {
        ...(currentSession?.feedback_json as any || {}),
        model_note: aiResult.message,
    };

    await adminClient
        .from('case_sessions')
        .update({ feedback_json: updatedFeedback })
        .eq('id', sessionId);

    return {
        success: true,
        modelNote: aiResult.message,
    };
}

// ==============================================================================
// 7. PERFORM PHYSICAL EXAM (by body system — no LLM, reads from blueprint)
// ==============================================================================

export async function performPhysicalExam(
    sessionId: string,
    system: PhysicalExamSystem
): Promise<PerformPhysicalExamResult | { error: string }> {
    const user = await getAuthUser();
    if (!user) return { error: "Usuário não autenticado." };

    const supabase = await createClient();

    // Load session (also load current physical_exam_findings to append)
    const { data: session } = await supabase
        .from('case_sessions')
        .select('id, case_id, status, physical_exam_findings')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

    if (!session) return { error: "Sessão não encontrada." };
    if (session.status !== 'in_progress') return { error: "Sessão já finalizada." };

    // Load blueprint
    const { data: clinicalCase } = await supabase
        .from('clinical_cases')
        .select('blueprint_json')
        .eq('id', session.case_id)
        .single();

    if (!clinicalCase) return { error: "Caso não encontrado." };

    const blueprint = clinicalCase.blueprint_json as CaseBlueprint;
    const physicalExam = blueprint.physical_exam;

    if (!physicalExam || !physicalExam.systems) {
        return { error: "Este caso é anterior à atualização do exame físico. Inicie um novo treino para utilizar este recurso." };
    }

    // Get findings for the requested system
    let findings = physicalExam.systems[system];

    // If system=geral, prepend vitals
    if (system === 'geral' && physicalExam.vitals) {
        findings = `Sinais vitais: ${physicalExam.vitals}\n\n${findings || 'Sem achados adicionais.'}`;
    }

    if (!findings || findings.trim() === '') {
        findings = 'Sem alterações significativas neste sistema.';
    }

    const result: PerformPhysicalExamResult = {
        system,
        system_label: PHYSICAL_EXAM_LABELS[system],
        findings,
    };

    // Persist findings in case_sessions.physical_exam_findings (JSONB array)
    const adminClient = createAdminClient();
    const existingFindings: PerformPhysicalExamResult[] =
        (session.physical_exam_findings as PerformPhysicalExamResult[] | null) || [];
    const alreadyDone = existingFindings.some(f => f.system === system);
    if (!alreadyDone) {
        await adminClient
            .from('case_sessions')
            .update({ physical_exam_findings: [...existingFindings, result] })
            .eq('id', sessionId);
    }

    // Add system message in chat
    await adminClient.from('case_messages').insert({
        session_id: sessionId,
        role: 'system',
        content: `🩺 Exame físico realizado: ${PHYSICAL_EXAM_LABELS[system]}. Achados disponíveis na aba Exame Físico.`,
    });

    return result;
}

// ==============================================================================
// 8. GET SESSION PHYSICAL FINDINGS (restore on re-entry)
// ==============================================================================

export async function getSessionPhysicalFindings(
    sessionId: string
): Promise<PerformPhysicalExamResult[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('case_sessions')
        .select('physical_exam_findings')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

    return (data?.physical_exam_findings as PerformPhysicalExamResult[] | null) || [];
}

// ==============================================================================
// 9. LIST CASE SESSIONS (history for a given case)
// ==============================================================================

export interface SessionSummary {
    id: string;
    created_at: string;
    status: string;
    score_total: number | null;
    attempt_number: number;
}

export async function listCaseSessions(
    caseId: string
): Promise<SessionSummary[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
        .from('case_sessions')
        .select('id, created_at, status, score_total')
        .eq('case_id', caseId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

    return ((data || []) as any[]).map((s, idx) => ({
        id: s.id,
        created_at: s.created_at,
        status: s.status,
        score_total: s.score_total,
        attempt_number: idx + 1,
    }));
}

// ==============================================================================
// 10. RESET SESSION (repeat same case — new session, same blueprint)
// ==============================================================================

export async function resetSession(
    caseId: string,
    environment: CaseEnvironment
): Promise<{ sessionId: string } | { error: string }> {
    const user = await getAuthUser();
    if (!user) return { error: "Usuário não autenticado." };

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from('case_sessions')
        .insert({
            user_id: user.id,
            case_id: caseId,
            status: 'in_progress',
            environment,
        })
        .select('id')
        .single();

    if (error || !data) {
        console.error('Error resetting session:', error);
        return { error: "Erro ao criar nova sessão." };
    }

    return { sessionId: data.id };
}

// ==============================================================================
// 11 (a). DELETE SESSION
// ==============================================================================

export async function deleteSession(
    sessionId: string
): Promise<{ success: boolean; error?: string }> {
    const user = await getAuthUser();
    if (!user) return { success: false, error: 'Não autenticado.' };

    const supabase = await createClient();

    // Verify ownership before deletion
    const { data: session } = await supabase
        .from('case_sessions')
        .select('id, case_id')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

    if (!session) return { success: false, error: 'Sessão não encontrada.' };

    const adminClient = createAdminClient();

    // Delete the session (cascade removes messages, exam requests, etc.)
    const { error } = await adminClient
        .from('case_sessions')
        .delete()
        .eq('id', sessionId);

    if (error) {
        console.error('Error deleting session:', error);
        return { success: false, error: 'Erro ao apagar sessão.' };
    }

    return { success: true };
}


// ==============================================================================
// 11. GET RECENT CASE SESSIONS (for history panel on selector page)
// ==============================================================================

export interface RecentSession {
    session_id: string;
    case_id: string;
    title: string;
    topics: string[];
    environment: CaseEnvironment;
    difficulty: string;
    status: string;
    score_total: number | null;
    created_at: string;
    submitted_at: string | null;
}

export async function getRecentCaseSessions(limit = 10): Promise<RecentSession[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Fetch most recent sessions with their case metadata
    const { data } = await supabase
        .from('case_sessions')
        .select(`
            id,
            status,
            score_total,
            created_at,
            submitted_at,
            clinical_cases (
                id,
                title,
                topics,
                environment,
                difficulty
            )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (!data) return [];

    return data.map((row: any) => ({
        session_id: row.id,
        case_id: row.clinical_cases?.id ?? '',
        title: row.clinical_cases?.title ?? 'Sem título',
        topics: row.clinical_cases?.topics ?? [],
        environment: row.clinical_cases?.environment ?? 'ambulatorio',
        difficulty: row.clinical_cases?.difficulty ?? 'medium',
        status: row.status,
        score_total: row.score_total,
        created_at: row.created_at,
        submitted_at: row.submitted_at,
    }));
}

