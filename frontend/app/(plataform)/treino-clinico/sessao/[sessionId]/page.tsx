import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import SessionClient from './session-client';
import { getSessionMessages, getSessionExams } from '@/app/actions/clinical-training';
import type { CaseBlueprint, GradeResult } from '@/types/clinical-training';

interface PageProps {
    params: Promise<{ sessionId: string }>;
}

export default async function ClinicalSessionPage({ params }: PageProps) {
    const { sessionId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect('/login');

    // Load session with case
    const { data: session } = await supabase
        .from('case_sessions')
        .select('*, clinical_cases(*)')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

    if (!session) return redirect('/treino-clinico');

    const clinicalCase = session.clinical_cases as any;
    const blueprint = clinicalCase.blueprint_json as CaseBlueprint;

    // Load messages and exams
    const messages = await getSessionMessages(sessionId);
    const exams = await getSessionExams(sessionId);

    // Build initial grade if graded
    let initialGrade: GradeResult | null = null;
    if (session.status === 'graded' && session.score_total !== null) {
        initialGrade = {
            score_total: session.score_total,
            score_breakdown: session.score_breakdown,
            feedback: session.feedback_json,
        };
    }

    return (
        <SessionClient
            sessionId={sessionId}
            stem={blueprint.stem || clinicalCase.stem || ''}
            environment={session.environment}
            availableExams={blueprint.available_exams || []}
            initialMessages={messages}
            initialExams={exams}
            sessionStatus={session.status}
            initialGrade={initialGrade}
        />
    );
}
