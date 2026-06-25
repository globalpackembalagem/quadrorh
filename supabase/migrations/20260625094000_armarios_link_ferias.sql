CREATE OR REPLACE FUNCTION public.armario_link_situacao_permitida(p_situacao text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(
    upper(translate(coalesce(p_situacao, ''), 'аюбцихймлнсртузышг', 'AAAAEEEIIIOOOOUUUC')),
    '\s+',
    ' ',
    'g'
  ) IN ('ATIVO', 'FERIAS');
$$;

CREATE OR REPLACE FUNCTION public.buscar_funcionaria_armario_sopro(p_cpf text)
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
    RETURN jsonb_build_object('ok', false, 'message', 'CPF INVALIDO. PROCURE O RH.');
  END IF;

  SELECT f.id, f.nome_completo, f.cpf, f.sexo, f.cargo, s.nome AS setor_nome, sit.nome AS situacao_nome
  INTO v_func
  FROM public.funcionarios f
  LEFT JOIN public.setores s ON s.id = f.setor_id
  LEFT JOIN public.situacoes sit ON sit.id = f.situacao_id
  WHERE regexp_replace(coalesce(f.cpf, ''), '\D', '', 'g') = v_cpf
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CPF NAO LOCALIZADO. PROCURE O RH.');
  END IF;

  IF upper(coalesce(v_func.sexo, '')) NOT IN ('FEMININO', 'F') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CADASTRO DISPONIVEL APENAS PARA VESTIARIO FEMININO. PROCURE O RH.');
  END IF;

  IF NOT public.armario_link_situacao_permitida(v_func.situacao_nome) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CADASTRO DISPONIVEL APENAS PARA FUNCIONARIAS ATIVAS OU EM FERIAS. PROCURE O RH.');
  END IF;

  IF public.armario_link_bloqueado('SETOR', v_func.setor_nome) OR public.armario_link_bloqueado('FUNCAO', v_func.cargo) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'SEU CADASTRO NAO UTILIZA ESTE LINK. QUALQUER DUVIDA, PROCURE O RH.');
  END IF;

  SELECT numero, local
  INTO v_armario
  FROM public.armarios_femininos
  WHERE funcionario_id = v_func.id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'VOCE JA CADASTROU O ARMARIO NUMERO ' || v_armario.numero || '. QUALQUER DUVIDA, PROCURE O RH.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'funcionario', jsonb_build_object('nome', v_func.nome_completo, 'setor', v_func.setor_nome, 'cargo', v_func.cargo));
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
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CPF INVALIDO. PROCURE O RH.');
  END IF;

  IF p_numero IS NULL OR p_numero <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'NUMERO DO ARMARIO INVALIDO. PROCURE O RH.');
  END IF;

  SELECT f.id, f.nome_completo, f.cpf, f.sexo, f.cargo, s.nome AS setor_nome, sit.nome AS situacao_nome
  INTO v_func
  FROM public.funcionarios f
  LEFT JOIN public.setores s ON s.id = f.setor_id
  LEFT JOIN public.situacoes sit ON sit.id = f.situacao_id
  WHERE regexp_replace(coalesce(f.cpf, ''), '\D', '', 'g') = v_cpf
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CPF NAO LOCALIZADO. PROCURE O RH.');
  END IF;

  IF upper(coalesce(v_func.sexo, '')) NOT IN ('FEMININO', 'F') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CADASTRO DISPONIVEL APENAS PARA VESTIARIO FEMININO. PROCURE O RH.');
  END IF;

  IF NOT public.armario_link_situacao_permitida(v_func.situacao_nome) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CADASTRO DISPONIVEL APENAS PARA FUNCIONARIAS ATIVAS OU EM FERIAS. PROCURE O RH.');
  END IF;

  IF public.armario_link_bloqueado('SETOR', v_func.setor_nome) OR public.armario_link_bloqueado('FUNCAO', v_func.cargo) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'SEU CADASTRO NAO UTILIZA ESTE LINK. QUALQUER DUVIDA, PROCURE O RH.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.armarios_femininos WHERE funcionario_id = v_func.id) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'VOCE JA CADASTROU ARMARIO. QUALQUER DUVIDA, PROCURE O RH.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.armarios_femininos
    WHERE numero = p_numero
      AND local = 'SOPRO'
      AND (quebrado OR bloqueado OR funcionario_id IS NOT NULL OR nome_prestador IS NOT NULL)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'ARMARIO JA OCUPADO OU INDISPONIVEL. PROCURE O RH.');
  END IF;

  INSERT INTO public.armarios_femininos (numero, local, funcionario_id)
  VALUES (p_numero, 'SOPRO', v_func.id)
  ON CONFLICT (numero, local)
  DO UPDATE SET funcionario_id = excluded.funcionario_id, updated_at = now();

  RETURN jsonb_build_object('ok', true, 'message', 'ARMARIO CADASTRADO COM SUCESSO.');
END;
$$;