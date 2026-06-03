CREATE TABLE IF NOT EXISTS public.force_update (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at timestamp with time zone NOT NULL DEFAULT now(),
  triggered_by text NOT NULL
);

ALTER TABLE public.force_update ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer pessoa pode ver force_update" ON public.force_update;
CREATE POLICY "Qualquer pessoa pode ver force_update"
ON public.force_update FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Qualquer pessoa pode inserir force_update" ON public.force_update;
CREATE POLICY "Qualquer pessoa pode inserir force_update"
ON public.force_update FOR INSERT
WITH CHECK (true);
