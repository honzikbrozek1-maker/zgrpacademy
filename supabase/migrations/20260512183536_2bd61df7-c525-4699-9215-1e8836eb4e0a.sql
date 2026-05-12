
-- RPC for users to update completed_modules only (cannot tamper with score/completed)
CREATE OR REPLACE FUNCTION public.set_completed_modules(p_level_id uuid, p_modules jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;
  IF jsonb_typeof(p_modules) <> 'array' THEN
    RAISE EXCEPTION 'p_modules must be a JSON array';
  END IF;

  INSERT INTO public.user_progress (user_id, level_id, completed_modules)
  VALUES (auth.uid(), p_level_id, p_modules)
  ON CONFLICT (user_id, level_id) DO UPDATE SET
    completed_modules = EXCLUDED.completed_modules;
END;
$$;

-- Admin RPC to reset a user's progress
CREATE OR REPLACE FUNCTION public.admin_reset_user_progress(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.user_progress WHERE user_id = p_user_id;
END;
$$;

-- Self-reset RPC (used from Account page)
CREATE OR REPLACE FUNCTION public.reset_my_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  DELETE FROM public.user_progress WHERE user_id = auth.uid();
END;
$$;

-- Remove direct write policies; all writes go through SECURITY DEFINER RPCs which bypass RLS
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
