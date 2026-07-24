UPDATE public.level_groups
SET diploma_body_text = regexp_replace(diploma_body_text, '^\s*Certifik[áa]t\s*', '', 'i')
WHERE diploma_body_text ~* '^\s*Certifik[áa]t';