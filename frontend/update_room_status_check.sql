-- Remove a constraint antiga
ALTER TABLE public.kahoot_rooms DROP CONSTRAINT IF EXISTS kahoot_rooms_status_check;

-- Adiciona a nova constraint com os novos estados
ALTER TABLE public.kahoot_rooms ADD CONSTRAINT kahoot_rooms_status_check 
CHECK (status IN ('draft', 'waiting', 'active', 'question_ended', 'leaderboard', 'finished'));

-- Adiciona a coluna para cronometrar o tempo da questão (caso não exista)
ALTER TABLE public.kahoot_rooms ADD COLUMN IF NOT EXISTS question_start_at TIMESTAMPTZ;
