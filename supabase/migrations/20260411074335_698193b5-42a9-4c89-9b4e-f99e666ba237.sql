
-- Fix admin_requests INSERT policy: require target_admin_id to be a valid admin, limit 1 pending request
DROP POLICY IF EXISTS "Users can insert own requests" ON public.admin_requests;

CREATE POLICY "Users can insert own requests"
ON public.admin_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND target_admin_id IS NOT NULL
  AND has_role(target_admin_id, 'admin')
  AND NOT EXISTS (
    SELECT 1 FROM admin_requests ar
    WHERE ar.user_id = auth.uid() AND ar.status = 'pending'
  )
);

-- Also tighten the SELECT for admins: only see requests targeted to them specifically (remove NULL fallback)
DROP POLICY IF EXISTS "Admins can view targeted requests" ON public.admin_requests;

CREATE POLICY "Admins can view targeted requests"
ON public.admin_requests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND target_admin_id = auth.uid()
);
