-- ==============================================================================
-- CLINICAL TRAINING MODULE — Migration
-- Tables: clinical_cases, case_sessions, case_messages, case_exam_requests
-- ==============================================================================

-- 1. clinical_cases (blueprints / case library)
CREATE TABLE IF NOT EXISTS clinical_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    mode TEXT NOT NULL CHECK (mode IN ('track', 'standalone')),
    title TEXT NOT NULL,
    topics TEXT[] NOT NULL DEFAULT '{}',

    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    detail_level TEXT NOT NULL CHECK (detail_level IN ('low', 'medium', 'high')),

    environment TEXT NOT NULL CHECK (environment IN (
        'ambulatorio', 'pronto_socorro', 'enfermaria', 'uti', 'telemedicina', 'domiciliar'
    )),
    environment_source TEXT NOT NULL DEFAULT 'user' CHECK (environment_source IN ('user', 'random')),

    stem TEXT,
    blueprint_json JSONB NOT NULL DEFAULT '{}',

    track_id UUID,
    module_id UUID,
    source TEXT NOT NULL DEFAULT 'ai_generated'
);

-- 2. case_sessions (per-user training sessions)
CREATE TABLE IF NOT EXISTS case_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES clinical_cases(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at TIMESTAMPTZ,

    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),

    environment TEXT NOT NULL CHECK (environment IN (
        'ambulatorio', 'pronto_socorro', 'enfermaria', 'uti', 'telemedicina', 'domiciliar'
    )),

    final_anamnesis_text TEXT,
    score_total NUMERIC,
    score_breakdown JSONB,
    feedback_json JSONB
);

-- 3. case_messages (chat history)
CREATE TABLE IF NOT EXISTS case_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES case_sessions(id) ON DELETE CASCADE,

    role TEXT NOT NULL CHECK (role IN ('user', 'patient', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. case_exam_requests (complementary exams)
CREATE TABLE IF NOT EXISTS case_exam_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES case_sessions(id) ON DELETE CASCADE,

    exam_code TEXT NOT NULL,
    exam_name TEXT NOT NULL,
    exam_category TEXT NOT NULL CHECK (exam_category IN ('lab', 'imagem', 'ecg', 'eco', 'micro', 'outro')),

    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    result_text TEXT,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'returned'))
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_clinical_cases_user ON clinical_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_clinical_cases_mode ON clinical_cases(mode);
CREATE INDEX IF NOT EXISTS idx_case_sessions_user ON case_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_case_sessions_case ON case_sessions(case_id);
CREATE INDEX IF NOT EXISTS idx_case_sessions_status ON case_sessions(status);
CREATE INDEX IF NOT EXISTS idx_case_messages_session ON case_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_case_messages_created ON case_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_case_exam_requests_session ON case_exam_requests(session_id);

-- ==============================================================================
-- RLS POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE clinical_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_exam_requests ENABLE ROW LEVEL SECURITY;

-- clinical_cases: user can only access own cases
CREATE POLICY "clinical_cases_select_own" ON clinical_cases
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clinical_cases_insert_own" ON clinical_cases
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clinical_cases_update_own" ON clinical_cases
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "clinical_cases_delete_own" ON clinical_cases
    FOR DELETE USING (auth.uid() = user_id);

-- case_sessions: user can only access own sessions
CREATE POLICY "case_sessions_select_own" ON case_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "case_sessions_insert_own" ON case_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "case_sessions_update_own" ON case_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "case_sessions_delete_own" ON case_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- case_messages: user can access if session belongs to them
CREATE POLICY "case_messages_select_own" ON case_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_sessions
            WHERE case_sessions.id = case_messages.session_id
            AND case_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "case_messages_insert_own" ON case_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM case_sessions
            WHERE case_sessions.id = case_messages.session_id
            AND case_sessions.user_id = auth.uid()
        )
    );

-- case_exam_requests: user can access if session belongs to them
CREATE POLICY "case_exam_requests_select_own" ON case_exam_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM case_sessions
            WHERE case_sessions.id = case_exam_requests.session_id
            AND case_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "case_exam_requests_insert_own" ON case_exam_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM case_sessions
            WHERE case_sessions.id = case_exam_requests.session_id
            AND case_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "case_exam_requests_update_own" ON case_exam_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM case_sessions
            WHERE case_sessions.id = case_exam_requests.session_id
            AND case_sessions.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- PROFILES: Add clinical training quota column
-- ==============================================================================

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS daily_clinical_count INTEGER DEFAULT 0;
