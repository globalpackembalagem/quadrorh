-- Remover políticas restritivas existentes
DROP POLICY IF EXISTS "Apenas admin pode inserir setores" ON public.setores;
DROP POLICY IF EXISTS "Apenas admin pode atualizar setores" ON public.setores;
DROP POLICY IF EXISTS "Apenas admin pode inserir situações" ON public.situacoes;
DROP POLICY IF EXISTS "Apenas admin pode atualizar situações" ON public.situacoes;

-- Criar políticas permissivas para setores
CREATE POLICY "Qualquer pessoa pode inserir setores"
ON public.setores
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar setores"
ON public.setores
FOR UPDATE
USING (true);

-- Criar políticas permissivas para situações
CREATE POLICY "Qualquer pessoa pode inserir situacoes"
ON public.situacoes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar situacoes"
ON public.situacoes
FOR UPDATE
USING (true);