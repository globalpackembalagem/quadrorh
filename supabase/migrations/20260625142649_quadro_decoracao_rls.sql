-- Restore the app policies needed to edit the decoration planned board.
-- This does not allow deletes and does not change existing data.
DROP POLICY IF EXISTS "Sistema pode atualizar quadro decoracao"
ON public.quadro_decoracao;

CREATE POLICY "Sistema pode atualizar quadro decoracao"
ON public.quadro_decoracao
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Sistema pode inserir historico quadro"
ON public.historico_quadro;

CREATE POLICY "Sistema pode inserir historico quadro"
ON public.historico_quadro
FOR INSERT
TO public
WITH CHECK (true);
