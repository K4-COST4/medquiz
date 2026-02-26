ALTER TABLE public.kahoot_players ADD COLUMN IF NOT EXISTS last_answer text;
-- (Nota: 'last_answer' guardará o ID da opção: 'a', 'b', 'c' ou 'd')
