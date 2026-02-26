-- 1. Enable Vector Extension (if not already enabled)
create extension if not exists vector;

-- 2. Update DECKS table
-- Add columns for Context and File Management
alter table public.decks 
add column if not exists study_objective text,
add column if not exists temp_file_path text,
add column if not exists original_filename text,
add column if not exists file_uploaded_at timestamp with time zone,
add column if not exists embedding vector(768);

-- Create index for Deck vector search (Only for public decks)
create index if not exists decks_embedding_idx 
on public.decks 
using ivfflat (embedding vector_cosine_ops)
where is_public = true;

-- 3. Update FLASHCARDS table
-- Add columns for Ratings (Thumbs Up/Down)
alter table public.flashcards 
add column if not exists likes_count integer default 0,
add column if not exists dislikes_count integer default 0;

-- 4. Create View for Approval Rate (Optional, simplifies frontend queries)
create or replace view public.flashcard_stats as
select 
    id, 
    deck_id,
    likes_count, 
    dislikes_count,
    case 
        when (likes_count + dislikes_count) = 0 then 0
        else round((likes_count::numeric / (likes_count + dislikes_count)::numeric) * 100, 1)
    end as approval_percentage
from public.flashcards;

-- 5. Storage Bucket Policies (Instructional Comment)
-- You need to go to Supabase Dashboard -> Storage -> create bucket 'deck-attachments'
-- Set Lifecycle Rule: older than 7 days -> delete.

-- 6. Link Decks to Lessons (Custom Track Integration)
alter table public.decks
add column if not exists lesson_id uuid references public.study_nodes(id) on delete cascade,
add column if not exists module_id uuid references public.study_nodes(id) on delete cascade;
