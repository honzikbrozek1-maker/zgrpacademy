-- 1. RPC to award points (used by quiz/fill-in-blank modules)
CREATE OR REPLACE FUNCTION public.award_points(points integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_pts integer;
  new_pts integer;
BEGIN
  IF points <= 0 OR points > 100 THEN
    RAISE EXCEPTION 'Invalid points value';
  END IF;

  SELECT total_points INTO old_pts FROM profiles WHERE user_id = auth.uid();
  new_pts := old_pts + points;
  
  UPDATE profiles SET total_points = new_pts WHERE user_id = auth.uid();
  
  RETURN json_build_object('old_points', old_pts, 'new_points', new_pts);
END;
$$;

-- 2. RPC to complete a level (awards bonus points + advances level)
CREATE OR REPLACE FUNCTION public.complete_level(p_level_id uuid, p_score integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_passing_score integer;
  v_passed boolean;
  v_profile record;
BEGIN
  -- Get passing score for this level
  SELECT passing_score INTO v_passing_score FROM levels WHERE id = p_level_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Level not found';
  END IF;
  
  v_passed := p_score >= v_passing_score;
  
  -- Upsert user progress
  INSERT INTO user_progress (user_id, level_id, completed, test_score, completed_at)
  VALUES (auth.uid(), p_level_id, v_passed, p_score, CASE WHEN v_passed THEN now() ELSE NULL END)
  ON CONFLICT (user_id, level_id) DO UPDATE SET
    completed = v_passed,
    test_score = p_score,
    completed_at = CASE WHEN v_passed THEN now() ELSE NULL END;
  
  -- If passed, award points and advance level
  IF v_passed THEN
    SELECT total_points, current_level INTO v_profile FROM profiles WHERE user_id = auth.uid();
    UPDATE profiles SET
      total_points = v_profile.total_points + 50,
      current_level = v_profile.current_level + 1
    WHERE user_id = auth.uid();
  END IF;
  
  RETURN json_build_object('passed', v_passed, 'score', p_score);
END;
$$;

-- 3. RPC to approve/reject admin requests server-side
CREATE OR REPLACE FUNCTION public.handle_admin_request(p_request_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request record;
BEGIN
  -- Must be an admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get the request, must be targeted to this admin
  SELECT * INTO v_request FROM admin_requests
  WHERE id = p_request_id AND target_admin_id = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not targeted to you';
  END IF;

  -- Cannot approve own request
  IF v_request.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot approve own request';
  END IF;

  -- Update the request
  UPDATE admin_requests SET
    status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    reviewed_by = auth.uid(),
    updated_at = now()
  WHERE id = p_request_id;

  -- If approved, grant admin role
  IF p_approve THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_request.user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- 4. Restrict profiles UPDATE policy to safe columns only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND total_points = (SELECT total_points FROM profiles WHERE user_id = auth.uid())
  AND current_level = (SELECT current_level FROM profiles WHERE user_id = auth.uid())
);

-- 5. Remove the unsafe invite UPDATE policy (accept_invite RPC handles this)
DROP POLICY IF EXISTS "Users can accept invites" ON public.invite_links;