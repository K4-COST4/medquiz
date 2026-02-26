-- Adiciona colunas para controle granular de cotas na tabela profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS daily_flashcards_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_track_generation_date TIMESTAMP WITH TIME ZONE;
