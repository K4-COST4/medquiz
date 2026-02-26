-- ==============================================================================
-- MIGRATION: RAG CACHE SYSTEM
-- Date: 2026-01-27
-- Description: Creates a cache table for RAG system to store query results
--              and avoid redundant API calls for similar queries.
-- ==============================================================================

-- 1. Create the RAG Cache Table
CREATE TABLE IF NOT EXISTS rag_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT NOT NULL,
  context TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- 2. Create Unique Index on Query Hash (prevents duplicate caching)
CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_cache_query_hash 
ON rag_cache(query_hash);

-- 3. Create Index on Expiration Date (optimizes cleanup queries)
CREATE INDEX IF NOT EXISTS idx_rag_cache_expires_at 
ON rag_cache(expires_at);

-- 4. Create Cleanup Function (RPC for removing expired entries)
CREATE OR REPLACE FUNCTION cleanup_expired_rag_cache()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rag_cache
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- 5. Add Comment for Documentation
COMMENT ON TABLE rag_cache IS 'Cache table for RAG (Retrieval-Augmented Generation) system. Stores query results with 24h TTL to reduce API calls and improve response time.';
COMMENT ON COLUMN rag_cache.query_hash IS 'SHA-256 hash of normalized query (lowercase + trimmed)';
COMMENT ON COLUMN rag_cache.context IS 'Full RAG context result (internal DB + PubMed)';
COMMENT ON COLUMN rag_cache.expires_at IS 'Expiration timestamp (24h from creation)';
COMMENT ON FUNCTION cleanup_expired_rag_cache IS 'Removes all expired cache entries. Returns number of deleted rows.';
