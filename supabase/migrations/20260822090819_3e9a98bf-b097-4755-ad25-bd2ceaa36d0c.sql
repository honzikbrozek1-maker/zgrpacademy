CREATE OR REPLACE FUNCTION public.get_practice_questions(p_level_ids uuid[], p_lang text DEFAULT 'cs'::text)
 RETURNS TABLE(id uuid, level_id uuid, group_id uuid, type text, question_text text, option_1 text, option_2 text, option_3 text, option_4 text, back_text text, wrong_option_1 text, wrong_option_2 text, wrong_option_3 text, order_index integer, in_level_test boolean, in_practice boolean, created_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_allowed uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  v_is_admin := public.has_role(auth.uid(), 'admin');
  IF v_is_admin THEN
    v_allowed := COALESCE(p_level_ids, ARRAY[]::uuid[]);
  ELSE
    -- Silently skip locked levels instead of failing the whole request.
    SELECT COALESCE(array_agg(lid), ARRAY[]::uuid[])
    INTO v_allowed
    FROM unnest(COALESCE(p_level_ids, ARRAY[]::uuid[])) AS lid
    WHERE public.is_level_unlocked(auth.uid(), lid);
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
  WHERE q.level_id = ANY(v_allowed)
    AND COALESCE(q.in_practice, true) = true
  ORDER BY q.order_index, q.created_at;
END;
$function$;