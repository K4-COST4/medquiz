-- FIX SUPABASE WARNINGS v5 (Corrected Column Name)
-- 1. Fix 'function_search_path_mutable'

-- Kahoot / Live
ALTER FUNCTION public.submit_kahoot_answer(UUID, UUID, TEXT, INT) SET search_path = public;

-- RAG / Search
ALTER FUNCTION public.match_documents(vector, float, int) SET search_path = public;

-- Standard Functions
ALTER FUNCTION public.get_adaptive_session(UUID) SET search_path = public; 

-- Counters
ALTER FUNCTION public.increment_question_stats(UUID, BOOLEAN) SET search_path = public;

-- Helpers
ALTER FUNCTION public.complete_until_checkpoint(UUID) SET search_path = public;

-- 2. Harden 'kahoot_players' RLS Policy
DROP POLICY IF EXISTS "Anyone can join" ON public.kahoot_players;

CREATE POLICY "Anyone can join"
ON public.kahoot_players
FOR INSERT
TO public
WITH CHECK (room_id IS NOT NULL); -- Column is 'room_id', not 'quiz_room_id'
