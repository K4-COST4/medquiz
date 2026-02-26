-- Adicionar coluna para preferência de exibição de distratores
-- Aplica tanto ao acertar quanto ao errar (feedback consistente)

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS show_distractors_expanded BOOLEAN DEFAULT true;

-- Comentário
COMMENT ON COLUMN profiles.show_distractors_expanded IS 
'Se true, a seção "Por que as outras estão erradas?" inicia expandida. Se false, inicia colapsada. Aplica-se tanto ao acertar quanto ao errar.';
