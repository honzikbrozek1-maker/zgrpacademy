-- 1. level_groups
CREATE TABLE public.level_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'products',
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  diploma_title text NOT NULL DEFAULT 'Certifikát o absolvování',
  diploma_subtitle text NOT NULL DEFAULT 'ZGRP Academy',
  min_average_score integer NOT NULL DEFAULT 70,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.level_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paid users and admins can view level groups"
  ON public.level_groups FOR SELECT TO authenticated
  USING (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage level groups"
  ON public.level_groups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_level_groups_updated
  BEFORE UPDATE ON public.level_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. levels.group_id
ALTER TABLE public.levels ADD COLUMN group_id uuid REFERENCES public.level_groups(id) ON DELETE SET NULL;
CREATE INDEX idx_levels_group_id ON public.levels(group_id);

-- 3. issued_diplomas
CREATE TABLE public.issued_diplomas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.level_groups(id) ON DELETE CASCADE,
  average_score integer NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_id)
);

ALTER TABLE public.issued_diplomas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diplomas"
  ON public.issued_diplomas FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all diplomas"
  ON public.issued_diplomas FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. RPC: issue_diploma_if_eligible
CREATE OR REPLACE FUNCTION public.issue_diploma_if_eligible(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_completed integer;
  v_avg integer;
  v_min integer;
  v_existing uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.is_paid(auth.uid()) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Payment required';
  END IF;

  SELECT min_average_score INTO v_min FROM level_groups WHERE id = p_group_id;
  IF v_min IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  SELECT COUNT(*) INTO v_total FROM levels WHERE group_id = p_group_id;
  IF v_total = 0 THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'no_levels');
  END IF;

  SELECT COUNT(*), COALESCE(ROUND(AVG(up.test_score))::int, 0)
    INTO v_completed, v_avg
    FROM user_progress up
    JOIN levels l ON l.id = up.level_id
   WHERE l.group_id = p_group_id
     AND up.user_id = auth.uid()
     AND up.completed = true;

  IF v_completed < v_total THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'incomplete', 'completed', v_completed, 'total', v_total);
  END IF;

  IF v_avg < v_min THEN
    RETURN jsonb_build_object('issued', false, 'reason', 'low_score', 'average', v_avg, 'required', v_min);
  END IF;

  SELECT id INTO v_existing FROM issued_diplomas WHERE user_id = auth.uid() AND group_id = p_group_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('issued', true, 'already', true, 'diploma_id', v_existing, 'average', v_avg);
  END IF;

  INSERT INTO issued_diplomas (user_id, group_id, average_score)
  VALUES (auth.uid(), p_group_id, v_avg)
  RETURNING id INTO v_existing;

  RETURN jsonb_build_object('issued', true, 'already', false, 'diploma_id', v_existing, 'average', v_avg);
END;
$$;

-- 5. RPC: list_my_diplomas
CREATE OR REPLACE FUNCTION public.list_my_diplomas()
RETURNS TABLE (
  diploma_id uuid,
  group_id uuid,
  group_title text,
  category text,
  diploma_title text,
  diploma_subtitle text,
  average_score integer,
  issued_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, g.id, g.title, g.category, g.diploma_title, g.diploma_subtitle, d.average_score, d.issued_at
  FROM issued_diplomas d
  JOIN level_groups g ON g.id = d.group_id
  WHERE d.user_id = auth.uid()
  ORDER BY d.issued_at DESC;
$$;