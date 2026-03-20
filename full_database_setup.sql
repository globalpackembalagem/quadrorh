-- Enum para sexo
CREATE TYPE public.sexo_tipo AS ENUM ('masculino', 'feminino');

-- Enum para tipo de registro de ponto
CREATE TYPE public.ponto_tipo AS ENUM ('F', 'A');

-- Enum para status do perÃ­odo
CREATE TYPE public.periodo_status AS ENUM ('aberto', 'fechado');

-- Enum para perfil de usuÃ¡rio
CREATE TYPE public.usuario_perfil AS ENUM ('administrador', 'gestor', 'visualizacao');

-- Tabela de Setores (configuraÃ§Ã£o)
CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  conta_no_quadro BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de SituaÃ§Ãµes (regra central)
CREATE TABLE public.situacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  conta_no_quadro BOOLEAN NOT NULL DEFAULT true,
  entra_no_ponto BOOLEAN NOT NULL DEFAULT true,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de FuncionÃ¡rios
CREATE TABLE public.funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  sexo sexo_tipo NOT NULL,
  setor_id UUID NOT NULL REFERENCES public.setores(id),
  situacao_id UUID NOT NULL REFERENCES public.situacoes(id),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de PerÃ­odos de Ponto
CREATE TABLE public.periodos_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status periodo_status NOT NULL DEFAULT 'aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Registros de Ponto
CREATE TABLE public.registros_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id),
  data DATE NOT NULL,
  periodo_id UUID NOT NULL REFERENCES public.periodos_ponto(id),
  tipo ponto_tipo NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(funcionario_id, data)
);

-- Tabela de UsuÃ¡rios do Sistema
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  perfil usuario_perfil NOT NULL DEFAULT 'visualizacao',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.situacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_ponto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Permitir leitura para todos os usuÃ¡rios autenticados
CREATE POLICY "UsuÃ¡rios autenticados podem ver setores" ON public.setores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem ver situaÃ§Ãµes" ON public.situacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem ver funcionÃ¡rios" ON public.funcionarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem ver perÃ­odos" ON public.periodos_ponto
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem ver registros" ON public.registros_ponto
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem ver usuÃ¡rios" ON public.usuarios
  FOR SELECT TO authenticated USING (true);

-- RLS Policies - Permitir inserÃ§Ã£o/atualizaÃ§Ã£o/exclusÃ£o para todos (serÃ¡ controlado por perfil na aplicaÃ§Ã£o)
CREATE POLICY "UsuÃ¡rios autenticados podem inserir setores" ON public.setores
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "UsuÃ¡rios autenticados podem atualizar setores" ON public.setores
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem inserir situaÃ§Ãµes" ON public.situacoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "UsuÃ¡rios autenticados podem atualizar situaÃ§Ãµes" ON public.situacoes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem inserir funcionÃ¡rios" ON public.funcionarios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "UsuÃ¡rios autenticados podem atualizar funcionÃ¡rios" ON public.funcionarios
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem inserir perÃ­odos" ON public.periodos_ponto
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "UsuÃ¡rios autenticados podem atualizar perÃ­odos" ON public.periodos_ponto
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem inserir registros" ON public.registros_ponto
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "UsuÃ¡rios autenticados podem atualizar registros" ON public.registros_ponto
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem deletar registros" ON public.registros_ponto
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "UsuÃ¡rios autenticados podem inserir usuÃ¡rios" ON public.usuarios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "UsuÃ¡rios autenticados podem atualizar usuÃ¡rios" ON public.usuarios
  FOR UPDATE TO authenticated USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_setores_updated_at
  BEFORE UPDATE ON public.setores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_situacoes_updated_at
  BEFORE UPDATE ON public.situacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funcionarios_updated_at
  BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_periodos_ponto_updated_at
  BEFORE UPDATE ON public.periodos_ponto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais de SituaÃ§Ãµes
INSERT INTO public.situacoes (nome, conta_no_quadro, entra_no_ponto, ativa) VALUES
  ('Ativo', true, true, true),
  ('FÃ©rias', true, false, true),
  ('Afastado', true, false, true),
  ('LicenÃ§a', true, false, true),
  ('Desligado', false, false, true);

-- Inserir dados iniciais de Setores
INSERT INTO public.setores (nome, ativo, conta_no_quadro) VALUES
  ('Administrativo', true, true),
  ('Operacional', true, true),
  ('Comercial', true, true),
  ('RH', true, true),
  ('TI', true, true);
-- Adicionar novos campos Ã  tabela funcionarios
ALTER TABLE public.funcionarios
ADD COLUMN empresa text DEFAULT 'GLOBALPACK',
ADD COLUMN matricula text,
ADD COLUMN data_admissao date,
ADD COLUMN cargo text,
ADD COLUMN centro_custo text,
ADD COLUMN turma text,
ADD COLUMN data_demissao date;

-- Criar Ã­ndice para busca por matrÃ­cula
CREATE INDEX idx_funcionarios_matricula ON public.funcionarios(matricula);

-- Criar Ã­ndice para busca por empresa
CREATE INDEX idx_funcionarios_empresa ON public.funcionarios(empresa);
-- FunÃ§Ã£o para verificar o perfil do usuÃ¡rio (SECURITY DEFINER evita recursÃ£o)
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

-- FunÃ§Ã£o helper para verificar se Ã© admin ou gestor
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

-- FunÃ§Ã£o helper para verificar se pode visualizar (qualquer perfil ativo)
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
-- Remover polÃ­ticas antigas
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem ver funcionÃ¡rios" ON public.funcionarios;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem inserir funcionÃ¡rios" ON public.funcionarios;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem atualizar funcionÃ¡rios" ON public.funcionarios;

-- Novas polÃ­ticas baseadas em perfil
CREATE POLICY "UsuÃ¡rios com perfil ativo podem ver funcionÃ¡rios"
ON public.funcionarios FOR SELECT
TO authenticated
USING (public.can_view_data(auth.uid()));

CREATE POLICY "Admin e Gestor podem inserir funcionÃ¡rios"
ON public.funcionarios FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_gestor(auth.uid()));

CREATE POLICY "Admin e Gestor podem atualizar funcionÃ¡rios"
ON public.funcionarios FOR UPDATE
TO authenticated
USING (public.is_admin_or_gestor(auth.uid()));

-- ========== ATUALIZAR RLS DA TABELA REGISTROS_PONTO ==========
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem ver registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem inserir registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem atualizar registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem deletar registros" ON public.registros_ponto;

CREATE POLICY "UsuÃ¡rios com perfil ativo podem ver registros"
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
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem ver usuÃ¡rios" ON public.usuarios;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem inserir usuÃ¡rios" ON public.usuarios;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem atualizar usuÃ¡rios" ON public.usuarios;

-- UsuÃ¡rios podem ver apenas seu prÃ³prio registro (exceto admin que vÃª todos)
CREATE POLICY "UsuÃ¡rios podem ver prÃ³prio registro ou admin vÃª todos"
ON public.usuarios FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.get_user_perfil(auth.uid()) = 'administrador'
);

-- Apenas admin pode inserir novos usuÃ¡rios
CREATE POLICY "Apenas admin pode inserir usuÃ¡rios"
ON public.usuarios FOR INSERT
TO authenticated
WITH CHECK (public.get_user_perfil(auth.uid()) = 'administrador');

-- Apenas admin pode atualizar usuÃ¡rios
CREATE POLICY "Apenas admin pode atualizar usuÃ¡rios"
ON public.usuarios FOR UPDATE
TO authenticated
USING (public.get_user_perfil(auth.uid()) = 'administrador');

-- ========== ATUALIZAR RLS DAS TABELAS DE CONFIGURAÃ‡ÃƒO ==========
-- Setores
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem ver setores" ON public.setores;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem inserir setores" ON public.setores;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem atualizar setores" ON public.setores;

CREATE POLICY "UsuÃ¡rios com perfil ativo podem ver setores"
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

-- SituaÃ§Ãµes
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem ver situaÃ§Ãµes" ON public.situacoes;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem inserir situaÃ§Ãµes" ON public.situacoes;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem atualizar situaÃ§Ãµes" ON public.situacoes;

CREATE POLICY "UsuÃ¡rios com perfil ativo podem ver situaÃ§Ãµes"
ON public.situacoes FOR SELECT
TO authenticated
USING (public.can_view_data(auth.uid()));

CREATE POLICY "Apenas admin pode inserir situaÃ§Ãµes"
ON public.situacoes FOR INSERT
TO authenticated
WITH CHECK (public.get_user_perfil(auth.uid()) = 'administrador');

CREATE POLICY "Apenas admin pode atualizar situaÃ§Ãµes"
ON public.situacoes FOR UPDATE
TO authenticated
USING (public.get_user_perfil(auth.uid()) = 'administrador');

-- PerÃ­odos
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem ver perÃ­odos" ON public.periodos_ponto;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem inserir perÃ­odos" ON public.periodos_ponto;
DROP POLICY IF EXISTS "UsuÃ¡rios autenticados podem atualizar perÃ­odos" ON public.periodos_ponto;

CREATE POLICY "UsuÃ¡rios com perfil ativo podem ver perÃ­odos"
ON public.periodos_ponto FOR SELECT
TO authenticated
USING (public.can_view_data(auth.uid()));

CREATE POLICY "Apenas admin pode inserir perÃ­odos"
ON public.periodos_ponto FOR INSERT
TO authenticated
WITH CHECK (public.get_user_perfil(auth.uid()) = 'administrador');

CREATE POLICY "Apenas admin pode atualizar perÃ­odos"
ON public.periodos_ponto FOR UPDATE
TO authenticated
USING (public.get_user_perfil(auth.uid()) = 'administrador');
-- Corrigir funÃ§Ã£o update_updated_at_column para ter search_path definido
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Adicionar campo grupo para consolidaÃ§Ã£o visual dos setores
ALTER TABLE setores ADD COLUMN grupo TEXT;

-- Atualizar grupos para SOPRO (consolidar MOD + PRODUÃ‡ÃƒO G+P)
UPDATE setores SET grupo = 'SOPRO A' WHERE nome IN ('MOD - SOPRO A', 'PRODUÃ‡ÃƒO SOPRO G+P A');
UPDATE setores SET grupo = 'SOPRO B' WHERE nome IN ('MOD - SOPRO B', 'PRODUÃ‡ÃƒO SOPRO G+P B');
UPDATE setores SET grupo = 'SOPRO C' WHERE nome IN ('MOD - SOPRO C', 'PRODUÃ‡ÃƒO SOPRO G+P C');

-- Atualizar DECORAÃ‡ÃƒO existentes
UPDATE setores SET nome = 'DECORAÃ‡ÃƒO MOD DIA - T1', grupo = 'DECORAÃ‡ÃƒO DIA T1' WHERE nome = 'DECORAÃ‡ÃƒO MOD DIA';
UPDATE setores SET nome = 'DECORAÃ‡ÃƒO MOD NOITE - T1', grupo = 'DECORAÃ‡ÃƒO NOITE T1' WHERE nome = 'DECORAÃ‡ÃƒO MOD NOITE';

-- Inserir novos setores de DECORAÃ‡ÃƒO para T2
INSERT INTO setores (nome, grupo, ativo, conta_no_quadro) VALUES 
  ('DECORAÃ‡ÃƒO MOD DIA - T2', 'DECORAÃ‡ÃƒO DIA T2', true, true),
  ('DECORAÃ‡ÃƒO MOD NOITE - T2', 'DECORAÃ‡ÃƒO NOITE T2', true, true);


-- Permitir leitura pÃºblica de setores e situaÃ§Ãµes (dados de configuraÃ§Ã£o)
-- DROP das polÃ­ticas restritivas existentes
DROP POLICY IF EXISTS "UsuÃ¡rios com perfil ativo podem ver setores" ON setores;
DROP POLICY IF EXISTS "UsuÃ¡rios com perfil ativo podem ver situaÃ§Ãµes" ON situacoes;

-- Criar polÃ­ticas de leitura pÃºblica (SELECT)
CREATE POLICY "Qualquer pessoa pode ver setores" 
  ON setores FOR SELECT 
  USING (true);

CREATE POLICY "Qualquer pessoa pode ver situaÃ§Ãµes" 
  ON situacoes FOR SELECT 
  USING (true);


-- Permitir inserÃ§Ã£o pÃºblica de funcionÃ¡rios (sistema interno sem autenticaÃ§Ã£o)
DROP POLICY IF EXISTS "Admin e Gestor podem inserir funcionÃ¡rios" ON funcionarios;

CREATE POLICY "Qualquer pessoa pode inserir funcionÃ¡rios" 
  ON funcionarios FOR INSERT 
  WITH CHECK (true);

-- Permitir atualizaÃ§Ã£o pÃºblica tambÃ©m
DROP POLICY IF EXISTS "Admin e Gestor podem atualizar funcionÃ¡rios" ON funcionarios;

CREATE POLICY "Qualquer pessoa pode atualizar funcionÃ¡rios" 
  ON funcionarios FOR UPDATE 
  USING (true);

-- Permitir leitura pÃºblica
DROP POLICY IF EXISTS "UsuÃ¡rios com perfil ativo podem ver funcionÃ¡rios" ON funcionarios;

CREATE POLICY "Qualquer pessoa pode ver funcionÃ¡rios" 
  ON funcionarios FOR SELECT 
  USING (true);

-- Tabela para armazenar o quadro planejado por grupo e turma
CREATE TABLE public.quadro_planejado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo TEXT NOT NULL, -- SOPRO, DECORAÃ‡ÃƒO, etc.
  turma TEXT NOT NULL, -- A, B, C
  
  -- GLOBALPACK
  aux_maquina_industria INTEGER NOT NULL DEFAULT 0,
  reserva_ferias_industria INTEGER NOT NULL DEFAULT 0,
  reserva_faltas_industria INTEGER NOT NULL DEFAULT 0,
  amarra_pallets INTEGER NOT NULL DEFAULT 0,
  revisao_frasco INTEGER NOT NULL DEFAULT 0,
  mod_sindicalista INTEGER NOT NULL DEFAULT 0,
  controle_praga INTEGER NOT NULL DEFAULT 0,
  
  -- G+P
  aux_maquina_gp INTEGER NOT NULL DEFAULT 0,
  reserva_faltas_gp INTEGER NOT NULL DEFAULT 0,
  reserva_ferias_gp INTEGER NOT NULL DEFAULT 0,
  
  -- Aumento de quadro
  aumento_quadro INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(grupo, turma)
);

