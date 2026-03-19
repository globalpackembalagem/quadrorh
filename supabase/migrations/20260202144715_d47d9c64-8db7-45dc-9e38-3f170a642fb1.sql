-- Criar tabela de histórico de auditoria (exceto faltas)
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

-- Permitir leitura para todos (histórico é apenas visualização)
CREATE POLICY "Qualquer pessoa pode ver historico"
  ON public.historico_auditoria
  FOR SELECT
  USING (true);

-- Apenas sistema pode inserir (via triggers ou código)
CREATE POLICY "Qualquer pessoa pode inserir historico"
  ON public.historico_auditoria
  FOR INSERT
  WITH CHECK (true);

-- Permitir delete para períodos_ponto (alterando RLS existente)
-- Primeiro verificar se existe policy de delete
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar periodos_ponto" ON public.periodos_ponto;

CREATE POLICY "Qualquer pessoa pode deletar periodos_ponto"
  ON public.periodos_ponto
  FOR DELETE
  USING (true);