
-- Permitir leitura pública de setores e situações (dados de configuração)
-- DROP das políticas restritivas existentes
DROP POLICY IF EXISTS "Usuários com perfil ativo podem ver setores" ON setores;
DROP POLICY IF EXISTS "Usuários com perfil ativo podem ver situações" ON situacoes;

-- Criar políticas de leitura pública (SELECT)
CREATE POLICY "Qualquer pessoa pode ver setores" 
  ON setores FOR SELECT 
  USING (true);

CREATE POLICY "Qualquer pessoa pode ver situações" 
  ON situacoes FOR SELECT 
  USING (true);
