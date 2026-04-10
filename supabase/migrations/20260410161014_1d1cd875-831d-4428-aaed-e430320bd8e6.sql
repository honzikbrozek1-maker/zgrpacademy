-- Add target_admin_id to admin_requests so requests go to a specific admin
ALTER TABLE public.admin_requests ADD COLUMN target_admin_id uuid;

-- Drop existing admin view policy and replace with targeted one
DROP POLICY IF EXISTS "Admins can view all requests" ON public.admin_requests;

CREATE POLICY "Admins can view targeted requests"
ON public.admin_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND (target_admin_id IS NULL OR target_admin_id = auth.uid())
);

-- Update policy so only the targeted admin can update
DROP POLICY IF EXISTS "Admins can update requests" ON public.admin_requests;

CREATE POLICY "Target admin can update requests"
ON public.admin_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND (target_admin_id IS NULL OR target_admin_id = auth.uid())
);