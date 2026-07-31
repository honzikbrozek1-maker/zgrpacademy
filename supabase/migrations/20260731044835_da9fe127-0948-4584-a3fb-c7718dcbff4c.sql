ALTER TABLE public.level_groups
  ADD COLUMN IF NOT EXISTS diploma_intro_text text NOT NULL DEFAULT 'o absolvování kurzu zakončeného odbornou zkouškou a získání titulu',
  ADD COLUMN IF NOT EXISTS diploma_award_title text NOT NULL DEFAULT 'SPECIALISTA ZDRAVOTNÍHO PROTOKOLU',
  ADD COLUMN IF NOT EXISTS diploma_note_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS diploma_issuer text NOT NULL DEFAULT 'SPOLEK V ROVNOVÁZE Z.S.';

UPDATE public.level_groups
SET diploma_intro_text = 'o absolvování kurzu zakončeného odbornou zkouškou a získání titulu',
    diploma_award_title = 'SPECIALISTA ZDRAVOTNÍHO PROTOKOLU',
    diploma_note_text = '',
    diploma_issuer = 'SPOLEK V ROVNOVÁZE Z.S.'
WHERE diploma_body_text ILIKE '%SPECIALISTA ZDRAVOTNÍHO PROTOKOLU%';

DROP FUNCTION IF EXISTS public.list_my_diplomas();

CREATE OR REPLACE FUNCTION public.list_my_diplomas()
 RETURNS TABLE(diploma_id uuid, group_id uuid, group_title text, category text, diploma_title text, diploma_subtitle text, diploma_body_text text, diploma_signatory text, diploma_validity_years integer, average_score integer, issued_at timestamp with time zone, diploma_intro_text text, diploma_award_title text, diploma_note_text text, diploma_issuer text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.id, g.id, g.title, g.category, g.diploma_title, g.diploma_subtitle,
         g.diploma_body_text, g.diploma_signatory, g.diploma_validity_years,
         d.average_score, d.issued_at,
         g.diploma_intro_text, g.diploma_award_title, g.diploma_note_text, g.diploma_issuer
  FROM public.issued_diplomas d
  JOIN public.level_groups g ON g.id = d.group_id
  WHERE d.user_id = auth.uid()
  ORDER BY d.issued_at DESC;
$function$;