-- Enable RLS
ALTER TABLE public.quadro_planejado ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de acesso pÃºblico (como as outras tabelas)
CREATE POLICY "Qualquer pessoa pode ver quadro planejado"
ON public.quadro_planejado
FOR SELECT
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir quadro planejado"
ON public.quadro_planejado
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar quadro planejado"
ON public.quadro_planejado
FOR UPDATE
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_quadro_planejado_updated_at
BEFORE UPDATE ON public.quadro_planejado
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais para SOPRO
INSERT INTO public.quadro_planejado (grupo, turma, aux_maquina_industria, reserva_ferias_industria, reserva_faltas_industria, amarra_pallets, revisao_frasco, mod_sindicalista, controle_praga, aux_maquina_gp, reserva_faltas_gp, reserva_ferias_gp, aumento_quadro)
VALUES 
  ('SOPRO', 'A', 84, 8, 12, 2, 2, 1, 3, 30, 1, 0, 0),
  ('SOPRO', 'B', 84, 5, 20, 2, 2, 0, 3, 30, 1, 0, 0),
  ('SOPRO', 'C', 84, 8, 12, 2, 2, 0, 3, 30, 1, 0, 0),
  ('DECORAÃ‡ÃƒO', 'A', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('DECORAÃ‡ÃƒO', 'B', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('DECORAÃ‡ÃƒO', 'C', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
-- Tabela especÃ­fica para quadro DECORAÃ‡ÃƒO (estrutura diferente do SOPRO)
CREATE TABLE public.quadro_decoracao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  turma TEXT NOT NULL, -- DIA-T1, DIA-T2, NOITE-T1, NOITE-T2
  
  aux_maquina INTEGER NOT NULL DEFAULT 0,
  reserva_refeicao INTEGER NOT NULL DEFAULT 0,
  reserva_faltas INTEGER NOT NULL DEFAULT 0,
  reserva_ferias INTEGER NOT NULL DEFAULT 0,
  apoio_topografia INTEGER NOT NULL DEFAULT 0,
  reserva_afastadas INTEGER NOT NULL DEFAULT 0,
  reserva_covid INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(turma)
);

-- Enable RLS
ALTER TABLE public.quadro_decoracao ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de acesso pÃºblico
CREATE POLICY "Qualquer pessoa pode ver quadro decoracao"
ON public.quadro_decoracao FOR SELECT USING (true);

CREATE POLICY "Qualquer pessoa pode inserir quadro decoracao"
ON public.quadro_decoracao FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar quadro decoracao"
ON public.quadro_decoracao FOR UPDATE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_quadro_decoracao_updated_at
BEFORE UPDATE ON public.quadro_decoracao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais conforme a planilha
INSERT INTO public.quadro_decoracao (turma, aux_maquina, reserva_refeicao, reserva_faltas, reserva_ferias, apoio_topografia, reserva_afastadas, reserva_covid)
VALUES 
  ('DIA-T1', 26, 8, 3, 1, 1, 0, 0),
  ('DIA-T2', 26, 8, 3, 1, 1, 0, 0),
  ('NOITE-T1', 26, 8, 3, 1, 1, 0, 0),
  ('NOITE-T2', 26, 8, 3, 1, 1, 0, 0);
-- Tabela para controle de demissÃµes/desligamentos
CREATE TABLE public.demissoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id),
  tipo_desligamento TEXT, -- SerÃ¡ preenchido depois (TÃ©rmino de Contrato, Dispensa Normal, Pedido de DemissÃ£o, Justa Causa)
  data_prevista DATE NOT NULL, -- Data prevista para desligamento
  data_exame_demissional DATE,
  hora_exame_demissional TIME,
  data_homologacao DATE,
  hora_homologacao TIME,
  realizado BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para perÃ­odos semanais configurÃ¡veis
CREATE TABLE public.periodos_demissao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL, -- Ex: "01/01 a 10/01"
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.demissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_demissao ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas para demissoes
CREATE POLICY "Qualquer pessoa pode ver demissoes" 
ON public.demissoes FOR SELECT USING (true);

CREATE POLICY "Qualquer pessoa pode inserir demissoes" 
ON public.demissoes FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar demissoes" 
ON public.demissoes FOR UPDATE USING (true);

CREATE POLICY "Qualquer pessoa pode deletar demissoes" 
ON public.demissoes FOR DELETE USING (true);

-- PolÃ­ticas para periodos_demissao
CREATE POLICY "Qualquer pessoa pode ver periodos_demissao" 
ON public.periodos_demissao FOR SELECT USING (true);

CREATE POLICY "Qualquer pessoa pode inserir periodos_demissao" 
ON public.periodos_demissao FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar periodos_demissao" 
ON public.periodos_demissao FOR UPDATE USING (true);

CREATE POLICY "Qualquer pessoa pode deletar periodos_demissao" 
ON public.periodos_demissao FOR DELETE USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_demissoes_updated_at
BEFORE UPDATE ON public.demissoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_periodos_demissao_updated_at
BEFORE UPDATE ON public.periodos_demissao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir perÃ­odos padrÃ£o para Janeiro
INSERT INTO public.periodos_demissao (nome, data_inicio, data_fim, ordem) VALUES
('01/01 a 10/01', '2025-01-01', '2025-01-10', 1),
('11/01 a 17/01', '2025-01-11', '2025-01-17', 2),
('18/01 a 24/01', '2025-01-18', '2025-01-24', 3),
('25/01 a 31/01', '2025-01-25', '2025-01-31', 4);
-- Tabela de divergÃªncias de quadro
CREATE TABLE public.divergencias_quadro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id),
  tipo_divergencia TEXT NOT NULL, -- COB. FÃ‰RIAS, SUMIDO, TREINAMENTO
  criado_por TEXT NOT NULL, -- identificador do gestor que criou
  observacoes TEXT,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  resolvido_por TEXT,
  resolvido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.divergencias_quadro ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Qualquer pessoa pode ver divergencias" 
ON public.divergencias_quadro 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir divergencias" 
ON public.divergencias_quadro 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar divergencias" 
ON public.divergencias_quadro 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer pessoa pode deletar divergencias" 
ON public.divergencias_quadro 
FOR DELETE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_divergencias_quadro_updated_at
BEFORE UPDATE ON public.divergencias_quadro
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Atualizar enum ponto_tipo para incluir 'P' (Presente)
ALTER TYPE public.ponto_tipo ADD VALUE IF NOT EXISTS 'P';

-- Adicionar coluna para controlar se funcionÃ¡rio estÃ¡ ativo no perÃ­odo
ALTER TABLE public.registros_ponto 
ADD COLUMN IF NOT EXISTS ativo_no_periodo boolean NOT NULL DEFAULT true;
-- Drop existing RLS policies on periodos_ponto
DROP POLICY IF EXISTS "UsuÃ¡rios com perfil ativo podem ver perÃ­odos" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Apenas admin pode inserir perÃ­odos" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Apenas admin pode atualizar perÃ­odos" ON public.periodos_ponto;

-- Create open policies for periodos_ponto (internal system)
CREATE POLICY "Qualquer pessoa pode ver periodos_ponto" 
ON public.periodos_ponto 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir periodos_ponto" 
ON public.periodos_ponto 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar periodos_ponto" 
ON public.periodos_ponto 
FOR UPDATE 
USING (true);

-- Drop existing RLS policies on registros_ponto
DROP POLICY IF EXISTS "UsuÃ¡rios com perfil ativo podem ver registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "Admin e Gestor podem inserir registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "Admin e Gestor podem atualizar registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "Admin e Gestor podem deletar registros" ON public.registros_ponto;

-- Create open policies for registros_ponto (internal system)
CREATE POLICY "Qualquer pessoa pode ver registros_ponto" 
ON public.registros_ponto 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir registros_ponto" 
ON public.registros_ponto 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar registros_ponto" 
ON public.registros_ponto 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer pessoa pode deletar registros_ponto" 
ON public.registros_ponto 
FOR DELETE 
USING (true);
-- Adicionar polÃ­tica DELETE para funcionÃ¡rios (necessÃ¡rio para zerar base)
CREATE POLICY "Qualquer pessoa pode deletar funcionÃ¡rios" 
ON public.funcionarios 
FOR DELETE 
USING (true);
-- Remover polÃ­ticas restritivas existentes
DROP POLICY IF EXISTS "Apenas admin pode inserir setores" ON public.setores;
DROP POLICY IF EXISTS "Apenas admin pode atualizar setores" ON public.setores;
DROP POLICY IF EXISTS "Apenas admin pode inserir situaÃ§Ãµes" ON public.situacoes;
DROP POLICY IF EXISTS "Apenas admin pode atualizar situaÃ§Ãµes" ON public.situacoes;

-- Criar polÃ­ticas permissivas para setores
CREATE POLICY "Qualquer pessoa pode inserir setores"
ON public.setores
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar setores"
ON public.setores
FOR UPDATE
USING (true);

-- Criar polÃ­ticas permissivas para situaÃ§Ãµes
CREATE POLICY "Qualquer pessoa pode inserir situacoes"
ON public.situacoes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar situacoes"
ON public.situacoes
FOR UPDATE
USING (true);
-- Adicionar coluna para marcar se foi lanÃ§ado no APDATA
ALTER TABLE public.demissoes 
ADD COLUMN IF NOT EXISTS lancado_apdata boolean NOT NULL DEFAULT false;
-- Adicionar campos especÃ­ficos para situaÃ§Ãµes especiais
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS cobertura_funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS treinamento_setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sumido_desde date;

-- Criar Ã­ndices para performance
CREATE INDEX IF NOT EXISTS idx_funcionarios_cobertura ON public.funcionarios(cobertura_funcionario_id) WHERE cobertura_funcionario_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funcionarios_treinamento ON public.funcionarios(treinamento_setor_id) WHERE treinamento_setor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funcionarios_sumido ON public.funcionarios(sumido_desde) WHERE sumido_desde IS NOT NULL;

-- ComentÃ¡rios para documentaÃ§Ã£o
COMMENT ON COLUMN public.funcionarios.cobertura_funcionario_id IS 'ID do funcionÃ¡rio que estÃ¡ sendo coberto (para situaÃ§Ã£o Cobertura de FÃ©rias)';
COMMENT ON COLUMN public.funcionarios.treinamento_setor_id IS 'ID do setor onde estÃ¡ treinando (para situaÃ§Ã£o Treinamento)';
COMMENT ON COLUMN public.funcionarios.sumido_desde IS 'Data desde quando o funcionÃ¡rio estÃ¡ sumido';
-- Criar enum para perfis de usuÃ¡rio mais granulares
DROP TYPE IF EXISTS public.perfil_usuario CASCADE;
CREATE TYPE public.perfil_usuario AS ENUM (
  'admin',           -- Acesso total
  'rh_demissoes',    -- Editar demissÃµes e homologaÃ§Ãµes
  'rh_completo',     -- RH com acesso total a funcionÃ¡rios
  'gestor_setor',    -- Gestor de setor (edita faltas, cria divergÃªncias)
  'visualizacao'     -- Apenas visualizaÃ§Ã£o
);

-- Criar tabela de roles de usuÃ¡rio (separada da tabela de perfis)
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

-- FunÃ§Ã£o para verificar se usuÃ¡rio tem determinado perfil
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

-- FunÃ§Ã£o para verificar se usuÃ¡rio Ã© admin
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

-- FunÃ§Ã£o para obter setor do usuÃ¡rio
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

-- FunÃ§Ã£o para verificar se usuÃ¡rio pode editar demissÃµes (admin ou rh_demissoes)
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

-- FunÃ§Ã£o para verificar se usuÃ¡rio pode editar faltas do setor
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

-- PolÃ­ticas RLS para user_roles
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

