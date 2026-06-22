CREATE EXTENSION IF NOT EXISTS unaccent;

DO $$
DECLARE
  nomes_oficiais text[] := ARRAY[
    'ACIDENTE DE TRABALHO',
    'ATIVO',
    'AUXILIO DOENCA',
    'DEMISSAO',
    'FERIAS',
    'LICENCA MATERNIDADE',
    'PEDIDO DEMISSAO',
    'TERMINO CONTRATO',
    'SERVICO MILITAR',
    'COBERTURA FERIAS'
  ];
  nome_oficial text;
  id_oficial uuid;
  id_duplicado uuid;
BEGIN
  FOREACH nome_oficial IN ARRAY nomes_oficiais LOOP
    INSERT INTO public.situacoes (nome, conta_no_quadro, entra_no_ponto, ativa)
    VALUES (
      nome_oficial,
      CASE WHEN nome_oficial IN ('ATIVO', 'FERIAS', 'COBERTURA FERIAS') THEN true ELSE false END,
      CASE WHEN nome_oficial IN ('ATIVO', 'FERIAS', 'COBERTURA FERIAS') THEN true ELSE false END,
      true
    )
    ON CONFLICT DO NOTHING;

    SELECT id INTO id_oficial
    FROM public.situacoes
    WHERE upper(unaccent(nome)) = nome_oficial
    ORDER BY ativa DESC, created_at ASC
    LIMIT 1;

    UPDATE public.situacoes
    SET
      nome = nome_oficial,
      conta_no_quadro = CASE WHEN nome_oficial IN ('ATIVO', 'FERIAS', 'COBERTURA FERIAS') THEN true ELSE false END,
      entra_no_ponto = CASE WHEN nome_oficial IN ('ATIVO', 'FERIAS', 'COBERTURA FERIAS') THEN true ELSE false END,
      ativa = true
    WHERE id = id_oficial;

    FOR id_duplicado IN
      SELECT id
      FROM public.situacoes
      WHERE id <> id_oficial
        AND (
          upper(unaccent(nome)) = nome_oficial
          OR (nome_oficial = 'ACIDENTE DE TRABALHO' AND upper(unaccent(nome)) LIKE '%ACIDENTE%')
          OR (nome_oficial = 'AUXILIO DOENCA' AND upper(unaccent(nome)) LIKE '%AUXILIO%')
          OR (nome_oficial = 'DEMISSAO' AND upper(unaccent(nome)) IN ('DEMISSAO', 'DESLIGADO'))
          OR (nome_oficial = 'FERIAS' AND upper(unaccent(nome)) LIKE '%FERIAS%')
          OR (nome_oficial = 'LICENCA MATERNIDADE' AND upper(unaccent(nome)) LIKE '%LICENCA%')
          OR (nome_oficial = 'PEDIDO DEMISSAO' AND upper(unaccent(nome)) IN ('PEDIDO DEMISSAO', 'PED. DEMISSAO'))
          OR (nome_oficial = 'TERMINO CONTRATO' AND upper(unaccent(nome)) LIKE '%TERMINO%')
          OR (nome_oficial = 'SERVICO MILITAR' AND upper(unaccent(nome)) LIKE '%MILITAR%')
          OR (nome_oficial = 'COBERTURA FERIAS' AND upper(unaccent(nome)) LIKE '%COBERTURA%')
        )
    LOOP
      UPDATE public.funcionarios
      SET situacao_id = id_oficial
      WHERE situacao_id = id_duplicado;

      UPDATE public.situacoes
      SET ativa = false, conta_no_quadro = false, entra_no_ponto = false
      WHERE id = id_duplicado;
    END LOOP;
  END LOOP;

  UPDATE public.situacoes
  SET
    nome = upper(unaccent(nome)),
    ativa = false,
    conta_no_quadro = false,
    entra_no_ponto = false
  WHERE upper(unaccent(nome)) NOT IN (SELECT unnest(nomes_oficiais));
END $$;
