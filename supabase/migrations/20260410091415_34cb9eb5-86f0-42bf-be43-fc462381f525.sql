-- Add admin role to user Jan Brožek
INSERT INTO public.user_roles (user_id, role) 
VALUES ('2b2b3b04-9c8e-403a-89d8-91ee0ceeb55a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Add color_scheme column to profiles for color theme preference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS color_scheme text NOT NULL DEFAULT 'teal';