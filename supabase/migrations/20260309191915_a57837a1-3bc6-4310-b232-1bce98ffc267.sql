ALTER TABLE public.prestadores_funcionarios 
ADD COLUMN IF NOT EXISTS cargo text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS situacao text NOT NULL DEFAULT '';