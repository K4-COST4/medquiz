-- TABELA DE SALAS (ROOMS)
create table public.kahoot_rooms (
  id uuid default gen_random_uuid() primary key,
  host_id uuid references auth.users(id) not null,
  title text not null,
  pin_code text not null unique, -- Código de 6 dígitos
  
  -- Status do Fluxo:
  -- 'draft': Fase de criação/edição (Host revisando questões da IA).
  -- 'waiting': Lobby aberto (Alunos entrando).
  -- 'active': Jogo rodando.
  -- 'finished': Jogo encerrou.
  status text default 'draft' check (status in ('draft', 'waiting', 'active', 'finished')),
  
  -- Configurações da Partida (Regras de Negócio)
  config jsonb default '{
    "show_leaderboard": "after_question",
    "question_timer_multiplier": 1.0,
    "allow_anonymous": true
  }'::jsonb,
  
  -- ARMAZENAMENTO DAS QUESTÕES (JSONB)
  -- Estrutura do Objeto Questão:
  -- {
  --   "id": "uuid",
  --   "type": "multiple_choice" | "true_false" | "fill_gap_select",
  --   "statement": "Texto da pergunta",
  --   "difficulty": "easy" | "medium" | "hard",
  --   "time_limit": 30,
  --   "options": [
  --      { "id": "a", "text": "Opção A", "isCorrect": false, "color": "red" },
  --      { "id": "b", "text": "Opção B", "isCorrect": true, "color": "blue" }
  --   ]
  -- }
  game_data jsonb not null default '[]'::jsonb,
  
  current_question_index integer default -1,
  created_at timestamp with time zone default now()
);

-- TABELA DE JOGADORES (PLAYERS)
create table public.kahoot_players (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.kahoot_rooms(id) on delete cascade,
  nickname text not null,
  score integer default 0,
  streak integer default 0,
  avatar_id text, -- Opcional para futuro
  created_at timestamp with time zone default now()
);

-- CONFIGURAÇÃO REALTIME (Essencial)
-- Você precisa rodar isso no SQL Editor do Supabase, pois requires superuser ou owner rights
alter publication supabase_realtime add table public.kahoot_rooms, public.kahoot_players;

-- RLS (SEGURANÇA)
alter table public.kahoot_rooms enable row level security;
create policy "Public read rooms" on public.kahoot_rooms for select using (true);
create policy "Host insert rooms" on public.kahoot_rooms for insert with check (auth.uid() = host_id);
create policy "Host update rooms" on public.kahoot_rooms for update using (auth.uid() = host_id);

alter table public.kahoot_players enable row level security;
create policy "Public read players" on public.kahoot_players for select using (true);
create policy "Public insert players" on public.kahoot_players for insert with check (true);
-- Update de players será feito via RPC (função segura) posteriormente, não via API direta por segurança, ou via server action com service role.
