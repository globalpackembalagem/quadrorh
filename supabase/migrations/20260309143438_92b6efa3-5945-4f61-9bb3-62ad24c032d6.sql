
-- Drop and re-add all tables to realtime publication to ensure all are included
DO $$
DECLARE
  _tables text[] := ARRAY[
    'funcionarios','registros_ponto','periodos_ponto','demissoes',
    'divergencias_quadro','divergencias_ponto','quadro_planejado','quadro_decoracao',
    'setores','situacoes','historico_auditoria','historico_quadro',
    'trocas_turno','experiencia_decisoes','previsao_documentos','eventos_sistema',
    'armarios_femininos','armarios_config','avisos_movimentacao','notificacoes',
    'liberacoes_faltas','historico_faltas','periodos_demissao','integracoes_agencia',
    'user_roles','meal_records','meal_types','fretado_imports','fretado_trips',
    'fretado_itinerarios','fretado_valores_extras','prestadores_funcionarios',
    'prestadores_usuarios','valor_historico','rateio_meses_fechados',
    'previsao_documentos_historico','comunicados','comunicados_categorias',
    'tipos_desligamento','sistema_config','notificacoes_vistas',
    'avisos_movimentacao_lidos','historico_acesso','user_roles_setores',
    'previsao_horarios_notificacao','force_logout'
  ];
  _t text;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', _t);
    EXCEPTION WHEN duplicate_object THEN
      -- already in publication, skip
    END;
  END LOOP;
END $$;
