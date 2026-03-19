-- Criar enum para perfis de usuário mais granulares
DROP TYPE IF EXISTS public.perfil_usuario CASCADE;
CREATE TYPE public.perfil_usuario AS ENUM (
  'admin',           -- Acesso total
  'rh_demissoes',    -- Editar demissões e homologações
  'rh_completo',     -- RH com acesso total a funcionários
  'gestor_setor',    -- Gestor de setor (edita faltas, cria divergências)
  'visualizacao'     -- Apenas visualização
);

-- Criar tabela de roles de usuário (separada da tabela de perfis)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  perfil perfil_usuario NOT NULL DEFAULT 'visualizacao',
  nome text NOT NULL,
  setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário tem determinado perfil
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS perfil_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil
  FROM public.user_roles
  WHERE user_id = _user_id
  AND ativo = true
  LIMIT 1
$$;

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND ativo = true
    AND perfil = 'admin'
  )
$$;

-- Função para obter setor do usuário
CREATE OR REPLACE FUNCTION public.get_user_setor_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT setor_id
  FROM public.user_roles
  WHERE user_id = _user_id
  AND ativo = true
  LIMIT 1
$$;

-- Função para verificar se usuário pode editar demissões (admin ou rh_demissoes)
CREATE OR REPLACE FUNCTION public.can_edit_demissoes(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND ativo = true
    AND perfil IN ('admin', 'rh_demissoes', 'rh_completo')
  )
$$;

-- Função para verificar se usuário pode editar faltas do setor
CREATE OR REPLACE FUNCTION public.can_edit_faltas(_user_id uuid, _funcionario_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND ativo = true
    AND (
      perfil = 'admin' 
      OR perfil = 'rh_completo'
      OR (perfil = 'gestor_setor' AND setor_id = _funcionario_setor_id)
    )
  )
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Admins podem ver todos os roles"
  ON public.user_roles FOR SELECT
  USING (public.is_admin(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Apenas admins podem inserir roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem atualizar roles"
  ON public.user_roles FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem deletar roles"
  ON public.user_roles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_setor_id ON public.user_roles(setor_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_perfil ON public.user_roles(perfil);