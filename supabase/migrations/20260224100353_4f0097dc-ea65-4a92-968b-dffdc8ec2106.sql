
-- Tabela para persistir decisões de experiência (efetivar/desligar)
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
