-- Enum para sexo
CREATE TYPE public.sexo_tipo AS ENUM ('masculino', 'feminino');

-- Enum para tipo de registro de ponto
CREATE TYPE public.ponto_tipo AS ENUM ('F', 'A');

-- Enum para status do período
CREATE TYPE public.periodo_status AS ENUM ('aberto', 'fechado');

-- Enum para perfil de usuário
CREATE TYPE public.usuario_perfil AS ENUM ('administrador', 'gestor', 'visualizacao');

-- Tabela de Setores (configuração)
CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  conta_no_quadro BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Situações (regra central)
CREATE TABLE public.situacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  conta_no_quadro BOOLEAN NOT NULL DEFAULT true,
  entra_no_ponto BOOLEAN NOT NULL DEFAULT true,
  ativa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Funcionários
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

-- Tabela de Períodos de Ponto
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

-- Tabela de Usuários do Sistema
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

-- RLS Policies - Permitir leitura para todos os usuários autenticados
CREATE POLICY "Usuários autenticados podem ver setores" ON public.setores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ver situações" ON public.situacoes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ver funcionários" ON public.funcionarios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ver períodos" ON public.periodos_ponto
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ver registros" ON public.registros_ponto
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem ver usuários" ON public.usuarios
  FOR SELECT TO authenticated USING (true);

-- RLS Policies - Permitir inserção/atualização/exclusão para todos (será controlado por perfil na aplicação)
CREATE POLICY "Usuários autenticados podem inserir setores" ON public.setores
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar setores" ON public.setores
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir situações" ON public.situacoes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar situações" ON public.situacoes
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir funcionários" ON public.funcionarios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar funcionários" ON public.funcionarios
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir períodos" ON public.periodos_ponto
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar períodos" ON public.periodos_ponto
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir registros" ON public.registros_ponto
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar registros" ON public.registros_ponto
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem deletar registros" ON public.registros_ponto
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "Usuários autenticados podem inserir usuários" ON public.usuarios
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar usuários" ON public.usuarios
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

-- Inserir dados iniciais de Situações
INSERT INTO public.situacoes (nome, conta_no_quadro, entra_no_ponto, ativa) VALUES
  ('Ativo', true, true, true),
  ('Férias', true, false, true),
  ('Afastado', true, false, true),
  ('Licença', true, false, true),
  ('Desligado', false, false, true);

-- Inserir dados iniciais de Setores
INSERT INTO public.setores (nome, ativo, conta_no_quadro) VALUES
  ('Administrativo', true, true),
  ('Operacional', true, true),
  ('Comercial', true, true),
  ('RH', true, true),
  ('TI', true, true);