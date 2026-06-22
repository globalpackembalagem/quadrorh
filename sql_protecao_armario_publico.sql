CREATE OR REPLACE FUNCTION public.buscar_funcionaria_armario_sopro(p_cpf text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_func record;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'status', 'CPF_INVALIDO', 'message', 'INFORME UM CPF VALIDO COM 11 DIGITOS.');
  END IF;

  SELECT
    f.id,
    f.nome_completo,
    f.matricula,
    f.sexo,
    s.nome AS setor_nome,
    sit.nome AS situacao_nome
  INTO v_func
  FROM public.funcionarios f
  JOIN public.setores s ON s.id = f.setor_id
  JOIN public.situacoes sit ON sit.id = f.situacao_id
  WHERE regexp_replace(coalesce(f.cpf, ''), '\D', '', 'g') = v_cpf
  LIMIT 1;

  IF v_func.id IS NULL
    OR upper(coalesce(v_func.sexo, '')) <> 'FEMININO'
    OR upper(coalesce(v_func.setor_nome, '')) NOT LIKE '%SOPRO%'
    OR upper(coalesce(v_func.setor_nome, '')) LIKE '%DECOR%'
    OR upper(coalesce(v_func.situacao_nome, '')) <> 'ATIVO'
  THEN
    RETURN jsonb_build_object('ok', false, 'status', 'NAO_LOCALIZADO', 'message', 'CPF NAO LOCALIZADO PARA CADASTRO DE ARMARIO DO VESTIARIO FEMININO DO SOPRO. PROCURE O RH.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.armarios_femininos
    WHERE funcionario_id = v_func.id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'status', 'JA_CADASTRADO', 'message', 'CADASTRO JA REALIZADO. PARA ALTERACAO, PROCURE O RH.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'OK',
    'nome', upper(v_func.nome_completo),
    'setor', upper(v_func.setor_nome)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cadastrar_armario_sopro(p_cpf text, p_numero integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_func record;
  v_armario record;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'status', 'CPF_INVALIDO', 'message', 'INFORME UM CPF VALIDO COM 11 DIGITOS.');
  END IF;

  IF p_numero IS NULL OR p_numero <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'status', 'ARMARIO_INVALIDO', 'message', 'INFORME O NUMERO DO ARMARIO.');
  END IF;

  SELECT
    f.id,
    f.nome_completo,
    f.matricula,
    f.sexo,
    s.nome AS setor_nome,
    sit.nome AS situacao_nome
  INTO v_func
  FROM public.funcionarios f
  JOIN public.setores s ON s.id = f.setor_id
  JOIN public.situacoes sit ON sit.id = f.situacao_id
  WHERE regexp_replace(coalesce(f.cpf, ''), '\D', '', 'g') = v_cpf
  LIMIT 1;

  IF v_func.id IS NULL
    OR upper(coalesce(v_func.sexo, '')) <> 'FEMININO'
    OR upper(coalesce(v_func.setor_nome, '')) NOT LIKE '%SOPRO%'
    OR upper(coalesce(v_func.setor_nome, '')) LIKE '%DECOR%'
    OR upper(coalesce(v_func.situacao_nome, '')) <> 'ATIVO'
  THEN
    RETURN jsonb_build_object('ok', false, 'status', 'NAO_LOCALIZADO', 'message', 'CPF NAO LOCALIZADO PARA CADASTRO DE ARMARIO DO VESTIARIO FEMININO DO SOPRO. PROCURE O RH.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.armarios_femininos
    WHERE funcionario_id = v_func.id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'status', 'JA_CADASTRADO', 'message', 'CADASTRO JA REALIZADO. PARA ALTERACAO, PROCURE O RH.');
  END IF;

  SELECT id, funcionario_id, nome_prestador, bloqueado, quebrado
  INTO v_armario
  FROM public.armarios_femininos
  WHERE numero = p_numero
    AND local = 'SOPRO'
  LIMIT 1;

  IF v_armario.id IS NOT NULL
    AND (
      v_armario.funcionario_id IS NOT NULL
      OR v_armario.nome_prestador IS NOT NULL
      OR coalesce(v_armario.bloqueado, false)
      OR coalesce(v_armario.quebrado, false)
    )
  THEN
    RETURN jsonb_build_object('ok', false, 'status', 'INDISPONIVEL', 'message', 'ARMARIO JA CADASTRADO OU INDISPONIVEL. PROCURE O RH.');
  END IF;

  IF v_armario.id IS NOT NULL THEN
    UPDATE public.armarios_femininos
    SET
      funcionario_id = v_func.id,
      matricula = v_func.matricula,
      observacoes = 'CADASTRO REALIZADO PELO LINK DO VESTIARIO FEMININO DO SOPRO',
      updated_at = now()
    WHERE id = v_armario.id;
  ELSE
    INSERT INTO public.armarios_femininos (numero, local, funcionario_id, matricula, observacoes)
    VALUES (p_numero, 'SOPRO', v_func.id, v_func.matricula, 'CADASTRO REALIZADO PELO LINK DO VESTIARIO FEMININO DO SOPRO');
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', 'CADASTRADO', 'message', 'CADASTRO REALIZADO COM SUCESSO. O NUMERO DO ARMARIO FOI REGISTRADO NO SISTEMA.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_funcionaria_armario_sopro(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cadastrar_armario_sopro(text, integer) TO anon, authenticated;
