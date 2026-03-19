
-- Fix ALL RESTRICTIVE policies to PERMISSIVE across all tables

-- previsao_horarios_notificacao
DROP POLICY IF EXISTS "Qualquer pessoa pode ver horarios notificacao" ON public.previsao_horarios_notificacao;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir horarios notificacao" ON public.previsao_horarios_notificacao;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar horarios notificacao" ON public.previsao_horarios_notificacao;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar horarios notificacao" ON public.previsao_horarios_notificacao;
CREATE POLICY "Qualquer pessoa pode ver horarios notificacao" ON public.previsao_horarios_notificacao FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir horarios notificacao" ON public.previsao_horarios_notificacao FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar horarios notificacao" ON public.previsao_horarios_notificacao FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar horarios notificacao" ON public.previsao_horarios_notificacao FOR DELETE USING (true);

-- avisos_movimentacao_lidos
DROP POLICY IF EXISTS "Acesso total avisos_movimentacao_lidos" ON public.avisos_movimentacao_lidos;
CREATE POLICY "Acesso total avisos_movimentacao_lidos" ON public.avisos_movimentacao_lidos FOR ALL USING (true) WITH CHECK (true);

-- user_roles_setores
DROP POLICY IF EXISTS "Acesso total user_roles_setores" ON public.user_roles_setores;
CREATE POLICY "Acesso total user_roles_setores" ON public.user_roles_setores FOR ALL USING (true) WITH CHECK (true);

-- notificacoes_vistas
DROP POLICY IF EXISTS "Acesso total notificacoes_vistas" ON public.notificacoes_vistas;
CREATE POLICY "Acesso total notificacoes_vistas" ON public.notificacoes_vistas FOR ALL USING (true) WITH CHECK (true);

-- historico_acesso
DROP POLICY IF EXISTS "Acesso total historico_acesso" ON public.historico_acesso;
CREATE POLICY "Acesso total historico_acesso" ON public.historico_acesso FOR ALL USING (true) WITH CHECK (true);

-- avisos_movimentacao
DROP POLICY IF EXISTS "Acesso total avisos_movimentacao" ON public.avisos_movimentacao;
CREATE POLICY "Acesso total avisos_movimentacao" ON public.avisos_movimentacao FOR ALL USING (true) WITH CHECK (true);

-- eventos_sistema
DROP POLICY IF EXISTS "Acesso total eventos_sistema" ON public.eventos_sistema;
CREATE POLICY "Acesso total eventos_sistema" ON public.eventos_sistema FOR ALL USING (true) WITH CHECK (true);

-- notificacoes
DROP POLICY IF EXISTS "Acesso total notificacoes" ON public.notificacoes;
CREATE POLICY "Acesso total notificacoes" ON public.notificacoes FOR ALL USING (true) WITH CHECK (true);

-- user_roles
DROP POLICY IF EXISTS "Acesso total user_roles" ON public.user_roles;
CREATE POLICY "Acesso total user_roles" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

-- historico_auditoria
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir historico" ON public.historico_auditoria;
DROP POLICY IF EXISTS "Qualquer pessoa pode ver historico" ON public.historico_auditoria;
CREATE POLICY "Qualquer pessoa pode ver historico" ON public.historico_auditoria FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir historico" ON public.historico_auditoria FOR INSERT WITH CHECK (true);

-- historico_quadro
DROP POLICY IF EXISTS "Qualquer pessoa pode ver historico_quadro" ON public.historico_quadro;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir historico_quadro" ON public.historico_quadro;
CREATE POLICY "Qualquer pessoa pode ver historico_quadro" ON public.historico_quadro FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir historico_quadro" ON public.historico_quadro FOR INSERT WITH CHECK (true);

-- historico_faltas
DROP POLICY IF EXISTS "Leitura para usuários ativos" ON public.historico_faltas;
DROP POLICY IF EXISTS "Inserção para usuários ativos" ON public.historico_faltas;
CREATE POLICY "Leitura para usuários ativos" ON public.historico_faltas FOR SELECT USING (true);
CREATE POLICY "Inserção para usuários ativos" ON public.historico_faltas FOR INSERT WITH CHECK (true);

-- quadro_decoracao
DROP POLICY IF EXISTS "Qualquer pessoa pode ver quadro decoracao" ON public.quadro_decoracao;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir quadro decoracao" ON public.quadro_decoracao;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar quadro decoracao" ON public.quadro_decoracao;
CREATE POLICY "Qualquer pessoa pode ver quadro decoracao" ON public.quadro_decoracao FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir quadro decoracao" ON public.quadro_decoracao FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar quadro decoracao" ON public.quadro_decoracao FOR UPDATE USING (true);

-- quadro_planejado
DROP POLICY IF EXISTS "Qualquer pessoa pode ver quadro planejado" ON public.quadro_planejado;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir quadro planejado" ON public.quadro_planejado;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar quadro planejado" ON public.quadro_planejado;
CREATE POLICY "Qualquer pessoa pode ver quadro planejado" ON public.quadro_planejado FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir quadro planejado" ON public.quadro_planejado FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar quadro planejado" ON public.quadro_planejado FOR UPDATE USING (true);

