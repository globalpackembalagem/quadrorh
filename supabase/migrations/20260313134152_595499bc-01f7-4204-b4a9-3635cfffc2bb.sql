
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
