-- Normaliza textos de cadastro em todas as gravacoes presentes e futuras.
-- Campos tecnicos, credenciais, CPF, e-mail, links e enums nao sao alterados.

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.normalizar_texto_cadastro(valor text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN valor IS NULL THEN NULL
    ELSE upper(extensions.unaccent(btrim(valor)))
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalizar_campos_cadastro_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  dados jsonb := to_jsonb(NEW);
  campo text;
  valor text;
BEGIN
  FOREACH campo IN ARRAY TG_ARGV LOOP
    IF dados ? campo AND jsonb_typeof(dados -> campo) = 'string' THEN
      valor := dados ->> campo;
      dados := jsonb_set(
        dados,
        ARRAY[campo],
        to_jsonb(public.normalizar_texto_cadastro(valor)),
        false
      );
    END IF;
  END LOOP;

  NEW := jsonb_populate_record(NEW, dados);
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tabela record;
  colunas text[];
  argumentos text;
  nome_trigger text;
BEGIN
  FOR tabela IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
     AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('text', 'character varying', 'character')
      AND c.column_name = ANY (ARRAY[
        'nome', 'name', 'nome_completo', 'nome_gestor', 'nome_usuario',
        'nome_registro', 'funcionario_nome', 'employee_name', 'matricula',
        'cargo', 'funcao', 'turma', 'turma_origem', 'turma_destino',
        'grupo', 'setor', 'setor_nome', 'setor_grupo', 'setor_prestador',
        'nome_prestador', 'centro_custo', 'cidade', 'local', 'responsavel',
        'descricao', 'descricao_acao', 'observacao', 'observacoes', 'detalhes',
        'motivo', 'motivo_recusa', 'motivo_bloqueio', 'justificativa',
        'titulo', 'mensagem', 'conteudo', 'template_texto', 'feedback_rh',
        'indicacao', 'ponto_referencia', 'residencia_fretado', 'dispositivo',
        'navegador', 'criado_por', 'atualizado_por', 'usuario_nome',
        'gestor_origem_nome', 'gestor_destino_nome', 'resolvido_por',
        'recusado_por', 'presenca_por', 'resultado_por', 'liberado_por',
        'marcado_por_nome', 'campo', 'valor_anterior', 'valor_novo',
        'tipo_desligamento', 'tipo_movimentacao', 'tipo_divergencia',
        'tipo_solicitado', 'tipo_atual', 'tipo_anterior', 'tipo_novo',
        'status_anterior', 'status_novo', 'acao', 'decisao', 'resultado',
        'categoria', 'empresa', 'tamanho_uniforme', 'tamanho_calca',
        'tamanho_camiseta', 'tamanho_calcado', 'calca', 'camisa', 'sapato',
        'oculos', 'sheet'
      ])
  LOOP
    SELECT array_agg(c.column_name ORDER BY c.ordinal_position),
           string_agg(quote_literal(c.column_name), ', ' ORDER BY c.ordinal_position)
      INTO colunas, argumentos
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = tabela.table_name
      AND c.data_type IN ('text', 'character varying', 'character')
      AND c.column_name = ANY (ARRAY[
        'nome', 'name', 'nome_completo', 'nome_gestor', 'nome_usuario',
        'nome_registro', 'funcionario_nome', 'employee_name', 'matricula',
        'cargo', 'funcao', 'turma', 'turma_origem', 'turma_destino',
        'grupo', 'setor', 'setor_nome', 'setor_grupo', 'setor_prestador',
        'nome_prestador', 'centro_custo', 'cidade', 'local', 'responsavel',
        'descricao', 'descricao_acao', 'observacao', 'observacoes', 'detalhes',
        'motivo', 'motivo_recusa', 'motivo_bloqueio', 'justificativa',
        'titulo', 'mensagem', 'conteudo', 'template_texto', 'feedback_rh',
        'indicacao', 'ponto_referencia', 'residencia_fretado', 'dispositivo',
        'navegador', 'criado_por', 'atualizado_por', 'usuario_nome',
        'gestor_origem_nome', 'gestor_destino_nome', 'resolvido_por',
        'recusado_por', 'presenca_por', 'resultado_por', 'liberado_por',
        'marcado_por_nome', 'campo', 'valor_anterior', 'valor_novo',
        'tipo_desligamento', 'tipo_movimentacao', 'tipo_divergencia',
        'tipo_solicitado', 'tipo_atual', 'tipo_anterior', 'tipo_novo',
        'status_anterior', 'status_novo', 'acao', 'decisao', 'resultado',
        'categoria', 'empresa', 'tamanho_uniforme', 'tamanho_calca',
        'tamanho_camiseta', 'tamanho_calcado', 'calca', 'camisa', 'sapato',
        'oculos', 'sheet'
      ]);

    IF array_length(colunas, 1) IS NULL THEN CONTINUE; END IF;

    nome_trigger := 'trg_normalizar_cadastro';
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', nome_trigger, tabela.table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.normalizar_campos_cadastro_trigger(%s)',
      nome_trigger,
      tabela.table_name,
      argumentos
    );
  END LOOP;
END;
$$;

-- Corrige dados existentes sem interromper a execucao em caso de restricao unica.
DO $$
DECLARE
  coluna record;
BEGIN
  FOR coluna IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
     AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('text', 'character varying', 'character')
      AND c.column_name = ANY (ARRAY[
        'nome', 'name', 'nome_completo', 'nome_gestor', 'nome_usuario',
        'nome_registro', 'funcionario_nome', 'employee_name', 'matricula',
        'cargo', 'funcao', 'turma', 'turma_origem', 'turma_destino',
        'grupo', 'setor', 'setor_nome', 'setor_grupo', 'setor_prestador',
        'nome_prestador', 'centro_custo', 'cidade', 'local', 'responsavel',
        'descricao', 'descricao_acao', 'observacao', 'observacoes', 'detalhes',
        'motivo', 'motivo_recusa', 'motivo_bloqueio', 'justificativa',
        'titulo', 'mensagem', 'conteudo', 'template_texto', 'feedback_rh',
        'indicacao', 'ponto_referencia', 'residencia_fretado', 'dispositivo',
        'navegador', 'criado_por', 'atualizado_por', 'usuario_nome',
        'gestor_origem_nome', 'gestor_destino_nome', 'resolvido_por',
        'recusado_por', 'presenca_por', 'resultado_por', 'liberado_por',
        'marcado_por_nome', 'campo', 'valor_anterior', 'valor_novo',
        'tipo_desligamento', 'tipo_movimentacao', 'tipo_divergencia',
        'tipo_solicitado', 'tipo_atual', 'tipo_anterior', 'tipo_novo',
        'status_anterior', 'status_novo', 'acao', 'decisao', 'resultado',
        'categoria', 'empresa', 'tamanho_uniforme', 'tamanho_calca',
        'tamanho_camiseta', 'tamanho_calcado', 'calca', 'camisa', 'sapato',
        'oculos', 'sheet'
      ])
  LOOP
    BEGIN
      EXECUTE format(
        'UPDATE public.%I SET %I = public.normalizar_texto_cadastro(%I) WHERE %I IS NOT NULL AND %I IS DISTINCT FROM public.normalizar_texto_cadastro(%I)',
        coluna.table_name, coluna.column_name, coluna.column_name,
        coluna.column_name, coluna.column_name, coluna.column_name
      );
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'COLISAO IGNORADA: %.%', coluna.table_name, coluna.column_name;
    END;
  END LOOP;
END;
$$;
