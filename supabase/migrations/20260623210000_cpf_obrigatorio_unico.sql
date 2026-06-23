-- CPF obrigatorio e unico para funcionarios atuais.
-- As situacoes de desligamento ficam fora da validacao.

CREATE OR REPLACE FUNCTION public.normalizar_nome_situacao_cpf(valor text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT translate(
    upper(btrim(coalesce(valor, ''))),
    'ÁÀÃÂÉÊÍÓÔÕÚÜÇ',
    'AAAAEEIOOOUUC'
  );
$$;

CREATE OR REPLACE FUNCTION public.validar_cpf_funcionario_atual()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  cpf_digitos text;
  situacao_nome text;
BEGIN
  SELECT public.normalizar_nome_situacao_cpf(s.nome)
    INTO situacao_nome
  FROM public.situacoes s
  WHERE s.id = NEW.situacao_id;

  IF situacao_nome = ANY (ARRAY[
    'DEMISSAO', 'PED. DEMISSAO', 'PEDIDO DEMISSAO',
    'PEDIDO DE DEMISSAO', 'TERMINO CONTRATO', 'TERMINO DE CONTRATO'
  ]) THEN
    RETURN NEW;
  END IF;

  cpf_digitos := regexp_replace(coalesce(NEW.cpf, ''), '\D', '', 'g');
  IF length(cpf_digitos) <> 11 THEN
    RAISE EXCEPTION 'CPF E OBRIGATORIO E DEVE TER 11 DIGITOS';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(cpf_digitos));

  IF EXISTS (
    SELECT 1
    FROM public.funcionarios f
    LEFT JOIN public.situacoes s ON s.id = f.situacao_id
    WHERE f.id <> NEW.id
      AND regexp_replace(coalesce(f.cpf, ''), '\D', '', 'g') = cpf_digitos
      AND public.normalizar_nome_situacao_cpf(s.nome) <> ALL (ARRAY[
        'DEMISSAO', 'PED. DEMISSAO', 'PEDIDO DEMISSAO',
        'PEDIDO DE DEMISSAO', 'TERMINO CONTRATO', 'TERMINO DE CONTRATO'
      ])
  ) THEN
    RAISE EXCEPTION 'CPF JA CADASTRADO PARA OUTRO FUNCIONARIO ATUAL';
  END IF;

  NEW.cpf := substr(cpf_digitos, 1, 3) || '.' ||
             substr(cpf_digitos, 4, 3) || '.' ||
             substr(cpf_digitos, 7, 3) || '-' ||
             substr(cpf_digitos, 10, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_cpf_funcionario_atual ON public.funcionarios;
CREATE TRIGGER trg_validar_cpf_funcionario_atual
BEFORE INSERT OR UPDATE OF cpf, situacao_id
ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.validar_cpf_funcionario_atual();

SELECT
  regexp_replace(coalesce(f.cpf, ''), '\D', '', 'g') AS cpf,
  count(*) AS quantidade,
  string_agg(f.nome_completo || ' [' || coalesce(f.matricula, 'SEM MATRICULA') || ']', ' | ' ORDER BY f.nome_completo) AS funcionarios
FROM public.funcionarios f
LEFT JOIN public.situacoes s ON s.id = f.situacao_id
WHERE public.normalizar_nome_situacao_cpf(s.nome) <> ALL (ARRAY[
  'DEMISSAO', 'PED. DEMISSAO', 'PEDIDO DEMISSAO', 'PEDIDO DE DEMISSAO',
  'TERMINO CONTRATO', 'TERMINO DE CONTRATO'
])
GROUP BY regexp_replace(coalesce(f.cpf, ''), '\D', '', 'g')
HAVING length(regexp_replace(coalesce(f.cpf, ''), '\D', '', 'g')) <> 11
    OR count(*) > 1
ORDER BY quantidade DESC, cpf;
