-- Tabela específica para quadro DECORAÇÃO (estrutura diferente do SOPRO)
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

-- Políticas de acesso público
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