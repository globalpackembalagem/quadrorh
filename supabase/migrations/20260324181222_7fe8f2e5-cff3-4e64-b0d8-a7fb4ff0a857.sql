
-- Table to store training records linked to hiring forecasts
CREATE TABLE IF NOT EXISTS public.treinamentos_previsao (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE CASCADE NOT NULL,
  nome_completo text NOT NULL,
  matricula text,
  empresa text,
  setor_nome text,
  setor_grupo text,
  turma text,
  cargo text,
  data_previsao date,
  treinamento_inicio timestamptz NOT NULL DEFAULT now(),
  treinamento_expiracao timestamptz NOT NULL DEFAULT (now() + interval '2 days'),
  status text NOT NULL DEFAULT 'EM TREINAMENTO',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treinamentos_previsao ENABLE ROW LEVEL SECURITY;

-- Permissive policies
CREATE POLICY "Acesso total treinamentos_previsao" ON public.treinamentos_previsao
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.treinamentos_previsao;
