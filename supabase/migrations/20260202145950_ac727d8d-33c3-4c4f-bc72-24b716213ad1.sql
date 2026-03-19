-- Tabela para histórico específico de faltas (separado do histórico geral)
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

-- Tabela para divergências de ponto (quando tenta editar após 3 dias)
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

CREATE POLICY "Leitura para usuários ativos" 
ON public.historico_faltas 
FOR SELECT 
USING (true);

CREATE POLICY "Inserção para usuários ativos" 
ON public.historico_faltas 
FOR INSERT 
WITH CHECK (true);

-- RLS para divergencias_ponto
ALTER TABLE public.divergencias_ponto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura divergencias ponto" 
ON public.divergencias_ponto 
FOR SELECT 
USING (true);

CREATE POLICY "Inserção divergencias ponto" 
ON public.divergencias_ponto 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Atualização divergencias ponto" 
ON public.divergencias_ponto 
FOR UPDATE 
USING (true);

CREATE POLICY "Exclusão divergencias ponto" 
ON public.divergencias_ponto 
FOR DELETE 
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_divergencias_ponto_updated_at
BEFORE UPDATE ON public.divergencias_ponto
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_historico_faltas_funcionario ON public.historico_faltas(funcionario_id);
CREATE INDEX idx_historico_faltas_periodo ON public.historico_faltas(periodo_id);
CREATE INDEX idx_divergencias_ponto_funcionario ON public.divergencias_ponto(funcionario_id);
CREATE INDEX idx_divergencias_ponto_periodo ON public.divergencias_ponto(periodo_id);
CREATE INDEX idx_divergencias_ponto_resolvido ON public.divergencias_ponto(resolvido);