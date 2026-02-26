-- ==============================================================================
-- CORREÇÃO CRÍTICA: RPC match_questions com campo distance
-- Data: 2026-02-10
-- Descrição: Modifica a função para retornar a distância vetorial como campo
-- ==============================================================================

-- Deletar função antiga
DROP FUNCTION IF EXISTS match_questions(vector, float, int, text[], text);

-- Criar nova função que retorna distance
CREATE OR REPLACE FUNCTION match_questions (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_topics text[],
  filter_difficulty text
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  statement text,
  options jsonb,
  correct_answer text,
  commentary text,
  q_type text,
  topics text[],
  difficulty text,
  source text,
  embedding vector(768),
  stats_attempts int,
  stats_correct int,
  stats_incorrect int,
  distance float  -- ⭐ NOVO CAMPO
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qb.id,
    qb.created_at,
    qb.statement,
    qb.options,
    qb.correct_answer,
    qb.commentary,
    qb.q_type,
    qb.topics,
    qb.difficulty,
    qb.source,
    qb.embedding,
    qb.stats_attempts,
    qb.stats_correct,
    qb.stats_incorrect,
    (qb.embedding <=> query_embedding)::float AS distance  -- ⭐ CALCULAR DISTÂNCIA
  FROM question_bank qb
  WHERE 1 = 1
    AND qb.embedding <=> query_embedding < 1 - match_threshold
    AND (filter_topics IS NULL OR qb.topics && filter_topics)
    AND (filter_difficulty IS NULL OR qb.difficulty = filter_difficulty)
  ORDER BY qb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Atualizar search_path para segurança
ALTER FUNCTION public.match_questions(vector, float, int, text[], text) SET search_path = public;

-- Comentário
COMMENT ON FUNCTION match_questions IS 'Busca questões similares usando embeddings vetoriais. Retorna distance para análise de qualidade.';
