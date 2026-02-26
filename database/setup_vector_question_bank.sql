-- ==============================================================================
-- MIGRATION: VECTOR QUESTION BANK
-- Date: 2026-01-17
-- Description: Sets up the vector database for questions, enabling semantic search
--              and collective intelligence stats.
-- ==============================================================================

-- 1. Enable pgvector extension (if not already enabled)
create extension if not exists vector;

-- 2. Create the Question Bank Table
create table if not exists question_bank (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  
  -- Core Content
  statement text not null,
  options jsonb not null, -- Array of options: [{id, text, isCorrect}, ...]
  correct_answer text,    -- ID or text of the correct answer
  commentary text,        -- Detailed explanation
  q_type text not null,   -- 'multiple_choice', 'true_false', 'fill_gap'
  
  -- Metadata for Search & Filtering
  topics text[] not null, -- Tags: ['cardiologia', 'has']
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  source text default 'ai_auto_gen', -- 'residencia_2024', 'manual', 'ai_auto_gen'
  
  -- Vector Embedding
  -- Using 768 dimensions to match Gemini 'embedding-001'
  embedding vector(768),
  
  -- Collective Intelligence (Stats)
  stats_attempts int default 0,
  stats_correct int default 0,
  stats_incorrect int default 0
);

-- 3. Create Index for Fast Vector Search
-- index 'ivfflat' is good for speed vs recall. 
-- 'lists = 100' is a standard starting point for <100k rows.
create index on question_bank using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 4. Create Search Function (RPC)
-- This function allows us to find similar questions using cosine similarity
create or replace function match_questions (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_topics text[],
  filter_difficulty text
)
returns setof question_bank
language plpgsql
as $$
begin
  return query
  select *
  from question_bank
  where 1 = 1
  -- Similarity Threshold (Cosine Distance < 1 - Threshold)
  -- If threshold is 0.8, we want distance < 0.2
  and question_bank.embedding <=> query_embedding < 1 - match_threshold
  -- Hard Filters (only apply if not null)
  and (filter_topics is null or question_bank.topics && filter_topics)
  and (filter_difficulty is null or question_bank.difficulty = filter_difficulty)
  -- Order by Similarity (Distance ascending)
  order by question_bank.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. Helper RPC to atomicaly update stats
-- Call this when a user answers a question
create or replace function increment_question_stats (
  question_id uuid,
  is_correct boolean
)
returns void
language plpgsql
as $$
begin
  update question_bank
  set 
    stats_attempts = stats_attempts + 1,
    stats_correct = stats_correct + (case when is_correct then 1 else 0 end),
    stats_incorrect = stats_incorrect + (case when is_correct then 0 else 1 end)
  where id = question_id;
end;
$$;

-- 6. Add Linkage to Existing Track Questions (The Bridge)
-- This allows us to link local user questions back to the central bank
alter table track_questions 
add column if not exists original_question_id uuid references question_bank(id);
