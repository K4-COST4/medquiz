-- Flashcard System Improvements: Media Support + SRS
-- Run this migration to add media support and SRS tables

-- ============================================
-- PART 1: Media Support for Flashcards
-- ============================================

-- Add media_refs column to flashcards table
ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS media_refs TEXT[]; -- Storage paths, NOT URLs

-- Create GIN index for media_refs array queries
CREATE INDEX IF NOT EXISTS idx_flashcards_media 
ON flashcards USING GIN(media_refs);

COMMENT ON COLUMN flashcards.media_refs IS 'Array of storage paths (e.g., ["userId/deckId/abc123.png"]). Use signed URLs for display.';

-- ============================================
-- PART 2: SRS State Table (1 row per user+card)
-- ============================================

CREATE TABLE IF NOT EXISTS flashcard_srs_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  
  -- Estado do Card
  state TEXT NOT NULL DEFAULT 'new', -- new/learning/review/relearning
  
  -- Agendamento (chave do SRS) - TIMESTAMPTZ para timezone-awareness
  due_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Parâmetros SM-2
  ease_factor DECIMAL NOT NULL DEFAULT 2.5, -- mínimo 1.3
  interval_days DECIMAL NOT NULL DEFAULT 1.0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0, -- quantas vezes "Again"
  
  -- Timestamps - TIMESTAMPTZ
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_card UNIQUE (user_id, card_id),
  CONSTRAINT ease_factor_min CHECK (ease_factor >= 1.3),
  CONSTRAINT interval_positive CHECK (interval_days > 0),
  CONSTRAINT valid_state CHECK (state IN ('new', 'learning', 'review', 'relearning'))
);

-- Índices críticos para performance (SEM WHERE NOW() - função volátil)
CREATE INDEX IF NOT EXISTS idx_srs_state_user_due 
  ON flashcard_srs_state(user_id, due_at);

CREATE INDEX IF NOT EXISTS idx_srs_state_user_deck_due 
  ON flashcard_srs_state(user_id, deck_id, due_at);

CREATE INDEX IF NOT EXISTS idx_srs_state_state 
  ON flashcard_srs_state(user_id, state);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_flashcard_srs_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_flashcard_srs_state_updated_at ON flashcard_srs_state;
CREATE TRIGGER trigger_update_flashcard_srs_state_updated_at
  BEFORE UPDATE ON flashcard_srs_state
  FOR EACH ROW
  EXECUTE FUNCTION update_flashcard_srs_state_updated_at();

-- ============================================
-- PART 3: SRS Log Table (múltiplas linhas por card)
-- ============================================

CREATE TABLE IF NOT EXISTS flashcard_srs_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  
  -- Dados da Revisão - TIMESTAMPTZ
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rating TEXT NOT NULL, -- 'again', 'hard', 'good', 'easy'
  quality INTEGER NOT NULL, -- 1, 3, 4, 5 (mapeamento SM-2)
  
  -- Estado ANTES da revisão (para analytics)
  previous_interval_days DECIMAL,
  previous_ease_factor DECIMAL,
  previous_state TEXT,
  
  -- Estado DEPOIS da revisão
  new_interval_days DECIMAL NOT NULL,
  new_ease_factor DECIMAL NOT NULL,
  new_state TEXT NOT NULL,
  
  -- Performance (opcional mas valioso)
  response_time_ms INTEGER, -- tempo para responder
  
  CONSTRAINT valid_rating CHECK (rating IN ('again', 'hard', 'good', 'easy')),
  CONSTRAINT valid_quality CHECK (quality IN (1, 3, 4, 5))
);

-- Índices para analytics
CREATE INDEX IF NOT EXISTS idx_srs_log_user_reviewed 
  ON flashcard_srs_log(user_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_srs_log_card 
  ON flashcard_srs_log(card_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_srs_log_deck 
  ON flashcard_srs_log(deck_id, reviewed_at DESC);

-- ============================================
-- PART 4: RLS Policies
-- ============================================

-- SRS State
ALTER TABLE flashcard_srs_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own SRS state" ON flashcard_srs_state;
CREATE POLICY "Users manage own SRS state"
  ON flashcard_srs_state
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- SRS Log
ALTER TABLE flashcard_srs_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own SRS log" ON flashcard_srs_log;
CREATE POLICY "Users manage own SRS log"
  ON flashcard_srs_log
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- PART 5: Storage Bucket (run via Supabase Dashboard or API)
-- ============================================

-- NOTE: This needs to be created via Supabase Dashboard or API
-- Bucket name: flashcard-media
-- Public: false (private bucket)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

-- Storage policy (to be applied via Dashboard):
-- INSERT: authenticated users only
-- SELECT: authenticated users only (will use signed URLs)
-- UPDATE: owner only
-- DELETE: owner only
