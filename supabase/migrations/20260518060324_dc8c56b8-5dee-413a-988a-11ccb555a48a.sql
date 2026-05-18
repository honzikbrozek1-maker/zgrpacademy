
ALTER TABLE public.level_groups
  ADD COLUMN IF NOT EXISTS diploma_body_text text NOT NULL DEFAULT 'Tímto certifikujeme, že {user_name} úspěšně absolvoval/a vzdělávací kurz {group_title} v rámci platformy ZGRP Academy.',
  ADD COLUMN IF NOT EXISTS diploma_signatory text NOT NULL DEFAULT 'MUDr. Gabriela Hanslianová',
  ADD COLUMN IF NOT EXISTS diploma_validity_years integer NOT NULL DEFAULT 1;

DROP FUNCTION IF EXISTS public.list_my_diplomas();

CREATE FUNCTION public.list_my_diplomas()
RETURNS TABLE(
  diploma_id uuid,
  group_id uuid,
  group_title text,
  category text,
  diploma_title text,
  diploma_subtitle text,
  diploma_body_text text,
  diploma_signatory text,
  diploma_validity_years integer,
  average_score integer,
  issued_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, g.id, g.title, g.category, g.diploma_title, g.diploma_subtitle,
         g.diploma_body_text, g.diploma_signatory, g.diploma_validity_years,
         d.average_score, d.issued_at
  FROM public.issued_diplomas d
  JOIN public.level_groups g ON g.id = d.group_id
  WHERE d.user_id = auth.uid()
  ORDER BY d.issued_at DESC;
$$;
