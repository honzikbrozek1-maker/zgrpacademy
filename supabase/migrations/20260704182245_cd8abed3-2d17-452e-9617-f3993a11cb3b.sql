CREATE OR REPLACE FUNCTION public.check_quiz_answer(p_question_id uuid, p_answer integer)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF v_is_correct THEN
    RETURN json_build_object('correct', true);
  ELSE
    RETURN json_build_object('correct', false, 'correct_answer', v_correct_answer);
  END IF;
END;
$function$;