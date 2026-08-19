-- 1. Columns
ALTER TABLE public.levels
  ADD COLUMN IF NOT EXISTS title_sk text,
  ADD COLUMN IF NOT EXISTS description_sk text;

ALTER TABLE public.level_groups
  ADD COLUMN IF NOT EXISTS title_sk text,
  ADD COLUMN IF NOT EXISTS description_sk text,
  ADD COLUMN IF NOT EXISTS diploma_title_sk text,
  ADD COLUMN IF NOT EXISTS diploma_subtitle_sk text,
  ADD COLUMN IF NOT EXISTS diploma_body_text_sk text,
  ADD COLUMN IF NOT EXISTS diploma_intro_text_sk text,
  ADD COLUMN IF NOT EXISTS diploma_award_title_sk text,
  ADD COLUMN IF NOT EXISTS diploma_note_text_sk text,
  ADD COLUMN IF NOT EXISTS diploma_issuer_sk text;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_text_sk text,
  ADD COLUMN IF NOT EXISTS option_1_sk text,
  ADD COLUMN IF NOT EXISTS option_2_sk text,
  ADD COLUMN IF NOT EXISTS option_3_sk text,
  ADD COLUMN IF NOT EXISTS option_4_sk text,
  ADD COLUMN IF NOT EXISTS back_text_sk text,
  ADD COLUMN IF NOT EXISTS wrong_option_1_sk text,
  ADD COLUMN IF NOT EXISTS wrong_option_2_sk text,
  ADD COLUMN IF NOT EXISTS wrong_option_3_sk text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'cs';

