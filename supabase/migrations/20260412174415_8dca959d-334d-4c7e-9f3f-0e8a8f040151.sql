
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_used_by uuid;
  v_expires_at timestamptz;
  v_rows_updated integer;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT role, used_by, expires_at INTO v_role, v_used_by, v_expires_at
  FROM public.invite_links
  WHERE code = invite_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_used_by IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  IF v_expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  -- Atomically mark invite as used
  UPDATE public.invite_links
  SET used_by = auth.uid(), used_at = now()
  WHERE code = invite_code AND used_by IS NULL;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  -- Grant role if admin
  IF v_role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$function$;
