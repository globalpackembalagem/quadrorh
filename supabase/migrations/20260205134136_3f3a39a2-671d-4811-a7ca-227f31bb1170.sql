-- Tabela para histórico de alterações do quadro planejado
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

-- Políticas de acesso
CREATE POLICY "Qualquer pessoa pode ver historico_quadro"
ON public.historico_quadro
FOR SELECT
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir historico_quadro"
ON public.historico_quadro
FOR INSERT
WITH CHECK (true);