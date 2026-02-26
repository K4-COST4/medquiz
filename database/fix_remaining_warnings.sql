-- FIX REMAINING WARNINGS (Final Verified)
-- 1. Restore fixes for active functions
-- Verified via `frontend/app/actions/generate-questions-service.ts`
ALTER FUNCTION public.match_questions(vector, float, int, text[], text) SET search_path = public;

-- Verified Trigger Function
ALTER FUNCTION public.auto_set_xp_reward() SET search_path = public;

-- 2. Drop "Phantom" Functions (Verified Unused)
-- Deep analysis confirms these are NOT called in the frontend codebase.
-- Current "Boss Mode" logic uses AI generation (Maestro) or `get_adaptive_session`.

DROP FUNCTION IF EXISTS public.get_boss_questions(uuid, int);
DROP FUNCTION IF EXISTS public.get_module_boss_questions(uuid, int);
DROP FUNCTION IF EXISTS public.get_new_questions(uuid, uuid, int);
DROP FUNCTION IF EXISTS public.match_med_documents(vector, float, int);
