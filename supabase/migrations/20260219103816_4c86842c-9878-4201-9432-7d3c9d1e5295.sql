
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS pode_visualizar_troca_turno boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pode_editar_troca_turno boolean NOT NULL DEFAULT true;
