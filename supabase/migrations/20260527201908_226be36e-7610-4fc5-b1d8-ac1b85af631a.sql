
-- Recycle bin for accidentally deleted admin content (questions, levels, groups, users)
CREATE TABLE public.deleted_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('question','level','level_group','user')),
  entity_id uuid NOT NULL,
  label text,
  payload jsonb NOT NULL,
  deleted_by uuid,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deleted_items TO authenticated;
GRANT ALL ON public.deleted_items TO service_role;

ALTER TABLE public.deleted_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage deleted_items"
ON public.deleted_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_deleted_items_expires ON public.deleted_items (expires_at);
CREATE INDEX idx_deleted_items_type ON public.deleted_items (entity_type, deleted_at DESC);

-- Soft delete a single question (snapshot then remove)
CREATE OR REPLACE FUNCTION public.soft_delete_question(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.questions%ROWTYPE;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_row FROM public.questions WHERE id = p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  INSERT INTO public.deleted_items (entity_type, entity_id, label, payload, deleted_by)
  VALUES ('question', v_row.id, LEFT(v_row.question_text, 120), to_jsonb(v_row), auth.uid())
  RETURNING id INTO v_id;
  DELETE FROM public.questions WHERE id = p_id;
  RETURN v_id;
END $$;

-- Soft delete a level (snapshot level + child questions)
CREATE OR REPLACE FUNCTION public.soft_delete_level(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level public.levels%ROWTYPE;
  v_questions jsonb;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_level FROM public.levels WHERE id = p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO v_questions
    FROM public.questions q WHERE q.level_id = p_id;
  INSERT INTO public.deleted_items (entity_type, entity_id, label, payload, deleted_by)
  VALUES ('level', v_level.id, v_level.title,
          jsonb_build_object('level', to_jsonb(v_level), 'questions', v_questions),
          auth.uid())
  RETURNING id INTO v_id;
  DELETE FROM public.questions WHERE level_id = p_id;
  DELETE FROM public.user_progress WHERE level_id = p_id;
  DELETE FROM public.levels WHERE id = p_id;
  RETURN v_id;
END $$;

-- Soft delete a level group (snapshot group + child levels + their questions + group-level questions)
CREATE OR REPLACE FUNCTION public.soft_delete_group(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group public.level_groups%ROWTYPE;
  v_levels jsonb;
  v_level_questions jsonb;
  v_group_questions jsonb;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_group FROM public.level_groups WHERE id = p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(l)), '[]'::jsonb) INTO v_levels
    FROM public.levels l WHERE l.group_id = p_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO v_level_questions
    FROM public.questions q WHERE q.level_id IN (SELECT id FROM public.levels WHERE group_id = p_id);
  SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO v_group_questions
    FROM public.questions q WHERE q.group_id = p_id;
  INSERT INTO public.deleted_items (entity_type, entity_id, label, payload, deleted_by)
  VALUES ('level_group', v_group.id, v_group.title,
          jsonb_build_object(
            'group', to_jsonb(v_group),
            'levels', v_levels,
            'level_questions', v_level_questions,
            'group_questions', v_group_questions
          ),
          auth.uid())
  RETURNING id INTO v_id;
  DELETE FROM public.questions WHERE group_id = p_id
     OR level_id IN (SELECT id FROM public.levels WHERE group_id = p_id);
  DELETE FROM public.user_progress WHERE level_id IN (SELECT id FROM public.levels WHERE group_id = p_id);
  DELETE FROM public.user_group_progress WHERE group_id = p_id;
  DELETE FROM public.levels WHERE group_id = p_id;
  DELETE FROM public.level_groups WHERE id = p_id;
  RETURN v_id;
END $$;

-- Soft delete a user (snapshot profile + role + section profiles + progress + review items)
CREATE OR REPLACE FUNCTION public.soft_delete_user(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
  v_roles jsonb;
  v_section jsonb;
  v_progress jsonb;
  v_group_progress jsonb;
  v_review jsonb;
  v_label text;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT to_jsonb(p), p.display_name INTO v_profile, v_label
    FROM public.profiles p WHERE p.user_id = p_user_id;
  IF v_profile IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_roles
    FROM public.user_roles r WHERE r.user_id = p_user_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO v_section
    FROM public.section_profiles s WHERE s.user_id = p_user_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(u)), '[]'::jsonb) INTO v_progress
    FROM public.user_progress u WHERE u.user_id = p_user_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(u)), '[]'::jsonb) INTO v_group_progress
    FROM public.user_group_progress u WHERE u.user_id = p_user_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_review
    FROM public.review_items r WHERE r.user_id = p_user_id;
  INSERT INTO public.deleted_items (entity_type, entity_id, label, payload, deleted_by)
  VALUES ('user', p_user_id, v_label,
          jsonb_build_object(
            'profile', v_profile,
            'roles', v_roles,
            'section_profiles', v_section,
            'user_progress', v_progress,
            'user_group_progress', v_group_progress,
            'review_items', v_review
          ),
          auth.uid())
  RETURNING id INTO v_id;
  DELETE FROM public.review_items WHERE user_id = p_user_id;
  DELETE FROM public.user_progress WHERE user_id = p_user_id;
  DELETE FROM public.user_group_progress WHERE user_id = p_user_id;
  DELETE FROM public.section_profiles WHERE user_id = p_user_id;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  DELETE FROM public.profiles WHERE user_id = p_user_id;
  RETURN v_id;
