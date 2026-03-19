-- Tabela para controle de demissões/desligamentos
CREATE TABLE public.demissoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id),
  tipo_desligamento TEXT, -- Será preenchido depois (Término de Contrato, Dispensa Normal, Pedido de Demissão, Justa Causa)
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

-- Tabela para períodos semanais configuráveis
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

-- Políticas para demissoes
CREATE POLICY "Qualquer pessoa pode ver demissoes" 
ON public.demissoes FOR SELECT USING (true);

CREATE POLICY "Qualquer pessoa pode inserir demissoes" 
ON public.demissoes FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar demissoes" 
ON public.demissoes FOR UPDATE USING (true);

CREATE POLICY "Qualquer pessoa pode deletar demissoes" 
ON public.demissoes FOR DELETE USING (true);

-- Políticas para periodos_demissao
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

-- Inserir períodos padrão para Janeiro
INSERT INTO public.periodos_demissao (nome, data_inicio, data_fim, ordem) VALUES
('01/01 a 10/01', '2025-01-01', '2025-01-10', 1),
('11/01 a 17/01', '2025-01-11', '2025-01-17', 2),
('18/01 a 24/01', '2025-01-18', '2025-01-24', 3),
('25/01 a 31/01', '2025-01-25', '2025-01-31', 4);