-- Ãndices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_setor_id ON public.user_roles(setor_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_perfil ON public.user_roles(perfil);
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

-- PolÃ­ticas RLS
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

-- Atualizar funÃ§Ã£o can_edit_faltas para suportar mÃºltiplos setores
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

-- FunÃ§Ã£o para obter todos os setores de um usuÃ¡rio
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
-- Adicionar colunas de permissÃµes individuais na tabela user_roles
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS pode_visualizar_funcionarios boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS pode_editar_funcionarios boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pode_editar_demissoes boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pode_editar_homologacoes boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pode_editar_faltas boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pode_criar_divergencias boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pode_exportar_excel boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS acesso_admin boolean NOT NULL DEFAULT false;

-- Atualizar usuÃ¡rios existentes baseado no perfil atual
UPDATE public.user_roles SET
  pode_visualizar_funcionarios = true,
  pode_editar_funcionarios = CASE WHEN perfil IN ('admin', 'rh_completo') THEN true ELSE false END,
  pode_editar_demissoes = CASE WHEN perfil IN ('admin', 'rh_completo', 'rh_demissoes') THEN true ELSE false END,
  pode_editar_homologacoes = CASE WHEN perfil IN ('admin', 'rh_completo', 'rh_demissoes') THEN true ELSE false END,
  pode_editar_faltas = CASE WHEN perfil IN ('admin', 'rh_completo', 'gestor_setor') THEN true ELSE false END,
  pode_criar_divergencias = CASE WHEN perfil IN ('admin', 'rh_completo', 'gestor_setor') THEN true ELSE false END,
  pode_exportar_excel = true,
  acesso_admin = CASE WHEN perfil = 'admin' THEN true ELSE false END;

-- ComentÃ¡rios para documentaÃ§Ã£o
COMMENT ON COLUMN public.user_roles.pode_visualizar_funcionarios IS 'Pode ver lista de funcionÃ¡rios';
COMMENT ON COLUMN public.user_roles.pode_editar_funcionarios IS 'Pode criar/editar/excluir funcionÃ¡rios';
COMMENT ON COLUMN public.user_roles.pode_editar_demissoes IS 'Pode criar/editar demissÃµes';
COMMENT ON COLUMN public.user_roles.pode_editar_homologacoes IS 'Pode editar datas de homologaÃ§Ã£o';
COMMENT ON COLUMN public.user_roles.pode_editar_faltas IS 'Pode registrar faltas/atestados';
COMMENT ON COLUMN public.user_roles.pode_criar_divergencias IS 'Pode criar divergÃªncias de quadro';
COMMENT ON COLUMN public.user_roles.pode_exportar_excel IS 'Pode exportar dados para Excel';
COMMENT ON COLUMN public.user_roles.acesso_admin IS 'Acesso Ã s configuraÃ§Ãµes administrativas';
-- Remover a constraint de FK para auth.users (permitir IDs locais)
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Adicionar coluna de senha para login local
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS senha TEXT DEFAULT 'senha123';

-- Atualizar RLS para permitir acesso pÃºblico (sem auth obrigatÃ³rio)
DROP POLICY IF EXISTS "Admins podem ver todos os roles" ON user_roles;
DROP POLICY IF EXISTS "Apenas admins podem inserir roles" ON user_roles;
DROP POLICY IF EXISTS "Apenas admins podem atualizar roles" ON user_roles;
DROP POLICY IF EXISTS "Apenas admins podem deletar roles" ON user_roles;

CREATE POLICY "Acesso total user_roles" ON user_roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins podem ver todos os setores de roles" ON user_roles_setores;
DROP POLICY IF EXISTS "Apenas admins podem inserir setores de roles" ON user_roles_setores;
DROP POLICY IF EXISTS "Apenas admins podem atualizar setores de roles" ON user_roles_setores;
DROP POLICY IF EXISTS "Apenas admins podem deletar setores de roles" ON user_roles_setores;

CREATE POLICY "Acesso total user_roles_setores" ON user_roles_setores FOR ALL USING (true) WITH CHECK (true);
-- Criar tabela de histÃ³rico de auditoria (exceto faltas)
CREATE TABLE public.historico_auditoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela TEXT NOT NULL,
  operacao TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  registro_id UUID NOT NULL,
  dados_anteriores JSONB,
  dados_novos JSONB,
  usuario_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.historico_auditoria ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para todos (histÃ³rico Ã© apenas visualizaÃ§Ã£o)
CREATE POLICY "Qualquer pessoa pode ver historico"
  ON public.historico_auditoria
  FOR SELECT
  USING (true);

-- Apenas sistema pode inserir (via triggers ou cÃ³digo)
CREATE POLICY "Qualquer pessoa pode inserir historico"
  ON public.historico_auditoria
  FOR INSERT
  WITH CHECK (true);

-- Permitir delete para perÃ­odos_ponto (alterando RLS existente)
-- Primeiro verificar se existe policy de delete
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar periodos_ponto" ON public.periodos_ponto;

CREATE POLICY "Qualquer pessoa pode deletar periodos_ponto"
  ON public.periodos_ponto
  FOR DELETE
  USING (true);
-- Tabela para histÃ³rico especÃ­fico de faltas (separado do histÃ³rico geral)
CREATE TABLE public.historico_faltas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_ponto_id UUID NOT NULL,
  funcionario_id UUID NOT NULL,
  periodo_id UUID NOT NULL,
  data DATE NOT NULL,
  tipo_anterior TEXT,
  tipo_novo TEXT NOT NULL,
  operacao TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  usuario_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para divergÃªncias de ponto (quando tenta editar apÃ³s 3 dias)
CREATE TABLE public.divergencias_ponto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  periodo_id UUID NOT NULL REFERENCES public.periodos_ponto(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo_atual TEXT,
  tipo_solicitado TEXT NOT NULL,
  motivo TEXT,
  criado_por TEXT NOT NULL,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  resolvido_por TEXT,
  resolvido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para historico_faltas
ALTER TABLE public.historico_faltas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura para usuÃ¡rios ativos" 
ON public.historico_faltas 
FOR SELECT 
USING (true);

CREATE POLICY "InserÃ§Ã£o para usuÃ¡rios ativos" 
ON public.historico_faltas 
FOR INSERT 
WITH CHECK (true);

-- RLS para divergencias_ponto
ALTER TABLE public.divergencias_ponto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura divergencias ponto" 
ON public.divergencias_ponto 
FOR SELECT 
USING (true);

CREATE POLICY "InserÃ§Ã£o divergencias ponto" 
ON public.divergencias_ponto 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "AtualizaÃ§Ã£o divergencias ponto" 
ON public.divergencias_ponto 
FOR UPDATE 
USING (true);

CREATE POLICY "ExclusÃ£o divergencias ponto" 
ON public.divergencias_ponto 
FOR DELETE 
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_divergencias_ponto_updated_at
BEFORE UPDATE ON public.divergencias_ponto
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ãndices para performance
CREATE INDEX idx_historico_faltas_funcionario ON public.historico_faltas(funcionario_id);
CREATE INDEX idx_historico_faltas_periodo ON public.historico_faltas(periodo_id);
CREATE INDEX idx_divergencias_ponto_funcionario ON public.divergencias_ponto(funcionario_id);
CREATE INDEX idx_divergencias_ponto_periodo ON public.divergencias_ponto(periodo_id);
CREATE INDEX idx_divergencias_ponto_resolvido ON public.divergencias_ponto(resolvido);
-- Enable realtime for main tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.funcionarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.registros_ponto;
ALTER PUBLICATION supabase_realtime ADD TABLE public.divergencias_quadro;
ALTER PUBLICATION supabase_realtime ADD TABLE public.demissoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.periodos_ponto;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quadro_planejado;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quadro_decoracao;
ALTER PUBLICATION supabase_realtime ADD TABLE public.setores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.situacoes;
-- Criar enum para status da integraÃ§Ã£o
CREATE TYPE public.integracao_status AS ENUM ('convocado', 'compareceu', 'aprovado', 'reprovado', 'faltou');

-- Criar enum para linhas de fretado
CREATE TYPE public.fretado_linha AS ENUM ('NAO', 'VARZEA_A', 'VARZEA_B', 'CAMPINAS', 'LOUVEIRA', 'VINHEDO');

-- Criar tabela de histÃ³rico de integraÃ§Ãµes
CREATE TABLE public.historico_integracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  setor_id UUID REFERENCES public.setores(id) NOT NULL,
  sexo public.sexo_tipo NOT NULL,
  indicacao TEXT,
  fretado public.fretado_linha NOT NULL DEFAULT 'NAO',
  ponto_referencia TEXT,
  camisa TEXT,
  calca TEXT,
  sapato TEXT,
  oculos BOOLEAN NOT NULL DEFAULT false,
  status public.integracao_status NOT NULL DEFAULT 'convocado',
  data_integracao DATE NOT NULL DEFAULT CURRENT_DATE,
  previsao_funcionario_id UUID REFERENCES public.funcionarios(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historico_integracoes ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (como as outras tabelas do sistema)
CREATE POLICY "Qualquer pessoa pode ver historico_integracoes" 
ON public.historico_integracoes 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir historico_integracoes" 
ON public.historico_integracoes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar historico_integracoes" 
ON public.historico_integracoes 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer pessoa pode deletar historico_integracoes" 
ON public.historico_integracoes 
FOR DELETE 
USING (true);

-- Ãndices para performance
CREATE INDEX idx_historico_integracoes_data ON public.historico_integracoes(data_integracao);
CREATE INDEX idx_historico_integracoes_status ON public.historico_integracoes(status);
CREATE INDEX idx_historico_integracoes_setor ON public.historico_integracoes(setor_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_historico_integracoes_updated_at
BEFORE UPDATE ON public.historico_integracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Criar enum para tipo de integraÃ§Ã£o
CREATE TYPE public.tipo_integracao AS ENUM ('1a', '2a', 'admissao');

-- Adicionar coluna tipo_integracao Ã  tabela historico_integracoes
ALTER TABLE public.historico_integracoes
ADD COLUMN tipo_integracao public.tipo_integracao NOT NULL DEFAULT '1a';
-- Remover tabela historico_integracoes e seus tipos ENUM relacionados
DROP TABLE IF EXISTS public.historico_integracoes CASCADE;

-- Remover ENUMs (se nÃ£o estiverem sendo usados em outro lugar)
DROP TYPE IF EXISTS public.integracao_status CASCADE;
DROP TYPE IF EXISTS public.fretado_linha CASCADE;
DROP TYPE IF EXISTS public.tipo_integracao CASCADE;
-- Adicionar campo de transferÃªncia programada no funcionÃ¡rio
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS transferencia_programada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transferencia_data date,
ADD COLUMN IF NOT EXISTS transferencia_setor_id uuid REFERENCES public.setores(id);

-- Criar tabela de histÃ³rico de transferÃªncias
CREATE TABLE IF NOT EXISTS public.transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  setor_origem_id uuid NOT NULL REFERENCES public.setores(id),
  setor_destino_id uuid NOT NULL REFERENCES public.setores(id),
  data_programada date NOT NULL,
  data_efetivada date,
  efetivada boolean DEFAULT false,
  observacoes text,
  criado_por text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas RLS
CREATE POLICY "Qualquer pessoa pode ver transferencias" 
ON public.transferencias FOR SELECT USING (true);

CREATE POLICY "Qualquer pessoa pode inserir transferencias" 
ON public.transferencias FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar transferencias" 
ON public.transferencias FOR UPDATE USING (true);

CREATE POLICY "Qualquer pessoa pode deletar transferencias" 
ON public.transferencias FOR DELETE USING (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.transferencias;
-- Tabela para histÃ³rico de alteraÃ§Ãµes do quadro planejado
CREATE TABLE public.historico_quadro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela TEXT NOT NULL, -- 'quadro_planejado' ou 'quadro_decoracao'
  registro_id UUID NOT NULL,
  campo TEXT NOT NULL, -- nome do campo alterado
  valor_anterior INTEGER NOT NULL,
  valor_novo INTEGER NOT NULL,
  grupo TEXT, -- SOPRO ou null
  turma TEXT NOT NULL,
  usuario_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.historico_quadro ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de acesso
CREATE POLICY "Qualquer pessoa pode ver historico_quadro"
ON public.historico_quadro
FOR SELECT
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir historico_quadro"
ON public.historico_quadro
FOR INSERT
WITH CHECK (true);
-- Criar tabela de categorias de comunicados
CREATE TABLE public.comunicados_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de comunicados
CREATE TABLE public.comunicados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id UUID NOT NULL REFERENCES public.comunicados_categorias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  fixado BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comunicados_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de leitura pÃºblica (sem login necessÃ¡rio)
CREATE POLICY "Categorias sÃ£o pÃºblicas para leitura" 
ON public.comunicados_categorias 
FOR SELECT 
USING (true);

CREATE POLICY "Comunicados sÃ£o pÃºblicos para leitura" 
ON public.comunicados 
FOR SELECT 
USING (true);

-- PolÃ­ticas de escrita apenas para admin
CREATE POLICY "Apenas admin pode inserir categorias" 
ON public.comunicados_categorias 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

CREATE POLICY "Apenas admin pode atualizar categorias" 
ON public.comunicados_categorias 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

CREATE POLICY "Apenas admin pode deletar categorias" 
ON public.comunicados_categorias 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

CREATE POLICY "Apenas admin pode inserir comunicados" 
ON public.comunicados 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

CREATE POLICY "Apenas admin pode atualizar comunicados" 
ON public.comunicados 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

CREATE POLICY "Apenas admin pode deletar comunicados" 
ON public.comunicados 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_comunicados_categorias_updated_at
BEFORE UPDATE ON public.comunicados_categorias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comunicados_updated_at
BEFORE UPDATE ON public.comunicados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir categorias padrÃ£o
INSERT INTO public.comunicados_categorias (slug, nome, descricao, icone, ordem) VALUES
('fretado', 'FRETADO', 'InformaÃ§Ãµes sobre transporte fretado: itinerÃ¡rios, horÃ¡rios, pontos de parada e avisos.', 'Bus', 1),
('cesta-basica', 'CESTA BÃSICA', 'InformaÃ§Ãµes sobre o benefÃ­cio da cesta bÃ¡sica: quem tem direito, datas e critÃ©rios.', 'ShoppingBasket', 2),
('wellhub', 'WELLHUB (GYMPASS)', 'InformaÃ§Ãµes sobre o benefÃ­cio Wellhub: como funciona, quem pode usar e regras.', 'Dumbbell', 3),
('app-apdata', 'APP APDATA', 'OrientaÃ§Ãµes sobre o aplicativo APDATA: funÃ§Ãµes, uso e comunicados do sistema.', 'Smartphone', 4);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.comunicados_categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comunicados;

-- Add approval workflow columns to transferencias table
ALTER TABLE public.transferencias 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente_gestores',
  ADD COLUMN IF NOT EXISTS gestor_origem_aprovado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gestor_origem_nome text,
  ADD COLUMN IF NOT EXISTS gestor_origem_aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS gestor_destino_aprovado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gestor_destino_nome text,
  ADD COLUMN IF NOT EXISTS gestor_destino_aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS recusado_por text,
  ADD COLUMN IF NOT EXISTS motivo_recusa text,
  ADD COLUMN IF NOT EXISTS turma_destino text;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'transferencia_pendente', 'transferencia_aprovada', 'transferencia_recusada'
  titulo text NOT NULL,
  mensagem text NOT NULL,
  referencia_id uuid, -- ID da transferÃªncia relacionada
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total notificacoes" ON public.notificacoes
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;


-- Tabela para solicitaÃ§Ãµes de troca de turno
CREATE TABLE public.trocas_turno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  setor_origem_id uuid NOT NULL REFERENCES public.setores(id),
  turma_origem text,
  setor_destino_id uuid NOT NULL REFERENCES public.setores(id),
  turma_destino text,
  status text NOT NULL DEFAULT 'pendente_gestores',
  gestor_origem_aprovado boolean DEFAULT false,
  gestor_origem_nome text,
  gestor_origem_aprovado_em timestamptz,
  gestor_destino_aprovado boolean DEFAULT false,
  gestor_destino_nome text,
  gestor_destino_aprovado_em timestamptz,
  motivo_recusa text,
  recusado_por text,
  observacoes text,
  criado_por text NOT NULL,
  efetivada boolean DEFAULT false,
  data_efetivada date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.trocas_turno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode ver trocas_turno" ON public.trocas_turno FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir trocas_turno" ON public.trocas_turno FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar trocas_turno" ON public.trocas_turno FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar trocas_turno" ON public.trocas_turno FOR DELETE USING (true);

-- Trigger updated_at
CREATE TRIGGER update_trocas_turno_updated_at
  BEFORE UPDATE ON public.trocas_turno
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trocas_turno;

ALTER TABLE public.trocas_turno ADD COLUMN data_programada date;

-- Tabela para registrar status de documentos de previsÃ£o de admissÃ£o
CREATE TABLE public.previsao_documentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendente', -- pendente, documentos_ok, falta_documentos
  atualizado_por text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- HistÃ³rico de mudanÃ§as de documentos
CREATE TABLE public.previsao_documentos_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  status_anterior text,
  status_novo text NOT NULL,
  usuario_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.previsao_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.previsao_documentos_historico ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (mesma estratÃ©gia do sistema)
CREATE POLICY "Qualquer pessoa pode ver previsao_documentos" ON public.previsao_documentos FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir previsao_documentos" ON public.previsao_documentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar previsao_documentos" ON public.previsao_documentos FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar previsao_documentos" ON public.previsao_documentos FOR DELETE USING (true);

CREATE POLICY "Qualquer pessoa pode ver previsao_documentos_historico" ON public.previsao_documentos_historico FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir previsao_documentos_historico" ON public.previsao_documentos_historico FOR INSERT WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_previsao_documentos_updated_at
  BEFORE UPDATE ON public.previsao_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint: um status por funcionÃ¡rio
ALTER TABLE public.previsao_documentos ADD CONSTRAINT previsao_documentos_funcionario_unique UNIQUE (funcionario_id);

-- 1. Add 'tipo' column to trocas_turno to differentiate between transfer and shift change
ALTER TABLE public.trocas_turno 
ADD COLUMN tipo text DEFAULT 'troca_turno' CHECK (tipo IN ('troca_turno', 'transferencia'));

-- 2. Migrate existing transferencias data to trocas_turno
INSERT INTO public.trocas_turno (
  id, funcionario_id, setor_origem_id, setor_destino_id,
  turma_origem, turma_destino, data_programada, observacoes,
  criado_por, status, efetivada, data_efetivada,
  gestor_origem_aprovado, gestor_destino_aprovado,
  created_at, updated_at, tipo
)
SELECT 
  t.id, t.funcionario_id, t.setor_origem_id, t.setor_destino_id,
  NULL as turma_origem, t.turma_destino, t.data_programada, t.observacoes,
  t.criado_por, 'pendente_rh'::text as status, t.efetivada, t.data_efetivada,
  true as gestor_origem_aprovado, true as gestor_destino_aprovado,
  t.created_at, COALESCE(t.updated_at, now()), 'transferencia'::text
FROM public.transferencias t
WHERE NOT EXISTS (
  SELECT 1 FROM public.trocas_turno tt 
  WHERE tt.id = t.id
);

-- 3. Update funcionarios table to remove transfer-specific fields (cleanup)
ALTER TABLE public.funcionarios
DROP COLUMN IF EXISTS transferencia_programada,
DROP COLUMN IF EXISTS transferencia_data,
DROP COLUMN IF EXISTS transferencia_setor_id;

-- 4. Drop the transferencias table (data is now in trocas_turno)
DROP TABLE IF EXISTS public.transferencias CASCADE;
-- Remover SUMIDO da contagem do quadro
UPDATE situacoes SET conta_no_quadro = false WHERE nome = 'SUMIDO';
UPDATE situacoes SET conta_no_quadro = true WHERE nome = 'SUMIDO';
ALTER TABLE public.funcionarios ADD COLUMN nao_e_meu_funcionario boolean NOT NULL DEFAULT false;
-- Adicionar 'FE' (FÃ©rias) ao enum ponto_tipo
ALTER TYPE public.ponto_tipo ADD VALUE IF NOT EXISTS 'FE';
-- Adicionar coluna para armazenar URL do PDF nos comunicados
ALTER TABLE public.comunicados 
ADD COLUMN arquivo_pdf_url TEXT NULL;

-- Criar bucket de storage para PDFs de comunicados
INSERT INTO storage.buckets (id, name, public)
VALUES ('comunicados-pdfs', 'comunicados-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket - pÃºblico para leitura, admin para upload
CREATE POLICY "PDFs de comunicados sÃ£o pÃºblicos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'comunicados-pdfs');

CREATE POLICY "Admin pode fazer upload de PDFs de comunicados" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'comunicados-pdfs' 
  AND (SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND perfil = 'admin' 
    AND ativo = true
  ))
);

CREATE POLICY "Admin pode deletar PDFs de comunicados" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'comunicados-pdfs' 
  AND (SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND perfil = 'admin' 
    AND ativo = true
  ))
);

-- Tabela de avisos de movimentaÃ§Ã£o (aparece no centro da tela)
CREATE TABLE public.avisos_movimentacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL, -- 'admissao', 'demissao', 'pedido_demissao'
  quantidade integer NOT NULL DEFAULT 1,
  setor_nome text,
  mensagem text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  criado_por text
);

-- Tabela para rastrear quem jÃ¡ viu cada aviso (exibe apenas 1x)
CREATE TABLE public.avisos_movimentacao_lidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id uuid NOT NULL REFERENCES public.avisos_movimentacao(id) ON DELETE CASCADE,
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  lido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(aviso_id, user_role_id)
);

