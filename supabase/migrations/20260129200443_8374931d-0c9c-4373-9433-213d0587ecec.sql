-- Função para verificar o perfil do usuário (SECURITY DEFINER evita recursão)
CREATE OR REPLACE FUNCTION public.get_user_perfil(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT perfil::text
  FROM public.usuarios
  WHERE user_id = _user_id
  AND ativo = true
  LIMIT 1
$$;

-- Função helper para verificar se é admin ou gestor
CREATE OR REPLACE FUNCTION public.is_admin_or_gestor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE user_id = _user_id
    AND ativo = true
    AND perfil IN ('administrador', 'gestor')
  )
$$;

-- Função helper para verificar se pode visualizar (qualquer perfil ativo)
CREATE OR REPLACE FUNCTION public.can_view_data(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE user_id = _user_id
    AND ativo = true
  )
$$;

-- ========== ATUALIZAR RLS DA TABELA FUNCIONARIOS ==========
-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários autenticados podem ver funcionários" ON public.funcionarios;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir funcionários" ON public.funcionarios;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar funcionários" ON public.funcionarios;

-- Novas políticas baseadas em perfil
CREATE POLICY "Usuários com perfil ativo podem ver funcionários"
ON public.funcionarios FOR SELECT
TO authenticated
USING (public.can_view_data(auth.uid()));

CREATE POLICY "Admin e Gestor podem inserir funcionários"
ON public.funcionarios FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin e Gestor podem atualizar funcionários"
ON public.funcionarios FOR UPDATE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()));

-- ========== ATUALIZAR RLS DA TABELA REGISTROS_PONTO ==========
DROP POLICY IF EXISTS "Usuários autenticados podem ver registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "Usuários autenticados podem deletar registros" ON public.registros_ponto;

CREATE POLICY "Usuários com perfil ativo podem ver registros"
ON public.registros_ponto FOR SELECT
TO authenticated
USING (public.can_view_data(auth.uid()));

CREATE POLICY "Admin e Gestor podem inserir registros"
ON public.registros_ponto FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin e Gestor podem atualizar registros"
ON public.registros_ponto FOR UPDATE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin e Gestor podem deletar registros"
ON public.registros_ponto FOR DELETE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()));

-- ========== ATUALIZAR RLS DA TABELA USUARIOS ==========
DROP POLICY IF EXISTS "Usuários autenticados podem ver usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar usuários" ON public.usuarios;

-- Usuários podem ver apenas seu próprio registro (exceto admin que vê todos)
CREATE POLICY "Usuários podem ver próprio registro ou admin vê todos"
ON public.usuarios FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.get_user_perfil(auth.uid()) = 'administrador'
);

-- Apenas admin pode inserir novos usuários
CREATE POLICY "Apenas admin pode inserir usuários"
ON public.usuarios FOR INSERT
TO authenticated
WITH CHECK (public.get_user_perfil(auth.uid()) = 'administrador');

-- Apenas admin pode atualizar usuários
CREATE POLICY "Apenas admin pode atualizar usuários"
ON public.usuarios FOR UPDATE
TO authenticated
USING (public.get_user_perfil(auth.uid()) = 'administrador');

-- ========== ATUALIZAR RLS DAS TABELAS DE CONFIGURAÇÃO ==========
-- Setores
DROP POLICY IF EXISTS "Usuários autenticados podem ver setores" ON public.setores;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir setores" ON public.setores;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar setores" ON public.setores;

CREATE POLICY "Usuários com perfil ativo podem ver setores"
ON public.setores FOR SELECT
TO authenticated
USING (public.can_view_data(auth.uid()));

CREATE POLICY "Apenas admin pode inserir setores"
ON public.setores FOR INSERT
TO authenticated
WITH CHECK (public.get_user_perfil(auth.uid()) = 'administrador');

CREATE POLICY "Apenas admin pode atualizar setores"
ON public.setores FOR UPDATE
TO authenticated
USING (public.get_user_perfil(auth.uid()) = 'administrador');

-- Situações
DROP POLICY IF EXISTS "Usuários autenticados podem ver situações" ON public.situacoes;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir situações" ON public.situacoes;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar situações" ON public.situacoes;

CREATE POLICY "Usuários com perfil ativo podem ver situações"
ON public.situacoes FOR SELECT
TO authenticated
USING (public.can_view_data(auth.uid()));

CREATE POLICY "Apenas admin pode inserir situações"
ON public.situacoes FOR INSERT
TO authenticated
WITH CHECK (public.get_user_perfil(auth.uid()) = 'administrador');

CREATE POLICY "Apenas admin pode atualizar situações"
ON public.situacoes FOR UPDATE
TO authenticated
USING (public.get_user_perfil(auth.uid()) = 'administrador');

-- Períodos
DROP POLICY IF EXISTS "Usuários autenticados podem ver períodos" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Usuários autenticados podem inserir períodos" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar períodos" ON public.periodos_ponto;

CREATE POLICY "Usuários com perfil ativo podem ver períodos"
ON public.periodos_ponto FOR SELECT
TO authenticated
USING (public.can_view_data(auth.uid()));

CREATE POLICY "Apenas admin pode inserir períodos"
ON public.periodos_ponto FOR INSERT
TO authenticated
WITH CHECK (public.get_user_perfil(auth.uid()) = 'administrador');

CREATE POLICY "Apenas admin pode atualizar períodos"
ON public.periodos_ponto FOR UPDATE
TO authenticated
USING (public.get_user_perfil(auth.uid()) = 'administrador');