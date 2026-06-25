-- Restore the app policies needed by the forecast admission flow.
-- The button that activates a forecast inserts and later updates this table.
DROP POLICY IF EXISTS "Acesso total treinamentos_previsao"
ON public.treinamentos_previsao;

CREATE POLICY "Sistema pode ver treinamentos_previsao"
ON public.treinamentos_previsao
FOR SELECT
TO public
USING (true);

CREATE POLICY "Sistema pode inserir treinamentos_previsao"
ON public.treinamentos_previsao
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar treinamentos_previsao"
ON public.treinamentos_previsao
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
