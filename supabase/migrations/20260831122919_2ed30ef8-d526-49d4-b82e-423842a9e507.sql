ALTER TABLE public.levels
  ADD COLUMN IF NOT EXISTS infographic_landscape text,
  ADD COLUMN IF NOT EXISTS infographic_portrait text;

UPDATE public.levels SET infographic_landscape = '/__l5e/assets-v1/69f29748-9bbb-4bcc-8080-5f18cc61cf75/balanceoil-landscape.webp' WHERE id = 'f9cb8b39-a42c-472b-b90c-ed3d9cd73ac0';
UPDATE public.levels SET infographic_landscape = '/__l5e/assets-v1/2b80dc99-b2fb-49df-8789-010e92cb547d/balancetest-landscape.webp' WHERE id = '714f037e-eede-4e55-a80e-94dd3dbf0061';
UPDATE public.levels SET infographic_landscape = '/__l5e/assets-v1/8485709f-cd62-4588-8419-2ee05eb53b55/zinobiotic-landscape.webp' WHERE id = '1e60d863-9f4c-46a5-8d14-43782abc9be5';
UPDATE public.levels SET infographic_landscape = '/__l5e/assets-v1/e5cf52f6-c347-4cf0-9ade-46ec998233ed/xtend-landscape.webp' WHERE id = '4246737d-fc82-49b1-8e18-794fbf7ace7d';
UPDATE public.levels SET infographic_landscape = '/__l5e/assets-v1/701df6e1-1eac-4484-b6d7-21ac57ef8365/protect-landscape.webp' WHERE id = '4a033cd7-5696-4c6d-baf8-b99bbc99e8b0';
UPDATE public.levels SET infographic_landscape = '/__l5e/assets-v1/095739f5-67a3-4560-90d8-f7dd30f40115/zinoshine-landscape.webp' WHERE id = 'ff95002a-3b0e-42f9-a51a-0c4ba80d7d4b';
UPDATE public.levels SET infographic_landscape = '/__l5e/assets-v1/a2c97881-a639-4d64-8d99-b999197bd290/zinogene-landscape.webp' WHERE id = 'bafb3cac-4d41-43ba-ad66-e85079cd6e39';
UPDATE public.levels SET infographic_landscape = '/__l5e/assets-v1/eb887faf-1b95-4703-9645-d990e269a10d/viva-landscape.webp' WHERE id = 'aaff87fb-8a2a-43d0-ab36-b86e014e4cf3';
UPDATE public.levels SET infographic_landscape = '/__l5e/assets-v1/0de403ef-07cf-4bd6-88a1-1feee901e77e/multify-landscape.webp' WHERE id = '607fb6a3-b911-41a4-9d2f-e49c246f7019';