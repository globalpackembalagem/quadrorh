-- Tabela para controlar force-logout global
CREATE TABLE public.force_logout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  triggered_by text NOT NULL
);

ALTER TABLE public.force_logout ENABLE ROW LEVEL SECURITY;

-- Todos podem ler (para verificar se precisam deslogar)
CREATE POLICY "Qualquer pessoa pode ver force_logout"
ON public.force_logout FOR SELECT
USING (true);

-- Apenas inserir (admin fará via app)
CREATE POLICY "Qualquer pessoa pode inserir force_logout"
ON public.force_logout FOR INSERT
WITH CHECK (true);

-- Permitir delete para limpeza
CREATE POLICY "Qualquer pessoa pode deletar force_logout"
ON public.force_logout FOR DELETE
USING (true);