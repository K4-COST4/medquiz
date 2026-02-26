-- PERFORMANCE OPTIMIZATION & CLEANUP v8 (Final Polish)
-- Fixes: Remaining 18 warnings ('auth_rls_initplan' on user_history & 'multiple_permissive_policies')
-- Strategy:
-- 1. Splits "Owner" policies into (INSERT, UPDATE, DELETE) vs SELECT to avoid overlapping permissive policies.
-- 2. Explicitly targets 'public.user_history' (likely legacy) in addition to 'user_question_history'.

-- 1. PROFILES
-- Drop Conflicting
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem ver qualquer perfil público" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem criar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public Read Access" ON public.profiles;

-- Create Split Policies
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((select auth.uid()) = id);
CREATE POLICY "Public Read Access" ON public.profiles FOR SELECT USING (true); 

DROP INDEX IF EXISTS public.profiles_handle_idx;

-- 2. USER_NODE_PROGRESS (Split not needed if only one policy, but cleaner)
DROP POLICY IF EXISTS "Aluno vê seu progresso" ON public.user_node_progress;
DROP POLICY IF EXISTS "Aluno atualiza seu progresso" ON public.user_node_progress;
DROP POLICY IF EXISTS "Aluno modifica seu progresso" ON public.user_node_progress;
DROP POLICY IF EXISTS "Users can manage their own progress" ON public.user_node_progress;

CREATE POLICY "Users can manage their own progress" ON public.user_node_progress FOR ALL USING ((select auth.uid()) = user_id);

-- 3. USER_HISTORY (Targeting the Legacy Table reported in warnings)
DROP POLICY IF EXISTS "Usuário insere seu próprio histórico" ON public.user_history;
DROP POLICY IF EXISTS "Usuário vê seu próprio histórico" ON public.user_history;
-- Create optimized for user_history if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_history') THEN
        CREATE POLICY "Users can manage their own legacy history" ON public.user_history FOR ALL USING ((select auth.uid()) = user_id);
    END IF;
END $$;

-- 3.1 USER_QUESTION_HISTORY (The actual active table)
DROP POLICY IF EXISTS "Aluno registra resposta" ON public.user_question_history;
DROP POLICY IF EXISTS "Aluno vê histórico" ON public.user_question_history;
DROP POLICY IF EXISTS "Users can manage their own history" ON public.user_question_history;

CREATE POLICY "Users can manage their own history" ON public.user_question_history FOR ALL USING ((select auth.uid()) = user_id);

-- 4. KAHOOT_PLAYERS
DROP POLICY IF EXISTS "Enable read access for all users" ON public.kahoot_players;
DROP POLICY IF EXISTS "Players are public read" ON public.kahoot_players;
DROP POLICY IF EXISTS "Host delete players" ON public.kahoot_players;
DROP POLICY IF EXISTS "Public Read Access" ON public.kahoot_players;
DROP POLICY IF EXISTS "Hosts can delete players" ON public.kahoot_players;

CREATE POLICY "Public Read Access" ON public.kahoot_players FOR SELECT USING (true);
CREATE POLICY "Hosts can delete players" ON public.kahoot_players FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.kahoot_rooms
        WHERE id = kahoot_players.room_id
        AND host_id = (select auth.uid())
    )
);

-- 5. MEDAI_SESSIONS & MESSAGES (Split not strictly needed but good practice)
DROP POLICY IF EXISTS "Gerenciar proprias sessoes" ON public.medai_sessions;
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.medai_sessions;
CREATE POLICY "Users can manage own sessions" ON public.medai_sessions FOR ALL USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Gerenciar proprias mensagens" ON public.medai_messages;
DROP POLICY IF EXISTS "Users can manage own messages" ON public.medai_messages;
CREATE POLICY "Users can manage own messages" ON public.medai_messages FOR ALL USING (
    session_id IN (
        SELECT id FROM public.medai_sessions WHERE user_id = (select auth.uid())
    )
);

-- 6. KAHOOT_ROOMS (Fix Multiple Permissive)
DROP POLICY IF EXISTS "Rooms are public read" ON public.kahoot_rooms;
DROP POLICY IF EXISTS "Hosts can manage own rooms" ON public.kahoot_rooms;
DROP POLICY IF EXISTS "Hosts can create rooms" ON public.kahoot_rooms;
DROP POLICY IF EXISTS "Hosts can update their own rooms" ON public.kahoot_rooms;
DROP POLICY IF EXISTS "Hosts can delete their own rooms" ON public.kahoot_rooms;
DROP POLICY IF EXISTS "Public Read Access" ON public.kahoot_rooms;