-- RLS
ALTER TABLE public.avisos_movimentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_movimentacao_lidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total avisos_movimentacao" ON public.avisos_movimentacao
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total avisos_movimentacao_lidos" ON public.avisos_movimentacao_lidos
  FOR ALL USING (true) WITH CHECK (true);

-- Realtime para avisos
ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos_movimentacao;

-- Adicionar campo de tempo de inatividade em minutos (padrÃ£o 4 minutos)
ALTER TABLE public.user_roles ADD COLUMN tempo_inatividade integer NOT NULL DEFAULT 4;
ALTER TABLE public.user_roles ADD COLUMN email text;
-- Tabela de eventos do sistema (captura automÃ¡tica de tudo)
CREATE TABLE public.eventos_sistema (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL, -- 'admissao', 'demissao', 'pedido_demissao', 'transferencia', 'ativacao'
  descricao text NOT NULL,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  funcionario_nome text,
  setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
  setor_nome text,
  turma text,
  quantidade integer DEFAULT 1,
  dados_extra jsonb,
  notificado boolean DEFAULT false,
  notificado_em timestamptz,
  notificado_tipo text, -- 'modal' ou 'sino'
  criado_por text,
  created_at timestamptz DEFAULT now()
);

-- RLS permissiva (sistema local)
ALTER TABLE public.eventos_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total eventos_sistema" ON public.eventos_sistema FOR ALL USING (true) WITH CHECK (true);

-- Index para busca rÃ¡pida
CREATE INDEX idx_eventos_sistema_created ON public.eventos_sistema(created_at DESC);
CREATE INDEX idx_eventos_sistema_tipo ON public.eventos_sistema(tipo);
CREATE INDEX idx_eventos_sistema_notificado ON public.eventos_sistema(notificado);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos_sistema;

-- Criar tabela de tipos de desligamento gerenciÃ¡vel pelos administradores
CREATE TABLE public.tipos_desligamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  emoji text DEFAULT 'ðŸ“‹',
  tem_exame_demissional boolean NOT NULL DEFAULT true,
  tem_homologacao boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  template_texto text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tipos_desligamento ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ver (usado na carta de desligamento)
CREATE POLICY "Qualquer pessoa pode ver tipos_desligamento"
ON public.tipos_desligamento FOR SELECT
USING (true);

-- Apenas admins podem inserir
CREATE POLICY "Apenas admin pode inserir tipos_desligamento"
ON public.tipos_desligamento FOR INSERT
WITH CHECK (true);

-- Apenas admins podem atualizar
CREATE POLICY "Apenas admin pode atualizar tipos_desligamento"
ON public.tipos_desligamento FOR UPDATE
USING (true);

-- Apenas admins podem deletar
CREATE POLICY "Apenas admin pode deletar tipos_desligamento"
ON public.tipos_desligamento FOR DELETE
USING (true);

-- Trigger de updated_at
CREATE TRIGGER update_tipos_desligamento_updated_at
BEFORE UPDATE ON public.tipos_desligamento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir os tipos padrÃ£o
INSERT INTO public.tipos_desligamento (nome, descricao, emoji, tem_exame_demissional, tem_homologacao, ordem, template_texto) VALUES
(
  'Pedido de DemissÃ£o',
  'Colaborador solicita desligamento voluntÃ¡rio',
  'âœ‹',
  true,
  true,
  1,
  'Comunicamos que o(a) colaborador(a) {NOME}, ocupante do cargo de {CARGO}, manifestou formalmente seu pedido de demissÃ£o, sendo o Ãºltimo dia de trabalho em {DATA_DESLIGAMENTO}.\n\nAgradecemos pelos serviÃ§os prestados e desejamos sucesso em seus projetos futuros.'
),
(
  'Dispensa S/ Justa Causa',
  'Empresa dispensa o colaborador sem justa causa',
  'ðŸ“‹',
  true,
  true,
  2,
  'Comunicamos que o(a) colaborador(a) {NOME}, ocupante do cargo de {CARGO}, estÃ¡ sendo dispensado(a) sem justa causa, sendo o Ãºltimo dia de trabalho em {DATA_DESLIGAMENTO}.\n\nTodos os direitos trabalhistas previstos em lei serÃ£o devidamente cumpridos.'
),
(
  'Dem. Justa Causa',
  'Dispensa motivada por infraÃ§Ã£o disciplinar',
  'âš ï¸',
  false,
  false,
  3,
  'Comunicamos que o(a) colaborador(a) {NOME}, ocupante do cargo de {CARGO}, estÃ¡ sendo dispensado(a) por justa causa, nos termos do artigo 482 da ConsolidaÃ§Ã£o das Leis do Trabalho (CLT), sendo o Ãºltimo dia de trabalho em {DATA_DESLIGAMENTO}.\n\nA empresa mantÃ©m registros documentados das ocorrÃªncias que motivaram esta decisÃ£o.'
),
(
  'TÃ©rmino de Contrato',
  'Encerramento de contrato por prazo determinado',
  'ðŸ“…',
  true,
  false,
  4,
  'Comunicamos que o contrato de trabalho por prazo determinado do(a) colaborador(a) {NOME}, ocupante do cargo de {CARGO}, chega ao seu tÃ©rmino em {DATA_DESLIGAMENTO}, conforme previsto no instrumento contratual firmado entre as partes.\n\nAgradecemos pela dedicaÃ§Ã£o e comprometimento durante o perÃ­odo contratual.'
),
(
  'Ant. TÃ©rmino',
  'Encerramento antecipado de contrato temporÃ¡rio',
  'â©',
  true,
  false,
  5,
  'Comunicamos que o contrato de trabalho por prazo determinado do(a) colaborador(a) {NOME}, ocupante do cargo de {CARGO}, serÃ¡ encerrado antecipadamente em {DATA_DESLIGAMENTO}, nos termos do artigo 479 da ConsolidaÃ§Ã£o das Leis do Trabalho (CLT).\n\nTodos os direitos legais decorrentes da rescisÃ£o antecipada serÃ£o devidamente observados.'
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS recebe_notificacoes boolean NOT NULL DEFAULT true;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS pode_visualizar_faltas boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pode_visualizar_demissoes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_visualizar_homologacoes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_visualizar_divergencias boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_visualizar_previsao boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pode_editar_previsao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_visualizar_coberturas boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pode_editar_coberturas boolean NOT NULL DEFAULT false;

-- Sincronizar valores existentes com base nas permissÃµes atuais
UPDATE public.user_roles SET
  pode_visualizar_faltas = pode_editar_faltas OR acesso_admin,
  pode_visualizar_demissoes = pode_editar_demissoes OR acesso_admin,
  pode_visualizar_homologacoes = pode_editar_homologacoes OR acesso_admin,
  pode_visualizar_divergencias = pode_criar_divergencias OR acesso_admin,
  pode_visualizar_previsao = pode_visualizar_funcionarios OR acesso_admin,
  pode_editar_previsao = pode_editar_funcionarios OR acesso_admin,
  pode_visualizar_coberturas = pode_visualizar_funcionarios OR acesso_admin,
  pode_editar_coberturas = pode_editar_funcionarios OR acesso_admin;


ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS pode_visualizar_troca_turno boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS pode_editar_troca_turno boolean NOT NULL DEFAULT true;

-- Tabela de histÃ³rico de acesso dos usuÃ¡rios
CREATE TABLE public.historico_acesso (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_role_id uuid NOT NULL,
  nome_usuario text NOT NULL,
  data_acesso timestamp with time zone NOT NULL DEFAULT now(),
  ip text NULL,
  navegador text NULL,
  dispositivo text NULL
);

-- Enable RLS
ALTER TABLE public.historico_acesso ENABLE ROW LEVEL SECURITY;

-- PolÃ­tica: acesso total (mesma lÃ³gica das outras tabelas do sistema)
CREATE POLICY "Acesso total historico_acesso"
ON public.historico_acesso
FOR ALL
USING (true)
WITH CHECK (true);

-- Ãndice para consultas por usuÃ¡rio e data
CREATE INDEX idx_historico_acesso_user_role ON public.historico_acesso(user_role_id);
CREATE INDEX idx_historico_acesso_data ON public.historico_acesso(data_acesso DESC);

-- Adicionar 'DF' (Day OFF) ao enum ponto_tipo
ALTER TYPE public.ponto_tipo ADD VALUE IF NOT EXISTS 'DF';

-- Adicionar campo de status e retorno Ã  tabela divergencias_quadro
ALTER TABLE public.divergencias_quadro 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS descricao_acao text,
ADD COLUMN IF NOT EXISTS feedback_rh text;


-- Tabela para rastrear quem viu (clicou CIENTE) cada notificaÃ§Ã£o
CREATE TABLE public.notificacoes_vistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos_sistema(id) ON DELETE CASCADE,
  user_role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  nome_gestor TEXT NOT NULL,
  visto_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evento_id, user_role_id)
);

ALTER TABLE public.notificacoes_vistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total notificacoes_vistas" ON public.notificacoes_vistas
  FOR ALL USING (true) WITH CHECK (true);

-- Ãndice para buscas rÃ¡pidas
CREATE INDEX idx_notificacoes_vistas_evento ON public.notificacoes_vistas(evento_id);
CREATE INDEX idx_notificacoes_vistas_user ON public.notificacoes_vistas(user_role_id);


-- Tabela para configurar horÃ¡rios de envio automÃ¡tico de notificaÃ§Ãµes de previsÃ£o por setor
CREATE TABLE public.previsao_horarios_notificacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_grupo TEXT NOT NULL, -- ex: 'SOPRO A', 'SOPRO B', 'DECORAÃ‡ÃƒO DIA'
  horario TIME NOT NULL, -- horÃ¡rio de envio
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_envio DATE, -- data do Ãºltimo envio (para evitar duplicatas no mesmo dia)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setor_grupo)
);

-- Enable RLS
ALTER TABLE public.previsao_horarios_notificacao ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Qualquer pessoa pode ver horarios notificacao"
ON public.previsao_horarios_notificacao FOR SELECT USING (true);

CREATE POLICY "Qualquer pessoa pode inserir horarios notificacao"
ON public.previsao_horarios_notificacao FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar horarios notificacao"
ON public.previsao_horarios_notificacao FOR UPDATE USING (true);

CREATE POLICY "Qualquer pessoa pode deletar horarios notificacao"
ON public.previsao_horarios_notificacao FOR DELETE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_previsao_horarios_updated_at
BEFORE UPDATE ON public.previsao_horarios_notificacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir horÃ¡rios padrÃ£o
INSERT INTO public.previsao_horarios_notificacao (setor_grupo, horario) VALUES
  ('SOPRO A', '08:00'),
  ('SOPRO B', '16:00'),
  ('SOPRO C', '23:30'),
  ('DECORAÃ‡ÃƒO DIA', '08:00'),
  ('DECORAÃ‡ÃƒO NOITE', '20:00');


-- Fix ALL RESTRICTIVE policies to PERMISSIVE across all tables

-- previsao_horarios_notificacao
DROP POLICY IF EXISTS "Qualquer pessoa pode ver horarios notificacao" ON public.previsao_horarios_notificacao;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir horarios notificacao" ON public.previsao_horarios_notificacao;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar horarios notificacao" ON public.previsao_horarios_notificacao;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar horarios notificacao" ON public.previsao_horarios_notificacao;
CREATE POLICY "Qualquer pessoa pode ver horarios notificacao" ON public.previsao_horarios_notificacao FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir horarios notificacao" ON public.previsao_horarios_notificacao FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar horarios notificacao" ON public.previsao_horarios_notificacao FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar horarios notificacao" ON public.previsao_horarios_notificacao FOR DELETE USING (true);

-- avisos_movimentacao_lidos
DROP POLICY IF EXISTS "Acesso total avisos_movimentacao_lidos" ON public.avisos_movimentacao_lidos;
CREATE POLICY "Acesso total avisos_movimentacao_lidos" ON public.avisos_movimentacao_lidos FOR ALL USING (true) WITH CHECK (true);

-- user_roles_setores
DROP POLICY IF EXISTS "Acesso total user_roles_setores" ON public.user_roles_setores;
CREATE POLICY "Acesso total user_roles_setores" ON public.user_roles_setores FOR ALL USING (true) WITH CHECK (true);

-- notificacoes_vistas
DROP POLICY IF EXISTS "Acesso total notificacoes_vistas" ON public.notificacoes_vistas;
CREATE POLICY "Acesso total notificacoes_vistas" ON public.notificacoes_vistas FOR ALL USING (true) WITH CHECK (true);

-- historico_acesso
DROP POLICY IF EXISTS "Acesso total historico_acesso" ON public.historico_acesso;
CREATE POLICY "Acesso total historico_acesso" ON public.historico_acesso FOR ALL USING (true) WITH CHECK (true);

-- avisos_movimentacao
DROP POLICY IF EXISTS "Acesso total avisos_movimentacao" ON public.avisos_movimentacao;
CREATE POLICY "Acesso total avisos_movimentacao" ON public.avisos_movimentacao FOR ALL USING (true) WITH CHECK (true);

-- eventos_sistema
DROP POLICY IF EXISTS "Acesso total eventos_sistema" ON public.eventos_sistema;
CREATE POLICY "Acesso total eventos_sistema" ON public.eventos_sistema FOR ALL USING (true) WITH CHECK (true);

