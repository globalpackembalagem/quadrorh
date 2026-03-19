-- Remover a constraint de FK para auth.users (permitir IDs locais)
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Adicionar coluna de senha para login local
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS senha TEXT DEFAULT 'senha123';

-- Atualizar RLS para permitir acesso público (sem auth obrigatório)
DROP POLICY IF EXISTS "Admins podem ver todos os roles" ON user_roles;
DROP POLICY IF EXISTS "Apenas admins podem inserir roles" ON user_roles;
DROP POLICY IF EXISTS "Apenas admins podem atualizar roles" ON user_roles;
DROP POLICY IF EXISTS "Apenas admins podem deletar roles" ON user_roles;

CREATE POLICY "Acesso total user_roles" ON user_roles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins podem ver todos os setores de roles" ON user_roles_setores;
DROP POLICY IF EXISTS "Apenas admins podem inserir setores de roles" ON user_roles_setores;
DROP POLICY IF EXISTS "Apenas admins podem atualizar setores de roles" ON user_roles_setores;
DROP POLICY IF EXISTS "Apenas admins podem deletar setores de roles" ON user_roles_setores;

CREATE POLICY "Acesso total user_roles_setores" ON user_roles_setores FOR ALL USING (true) WITH CHECK (true);