-- helper: pick localized text
CREATE OR REPLACE FUNCTION public.pick_lang(p_cs text, p_sk text, p_lang text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN p_lang = 'sk' THEN COALESCE(NULLIF(btrim(p_sk), ''), p_cs) ELSE p_cs END;
$$;

-- 2. get_practice_questions with language
DROP FUNCTION IF EXISTS public.get_practice_questions(uuid[]);
CREATE OR REPLACE FUNCTION public.get_practice_questions(p_level_ids uuid[], p_lang text DEFAULT 'cs')
RETURNS TABLE(id uuid, level_id uuid, group_id uuid, type text, question_text text, option_1 text, option_2 text, option_3 text, option_4 text, back_text text, wrong_option_1 text, wrong_option_2 text, wrong_option_3 text, order_index integer, in_level_test boolean, in_practice boolean, created_at timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  RETURN QUERY
  SELECT q.id, q.level_id, q.group_id, q.type,
         public.pick_lang(q.question_text, q.question_text_sk, p_lang),
         public.pick_lang(q.option_1, q.option_1_sk, p_lang),
         public.pick_lang(q.option_2, q.option_2_sk, p_lang),
         public.pick_lang(q.option_3, q.option_3_sk, p_lang),
         public.pick_lang(q.option_4, q.option_4_sk, p_lang),
         public.pick_lang(q.back_text, q.back_text_sk, p_lang),
         public.pick_lang(q.wrong_option_1, q.wrong_option_1_sk, p_lang),
         public.pick_lang(q.wrong_option_2, q.wrong_option_2_sk, p_lang),
         public.pick_lang(q.wrong_option_3, q.wrong_option_3_sk, p_lang),
         q.order_index, q.in_level_test, q.in_practice, q.created_at
  FROM public.questions q
  WHERE q.level_id = ANY(p_level_ids)
    AND COALESCE(q.in_practice, true) = true
  ORDER BY q.order_index, q.created_at;
END;
$function$;

-- 3. get_level_test with language
DROP FUNCTION IF EXISTS public.get_level_test(uuid);
CREATE OR REPLACE FUNCTION public.get_level_test(p_level_id uuid, p_lang text DEFAULT 'cs')
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
           public.pick_lang(wrong_option_3, wrong_option_3_sk, p_lang) AS wrong_option_3,
           order_index
      FROM questions
     WHERE level_id = p_level_id
       AND COALESCE(in_practice, true) = false
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

-- 4. get_group_test with language
DROP FUNCTION IF EXISTS public.get_group_test(uuid);
CREATE OR REPLACE FUNCTION public.get_group_test(p_group_id uuid, p_lang text DEFAULT 'cs')
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_q record;
  v_opts text[];
  v_shuffled text[];
  v_correct text;
  v_result jsonb := '[]'::jsonb;
  v_all_levels_passed boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  IF NOT public.is_group_unlocked(auth.uid(), p_group_id) THEN
    RAISE EXCEPTION 'Group locked';
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM public.levels l
    WHERE l.group_id = p_group_id
      AND NOT EXISTS (
        SELECT 1 FROM public.user_progress up
        WHERE up.user_id = auth.uid()
          AND up.level_id = l.id
          AND up.completed = true
      )
  ) INTO v_all_levels_passed;

  IF NOT v_all_levels_passed THEN
    RAISE EXCEPTION 'Not all level tests passed';
  END IF;

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
           public.pick_lang(wrong_option_3, wrong_option_3_sk, p_lang) AS wrong_option_3,
           order_index
      FROM public.questions
     WHERE group_id = p_group_id
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

-- 5. complete_level_v2 with language
DROP FUNCTION IF EXISTS public.complete_level_v2(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.complete_level_v2(p_level_id uuid, p_answers jsonb, p_lang text DEFAULT 'cs')
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
    SELECT id, type,
           public.pick_lang(option_1, option_1_sk, p_lang) AS option_1,
           public.pick_lang(option_2, option_2_sk, p_lang) AS option_2,
           public.pick_lang(option_3, option_3_sk, p_lang) AS option_3,
           public.pick_lang(option_4, option_4_sk, p_lang) AS option_4,
           correct_answer,
           public.pick_lang(back_text, back_text_sk, p_lang) AS back_text,
           public.pick_lang(wrong_option_1, wrong_option_1_sk, p_lang) AS wrong_option_1,
           public.pick_lang(wrong_option_2, wrong_option_2_sk, p_lang) AS wrong_option_2,
           public.pick_lang(wrong_option_3, wrong_option_3_sk, p_lang) AS wrong_option_3
      FROM questions
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

-- 6. complete_group_test_v2 with language
DROP FUNCTION IF EXISTS public.complete_group_test_v2(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.complete_group_test_v2(p_group_id uuid, p_answers jsonb, p_lang text DEFAULT 'cs')
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  SELECT final_test_passing_score INTO v_passing FROM public.level_groups WHERE id = p_group_id;
  IF v_passing IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_answers_map := v_answers_map || jsonb_build_object(
      v_item->>'question_id', v_item->>'answer_text'
    );
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
    IF v_is_correct THEN v_correct := v_correct + 1; END IF;
    v_per_question := v_per_question || jsonb_build_object(
      'question_id', v_q.id,
      'question_text', v_q.question_text,
      'correct', v_is_correct,
      'user_answer', v_user_ans,
      'correct_answer', v_correct_text
    );
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Group test has no questions';
  END IF;

  v_score := round((v_correct::numeric / v_total) * 100);
  v_passed := v_score >= v_passing;

  INSERT INTO public.user_group_progress (user_id, group_id, passed, test_score, completed_at)
  VALUES (auth.uid(), p_group_id, v_passed, v_score, CASE WHEN v_passed THEN now() ELSE NULL END)
  ON CONFLICT (user_id, group_id) DO UPDATE SET
    passed = public.user_group_progress.passed OR v_passed,
    test_score = GREATEST(COALESCE(public.user_group_progress.test_score, 0), v_score),
    completed_at = COALESCE(public.user_group_progress.completed_at,
                            CASE WHEN v_passed THEN now() ELSE NULL END),
    updated_at = now();

  RETURN jsonb_build_object(
    'passed', v_passed,
    'score', v_score,
    'total', v_total,
    'correct_count', v_correct,
    'per_question', v_per_question
  );
END;
$function$;

-- 7. list_my_diplomas with language
DROP FUNCTION IF EXISTS public.list_my_diplomas();
CREATE OR REPLACE FUNCTION public.list_my_diplomas(p_lang text DEFAULT 'cs')
RETURNS TABLE(diploma_id uuid, group_id uuid, group_title text, category text, diploma_title text, diploma_subtitle text, diploma_body_text text, diploma_signatory text, diploma_validity_years integer, average_score integer, issued_at timestamp with time zone, diploma_intro_text text, diploma_award_title text, diploma_note_text text, diploma_issuer text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT d.id, g.id,
         public.pick_lang(g.title, g.title_sk, p_lang),
         g.category,
         public.pick_lang(g.diploma_title, g.diploma_title_sk, p_lang),
         public.pick_lang(g.diploma_subtitle, g.diploma_subtitle_sk, p_lang),
         public.pick_lang(g.diploma_body_text, g.diploma_body_text_sk, p_lang),
         g.diploma_signatory, g.diploma_validity_years,
         d.average_score, d.issued_at,
         public.pick_lang(g.diploma_intro_text, g.diploma_intro_text_sk, p_lang),
         public.pick_lang(g.diploma_award_title, g.diploma_award_title_sk, p_lang),
         public.pick_lang(g.diploma_note_text, g.diploma_note_text_sk, p_lang),
         public.pick_lang(g.diploma_issuer, g.diploma_issuer_sk, p_lang)
  FROM public.issued_diplomas d
  JOIN public.level_groups g ON g.id = d.group_id
  WHERE d.user_id = auth.uid()
  ORDER BY d.issued_at DESC;
$function$;