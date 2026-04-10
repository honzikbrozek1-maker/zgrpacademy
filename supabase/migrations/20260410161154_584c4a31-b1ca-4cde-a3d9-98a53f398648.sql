CREATE OR REPLACE FUNCTION public.list_admins()
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name
  FROM public.profiles p
  INNER JOIN public.user_roles r ON r.user_id = p.user_id
  WHERE r.role = 'admin'
  ORDER BY p.display_name;
$$;