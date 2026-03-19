-- Drop existing RLS policies on periodos_ponto
DROP POLICY IF EXISTS "Usuários com perfil ativo podem ver períodos" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Apenas admin pode inserir períodos" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Apenas admin pode atualizar períodos" ON public.periodos_ponto;

-- Create open policies for periodos_ponto (internal system)
CREATE POLICY "Qualquer pessoa pode ver periodos_ponto" 
ON public.periodos_ponto 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir periodos_ponto" 
ON public.periodos_ponto 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar periodos_ponto" 
ON public.periodos_ponto 
FOR UPDATE 
USING (true);

-- Drop existing RLS policies on registros_ponto
DROP POLICY IF EXISTS "Usuários com perfil ativo podem ver registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "Admin e Gestor podem inserir registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "Admin e Gestor podem atualizar registros" ON public.registros_ponto;
DROP POLICY IF EXISTS "Admin e Gestor podem deletar registros" ON public.registros_ponto;

-- Create open policies for registros_ponto (internal system)
CREATE POLICY "Qualquer pessoa pode ver registros_ponto" 
ON public.registros_ponto 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir registros_ponto" 
ON public.registros_ponto 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar registros_ponto" 
ON public.registros_ponto 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer pessoa pode deletar registros_ponto" 
ON public.registros_ponto 
FOR DELETE 
USING (true);