REVOKE ALL ON FUNCTION public.normalize_test_answer(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_test_answer(text) TO service_role;