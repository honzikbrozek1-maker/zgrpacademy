
-- Recreate view with security_invoker = true
CREATE OR REPLACE VIEW public.questions_safe
WITH (security_invoker = true)
AS
  SELECT id, level_id, type, question_text, option_1, option_2, option_3, option_4, back_text, order_index, created_at
  FROM public.questions;
