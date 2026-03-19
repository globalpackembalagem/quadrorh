
ALTER TABLE public.user_roles 
  ADD COLUMN IF NOT EXISTS pode_visualizar_armarios boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_editar_armarios boolean NOT NULL DEFAULT false;

-- Set admin users to have armarios access by default
UPDATE public.user_roles SET pode_visualizar_armarios = true, pode_editar_armarios = true WHERE acesso_admin = true;
