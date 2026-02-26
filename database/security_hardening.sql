-- SECURITY HARDENING MIGRATION
-- Fixes Supabase Security Advisories

-- 1. Fix 'security_definer_view'
-- Change flashcard_stats to invoke security of the caller.
-- This ensures the view respects the RLS policies of the underlying tables (flashcards/decks).
ALTER VIEW public.flashcard_stats SET (security_invoker = true);

-- 2. Fix 'rls_disabled_in_public' for user_mistakes
ALTER TABLE public.user_mistakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own mistakes" ON public.user_mistakes;
CREATE POLICY "Users can manage their own mistakes" 
ON public.user_mistakes 
FOR ALL 
TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 3. Fix 'rls_disabled_in_public' for med_knowledge_base
ALTER TABLE public.med_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read knowledge base" ON public.med_knowledge_base;
CREATE POLICY "Authenticated users can read knowledge base"
ON public.med_knowledge_base
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Service Role can manage knowledge base" ON public.med_knowledge_base;
CREATE POLICY "Service Role can manage knowledge base"
ON public.med_knowledge_base
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Fix 'rls_disabled_in_public' for question_bank
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read question bank" ON public.question_bank;
CREATE POLICY "Authenticated users can read question bank"
ON public.question_bank
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Service Role can manage question bank" ON public.question_bank;
CREATE POLICY "Service Role can manage question bank"
ON public.question_bank
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure permissions
GRANT SELECT ON public.med_knowledge_base TO authenticated;
GRANT SELECT ON public.question_bank TO authenticated;
