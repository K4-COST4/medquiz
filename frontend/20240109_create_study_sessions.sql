-- Create table for persisting adaptive study sessions
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    node_id UUID REFERENCES public.study_nodes(id) ON DELETE CASCADE,
    questions JSONB NOT NULL, -- Array of Question objects
    remaining_questions JSONB, -- To track what's left (optional optimization, or just filter from main array)
    status TEXT CHECK (status IN ('active', 'completed', 'abandoned')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_node_active 
ON public.study_sessions(user_id, node_id) 
WHERE status = 'active';

-- RLS Policies
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sessions" ON public.study_sessions
    FOR ALL
    USING (auth.uid() = user_id);
