
-- 1. Section profiles table for per-category stats
CREATE TABLE public.section_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'products',
  total_points integer NOT NULL DEFAULT 0,
  current_level integer NOT NULL DEFAULT 1,
  color_scheme text NOT NULL DEFAULT 'teal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

ALTER TABLE public.section_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own section profiles"
ON public.section_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own section profiles"
ON public.section_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own section profiles"
ON public.section_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND total_points = (SELECT total_points FROM section_profiles sp WHERE sp.user_id = auth.uid() AND sp.category = section_profiles.category) AND current_level = (SELECT current_level FROM section_profiles sp WHERE sp.user_id = auth.uid() AND sp.category = section_profiles.category));

CREATE POLICY "Admins can view all section profiles"
ON public.section_profiles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_section_profiles_updated_at
BEFORE UPDATE ON public.section_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add completed_modules to user_progress
ALTER TABLE public.user_progress ADD COLUMN completed_modules jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. Migrate existing data from profiles to section_profiles
INSERT INTO public.section_profiles (user_id, category, total_points, current_level, color_scheme)
SELECT user_id, 'products', total_points, current_level, color_scheme FROM public.profiles
ON CONFLICT DO NOTHING;

INSERT INTO public.section_profiles (user_id, category, total_points, current_level, color_scheme)
SELECT user_id, 'backoffice', 0, 1, color_scheme FROM public.profiles
ON CONFLICT DO NOTHING;

-- 4. Update handle_new_user to create section profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  INSERT INTO public.section_profiles (user_id, category) VALUES (NEW.id, 'products');
  INSERT INTO public.section_profiles (user_id, category) VALUES (NEW.id, 'backoffice');
  
  RETURN NEW;
END;
$$;

-- 5. Update award_points to work per-category
CREATE OR REPLACE FUNCTION public.award_points(points integer, p_category text DEFAULT 'products')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_pts integer;
  new_pts integer;
BEGIN
  IF points <= 0 OR points > 100 THEN
    RAISE EXCEPTION 'Invalid points value';
  END IF;

  SELECT total_points INTO old_pts FROM section_profiles WHERE user_id = auth.uid() AND category = p_category;
  
  IF old_pts IS NULL THEN
    INSERT INTO section_profiles (user_id, category, total_points) VALUES (auth.uid(), p_category, points);
    RETURN json_build_object('old_points', 0, 'new_points', points);
  END IF;
  
  new_pts := old_pts + points;
  UPDATE section_profiles SET total_points = new_pts WHERE user_id = auth.uid() AND category = p_category;
  
  RETURN json_build_object('old_points', old_pts, 'new_points', new_pts);
END;
$$;

-- 6. Update complete_level to work per-category
CREATE OR REPLACE FUNCTION public.complete_level(p_level_id uuid, p_score integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_passing_score integer;
  v_passed boolean;
  v_category text;
  v_sp record;
BEGIN
  SELECT passing_score, category INTO v_passing_score, v_category FROM levels WHERE id = p_level_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Level not found';
  END IF;
  
  v_passed := p_score >= v_passing_score;
  
  INSERT INTO user_progress (user_id, level_id, completed, test_score, completed_at)
  VALUES (auth.uid(), p_level_id, v_passed, p_score, CASE WHEN v_passed THEN now() ELSE NULL END)
  ON CONFLICT (user_id, level_id) DO UPDATE SET
    completed = CASE WHEN user_progress.completed THEN true ELSE v_passed END,
    test_score = GREATEST(user_progress.test_score, p_score),
    completed_at = CASE WHEN user_progress.completed_at IS NOT NULL THEN user_progress.completed_at WHEN v_passed THEN now() ELSE NULL END;
  
  IF v_passed THEN
    SELECT total_points, current_level INTO v_sp FROM section_profiles WHERE user_id = auth.uid() AND category = v_category;
    IF v_sp IS NOT NULL THEN
      UPDATE section_profiles SET
        total_points = v_sp.total_points + 50,
        current_level = v_sp.current_level + 1
      WHERE user_id = auth.uid() AND category = v_category;
    END IF;
  END IF;
  
  RETURN json_build_object('passed', v_passed, 'score', p_score);
END;
$$;

-- 7. Update invite_links SELECT policy: only creator sees own, admins see only own too
DROP POLICY IF EXISTS "Users can view invite links by code lookup" ON public.invite_links;
CREATE POLICY "Users can view own invite links"
ON public.invite_links FOR SELECT TO authenticated
USING (created_by = auth.uid());