-- notificacoes
DROP POLICY IF EXISTS "Acesso total notificacoes" ON public.notificacoes;
CREATE POLICY "Acesso total notificacoes" ON public.notificacoes FOR ALL USING (true) WITH CHECK (true);

-- user_roles
DROP POLICY IF EXISTS "Acesso total user_roles" ON public.user_roles;
CREATE POLICY "Acesso total user_roles" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

-- historico_auditoria
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir historico" ON public.historico_auditoria;
DROP POLICY IF EXISTS "Qualquer pessoa pode ver historico" ON public.historico_auditoria;
CREATE POLICY "Qualquer pessoa pode ver historico" ON public.historico_auditoria FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir historico" ON public.historico_auditoria FOR INSERT WITH CHECK (true);

-- historico_quadro
DROP POLICY IF EXISTS "Qualquer pessoa pode ver historico_quadro" ON public.historico_quadro;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir historico_quadro" ON public.historico_quadro;
CREATE POLICY "Qualquer pessoa pode ver historico_quadro" ON public.historico_quadro FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir historico_quadro" ON public.historico_quadro FOR INSERT WITH CHECK (true);

-- historico_faltas
DROP POLICY IF EXISTS "Leitura para usuÃ¡rios ativos" ON public.historico_faltas;
DROP POLICY IF EXISTS "InserÃ§Ã£o para usuÃ¡rios ativos" ON public.historico_faltas;
CREATE POLICY "Leitura para usuÃ¡rios ativos" ON public.historico_faltas FOR SELECT USING (true);
CREATE POLICY "InserÃ§Ã£o para usuÃ¡rios ativos" ON public.historico_faltas FOR INSERT WITH CHECK (true);

-- quadro_decoracao
DROP POLICY IF EXISTS "Qualquer pessoa pode ver quadro decoracao" ON public.quadro_decoracao;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir quadro decoracao" ON public.quadro_decoracao;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar quadro decoracao" ON public.quadro_decoracao;
CREATE POLICY "Qualquer pessoa pode ver quadro decoracao" ON public.quadro_decoracao FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir quadro decoracao" ON public.quadro_decoracao FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar quadro decoracao" ON public.quadro_decoracao FOR UPDATE USING (true);

-- quadro_planejado
DROP POLICY IF EXISTS "Qualquer pessoa pode ver quadro planejado" ON public.quadro_planejado;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir quadro planejado" ON public.quadro_planejado;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar quadro planejado" ON public.quadro_planejado;
CREATE POLICY "Qualquer pessoa pode ver quadro planejado" ON public.quadro_planejado FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir quadro planejado" ON public.quadro_planejado FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar quadro planejado" ON public.quadro_planejado FOR UPDATE USING (true);

-- funcionarios
DROP POLICY IF EXISTS "Qualquer pessoa pode ver funcionÃ¡rios" ON public.funcionarios;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir funcionÃ¡rios" ON public.funcionarios;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar funcionÃ¡rios" ON public.funcionarios;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar funcionÃ¡rios" ON public.funcionarios;
CREATE POLICY "Qualquer pessoa pode ver funcionÃ¡rios" ON public.funcionarios FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir funcionÃ¡rios" ON public.funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar funcionÃ¡rios" ON public.funcionarios FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar funcionÃ¡rios" ON public.funcionarios FOR DELETE USING (true);

-- setores
DROP POLICY IF EXISTS "Qualquer pessoa pode ver setores" ON public.setores;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir setores" ON public.setores;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar setores" ON public.setores;
CREATE POLICY "Qualquer pessoa pode ver setores" ON public.setores FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir setores" ON public.setores FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar setores" ON public.setores FOR UPDATE USING (true);

-- situacoes
DROP POLICY IF EXISTS "Qualquer pessoa pode ver situaÃ§Ãµes" ON public.situacoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir situacoes" ON public.situacoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar situacoes" ON public.situacoes;
CREATE POLICY "Qualquer pessoa pode ver situaÃ§Ãµes" ON public.situacoes FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir situacoes" ON public.situacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar situacoes" ON public.situacoes FOR UPDATE USING (true);

-- demissoes
DROP POLICY IF EXISTS "Qualquer pessoa pode ver demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar demissoes" ON public.demissoes;
CREATE POLICY "Qualquer pessoa pode ver demissoes" ON public.demissoes FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir demissoes" ON public.demissoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar demissoes" ON public.demissoes FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar demissoes" ON public.demissoes FOR DELETE USING (true);

-- periodos_ponto
DROP POLICY IF EXISTS "Qualquer pessoa pode ver periodos_ponto" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir periodos_ponto" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar periodos_ponto" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Qualquer pessoa pode ver periodos_ponto" ON public.periodos_ponto FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir periodos_ponto" ON public.periodos_ponto FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar periodos_ponto" ON public.periodos_ponto FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar periodos_ponto" ON public.periodos_ponto FOR DELETE USING (true);

-- registros_ponto
DROP POLICY IF EXISTS "Qualquer pessoa pode ver registros_ponto" ON public.registros_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir registros_ponto" ON public.registros_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar registros_ponto" ON public.registros_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar registros_ponto" ON public.registros_ponto;
CREATE POLICY "Qualquer pessoa pode ver registros_ponto" ON public.registros_ponto FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir registros_ponto" ON public.registros_ponto FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar registros_ponto" ON public.registros_ponto FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar registros_ponto" ON public.registros_ponto FOR DELETE USING (true);

-- divergencias_quadro
DROP POLICY IF EXISTS "Qualquer pessoa pode ver divergencias" ON public.divergencias_quadro;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir divergencias" ON public.divergencias_quadro;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar divergencias" ON public.divergencias_quadro;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar divergencias" ON public.divergencias_quadro;
CREATE POLICY "Qualquer pessoa pode ver divergencias" ON public.divergencias_quadro FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir divergencias" ON public.divergencias_quadro FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar divergencias" ON public.divergencias_quadro FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar divergencias" ON public.divergencias_quadro FOR DELETE USING (true);

-- divergencias_ponto
DROP POLICY IF EXISTS "Leitura divergencias ponto" ON public.divergencias_ponto;
DROP POLICY IF EXISTS "InserÃ§Ã£o divergencias ponto" ON public.divergencias_ponto;
DROP POLICY IF EXISTS "AtualizaÃ§Ã£o divergencias ponto" ON public.divergencias_ponto;
DROP POLICY IF EXISTS "ExclusÃ£o divergencias ponto" ON public.divergencias_ponto;
CREATE POLICY "Leitura divergencias ponto" ON public.divergencias_ponto FOR SELECT USING (true);
CREATE POLICY "InserÃ§Ã£o divergencias ponto" ON public.divergencias_ponto FOR INSERT WITH CHECK (true);
CREATE POLICY "AtualizaÃ§Ã£o divergencias ponto" ON public.divergencias_ponto FOR UPDATE USING (true);
CREATE POLICY "ExclusÃ£o divergencias ponto" ON public.divergencias_ponto FOR DELETE USING (true);

-- trocas_turno
DROP POLICY IF EXISTS "Qualquer pessoa pode ver trocas_turno" ON public.trocas_turno;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir trocas_turno" ON public.trocas_turno;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar trocas_turno" ON public.trocas_turno;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar trocas_turno" ON public.trocas_turno;
CREATE POLICY "Qualquer pessoa pode ver trocas_turno" ON public.trocas_turno FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir trocas_turno" ON public.trocas_turno FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar trocas_turno" ON public.trocas_turno FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar trocas_turno" ON public.trocas_turno FOR DELETE USING (true);

-- periodos_demissao
DROP POLICY IF EXISTS "Qualquer pessoa pode ver periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar periodos_demissao" ON public.periodos_demissao;
CREATE POLICY "Qualquer pessoa pode ver periodos_demissao" ON public.periodos_demissao FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir periodos_demissao" ON public.periodos_demissao FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar periodos_demissao" ON public.periodos_demissao FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar periodos_demissao" ON public.periodos_demissao FOR DELETE USING (true);

-- previsao_documentos
DROP POLICY IF EXISTS "Qualquer pessoa pode ver previsao_documentos" ON public.previsao_documentos;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir previsao_documentos" ON public.previsao_documentos;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar previsao_documentos" ON public.previsao_documentos;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar previsao_documentos" ON public.previsao_documentos;
CREATE POLICY "Qualquer pessoa pode ver previsao_documentos" ON public.previsao_documentos FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir previsao_documentos" ON public.previsao_documentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar previsao_documentos" ON public.previsao_documentos FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar previsao_documentos" ON public.previsao_documentos FOR DELETE USING (true);

-- previsao_documentos_historico
DROP POLICY IF EXISTS "Qualquer pessoa pode ver previsao_documentos_historico" ON public.previsao_documentos_historico;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir previsao_documentos_historico" ON public.previsao_documentos_historico;
CREATE POLICY "Qualquer pessoa pode ver previsao_documentos_historico" ON public.previsao_documentos_historico FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir previsao_documentos_historico" ON public.previsao_documentos_historico FOR INSERT WITH CHECK (true);

-- tipos_desligamento
DROP POLICY IF EXISTS "Qualquer pessoa pode ver tipos_desligamento" ON public.tipos_desligamento;
DROP POLICY IF EXISTS "Apenas admin pode inserir tipos_desligamento" ON public.tipos_desligamento;
DROP POLICY IF EXISTS "Apenas admin pode atualizar tipos_desligamento" ON public.tipos_desligamento;
DROP POLICY IF EXISTS "Apenas admin pode deletar tipos_desligamento" ON public.tipos_desligamento;
CREATE POLICY "Qualquer pessoa pode ver tipos_desligamento" ON public.tipos_desligamento FOR SELECT USING (true);
CREATE POLICY "Apenas admin pode inserir tipos_desligamento" ON public.tipos_desligamento FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admin pode atualizar tipos_desligamento" ON public.tipos_desligamento FOR UPDATE USING (true);
CREATE POLICY "Apenas admin pode deletar tipos_desligamento" ON public.tipos_desligamento FOR DELETE USING (true);

-- usuarios
DROP POLICY IF EXISTS "UsuÃ¡rios podem ver prÃ³prio registro ou admin vÃª todos" ON public.usuarios;
DROP POLICY IF EXISTS "Apenas admin pode inserir usuÃ¡rios" ON public.usuarios;
DROP POLICY IF EXISTS "Apenas admin pode atualizar usuÃ¡rios" ON public.usuarios;
CREATE POLICY "UsuÃ¡rios podem ver prÃ³prio registro ou admin vÃª todos" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "Apenas admin pode inserir usuÃ¡rios" ON public.usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admin pode atualizar usuÃ¡rios" ON public.usuarios FOR UPDATE USING (true);

-- comunicados
DROP POLICY IF EXISTS "Comunicados sÃ£o pÃºblicos para leitura" ON public.comunicados;
DROP POLICY IF EXISTS "Apenas admin pode inserir comunicados" ON public.comunicados;
DROP POLICY IF EXISTS "Apenas admin pode atualizar comunicados" ON public.comunicados;
DROP POLICY IF EXISTS "Apenas admin pode deletar comunicados" ON public.comunicados;
CREATE POLICY "Comunicados sÃ£o pÃºblicos para leitura" ON public.comunicados FOR SELECT USING (true);
CREATE POLICY "Apenas admin pode inserir comunicados" ON public.comunicados FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admin pode atualizar comunicados" ON public.comunicados FOR UPDATE USING (true);
CREATE POLICY "Apenas admin pode deletar comunicados" ON public.comunicados FOR DELETE USING (true);

-- comunicados_categorias
DROP POLICY IF EXISTS "Categorias sÃ£o pÃºblicas para leitura" ON public.comunicados_categorias;
DROP POLICY IF EXISTS "Apenas admin pode inserir categorias" ON public.comunicados_categorias;
DROP POLICY IF EXISTS "Apenas admin pode atualizar categorias" ON public.comunicados_categorias;
DROP POLICY IF EXISTS "Apenas admin pode deletar categorias" ON public.comunicados_categorias;
CREATE POLICY "Categorias sÃ£o pÃºblicas para leitura" ON public.comunicados_categorias FOR SELECT USING (true);
CREATE POLICY "Apenas admin pode inserir categorias" ON public.comunicados_categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admin pode atualizar categorias" ON public.comunicados_categorias FOR UPDATE USING (true);
CREATE POLICY "Apenas admin pode deletar categorias" ON public.comunicados_categorias FOR DELETE USING (true);

-- Limpar todas as tabelas de notificaÃ§Ãµes
DELETE FROM notificacoes_vistas;
DELETE FROM notificacoes;
DELETE FROM avisos_movimentacao_lidos;
DELETE FROM avisos_movimentacao;
DELETE FROM eventos_sistema;

-- Tabela para persistir decisÃµes de experiÃªncia (efetivar/desligar)
CREATE TABLE public.experiencia_decisoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  decisao TEXT NOT NULL CHECK (decisao IN ('demitido', 'efetivado')),
  criado_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funcionario_id)
);

-- Enable RLS
ALTER TABLE public.experiencia_decisoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total experiencia_decisoes" ON public.experiencia_decisoes
  FOR ALL USING (true) WITH CHECK (true);


-- Adicionar campos de data Ã  tabela experiencia_decisoes
ALTER TABLE public.experiencia_decisoes
ADD COLUMN data_programada date,
ADD COLUMN data_prevista date;

ALTER TABLE public.funcionarios ADD COLUMN tamanho_uniforme text NULL;
ALTER TABLE public.funcionarios 
  ADD COLUMN tamanho_calca text NULL,
  ADD COLUMN tamanho_camiseta text NULL,
  ADD COLUMN tamanho_calcado text NULL,
  ADD COLUMN usa_oculos boolean NULL DEFAULT false;

-- Adicionar campos de data inÃ­cio e fim para coberturas/treinamentos
ALTER TABLE public.funcionarios 
ADD COLUMN cobertura_data_inicio date DEFAULT NULL,
ADD COLUMN cobertura_data_fim date DEFAULT NULL;


-- Tabela de controle de armÃ¡rios femininos
CREATE TABLE public.armarios_femininos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero integer NOT NULL UNIQUE,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar todos os 401 armÃ¡rios
INSERT INTO public.armarios_femininos (numero)
SELECT generate_series(1, 401);

-- Enable RLS
ALTER TABLE public.armarios_femininos ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de acesso
CREATE POLICY "Qualquer pessoa pode ver armarios" ON public.armarios_femininos FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode atualizar armarios" ON public.armarios_femininos FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode inserir armarios" ON public.armarios_femininos FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode deletar armarios" ON public.armarios_femininos FOR DELETE USING (true);

-- Trigger updated_at
CREATE TRIGGER update_armarios_femininos_updated_at
  BEFORE UPDATE ON public.armarios_femininos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar 'DA' ao enum ponto_tipo
