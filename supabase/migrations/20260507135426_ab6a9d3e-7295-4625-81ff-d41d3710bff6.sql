CREATE OR REPLACE FUNCTION public.complete_level(p_level_id uuid, p_question_answers jsonb)
 RETURNS json
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
  v_answers jsonb := '{}'::jsonb;
  v_item jsonb;
  v_q record;
  v_ans integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT passing_score, category INTO v_passing, v_category
    FROM levels WHERE id = p_level_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Level not found';
  END IF;

  -- Build a map of question_id -> answer from submitted answers
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_question_answers) LOOP
    v_answers := v_answers || jsonb_build_object(
      v_item->>'question_id',
      (v_item->>'answer')::integer
    );
  END LOOP;

  -- Iterate over ALL questions of the level (canonical set)
  -- Only count quiz-type questions that have a correct_answer
  FOR v_q IN
    SELECT id, correct_answer
      FROM questions
     WHERE level_id = p_level_id
       AND correct_answer IS NOT NULL
  LOOP
    v_total := v_total + 1;
    v_ans := NULLIF(v_answers->>v_q.id::text, '')::integer;
    IF v_ans IS NOT NULL AND v_ans = v_q.correct_answer THEN
      v_correct := v_correct + 1;
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Level has no questions';
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

  RETURN json_build_object('passed', v_passed, 'score', v_score);
END;
$function$;