CREATE OR REPLACE FUNCTION public.buscar_funcionaria_armario_sopro(p_cpf text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_func record;
  v_setor_norm text;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CPF INVALIDO. PROCURE O RH.');
  END IF;

  SELECT f.id, f.nome_completo, f.cpf, f.sexo, s.nome AS setor_nome, sit.nome AS situacao_nome
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

  IF upper(coalesce(v_func.situacao_nome, '')) <> 'ATIVO' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CADASTRO DISPONIVEL APENAS PARA FUNCIONARIAS ATIVAS. PROCURE O RH.');
  END IF;

  v_setor_norm := upper(translate(coalesce(v_func.setor_nome, ''), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));

  IF v_setor_norm IN ('DECORACAO MOD DIA', 'DECORACAO MOD NOITE') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'SETOR NAO LIBERADO PARA ESTE CADASTRO. PROCURE O RH.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.armarios_femininos WHERE funcionario_id = v_func.id) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CPF JA POSSUI ARMARIO CADASTRADO. PROCURE O RH.');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'funcionario', jsonb_build_object('nome', v_func.nome_completo, 'setor', v_func.setor_nome)
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
  v_setor_norm text;
  v_armario record;
BEGIN
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CPF INVALIDO. PROCURE O RH.');
  END IF;

  IF p_numero IS NULL OR p_numero <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'NUMERO DO ARMARIO INVALIDO. PROCURE O RH.');
  END IF;

  SELECT f.id, f.nome_completo, f.cpf, f.sexo, s.nome AS setor_nome, sit.nome AS situacao_nome
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

  IF upper(coalesce(v_func.situacao_nome, '')) <> 'ATIVO' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CADASTRO DISPONIVEL APENAS PARA FUNCIONARIAS ATIVAS. PROCURE O RH.');
  END IF;

  v_setor_norm := upper(translate(coalesce(v_func.setor_nome, ''), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));

  IF v_setor_norm IN ('DECORACAO MOD DIA', 'DECORACAO MOD NOITE') THEN
    RETURN jsonb_build_object('ok', false, 'message', 'SETOR NAO LIBERADO PARA ESTE CADASTRO. PROCURE O RH.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.armarios_femininos WHERE funcionario_id = v_func.id) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CPF JA POSSUI ARMARIO CADASTRADO. PROCURE O RH.');
  END IF;

  SELECT id, funcionario_id, nome_prestador, bloqueado, quebrado
  INTO v_armario
  FROM public.armarios_femininos
  WHERE numero = p_numero AND local = 'SOPRO'
  LIMIT 1;

  IF FOUND THEN
    IF v_armario.quebrado OR v_armario.bloqueado OR v_armario.funcionario_id IS NOT NULL OR v_armario.nome_prestador IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'message', 'ARMARIO JA OCUPADO OU INDISPONIVEL. PROCURE O RH.');
    END IF;

    UPDATE public.armarios_femininos
    SET funcionario_id = v_func.id, updated_at = now()
    WHERE id = v_armario.id;
  ELSE
    INSERT INTO public.armarios_femininos (numero, local, funcionario_id)
    VALUES (p_numero, 'SOPRO', v_func.id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'message', 'ARMARIO CADASTRADO COM SUCESSO.');
END;
$$;
