-- Fix: admin cannot approve their own request, and require target_admin_id
DROP POLICY IF EXISTS "Target admin can update requests" ON public.admin_requests;

CREATE POLICY "Target admin can update requests"
ON public.admin_requests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND target_admin_id = auth.uid()
  AND user_id != auth.uid()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND target_admin_id = auth.uid()
  AND user_id != auth.uid()
);