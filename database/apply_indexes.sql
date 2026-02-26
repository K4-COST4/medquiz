-- PERFORMANCE IMPROVEMENT: Apply Indexes to Foreign Keys (v2 Corrected)
-- Fixes: 'unindexed_foreign_keys' warnings.
-- Note: 'CONCURRENTLY' is omitted to allow running in Supabase SQL Editor.

-- 1. DECKS
CREATE INDEX IF NOT EXISTS idx_decks_user_id ON public.decks(user_id);
CREATE INDEX IF NOT EXISTS idx_decks_lesson_id ON public.decks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_decks_module_id ON public.decks(module_id);

-- 2. FLASHCARDS
CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON public.flashcards(deck_id);

-- 3. MEDIA & KAHOOT
CREATE INDEX IF NOT EXISTS idx_medai_sessions_user_id ON public.medai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_medai_messages_session_id ON public.medai_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_kahoot_rooms_host_id ON public.kahoot_rooms(host_id);

-- 4. USER TRACKING
-- Study Sessions
CREATE INDEX IF NOT EXISTS idx_study_sessions_node_id ON public.study_sessions(node_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);

-- User Node Progress
CREATE INDEX IF NOT EXISTS idx_user_node_progress_node_id ON public.user_node_progress(node_id);
CREATE INDEX IF NOT EXISTS idx_user_node_progress_user_id ON public.user_node_progress(user_id);

-- User History / Question History
-- Note: Wrapping legacy table 'user_history' in check to avoid errors if it doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_history') THEN
        CREATE INDEX IF NOT EXISTS idx_user_history_user_id ON public.user_history(user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_question_history_question_id ON public.user_question_history(question_id);
CREATE INDEX IF NOT EXISTS idx_user_question_history_user_id ON public.user_question_history(user_id); 

-- User Mistakes (Corrected Schema: user_id, question_id only)
CREATE INDEX IF NOT EXISTS idx_user_mistakes_question_id ON public.user_mistakes(question_id);
-- Removed invalid index on 'context_node_id'

-- 5. CONTENT BANK
CREATE INDEX IF NOT EXISTS idx_track_questions_original_question_id ON public.track_questions(original_question_id);
