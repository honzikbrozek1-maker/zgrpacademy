
-- Revert to security definer (default) - this is intentional
-- The view only exposes safe columns (no correct_answer)
CREATE OR REPLACE VIEW public.questions_safe
WITH (security_invoker = false)
AS
  SELECT id, level_id, type, question_text, option_1, option_2, option_3, option_4, back_text, order_index, created_at
  FROM public.questions;

-- Also need to grant has_role to the service_role for RLS policies to work
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;
