DROP VIEW IF EXISTS public.questions_safe;

CREATE VIEW public.questions_safe
WITH (security_invoker = off) AS
SELECT q.id, q.level_id, q.group_id, q.type, q.question_text,
       q.option_1, q.option_2, q.option_3, q.option_4, q.back_text,
       q.wrong_option_1, q.wrong_option_2, q.wrong_option_3,
       q.order_index, q.in_level_test, q.in_practice, q.created_at
FROM public.questions q
WHERE public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role);

REVOKE ALL ON public.questions_safe FROM anon;
GRANT SELECT ON public.questions_safe TO authenticated;
GRANT ALL ON public.questions_safe TO service_role;