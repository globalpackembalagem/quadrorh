
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS pode_visualizar_faltas boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pode_visualizar_demissoes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_visualizar_homologacoes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_visualizar_divergencias boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_visualizar_previsao boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pode_editar_previsao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_visualizar_coberturas boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pode_editar_coberturas boolean NOT NULL DEFAULT false;

-- Sincronizar valores existentes com base nas permissões atuais
UPDATE public.user_roles SET
  pode_visualizar_faltas = pode_editar_faltas OR acesso_admin,
  pode_visualizar_demissoes = pode_editar_demissoes OR acesso_admin,
  pode_visualizar_homologacoes = pode_editar_homologacoes OR acesso_admin,
  pode_visualizar_divergencias = pode_criar_divergencias OR acesso_admin,
  pode_visualizar_previsao = pode_visualizar_funcionarios OR acesso_admin,
  pode_editar_previsao = pode_editar_funcionarios OR acesso_admin,
  pode_visualizar_coberturas = pode_visualizar_funcionarios OR acesso_admin,
  pode_editar_coberturas = pode_editar_funcionarios OR acesso_admin;
