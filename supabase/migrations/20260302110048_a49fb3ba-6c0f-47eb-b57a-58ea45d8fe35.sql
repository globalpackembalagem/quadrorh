
-- Tabela para armazenar liberações de datas no controle de faltas
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

-- Políticas permissivas (controle feito na aplicação)
CREATE POLICY "Qualquer pessoa pode ver liberacoes_faltas"
  ON public.liberacoes_faltas FOR SELECT USING (true);

CREATE POLICY "Qualquer pessoa pode inserir liberacoes_faltas"
  ON public.liberacoes_faltas FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode deletar liberacoes_faltas"
  ON public.liberacoes_faltas FOR DELETE USING (true);

CREATE POLICY "Qualquer pessoa pode atualizar liberacoes_faltas"
  ON public.liberacoes_faltas FOR UPDATE USING (true);