ALTER TYPE public.ponto_tipo ADD VALUE IF NOT EXISTS 'DA';
ALTER TYPE public.ponto_tipo ADD VALUE IF NOT EXISTS 'S';
ALTER TABLE public.armarios_femininos ADD COLUMN local text NOT NULL DEFAULT 'VESTIARIO';
ALTER TABLE public.experiencia_decisoes ADD COLUMN funcionario_ciente boolean NOT NULL DEFAULT false;
ALTER TABLE public.experiencia_decisoes ADD COLUMN responsavel text NULL;
-- Adicionar 'SS' ao enum ponto_tipo
ALTER TYPE ponto_tipo ADD VALUE IF NOT EXISTS 'SS';

-- Migrar registros existentes de 'S' para 'SS'
UPDATE registros_ponto SET tipo = 'SS' WHERE tipo = 'S';
UPDATE historico_faltas SET tipo_novo = 'SS' WHERE tipo_novo = 'S';
UPDATE historico_faltas SET tipo_anterior = 'SS' WHERE tipo_anterior = 'S';
UPDATE divergencias_ponto SET tipo_solicitado = 'SS' WHERE tipo_solicitado = 'S';
UPDATE divergencias_ponto SET tipo_atual = 'SS' WHERE tipo_atual = 'S';


