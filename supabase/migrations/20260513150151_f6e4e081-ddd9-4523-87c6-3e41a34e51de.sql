
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.review_items WHERE user_id = v_uid;
  DELETE FROM public.user_progress WHERE user_id = v_uid;
  DELETE FROM public.awarded_question_points WHERE user_id = v_uid;
  DELETE FROM public.issued_diplomas WHERE user_id = v_uid;
  DELETE FROM public.admin_requests WHERE user_id = v_uid;
  DELETE FROM public.section_profiles WHERE user_id = v_uid;
  DELETE FROM public.user_roles WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE user_id = v_uid;
END;
$$;
