DROP VIEW IF EXISTS public.questions_safe;

CREATE OR REPLACE FUNCTION public.get_practice_questions(p_level_ids uuid[])
RETURNS TABLE(
  id uuid,
  level_id uuid,
  group_id uuid,
  type text,
  question_text text,
  option_1 text,
  option_2 text,
  option_3 text,
  option_4 text,
  back_text text,
  wrong_option_1 text,
  wrong_option_2 text,
  wrong_option_3 text,
  order_index integer,
  in_level_test boolean,
  in_practice boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  RETURN QUERY
  SELECT q.id, q.level_id, q.group_id, q.type, q.question_text,
         q.option_1, q.option_2, q.option_3, q.option_4, q.back_text,
         q.wrong_option_1, q.wrong_option_2, q.wrong_option_3,
         q.order_index, q.in_level_test, q.in_practice, q.created_at
  FROM public.questions q
  WHERE q.level_id = ANY(p_level_ids)
    AND COALESCE(q.in_practice, true) = true
  ORDER BY q.order_index, q.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_practice_questions(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_practice_questions(uuid[]) TO authenticated, service_role;