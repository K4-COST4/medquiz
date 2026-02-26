-- ==============================================================================
-- Migration: Add physical_exam_findings column to case_sessions
-- Stores the array of physical exam findings per session (JSONB)
-- so findings persist when the user leaves and returns.
-- ==============================================================================

ALTER TABLE case_sessions
    ADD COLUMN IF NOT EXISTS physical_exam_findings JSONB DEFAULT '[]'::jsonb;
