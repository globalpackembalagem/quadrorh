-- Adicionar política DELETE para funcionários (necessário para zerar base)
CREATE POLICY "Qualquer pessoa pode deletar funcionários" 
ON public.funcionarios 
FOR DELETE 
USING (true);