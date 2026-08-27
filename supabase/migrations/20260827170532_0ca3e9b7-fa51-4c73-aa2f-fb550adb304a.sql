CREATE OR REPLACE FUNCTION public.normalize_test_answer(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_value IS NULL THEN NULL
    ELSE lower(
      regexp_replace(
        translate(
          btrim(p_value),
          chr(160) || chr(8239) || chr(8201) || chr(8211) || chr(8212) || chr(8722),
          '   ---'
        ),
        '[[:space:]]+',
        ' ',
        'g'
      )
    )
  END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_level_v2(p_level_id uuid, p_answers jsonb, p_lang text DEFAULT 'cs'::text)
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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Payment required'; END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.is_level_unlocked(auth.uid(), p_level_id) THEN RAISE EXCEPTION 'Level locked'; END IF;

  SELECT passing_score, category INTO v_passing, v_category FROM public.levels WHERE id = p_level_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Level not found'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_answers_map := v_answers_map || jsonb_build_object(v_item->>'question_id', v_item->>'answer_text');
  END LOOP;

  FOR v_q IN
    SELECT id, type,
           public.pick_lang(question_text, question_text_sk, p_lang) AS question_text,
           public.pick_lang(option_1, option_1_sk, p_lang) AS option_1,
           public.pick_lang(option_2, option_2_sk, p_lang) AS option_2,
           public.pick_lang(option_3, option_3_sk, p_lang) AS option_3,
           public.pick_lang(option_4, option_4_sk, p_lang) AS option_4,
           correct_answer,
           public.pick_lang(back_text, back_text_sk, p_lang) AS back_text,
           public.pick_lang(wrong_option_1, wrong_option_1_sk, p_lang) AS wrong_option_1,
           public.pick_lang(wrong_option_2, wrong_option_2_sk, p_lang) AS wrong_option_2,
           public.pick_lang(wrong_option_3, wrong_option_3_sk, p_lang) AS wrong_option_3
      FROM public.questions
     WHERE level_id = p_level_id
       AND COALESCE(in_practice, true) = false
       AND COALESCE(in_level_test, true) = true
  LOOP
    v_correct_text := NULL;
    IF v_q.type IN ('quiz', 'fill_blank') THEN
      IF v_q.correct_answer IS NULL THEN CONTINUE; END IF;
      v_correct_text := (ARRAY[v_q.option_1, v_q.option_2, v_q.option_3, v_q.option_4])[v_q.correct_answer];
      IF v_correct_text IS NULL THEN CONTINUE; END IF;
    ELSIF v_q.type = 'flashcard' THEN
      IF v_q.back_text IS NULL OR v_q.wrong_option_1 IS NULL OR v_q.wrong_option_2 IS NULL OR v_q.wrong_option_3 IS NULL THEN CONTINUE; END IF;
      v_correct_text := v_q.back_text;
    ELSE
      CONTINUE;
    END IF;

    v_total := v_total + 1;
    v_user_ans := v_answers_map->>v_q.id::text;
    v_is_correct := v_user_ans IS NOT NULL
      AND public.normalize_test_answer(v_user_ans) = public.normalize_test_answer(v_correct_text);
    IF v_is_correct THEN v_correct := v_correct + 1; END IF;
    v_per_question := v_per_question || jsonb_build_object(
      'question_id', v_q.id,
      'question_text', v_q.question_text,
      'correct', v_is_correct,
      'user_answer', v_user_ans,
      'correct_answer', v_correct_text
    );
  END LOOP;

  IF v_total = 0 THEN RAISE EXCEPTION 'Level has no testable questions'; END IF;

  v_score := round((v_correct::numeric / v_total) * 100);
  v_passed := v_score >= v_passing;

  SELECT completed INTO v_already_passed FROM public.user_progress WHERE user_id = auth.uid() AND level_id = p_level_id;
  v_already_passed := COALESCE(v_already_passed, false);

  INSERT INTO public.user_progress (user_id, level_id, completed, test_score, completed_at)
  VALUES (auth.uid(), p_level_id, v_passed, v_score, CASE WHEN v_passed THEN now() ELSE NULL END)
  ON CONFLICT (user_id, level_id) DO UPDATE SET
    completed = CASE WHEN public.user_progress.completed THEN true ELSE v_passed END,
    test_score = GREATEST(public.user_progress.test_score, v_score),
    completed_at = CASE WHEN public.user_progress.completed_at IS NOT NULL THEN public.user_progress.completed_at WHEN v_passed THEN now() ELSE NULL END;

  IF v_passed AND NOT v_already_passed THEN
    UPDATE public.section_profiles SET total_points = total_points + 50, current_level = current_level + 1
    WHERE user_id = auth.uid() AND category = v_category;
  END IF;

  RETURN jsonb_build_object('passed', v_passed, 'score', v_score, 'total', v_total, 'correct_count', v_correct, 'per_question', v_per_question);
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_group_test_v2(p_group_id uuid, p_answers jsonb, p_lang text DEFAULT 'cs'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_passing int;
  v_total int := 0;
  v_correct int := 0;
  v_score int;
  v_passed boolean;
  v_answers_map jsonb := '{}'::jsonb;
  v_item jsonb;
  v_q record;
  v_correct_text text;
  v_user_ans text;
  v_is_correct boolean;
  v_per_question jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Payment required'; END IF;
  IF NOT public.is_group_unlocked(auth.uid(), p_group_id) THEN RAISE EXCEPTION 'Group locked'; END IF;

  SELECT final_test_passing_score INTO v_passing FROM public.level_groups WHERE id = p_group_id;
  IF v_passing IS NULL THEN RAISE EXCEPTION 'Group not found'; END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_answers_map := v_answers_map || jsonb_build_object(v_item->>'question_id', v_item->>'answer_text');
  END LOOP;

  FOR v_q IN
    SELECT id, type,
           public.pick_lang(question_text, question_text_sk, p_lang) AS question_text,
           public.pick_lang(option_1, option_1_sk, p_lang) AS option_1,
           public.pick_lang(option_2, option_2_sk, p_lang) AS option_2,
           public.pick_lang(option_3, option_3_sk, p_lang) AS option_3,
           public.pick_lang(option_4, option_4_sk, p_lang) AS option_4,
           correct_answer,
           public.pick_lang(back_text, back_text_sk, p_lang) AS back_text,
           public.pick_lang(wrong_option_1, wrong_option_1_sk, p_lang) AS wrong_option_1,
           public.pick_lang(wrong_option_2, wrong_option_2_sk, p_lang) AS wrong_option_2,
           public.pick_lang(wrong_option_3, wrong_option_3_sk, p_lang) AS wrong_option_3
      FROM public.questions
     WHERE group_id = p_group_id
  LOOP
    v_correct_text := NULL;
    IF v_q.type IN ('quiz', 'fill_blank') THEN
      IF v_q.correct_answer IS NULL THEN CONTINUE; END IF;
      v_correct_text := (ARRAY[v_q.option_1, v_q.option_2, v_q.option_3, v_q.option_4])[v_q.correct_answer];
      IF v_correct_text IS NULL THEN CONTINUE; END IF;
    ELSIF v_q.type = 'flashcard' THEN
      IF v_q.back_text IS NULL OR v_q.wrong_option_1 IS NULL OR v_q.wrong_option_2 IS NULL OR v_q.wrong_option_3 IS NULL THEN CONTINUE; END IF;
      v_correct_text := v_q.back_text;
    ELSE
      CONTINUE;
    END IF;

    v_total := v_total + 1;
    v_user_ans := v_answers_map->>v_q.id::text;
    v_is_correct := v_user_ans IS NOT NULL
      AND public.normalize_test_answer(v_user_ans) = public.normalize_test_answer(v_correct_text);
    IF v_is_correct THEN v_correct := v_correct + 1; END IF;
    v_per_question := v_per_question || jsonb_build_object(
      'question_id', v_q.id,
      'question_text', v_q.question_text,
      'correct', v_is_correct,
      'user_answer', v_user_ans,
      'correct_answer', v_correct_text
    );
  END LOOP;

  IF v_total = 0 THEN RAISE EXCEPTION 'Group test has no questions'; END IF;

  v_score := round((v_correct::numeric / v_total) * 100);
  v_passed := v_score >= v_passing;

  INSERT INTO public.user_group_progress (user_id, group_id, passed, test_score, completed_at)
  VALUES (auth.uid(), p_group_id, v_passed, v_score, CASE WHEN v_passed THEN now() ELSE NULL END)
  ON CONFLICT (user_id, group_id) DO UPDATE SET
    passed = public.user_group_progress.passed OR v_passed,
    test_score = GREATEST(COALESCE(public.user_group_progress.test_score, 0), v_score),
    completed_at = COALESCE(public.user_group_progress.completed_at, CASE WHEN v_passed THEN now() ELSE NULL END),
    updated_at = now();

  RETURN jsonb_build_object('passed', v_passed, 'score', v_score, 'total', v_total, 'correct_count', v_correct, 'per_question', v_per_question);
END;
$function$;