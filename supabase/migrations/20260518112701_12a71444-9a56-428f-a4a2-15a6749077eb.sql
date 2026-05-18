-- Add in_practice flag (default true so existing questions stay in practice)
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS in_practice boolean NOT NULL DEFAULT true;

-- Rebuild questions_safe view to include in_practice (still hides correct_answer)
DROP VIEW IF EXISTS public.questions_safe;
CREATE VIEW public.questions_safe
WITH (security_invoker = true)
AS
SELECT id, level_id, group_id, type, question_text,
       option_1, option_2, option_3, option_4,
       back_text, wrong_option_1, wrong_option_2, wrong_option_3,
       order_index, in_level_test, in_practice, created_at
FROM public.questions;

GRANT SELECT ON public.questions_safe TO authenticated;