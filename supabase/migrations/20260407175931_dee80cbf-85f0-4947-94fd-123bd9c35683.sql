
CREATE TABLE public.snapshots_quadro (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo text NOT NULL,
  data_referencia date NOT NULL,
  quadro_real integer NOT NULL DEFAULT 0,
  quadro_necessario integer NOT NULL DEFAULT 0,
  diferenca integer NOT NULL DEFAULT 0,
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  movimentacoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  travado_por text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(grupo, data_referencia)
);

ALTER TABLE public.snapshots_quadro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode ver snapshots"
  ON public.snapshots_quadro FOR SELECT
  USING (true);

CREATE POLICY "Qualquer pessoa pode inserir snapshots"
  ON public.snapshots_quadro FOR INSERT
  WITH CHECK (true);
