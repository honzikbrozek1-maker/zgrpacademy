
-- 1. check_quiz_answer: only reveal correct_answer when user is WRONG
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

-- 2. list_admins: require auth
CREATE OR REPLACE FUNCTION public.list_admins()
 RETURNS TABLE(user_id uuid, display_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  RETURN QUERY
    SELECT p.user_id, p.display_name
    FROM public.profiles p
    INNER JOIN public.user_roles r ON r.user_id = p.user_id
    WHERE r.role = 'admin'
    ORDER BY p.display_name;
END;
$function$;

-- 3. review_items SELECT: gate on paid/admin
DROP POLICY IF EXISTS "Users can view own review items" ON public.review_items;
CREATE POLICY "Users can view own review items"
ON public.review_items
FOR SELECT
USING (auth.uid() = user_id AND (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role)));

-- 4. invite_links: only admins can SELECT
DROP POLICY IF EXISTS "Users can view own invite links" ON public.invite_links;
