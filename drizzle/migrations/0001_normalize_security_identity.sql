CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
    AND (
      COALESCE(auth.role(), '') = 'service_role'
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
      COALESCE(auth.role(), '') = 'service_role'
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