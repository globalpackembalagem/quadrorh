-- Criar tabela de relacionamento N:N entre user_roles e setores
CREATE TABLE public.user_roles_setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_role_id, setor_id)
);

-- Habilitar RLS
ALTER TABLE public.user_roles_setores ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins podem ver todos os setores de roles"
ON public.user_roles_setores FOR SELECT
USING (is_admin(auth.uid()) OR EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.id = user_role_id AND ur.user_id = auth.uid()
));

CREATE POLICY "Apenas admins podem inserir setores de roles"
ON public.user_roles_setores FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem atualizar setores de roles"
ON public.user_roles_setores FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem deletar setores de roles"
ON public.user_roles_setores FOR DELETE
USING (is_admin(auth.uid()));

-- Migrar dados existentes (se houver setor_id)
INSERT INTO public.user_roles_setores (user_role_id, setor_id)
SELECT id, setor_id FROM public.user_roles WHERE setor_id IS NOT NULL;

-- Atualizar função can_edit_faltas para suportar múltiplos setores
CREATE OR REPLACE FUNCTION public.can_edit_faltas(_user_id uuid, _funcionario_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.ativo = true
    AND (
      ur.perfil = 'admin' 
      OR ur.perfil = 'rh_completo'
      OR (ur.perfil = 'gestor_setor' AND (
        ur.setor_id = _funcionario_setor_id
        OR EXISTS (
          SELECT 1 FROM public.user_roles_setores urs
          WHERE urs.user_role_id = ur.id AND urs.setor_id = _funcionario_setor_id
        )
      ))
    )
  )
$$;

-- Função para obter todos os setores de um usuário
CREATE OR REPLACE FUNCTION public.get_user_setores(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s.setor_id
  FROM (
    -- Setor principal
    SELECT setor_id FROM public.user_roles 
    WHERE user_id = _user_id AND ativo = true AND setor_id IS NOT NULL
    UNION
    -- Setores adicionais
    SELECT urs.setor_id FROM public.user_roles_setores urs
    JOIN public.user_roles ur ON ur.id = urs.user_role_id
    WHERE ur.user_id = _user_id AND ur.ativo = true
  ) s
$$;