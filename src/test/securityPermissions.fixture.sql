CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.role', true), '');
$$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
CREATE TABLE public.profiles (user_id uuid PRIMARY KEY, display_name text, has_paid boolean);
CREATE TABLE public.level_groups (id uuid PRIMARY KEY, category text, order_index integer);
CREATE TABLE public.levels (id uuid PRIMARY KEY, group_id uuid);
CREATE TABLE public.user_group_progress (user_id uuid, group_id uuid, passed boolean);
CREATE TABLE public.questions (id uuid PRIMARY KEY, level_id uuid, in_practice boolean, correct_answer integer);
CREATE TABLE public.section_profiles (user_id uuid, category text, total_points integer, UNIQUE(user_id, category));
CREATE TABLE public.awarded_question_points (user_id uuid, question_id uuid, category text, UNIQUE(user_id, question_id, category));
CREATE TABLE public.admin_requests (user_id uuid, target_admin_id uuid, status text DEFAULT 'pending');
GRANT SELECT, INSERT ON public.admin_requests TO authenticated;
GRANT SELECT ON public.profiles, public.user_roles, public.levels, public.questions TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own requests" ON public.admin_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own requests" ON public.admin_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Unchanged production helpers, needed by the selected functions.
CREATE FUNCTION public.is_group_unlocked(_user_id uuid, _group_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_cat text; v_order int; v_missing int;
BEGIN
  SELECT category, order_index INTO v_cat, v_order FROM public.level_groups WHERE id = _group_id;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT count(*) INTO v_missing FROM public.level_groups g
  WHERE g.category = v_cat AND g.order_index < v_order
  AND NOT EXISTS (SELECT 1 FROM public.user_group_progress p
    WHERE p.user_id = _user_id AND p.group_id = g.id AND p.passed);
  RETURN v_missing = 0;
END;
$$;
CREATE FUNCTION public.list_admins() RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY SELECT p.user_id, p.display_name FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.user_id WHERE r.role = 'admin';
END;
$$;

INSERT INTO public.profiles VALUES
 ('00000000-0000-0000-0000-000000000001', 'Paid learner', true),
 ('00000000-0000-0000-0000-000000000002', 'Other learner', true),
 ('00000000-0000-0000-0000-000000000003', 'Administrator', false),
 ('00000000-0000-0000-0000-000000000004', 'Unpaid learner', false);
INSERT INTO public.user_roles VALUES
 ('00000000-0000-0000-0000-000000000001', 'user'),
 ('00000000-0000-0000-0000-000000000002', 'user'),
 ('00000000-0000-0000-0000-000000000003', 'admin'),
 ('00000000-0000-0000-0000-000000000004', 'user');
INSERT INTO public.level_groups VALUES
 ('10000000-0000-0000-0000-000000000001', 'products', 1),
 ('10000000-0000-0000-0000-000000000002', 'products', 2);
INSERT INTO public.levels VALUES
 ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
 ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002'),
 ('20000000-0000-0000-0000-000000000003', null);
INSERT INTO public.user_group_progress VALUES
 ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', true);
INSERT INTO public.questions VALUES
 ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', true, 2),
 ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', true, 3),
 ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', false, 4),
 ('30000000-0000-0000-0000-000000000004', null, false, 1);
INSERT INTO public.section_profiles VALUES
 ('00000000-0000-0000-0000-000000000001', 'products', 0);