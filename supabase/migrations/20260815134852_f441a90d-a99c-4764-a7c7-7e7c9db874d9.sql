ALTER TABLE public.admin_requests REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;