-- Ãndices para melhorar performance das queries mais frequentes
CREATE INDEX IF NOT EXISTS idx_funcionarios_setor_id ON public.funcionarios (setor_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_situacao_id ON public.funcionarios (situacao_id);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_funcionario_id ON public.registros_ponto (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_periodo_id ON public.registros_ponto (periodo_id);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_data ON public.registros_ponto (data);
CREATE INDEX IF NOT EXISTS idx_demissoes_funcionario_id ON public.demissoes (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_divergencias_quadro_funcionario_id ON public.divergencias_quadro (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_divergencias_ponto_funcionario_id ON public.divergencias_ponto (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_divergencias_ponto_periodo_id ON public.divergencias_ponto (periodo_id);
CREATE INDEX IF NOT EXISTS idx_trocas_turno_funcionario_id ON public.trocas_turno (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_eventos_sistema_tipo ON public.eventos_sistema (tipo);
CREATE INDEX IF NOT EXISTS idx_historico_auditoria_tabela ON public.historico_auditoria (tabela);


-- Tabela para armazenar liberaÃ§Ãµes de datas no controle de faltas
CREATE TABLE public.liberacoes_faltas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  data_liberada DATE NOT NULL,
  liberado_por TEXT NOT NULL,
  expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setor_id, data_liberada)
);

-- Enable RLS
ALTER TABLE public.liberacoes_faltas ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas permissivas (controle feito na aplicaÃ§Ã£o)
CREATE POLICY "Qualquer pessoa pode ver liberacoes_faltas"
  ON public.liberacoes_faltas FOR SELECT USING (true);

CREATE POLICY "Qualquer pessoa pode inserir liberacoes_faltas"
  ON public.liberacoes_faltas FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode deletar liberacoes_faltas"
  ON public.liberacoes_faltas FOR DELETE USING (true);

CREATE POLICY "Qualquer pessoa pode atualizar liberacoes_faltas"
  ON public.liberacoes_faltas FOR UPDATE USING (true);

-- Tabela para controlar force-logout global
CREATE TABLE public.force_logout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  triggered_by text NOT NULL
);

ALTER TABLE public.force_logout ENABLE ROW LEVEL SECURITY;

-- Todos podem ler (para verificar se precisam deslogar)
CREATE POLICY "Qualquer pessoa pode ver force_logout"
ON public.force_logout FOR SELECT
USING (true);

-- Apenas inserir (admin farÃ¡ via app)
CREATE POLICY "Qualquer pessoa pode inserir force_logout"
ON public.force_logout FOR INSERT
WITH CHECK (true);

-- Permitir delete para limpeza
CREATE POLICY "Qualquer pessoa pode deletar force_logout"
ON public.force_logout FOR DELETE
USING (true);

-- Remove a constraint unique antiga do numero sozinho
ALTER TABLE public.armarios_femininos DROP CONSTRAINT IF EXISTS armarios_femininos_numero_key;

-- Adiciona constraint unique composta (numero + local)
ALTER TABLE public.armarios_femininos ADD CONSTRAINT armarios_femininos_numero_local_key UNIQUE (numero, local);


-- Tabela para configuraÃ§Ã£o de capacidade de armÃ¡rios por local
CREATE TABLE public.armarios_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  local text NOT NULL UNIQUE,
  total integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.armarios_config ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas permissivas (controle na aplicaÃ§Ã£o)
CREATE POLICY "Qualquer pessoa pode ver armarios_config" ON public.armarios_config FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode atualizar armarios_config" ON public.armarios_config FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode inserir armarios_config" ON public.armarios_config FOR INSERT WITH CHECK (true);

-- Dados iniciais
INSERT INTO public.armarios_config (local, total) VALUES
  ('SOPRO', 400),
  ('DECORACAO', 100),
  ('CONTAINER', 50);


-- Tabela de configuraÃ§Ã£o do sistema (validade e bloqueio)
CREATE TABLE public.sistema_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_bloqueado boolean NOT NULL DEFAULT false,
  data_validade date NULL,
  dias_validade integer NULL,
  motivo_bloqueio text NULL,
  atualizado_por text NOT NULL DEFAULT 'SISTEMA',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sistema_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode ver sistema_config" ON public.sistema_config FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode atualizar sistema_config" ON public.sistema_config FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode inserir sistema_config" ON public.sistema_config FOR INSERT WITH CHECK (true);

-- Inserir configuraÃ§Ã£o padrÃ£o (sistema liberado, sem validade)
INSERT INTO public.sistema_config (sistema_bloqueado, data_validade, dias_validade, atualizado_por)
VALUES (false, null, null, 'LUCIANO');


-- Trigger: ao atualizar funcionÃ¡rio, liberar armÃ¡rio automaticamente se necessÃ¡rio
CREATE OR REPLACE FUNCTION public.auto_liberar_armario_feminino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _situacao_nome text;
BEGIN
  -- Se sexo mudou de feminino para masculino, liberar armÃ¡rio
  IF OLD.sexo = 'feminino' AND NEW.sexo = 'masculino' THEN
    UPDATE armarios_femininos 
    SET funcionario_id = NULL, observacoes = 'Liberado automaticamente - sexo alterado', updated_at = now()
    WHERE funcionario_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Se situaÃ§Ã£o mudou, verificar se a nova situaÃ§Ã£o Ã© elegÃ­vel
  IF OLD.situacao_id IS DISTINCT FROM NEW.situacao_id THEN
    SELECT nome INTO _situacao_nome FROM situacoes WHERE id = NEW.situacao_id;
    
    IF _situacao_nome NOT IN ('ATIVO', 'FÃ‰RIAS', 'COB. FÃ‰RIAS', 'AUXÃLIO DOENÃ‡A', 'TREINAMENTO') THEN
      UPDATE armarios_femininos 
      SET funcionario_id = NULL, observacoes = 'Liberado automaticamente - situaÃ§Ã£o: ' || COALESCE(_situacao_nome, 'desconhecida'), updated_at = now()
      WHERE funcionario_id = NEW.id;
    END IF;
  END IF;

  -- Se foi demitido (data_demissao preenchida), liberar armÃ¡rio
  IF OLD.data_demissao IS NULL AND NEW.data_demissao IS NOT NULL THEN
    UPDATE armarios_femininos 
    SET funcionario_id = NULL, observacoes = 'Liberado automaticamente - demissÃ£o', updated_at = now()
    WHERE funcionario_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_liberar_armario
BEFORE UPDATE ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.auto_liberar_armario_feminino();


-- Fix: Convert all RESTRICTIVE policies to PERMISSIVE
-- The issue: all policies are RESTRICTIVE (FORCE), which blocks access when there are no PERMISSIVE policies

-- user_roles
DROP POLICY IF EXISTS "Acesso total user_roles" ON public.user_roles;
CREATE POLICY "Acesso total user_roles" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

-- user_roles_setores
DROP POLICY IF EXISTS "Acesso total user_roles_setores" ON public.user_roles_setores;
CREATE POLICY "Acesso total user_roles_setores" ON public.user_roles_setores FOR ALL USING (true) WITH CHECK (true);

-- funcionarios
DROP POLICY IF EXISTS "Qualquer pessoa pode ver funcionÃ¡rios" ON public.funcionarios;
CREATE POLICY "Qualquer pessoa pode ver funcionÃ¡rios" ON public.funcionarios FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir funcionÃ¡rios" ON public.funcionarios;
CREATE POLICY "Qualquer pessoa pode inserir funcionÃ¡rios" ON public.funcionarios FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar funcionÃ¡rios" ON public.funcionarios;
CREATE POLICY "Qualquer pessoa pode atualizar funcionÃ¡rios" ON public.funcionarios FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar funcionÃ¡rios" ON public.funcionarios;
CREATE POLICY "Qualquer pessoa pode deletar funcionÃ¡rios" ON public.funcionarios FOR DELETE USING (true);

-- setores
DROP POLICY IF EXISTS "Qualquer pessoa pode ver setores" ON public.setores;
CREATE POLICY "Qualquer pessoa pode ver setores" ON public.setores FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir setores" ON public.setores;
CREATE POLICY "Qualquer pessoa pode inserir setores" ON public.setores FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar setores" ON public.setores;
CREATE POLICY "Qualquer pessoa pode atualizar setores" ON public.setores FOR UPDATE USING (true);

-- situacoes
DROP POLICY IF EXISTS "Qualquer pessoa pode ver situaÃ§Ãµes" ON public.situacoes;
CREATE POLICY "Qualquer pessoa pode ver situaÃ§Ãµes" ON public.situacoes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir situacoes" ON public.situacoes;
CREATE POLICY "Qualquer pessoa pode inserir situacoes" ON public.situacoes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar situacoes" ON public.situacoes;
CREATE POLICY "Qualquer pessoa pode atualizar situacoes" ON public.situacoes FOR UPDATE USING (true);

-- sistema_config
DROP POLICY IF EXISTS "Qualquer pessoa pode ver sistema_config" ON public.sistema_config;
CREATE POLICY "Qualquer pessoa pode ver sistema_config" ON public.sistema_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir sistema_config" ON public.sistema_config;
CREATE POLICY "Qualquer pessoa pode inserir sistema_config" ON public.sistema_config FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar sistema_config" ON public.sistema_config;
CREATE POLICY "Qualquer pessoa pode atualizar sistema_config" ON public.sistema_config FOR UPDATE USING (true);

-- registros_ponto
DROP POLICY IF EXISTS "Qualquer pessoa pode ver registros_ponto" ON public.registros_ponto;
CREATE POLICY "Qualquer pessoa pode ver registros_ponto" ON public.registros_ponto FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir registros_ponto" ON public.registros_ponto;
CREATE POLICY "Qualquer pessoa pode inserir registros_ponto" ON public.registros_ponto FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar registros_ponto" ON public.registros_ponto;
CREATE POLICY "Qualquer pessoa pode atualizar registros_ponto" ON public.registros_ponto FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar registros_ponto" ON public.registros_ponto;
CREATE POLICY "Qualquer pessoa pode deletar registros_ponto" ON public.registros_ponto FOR DELETE USING (true);

-- periodos_ponto
DROP POLICY IF EXISTS "Qualquer pessoa pode ver periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Qualquer pessoa pode ver periodos_ponto" ON public.periodos_ponto FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Qualquer pessoa pode inserir periodos_ponto" ON public.periodos_ponto FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Qualquer pessoa pode atualizar periodos_ponto" ON public.periodos_ponto FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Qualquer pessoa pode deletar periodos_ponto" ON public.periodos_ponto FOR DELETE USING (true);

-- demissoes
DROP POLICY IF EXISTS "Qualquer pessoa pode ver demissoes" ON public.demissoes;
CREATE POLICY "Qualquer pessoa pode ver demissoes" ON public.demissoes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir demissoes" ON public.demissoes;
CREATE POLICY "Qualquer pessoa pode inserir demissoes" ON public.demissoes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar demissoes" ON public.demissoes;
CREATE POLICY "Qualquer pessoa pode atualizar demissoes" ON public.demissoes FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar demissoes" ON public.demissoes;
CREATE POLICY "Qualquer pessoa pode deletar demissoes" ON public.demissoes FOR DELETE USING (true);

-- historico_acesso
DROP POLICY IF EXISTS "Acesso total historico_acesso" ON public.historico_acesso;
CREATE POLICY "Acesso total historico_acesso" ON public.historico_acesso FOR ALL USING (true) WITH CHECK (true);

-- eventos_sistema
DROP POLICY IF EXISTS "Acesso total eventos_sistema" ON public.eventos_sistema;
CREATE POLICY "Acesso total eventos_sistema" ON public.eventos_sistema FOR ALL USING (true) WITH CHECK (true);

-- notificacoes
DROP POLICY IF EXISTS "Acesso total notificacoes" ON public.notificacoes;
CREATE POLICY "Acesso total notificacoes" ON public.notificacoes FOR ALL USING (true) WITH CHECK (true);

-- notificacoes_vistas
DROP POLICY IF EXISTS "Acesso total notificacoes_vistas" ON public.notificacoes_vistas;
CREATE POLICY "Acesso total notificacoes_vistas" ON public.notificacoes_vistas FOR ALL USING (true) WITH CHECK (true);

-- avisos_movimentacao
DROP POLICY IF EXISTS "Acesso total avisos_movimentacao" ON public.avisos_movimentacao;
CREATE POLICY "Acesso total avisos_movimentacao" ON public.avisos_movimentacao FOR ALL USING (true) WITH CHECK (true);

-- avisos_movimentacao_lidos
DROP POLICY IF EXISTS "Acesso total avisos_movimentacao_lidos" ON public.avisos_movimentacao_lidos;
CREATE POLICY "Acesso total avisos_movimentacao_lidos" ON public.avisos_movimentacao_lidos FOR ALL USING (true) WITH CHECK (true);

-- experiencia_decisoes
DROP POLICY IF EXISTS "Acesso total experiencia_decisoes" ON public.experiencia_decisoes;
CREATE POLICY "Acesso total experiencia_decisoes" ON public.experiencia_decisoes FOR ALL USING (true) WITH CHECK (true);

-- divergencias_quadro
DROP POLICY IF EXISTS "Qualquer pessoa pode ver divergencias" ON public.divergencias_quadro;
CREATE POLICY "Qualquer pessoa pode ver divergencias" ON public.divergencias_quadro FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir divergencias" ON public.divergencias_quadro;
CREATE POLICY "Qualquer pessoa pode inserir divergencias" ON public.divergencias_quadro FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar divergencias" ON public.divergencias_quadro;
CREATE POLICY "Qualquer pessoa pode atualizar divergencias" ON public.divergencias_quadro FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar divergencias" ON public.divergencias_quadro;
CREATE POLICY "Qualquer pessoa pode deletar divergencias" ON public.divergencias_quadro FOR DELETE USING (true);

-- divergencias_ponto
DROP POLICY IF EXISTS "Leitura divergencias ponto" ON public.divergencias_ponto;
CREATE POLICY "Leitura divergencias ponto" ON public.divergencias_ponto FOR SELECT USING (true);
DROP POLICY IF EXISTS "InserÃ§Ã£o divergencias ponto" ON public.divergencias_ponto;
CREATE POLICY "InserÃ§Ã£o divergencias ponto" ON public.divergencias_ponto FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "AtualizaÃ§Ã£o divergencias ponto" ON public.divergencias_ponto;
CREATE POLICY "AtualizaÃ§Ã£o divergencias ponto" ON public.divergencias_ponto FOR UPDATE USING (true);
DROP POLICY IF EXISTS "ExclusÃ£o divergencias ponto" ON public.divergencias_ponto;
CREATE POLICY "ExclusÃ£o divergencias ponto" ON public.divergencias_ponto FOR DELETE USING (true);

-- trocas_turno
DROP POLICY IF EXISTS "Qualquer pessoa pode ver trocas_turno" ON public.trocas_turno;
CREATE POLICY "Qualquer pessoa pode ver trocas_turno" ON public.trocas_turno FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir trocas_turno" ON public.trocas_turno;
CREATE POLICY "Qualquer pessoa pode inserir trocas_turno" ON public.trocas_turno FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar trocas_turno" ON public.trocas_turno;
CREATE POLICY "Qualquer pessoa pode atualizar trocas_turno" ON public.trocas_turno FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar trocas_turno" ON public.trocas_turno;
CREATE POLICY "Qualquer pessoa pode deletar trocas_turno" ON public.trocas_turno FOR DELETE USING (true);

-- quadro_planejado
DROP POLICY IF EXISTS "Qualquer pessoa pode ver quadro planejado" ON public.quadro_planejado;
CREATE POLICY "Qualquer pessoa pode ver quadro planejado" ON public.quadro_planejado FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir quadro planejado" ON public.quadro_planejado;
CREATE POLICY "Qualquer pessoa pode inserir quadro planejado" ON public.quadro_planejado FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar quadro planejado" ON public.quadro_planejado;
CREATE POLICY "Qualquer pessoa pode atualizar quadro planejado" ON public.quadro_planejado FOR UPDATE USING (true);

-- quadro_decoracao
DROP POLICY IF EXISTS "Qualquer pessoa pode ver quadro decoracao" ON public.quadro_decoracao;
CREATE POLICY "Qualquer pessoa pode ver quadro decoracao" ON public.quadro_decoracao FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir quadro decoracao" ON public.quadro_decoracao;
CREATE POLICY "Qualquer pessoa pode inserir quadro decoracao" ON public.quadro_decoracao FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar quadro decoracao" ON public.quadro_decoracao;
CREATE POLICY "Qualquer pessoa pode atualizar quadro decoracao" ON public.quadro_decoracao FOR UPDATE USING (true);

-- historico_auditoria
DROP POLICY IF EXISTS "Qualquer pessoa pode ver historico" ON public.historico_auditoria;
CREATE POLICY "Qualquer pessoa pode ver historico" ON public.historico_auditoria FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir historico" ON public.historico_auditoria;
CREATE POLICY "Qualquer pessoa pode inserir historico" ON public.historico_auditoria FOR INSERT WITH CHECK (true);

-- historico_quadro
DROP POLICY IF EXISTS "Qualquer pessoa pode ver historico_quadro" ON public.historico_quadro;
CREATE POLICY "Qualquer pessoa pode ver historico_quadro" ON public.historico_quadro FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir historico_quadro" ON public.historico_quadro;
CREATE POLICY "Qualquer pessoa pode inserir historico_quadro" ON public.historico_quadro FOR INSERT WITH CHECK (true);

-- historico_faltas
DROP POLICY IF EXISTS "Leitura para usuÃ¡rios ativos" ON public.historico_faltas;
CREATE POLICY "Leitura para usuÃ¡rios ativos" ON public.historico_faltas FOR SELECT USING (true);
DROP POLICY IF EXISTS "InserÃ§Ã£o para usuÃ¡rios ativos" ON public.historico_faltas;
CREATE POLICY "InserÃ§Ã£o para usuÃ¡rios ativos" ON public.historico_faltas FOR INSERT WITH CHECK (true);

-- liberacoes_faltas
DROP POLICY IF EXISTS "Qualquer pessoa pode ver liberacoes_faltas" ON public.liberacoes_faltas;
CREATE POLICY "Qualquer pessoa pode ver liberacoes_faltas" ON public.liberacoes_faltas FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir liberacoes_faltas" ON public.liberacoes_faltas;
CREATE POLICY "Qualquer pessoa pode inserir liberacoes_faltas" ON public.liberacoes_faltas FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar liberacoes_faltas" ON public.liberacoes_faltas;
CREATE POLICY "Qualquer pessoa pode atualizar liberacoes_faltas" ON public.liberacoes_faltas FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar liberacoes_faltas" ON public.liberacoes_faltas;
CREATE POLICY "Qualquer pessoa pode deletar liberacoes_faltas" ON public.liberacoes_faltas FOR DELETE USING (true);

-- previsao_documentos
DROP POLICY IF EXISTS "Qualquer pessoa pode ver previsao_documentos" ON public.previsao_documentos;
CREATE POLICY "Qualquer pessoa pode ver previsao_documentos" ON public.previsao_documentos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir previsao_documentos" ON public.previsao_documentos;
CREATE POLICY "Qualquer pessoa pode inserir previsao_documentos" ON public.previsao_documentos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar previsao_documentos" ON public.previsao_documentos;
CREATE POLICY "Qualquer pessoa pode atualizar previsao_documentos" ON public.previsao_documentos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar previsao_documentos" ON public.previsao_documentos;
CREATE POLICY "Qualquer pessoa pode deletar previsao_documentos" ON public.previsao_documentos FOR DELETE USING (true);

-- previsao_documentos_historico
DROP POLICY IF EXISTS "Qualquer pessoa pode ver previsao_documentos_historico" ON public.previsao_documentos_historico;
CREATE POLICY "Qualquer pessoa pode ver previsao_documentos_historico" ON public.previsao_documentos_historico FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir previsao_documentos_historico" ON public.previsao_documentos_historico;
CREATE POLICY "Qualquer pessoa pode inserir previsao_documentos_historico" ON public.previsao_documentos_historico FOR INSERT WITH CHECK (true);

-- previsao_horarios_notificacao
DROP POLICY IF EXISTS "Qualquer pessoa pode ver horarios notificacao" ON public.previsao_horarios_notificacao;
CREATE POLICY "Qualquer pessoa pode ver horarios notificacao" ON public.previsao_horarios_notificacao FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir horarios notificacao" ON public.previsao_horarios_notificacao;
CREATE POLICY "Qualquer pessoa pode inserir horarios notificacao" ON public.previsao_horarios_notificacao FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar horarios notificacao" ON public.previsao_horarios_notificacao;
CREATE POLICY "Qualquer pessoa pode atualizar horarios notificacao" ON public.previsao_horarios_notificacao FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar horarios notificacao" ON public.previsao_horarios_notificacao;
CREATE POLICY "Qualquer pessoa pode deletar horarios notificacao" ON public.previsao_horarios_notificacao FOR DELETE USING (true);

-- periodos_demissao
DROP POLICY IF EXISTS "Qualquer pessoa pode ver periodos_demissao" ON public.periodos_demissao;
CREATE POLICY "Qualquer pessoa pode ver periodos_demissao" ON public.periodos_demissao FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir periodos_demissao" ON public.periodos_demissao;
CREATE POLICY "Qualquer pessoa pode inserir periodos_demissao" ON public.periodos_demissao FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar periodos_demissao" ON public.periodos_demissao;
CREATE POLICY "Qualquer pessoa pode atualizar periodos_demissao" ON public.periodos_demissao FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar periodos_demissao" ON public.periodos_demissao;
CREATE POLICY "Qualquer pessoa pode deletar periodos_demissao" ON public.periodos_demissao FOR DELETE USING (true);

-- tipos_desligamento
DROP POLICY IF EXISTS "Qualquer pessoa pode ver tipos_desligamento" ON public.tipos_desligamento;
CREATE POLICY "Qualquer pessoa pode ver tipos_desligamento" ON public.tipos_desligamento FOR SELECT USING (true);
DROP POLICY IF EXISTS "Apenas admin pode inserir tipos_desligamento" ON public.tipos_desligamento;
CREATE POLICY "Apenas admin pode inserir tipos_desligamento" ON public.tipos_desligamento FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Apenas admin pode atualizar tipos_desligamento" ON public.tipos_desligamento;
CREATE POLICY "Apenas admin pode atualizar tipos_desligamento" ON public.tipos_desligamento FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Apenas admin pode deletar tipos_desligamento" ON public.tipos_desligamento;
CREATE POLICY "Apenas admin pode deletar tipos_desligamento" ON public.tipos_desligamento FOR DELETE USING (true);

-- armarios_femininos
DROP POLICY IF EXISTS "Qualquer pessoa pode ver armarios" ON public.armarios_femininos;
CREATE POLICY "Qualquer pessoa pode ver armarios" ON public.armarios_femininos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir armarios" ON public.armarios_femininos;
CREATE POLICY "Qualquer pessoa pode inserir armarios" ON public.armarios_femininos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar armarios" ON public.armarios_femininos;
CREATE POLICY "Qualquer pessoa pode atualizar armarios" ON public.armarios_femininos FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar armarios" ON public.armarios_femininos;
CREATE POLICY "Qualquer pessoa pode deletar armarios" ON public.armarios_femininos FOR DELETE USING (true);

-- armarios_config
DROP POLICY IF EXISTS "Qualquer pessoa pode ver armarios_config" ON public.armarios_config;
CREATE POLICY "Qualquer pessoa pode ver armarios_config" ON public.armarios_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir armarios_config" ON public.armarios_config;
CREATE POLICY "Qualquer pessoa pode inserir armarios_config" ON public.armarios_config FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar armarios_config" ON public.armarios_config;
CREATE POLICY "Qualquer pessoa pode atualizar armarios_config" ON public.armarios_config FOR UPDATE USING (true);

-- force_logout
DROP POLICY IF EXISTS "Qualquer pessoa pode ver force_logout" ON public.force_logout;
CREATE POLICY "Qualquer pessoa pode ver force_logout" ON public.force_logout FOR SELECT USING (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir force_logout" ON public.force_logout;
CREATE POLICY "Qualquer pessoa pode inserir force_logout" ON public.force_logout FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar force_logout" ON public.force_logout;
CREATE POLICY "Qualquer pessoa pode deletar force_logout" ON public.force_logout FOR DELETE USING (true);

-- usuarios
DROP POLICY IF EXISTS "UsuÃ¡rios podem ver prÃ³prio registro ou admin vÃª todos" ON public.usuarios;
CREATE POLICY "UsuÃ¡rios podem ver prÃ³prio registro ou admin vÃª todos" ON public.usuarios FOR SELECT USING (true);
DROP POLICY IF EXISTS "Apenas admin pode inserir usuÃ¡rios" ON public.usuarios;
CREATE POLICY "Apenas admin pode inserir usuÃ¡rios" ON public.usuarios FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Apenas admin pode atualizar usuÃ¡rios" ON public.usuarios;
CREATE POLICY "Apenas admin pode atualizar usuÃ¡rios" ON public.usuarios FOR UPDATE USING (true);

-- comunicados
DROP POLICY IF EXISTS "Comunicados sÃ£o pÃºblicos para leitura" ON public.comunicados;
CREATE POLICY "Comunicados sÃ£o pÃºblicos para leitura" ON public.comunicados FOR SELECT USING (true);
DROP POLICY IF EXISTS "Apenas admin pode inserir comunicados" ON public.comunicados;
CREATE POLICY "Apenas admin pode inserir comunicados" ON public.comunicados FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Apenas admin pode atualizar comunicados" ON public.comunicados;
CREATE POLICY "Apenas admin pode atualizar comunicados" ON public.comunicados FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Apenas admin pode deletar comunicados" ON public.comunicados;
CREATE POLICY "Apenas admin pode deletar comunicados" ON public.comunicados FOR DELETE USING (true);

-- comunicados_categorias
DROP POLICY IF EXISTS "Categorias sÃ£o pÃºblicas para leitura" ON public.comunicados_categorias;
CREATE POLICY "Categorias sÃ£o pÃºblicas para leitura" ON public.comunicados_categorias FOR SELECT USING (true);
DROP POLICY IF EXISTS "Apenas admin pode inserir categorias" ON public.comunicados_categorias;
CREATE POLICY "Apenas admin pode inserir categorias" ON public.comunicados_categorias FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Apenas admin pode atualizar categorias" ON public.comunicados_categorias;
CREATE POLICY "Apenas admin pode atualizar categorias" ON public.comunicados_categorias FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Apenas admin pode deletar categorias" ON public.comunicados_categorias;
CREATE POLICY "Apenas admin pode deletar categorias" ON public.comunicados_categorias FOR DELETE USING (true);


CREATE OR REPLACE FUNCTION public.auto_liberar_armario_feminino()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _situacao_nome text;
BEGIN
  -- Se sexo mudou de feminino para masculino, liberar armÃ¡rio
  IF OLD.sexo = 'feminino' AND NEW.sexo = 'masculino' THEN
    UPDATE armarios_femininos 
    SET funcionario_id = NULL, observacoes = 'Liberado automaticamente - sexo alterado', updated_at = now()
    WHERE funcionario_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Se situaÃ§Ã£o mudou, verificar se a nova situaÃ§Ã£o Ã© elegÃ­vel
  IF OLD.situacao_id IS DISTINCT FROM NEW.situacao_id THEN
    SELECT nome INTO _situacao_nome FROM situacoes WHERE id = NEW.situacao_id;
    
    -- Manter armÃ¡rio para situaÃ§Ãµes de demissÃ£o (RH libera manualmente)
    IF _situacao_nome ILIKE '%DEMISSÃƒO%' OR _situacao_nome ILIKE '%DEMISSAO%' 
       OR _situacao_nome ILIKE '%TÃ‰RMINO%' OR _situacao_nome ILIKE '%TERMINO%'
       OR _situacao_nome ILIKE '%PED. DEMISSÃƒO%' THEN
      -- NÃ£o libera automaticamente - fica na aba DemissÃ£o para RH processar
      RETURN NEW;
    END IF;
    
    IF _situacao_nome NOT IN ('ATIVO', 'FÃ‰RIAS', 'COB. FÃ‰RIAS', 'AUXÃLIO DOENÃ‡A', 'TREINAMENTO') THEN
      UPDATE armarios_femininos 
      SET funcionario_id = NULL, observacoes = 'Liberado automaticamente - situaÃ§Ã£o: ' || COALESCE(_situacao_nome, 'desconhecida'), updated_at = now()
      WHERE funcionario_id = NEW.id;
    END IF;
  END IF;

  -- Se foi demitido (data_demissao preenchida), NÃƒO liberar automaticamente
  -- RH faz a liberaÃ§Ã£o manual pela aba DemissÃ£o
  
  RETURN NEW;
END;
$function$;


CREATE TABLE public.integracoes_agencia (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT,
  setor TEXT,
  funcao TEXT,
  telefone TEXT,
  cpf TEXT,
  sexo TEXT,
  indicacao TEXT,
  residencia_fretado TEXT,
  ponto_referencia TEXT,
  camisa TEXT,
  calca TEXT,
  sapato TEXT,
  oculos TEXT,
  data_integracao DATE,
  criado_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.integracoes_agencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total integracoes_agencia" ON public.integracoes_agencia FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.integracoes_agencia;

ALTER TABLE public.integracoes_agencia 
ADD COLUMN compareceu boolean DEFAULT NULL,
ADD COLUMN aprovado boolean DEFAULT NULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.armarios_femininos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.divergencias_ponto;
ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_auditoria;
ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_quadro;
ALTER PUBLICATION supabase_realtime ADD TABLE public.experiencia_decisoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.previsao_documentos;
DELETE FROM notificacoes WHERE user_role_id IN (
  'f34814cd-ac4e-4f9f-a249-e061a66d69ca',
  'c355592d-e925-463f-9fbc-33737351860a',
  'cbfb04a1-e5d4-43d6-bd02-35a86e4daea9',
  'ddf582eb-28b2-4ea6-b68d-dac97ecb1589',
  '258cb54d-8e50-43e6-967f-22a06273ed00',
  '258bd918-2967-49ab-a6a3-f4bca56b55f8',
  '2d22a681-65f5-4377-b2db-ace8cd6291a2',
  '6ce528ff-cff8-4736-b7ed-eab720eb8a8b'
);
ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_acesso;

CREATE TABLE public.meal_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  tolerance integer NOT NULL DEFAULT 5,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total meal_types" ON public.meal_types
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default meal types
INSERT INTO public.meal_types (name, start_time, end_time, tolerance) VALUES
  ('DESJEJUM', '05:30', '07:30', 5),
  ('ALMOÃ‡O', '10:00', '13:30', 5),
  ('JANTAR', '17:00', '20:30', 5),
  ('CEIA', '00:30', '04:00', 5);


-- ItinerÃ¡rios de fretado
CREATE TABLE public.fretado_itinerarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  valor_van numeric(10,2) NOT NULL DEFAULT 0,
  valor_micro numeric(10,2) NOT NULL DEFAULT 0,
  valor_onibus numeric(10,2) NOT NULL DEFAULT 0,
  pedagio numeric(10,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.fretado_itinerarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total fretado_itinerarios" ON public.fretado_itinerarios FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.fretado_itinerarios (nome, valor_van, valor_micro, valor_onibus, pedagio) VALUES
  ('VÃRZEA PTA A', 275.00, 370.00, 441.66, 0),
  ('VÃRZEA PTA B', 275.00, 370.00, 441.66, 0),
  ('LOUVEIRA', 225.00, 320.00, 391.66, 0),
  ('CAMPINAS', 250.00, 345.00, 416.66, 16.80);

-- Valores extras de fretado
CREATE TABLE public.fretado_valores_extras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cidade text NOT NULL,
  valor_viagem numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.fretado_valores_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total fretado_valores_extras" ON public.fretado_valores_extras FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.fretado_valores_extras (cidade, valor_viagem) VALUES
  ('CAMPO LIMPO', 203.99), ('ITU', 412.54), ('CAMAÃ‡ARI', 265.08),
  ('VZA PAULISTA', 203.99), ('INDAIATUBA', 266.07), ('CAMPINAS', 182.13),
  ('JUNDIAÃ', 156.59), ('LOUVEIRA', 124.17), ('VINHEDO', 110.87),
  ('ITUPEVA', 170.55), ('JARAGUA', 475.15), ('NIVEA', 258.45), ('GUARULHOS', 506.75);

-- HistÃ³rico de alteraÃ§Ãµes de valores
CREATE TABLE public.valor_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id uuid NOT NULL,
  tipo text NOT NULL,
  campo text NOT NULL,
  valor_anterior numeric(10,2) NOT NULL,
  valor_novo numeric(10,2) NOT NULL,
  motivo text NOT NULL,
  data_vigencia date NOT NULL,
  data_criacao timestamp with time zone NOT NULL DEFAULT now(),
  nome_registro text NOT NULL
);
ALTER TABLE public.valor_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total valor_historico" ON public.valor_historico FOR ALL USING (true) WITH CHECK (true);

-- FuncionÃ¡rios prestadores (importados de planilha)
CREATE TABLE public.prestadores_funcionarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matricula text NOT NULL,
  nome text NOT NULL DEFAULT '',
  centro_custo text NOT NULL DEFAULT '',
  codigo_estrutura text NOT NULL DEFAULT '',
  mes_referencia text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.prestadores_funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total prestadores_funcionarios" ON public.prestadores_funcionarios FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_prestadores_func_mes ON public.prestadores_funcionarios (mes_referencia);
CREATE UNIQUE INDEX idx_prestadores_func_unique ON public.prestadores_funcionarios (matricula, mes_referencia);

-- Registros de refeiÃ§Ã£o
CREATE TABLE public.meal_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id text NOT NULL,
  employee_name text NOT NULL DEFAULT '',
  meal_type_id text NOT NULL DEFAULT '',
  cost_center_id text NOT NULL DEFAULT '',
  date date NOT NULL,
  time text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total meal_records" ON public.meal_records FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_meal_records_date ON public.meal_records (date);

-- ImportaÃ§Ãµes de fretado
CREATE TABLE public.fretado_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo text NOT NULL UNIQUE,
  import_date text NOT NULL,
  total_extras numeric(12,2) NOT NULL DEFAULT 0,
  total_diario numeric(12,2) NOT NULL DEFAULT 0,
  total_lotacao numeric(12,2) NOT NULL DEFAULT 0,
  total_pedagio numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.fretado_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total fretado_imports" ON public.fretado_imports FOR ALL USING (true) WITH CHECK (true);

-- Viagens de fretado
CREATE TABLE public.fretado_trips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id uuid NOT NULL REFERENCES public.fretado_imports(id) ON DELETE CASCADE,
  date date NOT NULL,
  entry_time text NOT NULL DEFAULT '',
  entry_destino text NOT NULL DEFAULT '',
  exit_time text NOT NULL DEFAULT '',
  exit_destino text NOT NULL DEFAULT '',
  onibus integer NOT NULL DEFAULT 0,
  micro integer NOT NULL DEFAULT 0,
  baixo integer NOT NULL DEFAULT 0,
  van integer NOT NULL DEFAULT 0,
  pedagio numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  sheet text NOT NULL
);
ALTER TABLE public.fretado_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total fretado_trips" ON public.fretado_trips FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_fretado_trips_import ON public.fretado_trips (import_id);

-- UsuÃ¡rios de prestadores
CREATE TABLE public.prestadores_usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  setor text NOT NULL,
  telefone_whatsapp text NOT NULL DEFAULT '',
  modulos text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  data_cadastro timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.prestadores_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total prestadores_usuarios" ON public.prestadores_usuarios FOR ALL USING (true) WITH CHECK (true);

-- Meses fechados do rateio
CREATE TABLE public.rateio_meses_fechados (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes text NOT NULL UNIQUE,
  fechado_em timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.rateio_meses_fechados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total rateio_meses_fechados" ON public.rateio_meses_fechados FOR ALL USING (true) WITH CHECK (true);


ALTER TABLE public.user_roles 
  ADD COLUMN IF NOT EXISTS pode_visualizar_armarios boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pode_editar_armarios boolean NOT NULL DEFAULT false;

-- Set admin users to have armarios access by default
UPDATE public.user_roles SET pode_visualizar_armarios = true, pode_editar_armarios = true WHERE acesso_admin = true;


-- Drop and re-add all tables to realtime publication to ensure all are included
DO $$
DECLARE
  _tables text[] := ARRAY[
    'funcionarios','registros_ponto','periodos_ponto','demissoes',
    'divergencias_quadro','divergencias_ponto','quadro_planejado','quadro_decoracao',
    'setores','situacoes','historico_auditoria','historico_quadro',
    'trocas_turno','experiencia_decisoes','previsao_documentos','eventos_sistema',
    'armarios_femininos','armarios_config','avisos_movimentacao','notificacoes',
    'liberacoes_faltas','historico_faltas','periodos_demissao','integracoes_agencia',
    'user_roles','meal_records','meal_types','fretado_imports','fretado_trips',
    'fretado_itinerarios','fretado_valores_extras','prestadores_funcionarios',
    'prestadores_usuarios','valor_historico','rateio_meses_fechados',
    'previsao_documentos_historico','comunicados','comunicados_categorias',
    'tipos_desligamento','sistema_config','notificacoes_vistas',
    'avisos_movimentacao_lidos','historico_acesso','user_roles_setores',
    'previsao_horarios_notificacao','force_logout'
  ];
  _t text;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', _t);
    EXCEPTION WHEN duplicate_object THEN
      -- already in publication, skip
    END;
  END LOOP;
END $$;

ALTER TABLE public.meal_types RENAME COLUMN tolerance TO tolerance_before;
ALTER TABLE public.meal_types ADD COLUMN tolerance_after integer NOT NULL DEFAULT 5;
ALTER TABLE public.armarios_femininos ADD COLUMN matricula text DEFAULT NULL;

CREATE TABLE public.rateio_funcionarios_pj (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  centro_custo text NOT NULL DEFAULT '',
  codigo_estrutura text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rateio_funcionarios_pj ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total rateio_funcionarios_pj" ON public.rateio_funcionarios_pj FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.prestadores_funcionarios 
ADD COLUMN IF NOT EXISTS cargo text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS situacao text NOT NULL DEFAULT '';

-- Add empresa column to prestadores_funcionarios
ALTER TABLE public.prestadores_funcionarios 
ADD COLUMN empresa text NOT NULL DEFAULT '';

-- Drop existing unique constraint on matricula,mes_referencia and recreate with empresa
-- First find and drop the existing constraint
DO $$ 
BEGIN
  -- Try to drop the constraint if it exists
  ALTER TABLE public.prestadores_funcionarios DROP CONSTRAINT IF EXISTS prestadores_funcionarios_matricula_mes_referencia_key;
  ALTER TABLE public.prestadores_funcionarios DROP CONSTRAINT IF EXISTS unique_matricula_mes;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create new unique constraint including empresa
ALTER TABLE public.prestadores_funcionarios 
ADD CONSTRAINT prestadores_funcionarios_matricula_mes_empresa_key 
UNIQUE (matricula, mes_referencia, empresa);

-- Create rateio_excecoes table
CREATE TABLE public.rateio_excecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL, -- 'cargo' or 'nome'
  valor text NOT NULL,
  empresa text NOT NULL DEFAULT '', -- optional: filter by empresa
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tipo, valor, empresa)
);

-- Enable RLS
ALTER TABLE public.rateio_excecoes ENABLE ROW LEVEL SECURITY;

-- Allow full access (same pattern as other prestadores tables)
CREATE POLICY "Acesso total rateio_excecoes" ON public.rateio_excecoes
FOR ALL USING (true) WITH CHECK (true);

-- Backfill notificacoes_vistas for all read notifications that are missing
INSERT INTO notificacoes_vistas (evento_id, user_role_id, nome_gestor, visto_em)
SELECT DISTINCT n.referencia_id, n.user_role_id, ur.nome, 
  COALESCE(
    (SELECT MAX(n2.created_at) FROM notificacoes n2 WHERE n2.id = n.id), 
    now()
  )
FROM notificacoes n
JOIN user_roles ur ON ur.id = n.user_role_id
WHERE n.lida = true 
  AND n.referencia_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notificacoes_vistas nv 
    WHERE nv.evento_id = n.referencia_id 
      AND nv.user_role_id = n.user_role_id
  )
ON CONFLICT (evento_id, user_role_id) DO NOTHING;

-- Backfill: update notificacoes with null referencia_id by matching to eventos_sistema
-- Match by tipo mapping and approximate time
UPDATE notificacoes n
SET referencia_id = matched.evento_id
FROM (
  SELECT DISTINCT ON (n2.id) n2.id as notif_id, es.id as evento_id
  FROM notificacoes n2
  JOIN eventos_sistema es ON (
    -- Map notification tipo back to event tipo
    (n2.tipo = 'demissao_lancada' AND es.tipo = 'demissao')
    OR (n2.tipo = 'pedido_demissao_lancado' AND es.tipo = 'pedido_demissao')
    OR (n2.tipo = 'transferencia_pendente' AND es.tipo = 'transferencia')
    OR (n2.tipo = 'divergencia_nova' AND es.tipo = 'divergencia_nova')
    OR (n2.tipo = 'evento_sistema_modal' AND es.tipo IN ('demissao', 'pedido_demissao', 'transferencia', 'admissao'))
  )
  WHERE n2.referencia_id IS NULL
    AND es.created_at <= n2.created_at + interval '1 hour'
    AND es.created_at >= n2.created_at - interval '1 hour'
  ORDER BY n2.id, ABS(EXTRACT(EPOCH FROM (n2.created_at - es.created_at)))
) matched
WHERE n.id = matched.notif_id
  AND n.referencia_id IS NULL;

-- Now backfill notificacoes_vistas for read notifications that still lack records
INSERT INTO notificacoes_vistas (evento_id, user_role_id, nome_gestor, visto_em)
SELECT DISTINCT n.referencia_id, n.user_role_id, ur.nome, n.created_at
FROM notificacoes n
JOIN user_roles ur ON ur.id = n.user_role_id
WHERE n.lida = true 
  AND n.referencia_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notificacoes_vistas nv 
    WHERE nv.evento_id = n.referencia_id 
      AND nv.user_role_id = n.user_role_id
  )
ON CONFLICT (evento_id, user_role_id) DO NOTHING;


-- Add prestador columns to armarios_femininos
ALTER TABLE armarios_femininos ADD COLUMN IF NOT EXISTS nome_prestador text;
ALTER TABLE armarios_femininos ADD COLUMN IF NOT EXISTS setor_prestador text;

-- Create table for prestador sectors configuration
CREATE TABLE IF NOT EXISTS armarios_setores_prestador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE armarios_setores_prestador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total armarios_setores_prestador" ON armarios_setores_prestador FOR ALL USING (true) WITH CHECK (true);

-- Insert default SPSP sector
INSERT INTO armarios_setores_prestador (nome) VALUES ('SPSP') ON CONFLICT (nome) DO NOTHING;

ALTER TABLE public.armarios_femininos ADD COLUMN bloqueado boolean NOT NULL DEFAULT false;
ALTER TABLE public.armarios_femininos ADD COLUMN IF NOT EXISTS quebrado boolean NOT NULL DEFAULT false;

-- MigraÃ§Ãµes de usuÃ¡ria Silvia removidas para setup inicial


CREATE TABLE public.historico_movimentacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo TEXT NOT NULL,
  tipo_movimentacao TEXT NOT NULL,
  funcionario_nome TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  quadro_anterior INTEGER NOT NULL DEFAULT 0,
  quadro_novo INTEGER NOT NULL DEFAULT 0,
  necessario INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  criado_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_movimentacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total historico_movimentacao" ON public.historico_movimentacao FOR ALL USING (true) WITH CHECK (true);

DELETE FROM historico_movimentacao WHERE funcionario_nome = 'QUADRO INICIAL';

-- FIX PARA SETUP INICIAL
ALTER TABLE public.user_roles ALTER COLUMN user_id DROP NOT NULL;

-- CRIAR USUARIO ADMINISTRADOR PADRAO
INSERT INTO public.user_roles (nome, perfil, ativo, acesso_admin, senha, pode_visualizar_funcionarios, pode_editar_funcionarios, pode_visualizar_faltas, pode_editar_faltas)
VALUES ('LUCIANO', 'admin', true, true, 'admin123', true, true, true, true);

