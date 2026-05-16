
-- 1. Extend level_groups with final test passing score
ALTER TABLE public.level_groups
  ADD COLUMN IF NOT EXISTS final_test_passing_score integer NOT NULL DEFAULT 70;

-- 2. Allow questions to be attached to a group (final group test) instead of a level
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.level_groups(id) ON DELETE CASCADE;

ALTER TABLE public.questions
  ALTER COLUMN level_id DROP NOT NULL;

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_level_or_group_chk;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_level_or_group_chk
  CHECK ((level_id IS NOT NULL AND group_id IS NULL) OR (level_id IS NULL AND group_id IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_questions_group_id ON public.questions(group_id);

-- 3. Update questions_safe view to include group_id
DROP VIEW IF EXISTS public.questions_safe;
CREATE VIEW public.questions_safe
WITH (security_invoker = true) AS
SELECT
  id, level_id, group_id, type, question_text,
  option_1, option_2, option_3, option_4,
  back_text, wrong_option_1, wrong_option_2, wrong_option_3,
  order_index, created_at
FROM public.questions;

GRANT SELECT ON public.questions_safe TO authenticated;

-- 4. User group progress (final group test results)
CREATE TABLE IF NOT EXISTS public.user_group_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.level_groups(id) ON DELETE CASCADE,
  passed boolean NOT NULL DEFAULT false,
  test_score integer,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_id)
);

ALTER TABLE public.user_group_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own group progress" ON public.user_group_progress;
CREATE POLICY "Users can view own group progress"
ON public.user_group_progress FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all group progress" ON public.user_group_progress;
CREATE POLICY "Admins can view all group progress"
ON public.user_group_progress FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- 5. RPC: is_group_unlocked
CREATE OR REPLACE FUNCTION public.is_group_unlocked(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat text;
  v_order int;
  v_prev_id uuid;
  v_prev_passed boolean;
BEGIN
  SELECT category, order_index INTO v_cat, v_order
    FROM public.level_groups WHERE id = _group_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT id INTO v_prev_id
    FROM public.level_groups
   WHERE category = v_cat AND order_index < v_order
   ORDER BY order_index DESC
   LIMIT 1;

  IF v_prev_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT passed INTO v_prev_passed
    FROM public.user_group_progress
   WHERE user_id = _user_id AND group_id = v_prev_id;

  RETURN COALESCE(v_prev_passed, false);
END;
$$;

-- 6. RPC: get_group_test (returns shuffled options for group's final-test questions)
CREATE OR REPLACE FUNCTION public.get_group_test(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Group must be unlocked
  IF NOT public.is_group_unlocked(auth.uid(), p_group_id) THEN
    RAISE EXCEPTION 'Group locked';
  END IF;

  -- All levels in the group must have passed level test
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
    SELECT id, type, question_text, option_1, option_2, option_3, option_4,
           correct_answer, back_text, wrong_option_1, wrong_option_2, wrong_option_3,
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
$$;

-- 7. RPC: complete_group_test_v2
CREATE OR REPLACE FUNCTION public.complete_group_test_v2(p_group_id uuid, p_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT id, type, option_1, option_2, option_3, option_4,
           correct_answer, back_text, wrong_option_1, wrong_option_2, wrong_option_3
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
      'question_id', v_q.id, 'correct', v_is_correct
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
$$;

-- 8. Update issue_diploma_if_eligible: require passed group test instead of avg score
CREATE OR REPLACE FUNCTION public.issue_diploma_if_eligible(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passed boolean;
  v_score int;
  v_existing uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  SELECT passed, test_score INTO v_passed, v_score
    FROM public.user_group_progress
   WHERE user_id = auth.uid() AND group_id = p_group_id;

  IF NOT COALESCE(v_passed, false) THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'group_test_not_passed');
  END IF;

  SELECT id INTO v_existing FROM public.issued_diplomas
   WHERE user_id = auth.uid() AND group_id = p_group_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('issued', true, 'already', true, 'diploma_id', v_existing, 'average', v_score);
  END IF;

  INSERT INTO public.issued_diplomas (user_id, group_id, average_score)
  VALUES (auth.uid(), p_group_id, v_score)
  RETURNING id INTO v_existing;

  RETURN jsonb_build_object('issued', true, 'already', false, 'diploma_id', v_existing, 'average', v_score);
END;
$$;

-- 9. RLS update on questions_safe access via underlying table: questions still has admin-only SELECT.
-- The view uses security_invoker so paid users need a SELECT policy on questions for non-admins:
DROP POLICY IF EXISTS "Paid users can view questions" ON public.questions;
CREATE POLICY "Paid users can view questions"
ON public.questions FOR SELECT
TO authenticated
USING (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
