
CREATE TABLE public.rateio_funcionarios_pj (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  centro_custo text NOT NULL DEFAULT '',
  codigo_estrutura text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rateio_funcionarios_pj ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total rateio_funcionarios_pj" ON public.rateio_funcionarios_pj FOR ALL USING (true) WITH CHECK (true);
