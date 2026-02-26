-- ==============================================================================
-- TELEMETRIA: Schema para observabilidade do sistema de questões
-- Data: 2026-02-10
-- Descrição: Tabela de logs otimizada + campo embedding_status
-- ==============================================================================

-- 1. Tabela de logs de geração (otimizada)
CREATE TABLE IF NOT EXISTS question_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  node_id uuid REFERENCES study_nodes(id),
  
  -- Vector Search (otimizado)
  vector_query text,
  top1_distance float,
  top3_distances float[],
  vector_matches_count int,
  vector_hit_rate float,
  
  -- Generation
  ai_generated_count int DEFAULT 0,
  validation_passed int DEFAULT 0,
  validation_failed int DEFAULT 0,
  
  -- Timing
  vector_search_ms int,
  ai_generation_ms int,
  total_ms int
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_gen_logs_node ON question_generation_logs(node_id);
CREATE INDEX IF NOT EXISTS idx_gen_logs_date ON question_generation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gen_logs_hit_rate ON question_generation_logs(vector_hit_rate);

-- 2. Campo embedding_status em question_bank
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS embedding_status text 
CHECK (embedding_status IN ('pending', 'completed', 'failed'))
DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_embedding_status ON question_bank(embedding_status)
WHERE embedding_status != 'completed';

-- 3. Comentários
COMMENT ON TABLE question_generation_logs IS 'Logs de geração de questões para análise de qualidade e performance';
COMMENT ON COLUMN question_generation_logs.top1_distance IS 'Distância do match mais próximo (menor = melhor)';
COMMENT ON COLUMN question_generation_logs.vector_hit_rate IS 'Taxa de reuso do banco (0-1)';
COMMENT ON COLUMN question_bank.embedding_status IS 'Status da vetorização: pending, completed, failed';