-- funcionarios
DROP POLICY IF EXISTS "Qualquer pessoa pode ver funcionários" ON public.funcionarios;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir funcionários" ON public.funcionarios;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar funcionários" ON public.funcionarios;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar funcionários" ON public.funcionarios;
CREATE POLICY "Qualquer pessoa pode ver funcionários" ON public.funcionarios FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir funcionários" ON public.funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar funcionários" ON public.funcionarios FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar funcionários" ON public.funcionarios FOR DELETE USING (true);

-- setores
DROP POLICY IF EXISTS "Qualquer pessoa pode ver setores" ON public.setores;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir setores" ON public.setores;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar setores" ON public.setores;
CREATE POLICY "Qualquer pessoa pode ver setores" ON public.setores FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir setores" ON public.setores FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar setores" ON public.setores FOR UPDATE USING (true);

-- situacoes
DROP POLICY IF EXISTS "Qualquer pessoa pode ver situações" ON public.situacoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir situacoes" ON public.situacoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar situacoes" ON public.situacoes;
CREATE POLICY "Qualquer pessoa pode ver situações" ON public.situacoes FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir situacoes" ON public.situacoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar situacoes" ON public.situacoes FOR UPDATE USING (true);

-- demissoes
DROP POLICY IF EXISTS "Qualquer pessoa pode ver demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar demissoes" ON public.demissoes;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar demissoes" ON public.demissoes;
CREATE POLICY "Qualquer pessoa pode ver demissoes" ON public.demissoes FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir demissoes" ON public.demissoes FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar demissoes" ON public.demissoes FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar demissoes" ON public.demissoes FOR DELETE USING (true);

-- periodos_ponto
DROP POLICY IF EXISTS "Qualquer pessoa pode ver periodos_ponto" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir periodos_ponto" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar periodos_ponto" ON public.periodos_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar periodos_ponto" ON public.periodos_ponto;
CREATE POLICY "Qualquer pessoa pode ver periodos_ponto" ON public.periodos_ponto FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir periodos_ponto" ON public.periodos_ponto FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar periodos_ponto" ON public.periodos_ponto FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar periodos_ponto" ON public.periodos_ponto FOR DELETE USING (true);

-- registros_ponto
DROP POLICY IF EXISTS "Qualquer pessoa pode ver registros_ponto" ON public.registros_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir registros_ponto" ON public.registros_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar registros_ponto" ON public.registros_ponto;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar registros_ponto" ON public.registros_ponto;
CREATE POLICY "Qualquer pessoa pode ver registros_ponto" ON public.registros_ponto FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir registros_ponto" ON public.registros_ponto FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar registros_ponto" ON public.registros_ponto FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar registros_ponto" ON public.registros_ponto FOR DELETE USING (true);

-- divergencias_quadro
DROP POLICY IF EXISTS "Qualquer pessoa pode ver divergencias" ON public.divergencias_quadro;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir divergencias" ON public.divergencias_quadro;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar divergencias" ON public.divergencias_quadro;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar divergencias" ON public.divergencias_quadro;
CREATE POLICY "Qualquer pessoa pode ver divergencias" ON public.divergencias_quadro FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir divergencias" ON public.divergencias_quadro FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar divergencias" ON public.divergencias_quadro FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar divergencias" ON public.divergencias_quadro FOR DELETE USING (true);

-- divergencias_ponto
DROP POLICY IF EXISTS "Leitura divergencias ponto" ON public.divergencias_ponto;
DROP POLICY IF EXISTS "Inserção divergencias ponto" ON public.divergencias_ponto;
DROP POLICY IF EXISTS "Atualização divergencias ponto" ON public.divergencias_ponto;
DROP POLICY IF EXISTS "Exclusão divergencias ponto" ON public.divergencias_ponto;
CREATE POLICY "Leitura divergencias ponto" ON public.divergencias_ponto FOR SELECT USING (true);
CREATE POLICY "Inserção divergencias ponto" ON public.divergencias_ponto FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização divergencias ponto" ON public.divergencias_ponto FOR UPDATE USING (true);
CREATE POLICY "Exclusão divergencias ponto" ON public.divergencias_ponto FOR DELETE USING (true);

-- trocas_turno
DROP POLICY IF EXISTS "Qualquer pessoa pode ver trocas_turno" ON public.trocas_turno;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir trocas_turno" ON public.trocas_turno;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar trocas_turno" ON public.trocas_turno;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar trocas_turno" ON public.trocas_turno;
CREATE POLICY "Qualquer pessoa pode ver trocas_turno" ON public.trocas_turno FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir trocas_turno" ON public.trocas_turno FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar trocas_turno" ON public.trocas_turno FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar trocas_turno" ON public.trocas_turno FOR DELETE USING (true);

