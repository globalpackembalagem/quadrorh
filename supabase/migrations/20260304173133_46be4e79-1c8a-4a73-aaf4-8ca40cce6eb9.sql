
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
