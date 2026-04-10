
-- Fix invite_links: replace open SELECT policy with restricted one
DROP POLICY IF EXISTS "Anyone can view valid invite links by code" ON public.invite_links;

-- Allow authenticated users to SELECT invite_links ONLY when filtering by code
-- This uses a restrictive approach: users can look up a specific code but not enumerate all
CREATE POLICY "Authenticated users can view invite by code"
ON public.invite_links
FOR SELECT
TO authenticated
USING (true);

-- Actually, the above is still too permissive. We need a smarter approach.
-- Drop it and use RLS + application-level filtering isn't enough.
-- Instead, create a secure RPC function for looking up invites by code.
DROP POLICY IF EXISTS "Authenticated users can view invite by code" ON public.invite_links;

-- Only admins and the creator can see invite links
CREATE POLICY "Users can view invite links by code lookup"
ON public.invite_links
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
);

-- Allow any authenticated user to update an invite (to mark it as used) only if it's their own acceptance
-- Keep the existing admin ALL policy for full management
CREATE POLICY "Users can accept invites"
ON public.invite_links
FOR UPDATE
TO authenticated
USING (used_by IS NULL)
WITH CHECK (used_by = auth.uid());

-- Fix user_roles: replace the overly broad ALL policy with explicit per-operation policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a secure RPC for invite code lookup (for non-admin users on the invite page)
CREATE OR REPLACE FUNCTION public.lookup_invite(invite_code text)
RETURNS TABLE(role app_role, used_by uuid, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role, used_by, expires_at
  FROM public.invite_links
  WHERE code = invite_code
  LIMIT 1;
$$;

-- Create a secure RPC for accepting an invite
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_used_by uuid;
  v_expires_at timestamptz;
BEGIN
  -- Look up the invite
  SELECT role, used_by, expires_at INTO v_role, v_used_by, v_expires_at
  FROM public.invite_links
  WHERE code = invite_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_used_by IS NOT NULL THEN
    RAISE EXCEPTION 'Invite already used';
  END IF;

  IF v_expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  -- Mark invite as used
  UPDATE public.invite_links
  SET used_by = auth.uid(), used_at = now()
  WHERE code = invite_code AND used_by IS NULL;

  -- Grant role if admin
  IF v_role = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;
