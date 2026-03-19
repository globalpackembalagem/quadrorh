-- Adicionar colunas de permissões individuais na tabela user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS pode_visualizar_funcionarios boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS pode_editar_funcionarios boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pode_editar_demissoes boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pode_editar_homologacoes boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pode_editar_faltas boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pode_criar_divergencias boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pode_exportar_excel boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS acesso_admin boolean NOT NULL DEFAULT false;

-- Atualizar usuários existentes baseado no perfil atual
UPDATE public.user_roles SET
  pode_visualizar_funcionarios = true,
  pode_editar_funcionarios = CASE WHEN perfil IN ('admin', 'rh_completo') THEN true ELSE false END,
  pode_editar_demissoes = CASE WHEN perfil IN ('admin', 'rh_completo', 'rh_demissoes') THEN true ELSE false END,
  pode_editar_homologacoes = CASE WHEN perfil IN ('admin', 'rh_completo', 'rh_demissoes') THEN true ELSE false END,
  pode_editar_faltas = CASE WHEN perfil IN ('admin', 'rh_completo', 'gestor_setor') THEN true ELSE false END,
  pode_criar_divergencias = CASE WHEN perfil IN ('admin', 'rh_completo', 'gestor_setor') THEN true ELSE false END,
  pode_exportar_excel = true,
  acesso_admin = CASE WHEN perfil = 'admin' THEN true ELSE false END;

-- Comentários para documentação
COMMENT ON COLUMN public.user_roles.pode_visualizar_funcionarios IS 'Pode ver lista de funcionários';
COMMENT ON COLUMN public.user_roles.pode_editar_funcionarios IS 'Pode criar/editar/excluir funcionários';
COMMENT ON COLUMN public.user_roles.pode_editar_demissoes IS 'Pode criar/editar demissões';
COMMENT ON COLUMN public.user_roles.pode_editar_homologacoes IS 'Pode editar datas de homologação';
COMMENT ON COLUMN public.user_roles.pode_editar_faltas IS 'Pode registrar faltas/atestados';
COMMENT ON COLUMN public.user_roles.pode_criar_divergencias IS 'Pode criar divergências de quadro';
COMMENT ON COLUMN public.user_roles.pode_exportar_excel IS 'Pode exportar dados para Excel';
COMMENT ON COLUMN public.user_roles.acesso_admin IS 'Acesso às configurações administrativas';