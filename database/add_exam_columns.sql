-- 1. Metadados de Provas Oficiais (Retrocompatíveis)
ALTER TABLE public.question_bank 
ADD COLUMN IF NOT EXISTS institution text DEFAULT NULL,       -- Ex: 'USP-SP', 'ENARE'
ADD COLUMN IF NOT EXISTS exam_year integer DEFAULT NULL,      -- Ex: 2024
ADD COLUMN IF NOT EXISTS exam_semester integer DEFAULT NULL,  -- Ex: 1 ou 2
ADD COLUMN IF NOT EXISTS is_canceled boolean DEFAULT false,   -- Importante para filtros
ADD COLUMN IF NOT EXISTS original_index integer DEFAULT NULL, -- Ex: 15 (Questão 15 da prova)
ADD COLUMN IF NOT EXISTS exam_source_id uuid DEFAULT NULL;    -- Rastreabilidade

-- 2. Suporte a "Questão Mãe" (Texto Base)
ALTER TABLE public.question_bank 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.question_bank(id) ON DELETE SET NULL;

-- 3. Índices (Performance)
CREATE INDEX IF NOT EXISTS idx_question_bank_exam_filter ON public.question_bank(institution, exam_year, exam_semester);
CREATE INDEX IF NOT EXISTS idx_question_bank_parent ON public.question_bank(parent_id);
