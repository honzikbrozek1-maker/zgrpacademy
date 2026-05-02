CREATE OR REPLACE FUNCTION public.submit_quiz_test(p_question_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'correct', v_answer = v_correct_answer
    );
  END LOOP;

  RETURN v_results;
END;
$function$;