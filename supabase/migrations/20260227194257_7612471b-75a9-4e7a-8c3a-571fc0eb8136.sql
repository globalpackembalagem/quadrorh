
-- Índices para melhorar performance das queries mais frequentes
CREATE INDEX IF NOT EXISTS idx_funcionarios_setor_id ON public.funcionarios (setor_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_situacao_id ON public.funcionarios (situacao_id);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_funcionario_id ON public.registros_ponto (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_periodo_id ON public.registros_ponto (periodo_id);
CREATE INDEX IF NOT EXISTS idx_registros_ponto_data ON public.registros_ponto (data);
CREATE INDEX IF NOT EXISTS idx_demissoes_funcionario_id ON public.demissoes (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_divergencias_quadro_funcionario_id ON public.divergencias_quadro (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_divergencias_ponto_funcionario_id ON public.divergencias_ponto (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_divergencias_ponto_periodo_id ON public.divergencias_ponto (periodo_id);
CREATE INDEX IF NOT EXISTS idx_trocas_turno_funcionario_id ON public.trocas_turno (funcionario_id);
CREATE INDEX IF NOT EXISTS idx_eventos_sistema_tipo ON public.eventos_sistema (tipo);
CREATE INDEX IF NOT EXISTS idx_historico_auditoria_tabela ON public.historico_auditoria (tabela);
