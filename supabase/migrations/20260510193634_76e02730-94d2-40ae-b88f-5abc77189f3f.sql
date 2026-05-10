
-- 1) is_paid helper (SECURITY DEFINER to read profiles without recursion)
CREATE OR REPLACE FUNCTION public.is_paid(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND has_paid = true
  )
$$;

-- 2) Redefine questions_safe view to require paid (or admin)
CREATE OR REPLACE VIEW public.questions_safe
WITH (security_invoker = false) AS
SELECT id, level_id, type, question_text,
       option_1, option_2, option_3, option_4,
       back_text, order_index, created_at
FROM public.questions
WHERE public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin');

-- 3) Tighten levels SELECT policy: paid or admin only
DROP POLICY IF EXISTS "Everyone can view levels" ON public.levels;
CREATE POLICY "Paid users and admins can view levels"
ON public.levels FOR SELECT TO authenticated
USING (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 4) user_progress: require paid for insert/update; admins exempt
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
CREATE POLICY "Users can insert own progress"
ON public.user_progress FOR INSERT
WITH CHECK (auth.uid() = user_id AND (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress"
ON public.user_progress FOR UPDATE
USING (auth.uid() = user_id AND (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')));

-- 5) review_items: require paid for insert/update/delete
DROP POLICY IF EXISTS "Users can insert own review items" ON public.review_items;
CREATE POLICY "Users can insert own review items"
ON public.review_items FOR INSERT
WITH CHECK (auth.uid() = user_id AND (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "Users can update own review items" ON public.review_items;
CREATE POLICY "Users can update own review items"
ON public.review_items FOR UPDATE
USING (auth.uid() = user_id AND (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')));

-- 6) Add paid check inside scoring RPCs
CREATE OR REPLACE FUNCTION public.check_quiz_answer(p_question_id uuid, p_answer integer)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_answer integer;
  v_is_correct boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  SELECT correct_answer INTO v_correct_answer FROM questions WHERE id = p_question_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found';
  END IF;
  v_is_correct := (p_answer = v_correct_answer);
  RETURN json_build_object('correct', v_is_correct, 'correct_answer', v_correct_answer);
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_quiz_test(p_question_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_question_id uuid;
  v_answer integer;
  v_correct_answer integer;
  v_results jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_question_answers)
  LOOP
    v_question_id := (v_item->>'question_id')::uuid;
    v_answer := (v_item->>'answer')::integer;
    SELECT correct_answer INTO v_correct_answer FROM questions WHERE id = v_question_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    v_results := v_results || jsonb_build_object(
      'question_id', v_question_id,
      'correct', v_answer = v_correct_answer
    );
  END LOOP;
  RETURN v_results;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_points_for_question(p_question_id uuid, p_category text DEFAULT 'products')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct integer;
  v_inserted_count integer;
  v_old integer;
  v_new integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  SELECT correct_answer INTO v_correct FROM questions WHERE id = p_question_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found';
  END IF;

  INSERT INTO awarded_question_points (user_id, question_id, category)
  VALUES (auth.uid(), p_question_id, p_category)
  ON CONFLICT (user_id, question_id, category) DO NOTHING;
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  SELECT total_points INTO v_old FROM section_profiles
   WHERE user_id = auth.uid() AND category = p_category;

  IF v_old IS NULL THEN
    INSERT INTO section_profiles (user_id, category, total_points)
    VALUES (auth.uid(), p_category, 0);
    v_old := 0;
  END IF;

  IF v_inserted_count > 0 THEN
    v_new := v_old + 10;
    UPDATE section_profiles SET total_points = v_new
     WHERE user_id = auth.uid() AND category = p_category;
  ELSE
    v_new := v_old;
  END IF;

  RETURN json_build_object('old_points', v_old, 'new_points', v_new);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_level(p_level_id uuid, p_question_answers jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  SELECT passing_score, category INTO v_passing, v_category
    FROM levels WHERE id = p_level_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Level not found';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_question_answers) LOOP
    v_answers := v_answers || jsonb_build_object(
      v_item->>'question_id',
      (v_item->>'answer')::integer
    );
  END LOOP;

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
$$;