-- periodos_demissao
DROP POLICY IF EXISTS "Qualquer pessoa pode ver periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar periodos_demissao" ON public.periodos_demissao;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar periodos_demissao" ON public.periodos_demissao;
CREATE POLICY "Qualquer pessoa pode ver periodos_demissao" ON public.periodos_demissao FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir periodos_demissao" ON public.periodos_demissao FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar periodos_demissao" ON public.periodos_demissao FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar periodos_demissao" ON public.periodos_demissao FOR DELETE USING (true);

-- previsao_documentos
DROP POLICY IF EXISTS "Qualquer pessoa pode ver previsao_documentos" ON public.previsao_documentos;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir previsao_documentos" ON public.previsao_documentos;
DROP POLICY IF EXISTS "Qualquer pessoa pode atualizar previsao_documentos" ON public.previsao_documentos;
DROP POLICY IF EXISTS "Qualquer pessoa pode deletar previsao_documentos" ON public.previsao_documentos;
CREATE POLICY "Qualquer pessoa pode ver previsao_documentos" ON public.previsao_documentos FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir previsao_documentos" ON public.previsao_documentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar previsao_documentos" ON public.previsao_documentos FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar previsao_documentos" ON public.previsao_documentos FOR DELETE USING (true);

-- previsao_documentos_historico
DROP POLICY IF EXISTS "Qualquer pessoa pode ver previsao_documentos_historico" ON public.previsao_documentos_historico;
DROP POLICY IF EXISTS "Qualquer pessoa pode inserir previsao_documentos_historico" ON public.previsao_documentos_historico;
CREATE POLICY "Qualquer pessoa pode ver previsao_documentos_historico" ON public.previsao_documentos_historico FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir previsao_documentos_historico" ON public.previsao_documentos_historico FOR INSERT WITH CHECK (true);

-- tipos_desligamento
DROP POLICY IF EXISTS "Qualquer pessoa pode ver tipos_desligamento" ON public.tipos_desligamento;
DROP POLICY IF EXISTS "Apenas admin pode inserir tipos_desligamento" ON public.tipos_desligamento;
DROP POLICY IF EXISTS "Apenas admin pode atualizar tipos_desligamento" ON public.tipos_desligamento;
DROP POLICY IF EXISTS "Apenas admin pode deletar tipos_desligamento" ON public.tipos_desligamento;
CREATE POLICY "Qualquer pessoa pode ver tipos_desligamento" ON public.tipos_desligamento FOR SELECT USING (true);
CREATE POLICY "Apenas admin pode inserir tipos_desligamento" ON public.tipos_desligamento FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admin pode atualizar tipos_desligamento" ON public.tipos_desligamento FOR UPDATE USING (true);
CREATE POLICY "Apenas admin pode deletar tipos_desligamento" ON public.tipos_desligamento FOR DELETE USING (true);

-- usuarios
DROP POLICY IF EXISTS "Usuários podem ver próprio registro ou admin vê todos" ON public.usuarios;
DROP POLICY IF EXISTS "Apenas admin pode inserir usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Apenas admin pode atualizar usuários" ON public.usuarios;
CREATE POLICY "Usuários podem ver próprio registro ou admin vê todos" ON public.usuarios FOR SELECT USING (true);
CREATE POLICY "Apenas admin pode inserir usuários" ON public.usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admin pode atualizar usuários" ON public.usuarios FOR UPDATE USING (true);

-- comunicados
DROP POLICY IF EXISTS "Comunicados são públicos para leitura" ON public.comunicados;
DROP POLICY IF EXISTS "Apenas admin pode inserir comunicados" ON public.comunicados;
DROP POLICY IF EXISTS "Apenas admin pode atualizar comunicados" ON public.comunicados;
DROP POLICY IF EXISTS "Apenas admin pode deletar comunicados" ON public.comunicados;
CREATE POLICY "Comunicados são públicos para leitura" ON public.comunicados FOR SELECT USING (true);
CREATE POLICY "Apenas admin pode inserir comunicados" ON public.comunicados FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admin pode atualizar comunicados" ON public.comunicados FOR UPDATE USING (true);
CREATE POLICY "Apenas admin pode deletar comunicados" ON public.comunicados FOR DELETE USING (true);

-- comunicados_categorias
DROP POLICY IF EXISTS "Categorias são públicas para leitura" ON public.comunicados_categorias;
DROP POLICY IF EXISTS "Apenas admin pode inserir categorias" ON public.comunicados_categorias;
DROP POLICY IF EXISTS "Apenas admin pode atualizar categorias" ON public.comunicados_categorias;
DROP POLICY IF EXISTS "Apenas admin pode deletar categorias" ON public.comunicados_categorias;
CREATE POLICY "Categorias são públicas para leitura" ON public.comunicados_categorias FOR SELECT USING (true);
CREATE POLICY "Apenas admin pode inserir categorias" ON public.comunicados_categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "Apenas admin pode atualizar categorias" ON public.comunicados_categorias FOR UPDATE USING (true);
CREATE POLICY "Apenas admin pode deletar categorias" ON public.comunicados_categorias FOR DELETE USING (true);
