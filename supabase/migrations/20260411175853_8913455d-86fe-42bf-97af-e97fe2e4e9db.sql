
-- 1. Create a secure view without correct_answer
CREATE OR REPLACE VIEW public.questions_safe AS
  SELECT id, level_id, type, question_text, option_1, option_2, option_3, option_4, back_text, order_index, created_at
  FROM public.questions;

-- Grant access on the view
GRANT SELECT ON public.questions_safe TO authenticated;

-- 2. Drop the open SELECT policy on questions
DROP POLICY IF EXISTS "Everyone can view questions" ON public.questions;

-- 3. Create a new policy: only admins can SELECT directly from questions table
CREATE POLICY "Only admins can select questions directly"
  ON public.questions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Create RPC to check a single quiz answer
CREATE OR REPLACE FUNCTION public.check_quiz_answer(p_question_id uuid, p_answer integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correct_answer integer;
  v_is_correct boolean;
BEGIN
  SELECT correct_answer INTO v_correct_answer FROM questions WHERE id = p_question_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not found';
  END IF;
  
  v_is_correct := (p_answer = v_correct_answer);
  
  RETURN json_build_object('correct', v_is_correct, 'correct_answer', v_correct_answer);
END;
$$;

-- 5. Create RPC to batch-validate test answers
CREATE OR REPLACE FUNCTION public.submit_quiz_test(p_question_answers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_question_id uuid;
  v_answer integer;
  v_correct_answer integer;
  v_results jsonb := '[]'::jsonb;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_question_answers)
  LOOP
    v_question_id := (v_item->>'question_id')::uuid;
    v_answer := (v_item->>'answer')::integer;
    
    SELECT correct_answer INTO v_correct_answer FROM questions WHERE id = v_question_id;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    v_results := v_results || jsonb_build_object(
      'question_id', v_question_id,
      'answer', v_answer,
      'correct_answer', v_correct_answer,
      'correct', v_answer = v_correct_answer
    );
  END LOOP;
  
  RETURN v_results;
END;
$$;

-- 6. Harden has_role: revoke from public, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 7. Restrict check_quiz_answer and submit_quiz_test to authenticated
REVOKE EXECUTE ON FUNCTION public.check_quiz_answer(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.check_quiz_answer(uuid, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_quiz_test(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_quiz_test(jsonb) TO authenticated;
