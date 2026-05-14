-- Backfill admin role for users whose admin_request was approved but role wasn't granted
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT ar.user_id, 'admin'::app_role
FROM public.admin_requests ar
WHERE ar.status = 'approved'
ON CONFLICT (user_id, role) DO NOTHING;

-- Trigger to auto-grant admin role when an admin_request is approved
CREATE OR REPLACE FUNCTION public.grant_admin_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_admin_on_approval ON public.admin_requests;
CREATE TRIGGER trg_grant_admin_on_approval
AFTER UPDATE ON public.admin_requests
FOR EACH ROW
EXECUTE FUNCTION public.grant_admin_on_approval();