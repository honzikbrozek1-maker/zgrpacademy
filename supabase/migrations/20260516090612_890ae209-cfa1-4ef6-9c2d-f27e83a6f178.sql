ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS in_level_test boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_level_test(p_level_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_q record;
  v_correct text;
  v_opts text[];
  v_shuffled text[];
  v_result jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  FOR v_q IN
    SELECT id, type, question_text, option_1, option_2, option_3, option_4,
           correct_answer, back_text, wrong_option_1, wrong_option_2, wrong_option_3,
           order_index
      FROM questions
     WHERE level_id = p_level_id
       AND COALESCE(in_level_test, true) = true
     ORDER BY order_index, created_at
  LOOP
    v_correct := NULL;
    v_opts := NULL;

    IF v_q.type IN ('quiz', 'fill_blank') THEN
      IF v_q.correct_answer IS NULL THEN CONTINUE; END IF;
      v_opts := ARRAY[v_q.option_1, v_q.option_2, v_q.option_3, v_q.option_4];
      v_correct := v_opts[v_q.correct_answer];
      IF v_correct IS NULL THEN CONTINUE; END IF;
      v_opts := ARRAY(SELECT x FROM unnest(v_opts) AS x WHERE x IS NOT NULL);
      IF array_length(v_opts, 1) < 2 THEN CONTINUE; END IF;
    ELSIF v_q.type = 'flashcard' THEN
      IF v_q.back_text IS NULL OR v_q.wrong_option_1 IS NULL
         OR v_q.wrong_option_2 IS NULL OR v_q.wrong_option_3 IS NULL THEN
        CONTINUE;
      END IF;
      v_correct := v_q.back_text;
      v_opts := ARRAY[v_q.back_text, v_q.wrong_option_1, v_q.wrong_option_2, v_q.wrong_option_3];
    ELSE
      CONTINUE;
    END IF;

    SELECT array_agg(x ORDER BY random()) INTO v_shuffled FROM unnest(v_opts) AS x;

    v_result := v_result || jsonb_build_object(
      'id', v_q.id,
      'type', v_q.type,
      'question_text', v_q.question_text,
      'options', to_jsonb(v_shuffled)
    );
  END LOOP;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_level_v2(p_level_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_passing integer;
  v_category text;
  v_total integer := 0;
  v_correct integer := 0;
  v_score integer;
  v_passed boolean;
  v_already_passed boolean;
  v_answers_map jsonb := '{}'::jsonb;
  v_item jsonb;
  v_q record;
  v_user_ans text;
  v_correct_text text;
  v_per_question jsonb := '[]'::jsonb;
  v_is_correct boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  SELECT passing_score, category INTO v_passing, v_category
    FROM levels WHERE id = p_level_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Level not found';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_answers_map := v_answers_map || jsonb_build_object(
      v_item->>'question_id',
      v_item->>'answer_text'
    );
  END LOOP;

  FOR v_q IN
    SELECT id, type, option_1, option_2, option_3, option_4,
           correct_answer, back_text, wrong_option_1, wrong_option_2, wrong_option_3
      FROM questions
     WHERE level_id = p_level_id
       AND COALESCE(in_level_test, true) = true
  LOOP
    v_correct_text := NULL;
    IF v_q.type IN ('quiz', 'fill_blank') THEN
      IF v_q.correct_answer IS NULL THEN CONTINUE; END IF;
      v_correct_text := (ARRAY[v_q.option_1, v_q.option_2, v_q.option_3, v_q.option_4])[v_q.correct_answer];
      IF v_correct_text IS NULL THEN CONTINUE; END IF;
    ELSIF v_q.type = 'flashcard' THEN
      IF v_q.back_text IS NULL OR v_q.wrong_option_1 IS NULL
         OR v_q.wrong_option_2 IS NULL OR v_q.wrong_option_3 IS NULL THEN
        CONTINUE;
      END IF;
      v_correct_text := v_q.back_text;
    ELSE
      CONTINUE;
    END IF;

    v_total := v_total + 1;
    v_user_ans := v_answers_map->>v_q.id::text;
    v_is_correct := v_user_ans IS NOT NULL AND v_user_ans = v_correct_text;
    IF v_is_correct THEN
      v_correct := v_correct + 1;
    END IF;
    v_per_question := v_per_question || jsonb_build_object(
      'question_id', v_q.id,
      'correct', v_is_correct
    );
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Level has no testable questions';
  END IF;

  v_score := round((v_correct::numeric / v_total) * 100);
  v_passed := v_score >= v_passing;

  SELECT completed INTO v_already_passed
    FROM user_progress
   WHERE user_id = auth.uid() AND level_id = p_level_id;
  v_already_passed := COALESCE(v_already_passed, false);

  INSERT INTO user_progress (user_id, level_id, completed, test_score, completed_at)
  VALUES (auth.uid(), p_level_id, v_passed, v_score,
          CASE WHEN v_passed THEN now() ELSE NULL END)
  ON CONFLICT (user_id, level_id) DO UPDATE SET
    completed = CASE WHEN user_progress.completed THEN true ELSE v_passed END,
    test_score = GREATEST(user_progress.test_score, v_score),
    completed_at = CASE
      WHEN user_progress.completed_at IS NOT NULL THEN user_progress.completed_at
      WHEN v_passed THEN now()
      ELSE NULL
    END;

  IF v_passed AND NOT v_already_passed THEN
    UPDATE section_profiles SET
      total_points = total_points + 50,
      current_level = current_level + 1
    WHERE user_id = auth.uid() AND category = v_category;
  END IF;

  RETURN jsonb_build_object(
    'passed', v_passed,
    'score', v_score,
    'total', v_total,
    'correct_count', v_correct,
    'per_question', v_per_question
  );
END;
$function$;