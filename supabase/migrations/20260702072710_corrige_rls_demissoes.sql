ALTER TABLE public.demissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_demissao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer pessoa pode ver demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Sistema pode ver demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Sistema pode inserir demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Sistema pode atualizar demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Sistema pode deletar demissoes" ON public.demissoes;

CREATE POLICY "Sistema pode ver demissoes"
ON public.demissoes
FOR SELECT
USING (true);

CREATE POLICY "Sistema pode inserir demissoes"
ON public.demissoes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar demissoes"
ON public.demissoes
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Sistema pode deletar demissoes"
ON public.demissoes
FOR DELETE
USING (true);

DROP POLICY IF EXISTS "Qualquer pessoa pode ver periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Sistema pode ver periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Sistema pode inserir periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Sistema pode atualizar periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Sistema pode deletar periodos_demissao" ON public.periodos_demissao;

CREATE POLICY "Sistema pode ver periodos_demissao"
ON public.periodos_demissao
FOR SELECT
USING (true);

CREATE POLICY "Sistema pode inserir periodos_demissao"
ON public.periodos_demissao
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar periodos_demissao"
ON public.periodos_demissao
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Sistema pode deletar periodos_demissao"
ON public.periodos_demissao
FOR DELETE
USING (true);
