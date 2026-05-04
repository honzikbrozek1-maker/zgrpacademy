
-- Idempotency table for per-question point awards
CREATE TABLE IF NOT EXISTS public.awarded_question_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question_id uuid NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id, category)
);

ALTER TABLE public.awarded_question_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own awarded points"
ON public.awarded_question_points FOR SELECT
USING (auth.uid() = user_id);

-- Drop abusable functions
DROP FUNCTION IF EXISTS public.award_points(integer, text);
DROP FUNCTION IF EXISTS public.award_points(integer);
DROP FUNCTION IF EXISTS public.complete_level(uuid, integer);

-- New idempotent per-question award (server-controlled value)
CREATE OR REPLACE FUNCTION public.award_points_for_question(
  p_question_id uuid,
  p_category text DEFAULT 'products'
)
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

-- Server-side scored complete_level with one-time bonus guard
CREATE OR REPLACE FUNCTION public.complete_level(
  p_level_id uuid,
  p_question_answers jsonb
)
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
  v_item jsonb;
  v_qid uuid;
  v_ans integer;
  v_correct_ans integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT passing_score, category INTO v_passing, v_category
    FROM levels WHERE id = p_level_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Level not found';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_question_answers) LOOP
    v_qid := (v_item->>'question_id')::uuid;
    v_ans := (v_item->>'answer')::integer;
    SELECT correct_answer INTO v_correct_ans
      FROM questions WHERE id = v_qid AND level_id = p_level_id;
    IF FOUND THEN
      v_total := v_total + 1;
      IF v_ans = v_correct_ans THEN
        v_correct := v_correct + 1;
      END IF;
    END IF;
  END LOOP;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'No valid questions provided';
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
