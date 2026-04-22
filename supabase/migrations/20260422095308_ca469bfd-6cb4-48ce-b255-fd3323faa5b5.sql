ALTER TABLE public.user_roles 
ADD COLUMN fake_quadro_ativo BOOLEAN DEFAULT false,
ADD COLUMN fake_quadro_config JSONB DEFAULT '{}'::jsonb;