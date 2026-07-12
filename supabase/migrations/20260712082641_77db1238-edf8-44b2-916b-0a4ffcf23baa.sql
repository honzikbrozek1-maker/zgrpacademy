DROP FUNCTION IF EXISTS public.award_points_for_question(uuid, text);

CREATE OR REPLACE FUNCTION public.award_points_for_question(
  p_question_id uuid,
  p_answer integer,
  p_category text DEFAULT 'products'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Only award points when the submitted answer is actually correct
  IF p_answer IS NULL OR v_correct IS NULL OR p_answer <> v_correct THEN
    SELECT total_points INTO v_old FROM section_profiles
     WHERE user_id = auth.uid() AND category = p_category;
    RETURN json_build_object(
      'correct', false,
      'correct_answer', v_correct,
      'old_points', COALESCE(v_old, 0),
      'new_points', COALESCE(v_old, 0)
    );
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

  RETURN json_build_object('correct', true, 'old_points', v_old, 'new_points', v_new);
END;
$function$;