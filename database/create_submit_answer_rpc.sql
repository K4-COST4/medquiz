CREATE OR REPLACE FUNCTION submit_kahoot_answer(
  p_player_id UUID,
  p_room_id UUID,
  p_answer_key TEXT, -- 'a', 'b', 'c', 'd'
  p_time_remaining INT DEFAULT 30 -- Opcional: Para cálculo de pontos
) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room RECORD;
  v_player RECORD;
  v_question JSONB;
  v_options JSONB;
  v_is_correct BOOLEAN := FALSE;
  v_points_earned INT := 0;
  v_new_score INT;
  v_new_streak INT;
  v_option_idx INT;
BEGIN
  -- 1. Buscar Sala
  SELECT * INTO v_room FROM kahoot_rooms WHERE id = p_room_id;
  
  IF v_room.status <> 'active' THEN
    RETURN jsonb_build_object('error', 'A questão não está ativa.');
  END IF;

  -- 2. Buscar/Extrair a Questão Atual
  -- game_data é um JSONB array. Acessamos pelo index.
  v_question := v_room.game_data -> v_room.current_question_index;
  v_options := v_question -> 'content' -> 'options';

  -- 3. Verificar Correção
  -- Mapear 'a'->0, 'b'->1, 'c'->2, 'd'->3
  CASE p_answer_key
    WHEN 'a' THEN v_option_idx := 0;
    WHEN 'b' THEN v_option_idx := 1;
    WHEN 'c' THEN v_option_idx := 2;
    WHEN 'd' THEN v_option_idx := 3;
    ELSE v_option_idx := -1;
  END CASE;

  IF v_option_idx >= 0 THEN
      -- Verifica se isCorrect ou is_correct é true
      IF (v_options -> v_option_idx ->> 'isCorrect')::BOOLEAN OR (v_options -> v_option_idx ->> 'is_correct')::BOOLEAN THEN
        v_is_correct := TRUE;
      END IF;
  END IF;

  -- 4. Calcular Pontos
  IF v_is_correct THEN
    -- Fórmula simplificada: 1000 pontos base. 
    -- Se quiser algo mais complexo: 1000 * (1 - ((tempo_limite - tempo_restante) / tempo_limite) / 2)
    v_points_earned := 1000; 
  ELSE
    v_points_earned := 0;
  END IF;

  -- 5. Atualizar Jogador
  SELECT * INTO v_player FROM kahoot_players WHERE id = p_player_id;
  
  IF v_is_correct THEN
    v_new_streak := v_player.streak + 1;
  ELSE
    v_new_streak := 0;
  END IF;

  v_new_score := v_player.score + v_points_earned;

  UPDATE kahoot_players 
  SET 
    score = v_new_score,
    streak = v_new_streak,
    last_answer = p_answer_key
  WHERE id = p_player_id;

  -- 6. Retornar Resultado
  RETURN jsonb_build_object(
    'is_correct', v_is_correct,
    'points_earned', v_points_earned,
    'total_score', v_new_score,
    'streak', v_new_streak
  );
END;
$$;
