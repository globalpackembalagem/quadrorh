
-- Permitir inserção pública de funcionários (sistema interno sem autenticação)
DROP POLICY IF EXISTS "Admin e Gestor podem inserir funcionários" ON funcionarios;

CREATE POLICY "Qualquer pessoa pode inserir funcionários" 
  ON funcionarios FOR INSERT 
  WITH CHECK (true);

-- Permitir atualização pública também
DROP POLICY IF EXISTS "Admin e Gestor podem atualizar funcionários" ON funcionarios;

CREATE POLICY "Qualquer pessoa pode atualizar funcionários" 
  ON funcionarios FOR UPDATE 
  USING (true);

-- Permitir leitura pública
DROP POLICY IF EXISTS "Usuários com perfil ativo podem ver funcionários" ON funcionarios;

CREATE POLICY "Qualquer pessoa pode ver funcionários" 
  ON funcionarios FOR SELECT 
  USING (true);
