-- ==============================================================================
-- FIX: match_documents function - pgvector operator issue
-- Date: 2026-01-27
-- Description: Recreates match_documents function using SQL language to fix
--              "operator does not exist: extensions.vector <=> extensions.vector"
-- ==============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS match_documents(vector, double precision, integer);
DROP FUNCTION IF EXISTS match_documents(vector, float, int);

-- Recreate with SQL language (more compatible with pgvector)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    med_knowledge_base.id,
    med_knowledge_base.content,
    1 - (med_knowledge_base.embedding <=> query_embedding) as similarity,
    med_knowledge_base.metadata
  FROM med_knowledge_base
  WHERE 1 - (med_knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY med_knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION match_documents IS 'Performs semantic search on med_knowledge_base using cosine similarity. Returns documents with similarity > threshold, ordered by relevance.';