END $$;

-- Restore an item from the recycle bin
CREATE OR REPLACE FUNCTION public.restore_deleted_item(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.deleted_items%ROWTYPE;
  v_q jsonb;
  v_l jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_item FROM public.deleted_items WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  IF v_item.entity_type = 'question' THEN
    INSERT INTO public.questions SELECT * FROM jsonb_populate_record(NULL::public.questions, v_item.payload)
    ON CONFLICT (id) DO NOTHING;

  ELSIF v_item.entity_type = 'level' THEN
    INSERT INTO public.levels SELECT * FROM jsonb_populate_record(NULL::public.levels, v_item.payload->'level')
    ON CONFLICT (id) DO NOTHING;
    FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(v_item.payload->'questions','[]'::jsonb)) LOOP
      INSERT INTO public.questions SELECT * FROM jsonb_populate_record(NULL::public.questions, v_q)
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

  ELSIF v_item.entity_type = 'level_group' THEN
    INSERT INTO public.level_groups SELECT * FROM jsonb_populate_record(NULL::public.level_groups, v_item.payload->'group')
    ON CONFLICT (id) DO NOTHING;
    FOR v_l IN SELECT * FROM jsonb_array_elements(COALESCE(v_item.payload->'levels','[]'::jsonb)) LOOP
      INSERT INTO public.levels SELECT * FROM jsonb_populate_record(NULL::public.levels, v_l)
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
    FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(v_item.payload->'level_questions','[]'::jsonb)) LOOP
      INSERT INTO public.questions SELECT * FROM jsonb_populate_record(NULL::public.questions, v_q)
      ON CONFLICT (id) DO NOTHING;
    END LOOP;
    FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(v_item.payload->'group_questions','[]'::jsonb)) LOOP
      INSERT INTO public.questions SELECT * FROM jsonb_populate_record(NULL::public.questions, v_q)
      ON CONFLICT (id) DO NOTHING;
    END LOOP;

  ELSIF v_item.entity_type = 'user' THEN
    INSERT INTO public.profiles SELECT * FROM jsonb_populate_record(NULL::public.profiles, v_item.payload->'profile')
    ON CONFLICT (user_id) DO NOTHING;
    FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(v_item.payload->'roles','[]'::jsonb)) LOOP
      INSERT INTO public.user_roles SELECT * FROM jsonb_populate_record(NULL::public.user_roles, v_q)
      ON CONFLICT (user_id, role) DO NOTHING;
    END LOOP;
    FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(v_item.payload->'section_profiles','[]'::jsonb)) LOOP
      INSERT INTO public.section_profiles SELECT * FROM jsonb_populate_record(NULL::public.section_profiles, v_q)
      ON CONFLICT DO NOTHING;
    END LOOP;
    FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(v_item.payload->'user_progress','[]'::jsonb)) LOOP
      INSERT INTO public.user_progress SELECT * FROM jsonb_populate_record(NULL::public.user_progress, v_q)
      ON CONFLICT DO NOTHING;
    END LOOP;
    FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(v_item.payload->'user_group_progress','[]'::jsonb)) LOOP
      INSERT INTO public.user_group_progress SELECT * FROM jsonb_populate_record(NULL::public.user_group_progress, v_q)
      ON CONFLICT DO NOTHING;
    END LOOP;
    FOR v_q IN SELECT * FROM jsonb_array_elements(COALESCE(v_item.payload->'review_items','[]'::jsonb)) LOOP
      INSERT INTO public.review_items SELECT * FROM jsonb_populate_record(NULL::public.review_items, v_q)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  DELETE FROM public.deleted_items WHERE id = p_id;
  RETURN jsonb_build_object('restored', true, 'entity_type', v_item.entity_type);
END $$;

-- Purge expired (older than 7d). Anyone (admin) can call; also auto-purgeable.
CREATE OR REPLACE FUNCTION public.purge_expired_deleted_items()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM public.deleted_items WHERE expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
