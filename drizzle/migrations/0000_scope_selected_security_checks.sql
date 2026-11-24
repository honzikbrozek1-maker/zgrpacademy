CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
    AND (
      auth.role() = 'service_role'
      OR (
        auth.uid() IS NOT NULL
        AND (
          _user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles caller_role
            WHERE caller_role.user_id = auth.uid()
              AND caller_role.role = 'admin'
          )
        )
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles target_role
      WHERE target_role.user_id = _user_id AND target_role.role = _role
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_paid(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
    AND (
      auth.role() = 'service_role'
      OR (
        auth.uid() IS NOT NULL
        AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = _user_id AND has_paid = true
    );
$function$;

CREATE OR REPLACE FUNCTION public.is_level_unlocked(_user_id uuid, _level_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_group uuid;
BEGIN
  IF _user_id IS NULL OR NOT COALESCE(
    auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    ), false
  ) THEN
    RETURN false;
  END IF;

  SELECT group_id INTO v_group FROM public.levels WHERE id = _level_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_group IS NULL THEN
    RETURN true;
  END IF;
  RETURN public.is_group_unlocked(_user_id, v_group);
END;
$function$;

-- This policy previously called has_role for another account. Use the
-- existing authenticated administrator directory to preserve target selection.
ALTER POLICY "Users can insert own requests" ON public.admin_requests
WITH CHECK (
  auth.uid() = user_id
  AND target_admin_id IS NOT NULL
  AND target_admin_id IN (SELECT a.user_id FROM public.list_admins() a)
  AND NOT EXISTS (
    SELECT 1 FROM public.admin_requests ar
    WHERE ar.user_id = auth.uid() AND ar.status = 'pending'
  )
);

CREATE OR REPLACE FUNCTION public.check_quiz_answer(p_question_id uuid, p_answer integer)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_correct_answer integer;
  v_is_correct boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_is_admin := public.has_role(v_uid, 'admin');
  IF NOT (public.is_paid(v_uid) OR v_is_admin) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  SELECT q.correct_answer INTO v_correct_answer
  FROM public.questions q
  WHERE q.id = p_question_id
    AND (
      v_is_admin OR (
        q.level_id IS NOT NULL
        AND COALESCE(q.in_practice, true)
        AND public.is_level_unlocked(v_uid, q.level_id)
      )
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not available';
  END IF;

  v_is_correct := (p_answer = v_correct_answer);
  IF v_is_correct THEN
    RETURN json_build_object('correct', true);
  ELSE
    RETURN json_build_object('correct', false, 'correct_answer', v_correct_answer);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_points_for_question(
  p_question_id uuid, p_answer integer, p_category text DEFAULT 'products'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_correct integer;
  v_inserted_count integer;
  v_old integer;
  v_new integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_is_admin := public.has_role(v_uid, 'admin');
  IF NOT (public.is_paid(v_uid) OR v_is_admin) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  SELECT q.correct_answer INTO v_correct
  FROM public.questions q
  WHERE q.id = p_question_id
    AND (
      v_is_admin OR (
        q.level_id IS NOT NULL
        AND COALESCE(q.in_practice, true)
        AND public.is_level_unlocked(v_uid, q.level_id)
      )
    );
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question not available';
  END IF;

  IF p_answer IS NULL OR v_correct IS NULL OR p_answer <> v_correct THEN
    SELECT total_points INTO v_old FROM public.section_profiles
    WHERE user_id = v_uid AND category = p_category;
    RETURN json_build_object(
      'correct', false,
      'correct_answer', v_correct,
      'old_points', COALESCE(v_old, 0),
      'new_points', COALESCE(v_old, 0)
    );
  END IF;

  INSERT INTO public.awarded_question_points (user_id, question_id, category)
  VALUES (v_uid, p_question_id, p_category)
  ON CONFLICT (user_id, question_id, category) DO NOTHING;
  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  SELECT total_points INTO v_old FROM public.section_profiles
  WHERE user_id = v_uid AND category = p_category;
  IF v_old IS NULL THEN
    INSERT INTO public.section_profiles (user_id, category, total_points)
    VALUES (v_uid, p_category, 0);
    v_old := 0;
  END IF;

  IF v_inserted_count > 0 THEN
    v_new := v_old + 10;
    UPDATE public.section_profiles SET total_points = v_new
    WHERE user_id = v_uid AND category = p_category;
  ELSE
    v_new := v_old;
  END IF;
  RETURN json_build_object('correct', true, 'old_points', v_old, 'new_points', v_new);
END;
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_paid(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_level_unlocked(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_paid(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_level_unlocked(uuid, uuid) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_quiz_answer(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.award_points_for_question(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_quiz_answer(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_points_for_question(uuid, integer, text) TO authenticated, service_role;