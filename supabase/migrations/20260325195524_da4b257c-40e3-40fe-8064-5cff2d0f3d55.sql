
-- Restringir SELECT na user_roles para não expor coluna senha via anon key
-- Criar uma view segura que exclui a senha
CREATE OR REPLACE VIEW public.user_roles_safe AS
SELECT id, nome, setor_id, acesso_admin,
  pode_visualizar_funcionarios, pode_editar_funcionarios,
  pode_visualizar_previsao, pode_editar_previsao,
  pode_visualizar_coberturas, pode_editar_coberturas,
  pode_visualizar_faltas, pode_editar_faltas,
  pode_visualizar_demissoes, pode_editar_demissoes,
  pode_visualizar_homologacoes, pode_editar_homologacoes,
  pode_visualizar_divergencias, pode_criar_divergencias,
  pode_visualizar_troca_turno, pode_editar_troca_turno,
  pode_visualizar_armarios, pode_editar_armarios,
  pode_exportar_excel, recebe_notificacoes, tempo_inatividade,
  ativo, email, created_at, updated_at
FROM public.user_roles;

-- Restringir force_logout: apenas INSERT (sem DELETE público)
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar force_logout" ON public.force_logout;

-- Restringir integracoes_agencia: remover política ALL e criar políticas específicas
DROP POLICY IF EXISTS "Acesso total integracoes_agencia" ON public.integracoes_agencia;

CREATE POLICY "Leitura integracoes_agencia autenticado" 
ON public.integracoes_agencia FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Inserção integracoes_agencia autenticado" 
ON public.integracoes_agencia FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Atualização integracoes_agencia autenticado" 
ON public.integracoes_agencia FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Exclusão integracoes_agencia autenticado" 
ON public.integracoes_agencia FOR DELETE 
TO authenticated 
USING (true);
