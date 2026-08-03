delete from auth.users where id in (
 '4ff00c7f-8f26-4f8b-917d-3903899613c6',
 '3269d1e3-3c26-48c7-a05e-b2ec43328d46',
 '0643d509-c86c-4161-9c9b-ddb90c57f477',
 '9d077924-6dc1-44b5-a7b7-1e9652036e92',
 'f735a37e-9f6a-46a0-9dd3-74174874c31e',
 'b9b371d7-c447-47ee-95fb-866dbb314b00'
);
delete from public.profiles where display_name in ('Diag Test','Diag Prod','Diag Loc');