-- Split: Read (Select) vs Manage (Insert/Update/Delete)
CREATE POLICY "Public Read Access" ON public.kahoot_rooms FOR SELECT USING (true);
CREATE POLICY "Hosts can manage own rooms" ON public.kahoot_rooms FOR INSERT WITH CHECK ((select auth.uid()) = host_id);
CREATE POLICY "Hosts can update own rooms" ON public.kahoot_rooms FOR UPDATE USING ((select auth.uid()) = host_id);
CREATE POLICY "Hosts can delete own rooms" ON public.kahoot_rooms FOR DELETE USING ((select auth.uid()) = host_id);


-- 7. FLASHCARDS & DECKS (Fix Multiple Permissive)
-- DECKS
DROP POLICY IF EXISTS "Ver decks" ON public.decks;
DROP POLICY IF EXISTS "Dono gerencia decks" ON public.decks;
DROP POLICY IF EXISTS "Owner can manage decks" ON public.decks;
DROP POLICY IF EXISTS "Read Public or Own Decks" ON public.decks;

-- Split: Read vs Write
CREATE POLICY "Read Public or Own Decks" ON public.decks FOR SELECT USING (
    is_public = true OR (select auth.uid()) = user_id
);
CREATE POLICY "Owner can insert decks" ON public.decks FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Owner can update decks" ON public.decks FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Owner can delete decks" ON public.decks FOR DELETE USING ((select auth.uid()) = user_id);

-- FLASHCARDS
DROP POLICY IF EXISTS "Ver cards" ON public.flashcards;
DROP POLICY IF EXISTS "Dono gerencia cards" ON public.flashcards;
DROP POLICY IF EXISTS "Owner can manage cards" ON public.flashcards;
DROP POLICY IF EXISTS "Read Cards from Public or Own Decks" ON public.flashcards;

-- Split: Read vs Write
CREATE POLICY "Read Cards from Public or Own Decks" ON public.flashcards FOR SELECT USING (
    deck_id IN (
        SELECT id FROM public.decks 
        WHERE is_public = true OR user_id = (select auth.uid())
    )
);
CREATE POLICY "Owner can insert cards" ON public.flashcards FOR INSERT WITH CHECK (
    deck_id IN (SELECT id FROM public.decks WHERE user_id = (select auth.uid()))
);
-- Note: Update/Delete checks need USING, Insert needs WITH CHECK
CREATE POLICY "Owner can update cards" ON public.flashcards FOR UPDATE USING (
    deck_id IN (SELECT id FROM public.decks WHERE user_id = (select auth.uid()))
);
CREATE POLICY "Owner can delete cards" ON public.flashcards FOR DELETE USING (
    deck_id IN (SELECT id FROM public.decks WHERE user_id = (select auth.uid()))
);

-- 8. STUDY_NODES (Fix Multiple Permissive)
DROP POLICY IF EXISTS "Visualizar nós permitidos" ON public.study_nodes;
DROP POLICY IF EXISTS "Trilhas são públicas para leitura" ON public.study_nodes;
DROP POLICY IF EXISTS "Gerenciar meus nós" ON public.study_nodes;
DROP POLICY IF EXISTS "Owner can manage nodes" ON public.study_nodes;
DROP POLICY IF EXISTS "Public Read Nodes" ON public.study_nodes;

-- Split: Read vs Write
CREATE POLICY "Public Read Nodes" ON public.study_nodes FOR SELECT USING (true);
CREATE POLICY "Owner can insert nodes" ON public.study_nodes FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Owner can update nodes" ON public.study_nodes FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Owner can delete nodes" ON public.study_nodes FOR DELETE USING ((select auth.uid()) = user_id);

-- 9. USER_MISTAKES
DROP POLICY IF EXISTS "Users can manage their own mistakes" ON public.user_mistakes;
CREATE POLICY "Users can manage their own mistakes" ON public.user_mistakes FOR ALL USING ((select auth.uid()) = user_id);

-- 10. STUDY_SESSIONS
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.study_sessions;
CREATE POLICY "Users can manage their own sessions" ON public.study_sessions FOR ALL USING ((select auth.uid()) = user_id);
