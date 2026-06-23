CREATE TABLE IF NOT EXISTS public.armarios_link_bloqueios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('SETOR', 'FUNCAO')),
  valor text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT armarios_link_bloqueios_tipo_valor_unique UNIQUE (tipo, valor)
);

ALTER TABLE public.armarios_link_bloqueios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total armarios_link_bloqueios" ON public.armarios_link_bloqueios;
CREATE POLICY "Acesso total armarios_link_bloqueios"
ON public.armarios_link_bloqueios
FOR ALL
USING (true)
WITH CHECK (true);

INSERT INTO public.armarios_link_bloqueios (tipo, valor) VALUES
('SETOR', 'DECORACAO MOD DIA'),
('SETOR', 'DECORACAO MOD NOITE')
ON CONFLICT (tipo, valor) DO UPDATE SET ativo = true, updated_at = now();

CREATE OR REPLACE FUNCTION public.normalizar_armario_link(valor text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(translate(coalesce(valor, ''), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç', 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'));
$$;

CREATE OR REPLACE FUNCTION public.armario_link_bloqueado(p_tipo text, p_valor text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.armarios_link_bloqueios b
    WHERE b.ativo = true
      AND b.tipo = p_tipo
      AND public.normalizar_armario_link(p_valor) LIKE '%' || public.normalizar_armario_link(b.valor) || '%'
  );
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

  IF upper(coalesce(v_func.situacao_nome, '')) <> 'ATIVO' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CADASTRO DISPONIVEL APENAS PARA FUNCIONARIAS ATIVAS. PROCURE O RH.');
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

  RETURN jsonb_build_object(
    'ok', true,
    'funcionario', jsonb_build_object('nome', v_func.nome_completo, 'setor', v_func.setor_nome, 'cargo', v_func.cargo)
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

  IF upper(coalesce(v_func.situacao_nome, '')) <> 'ATIVO' THEN
    RETURN jsonb_build_object('ok', false, 'message', 'CADASTRO DISPONIVEL APENAS PARA FUNCIONARIAS ATIVAS. PROCURE O RH.');
  END IF;

  IF public.armario_link_bloqueado('SETOR', v_func.setor_nome) OR public.armario_link_bloqueado('FUNCAO', v_func.cargo) THEN
    RETURN jsonb_build_object('ok', false, 'message', 'SEU CADASTRO NAO UTILIZA ESTE LINK. QUALQUER DUVIDA, PROCURE O RH.');
  END IF;

  SELECT id, numero, local, funcionario_id, nome_prestador, bloqueado, quebrado
  INTO v_armario
  FROM public.armarios_femininos
  WHERE funcionario_id = v_func.id
     OR (numero = p_numero AND local = 'SOPRO')
  ORDER BY CASE WHEN funcionario_id = v_func.id THEN 0 ELSE 1 END
  LIMIT 1;

  IF FOUND AND v_armario.funcionario_id = v_func.id THEN
    RETURN jsonb_build_object('ok', false, 'message', 'VOCE JA CADASTROU O ARMARIO NUMERO ' || v_armario.numero || '. QUALQUER DUVIDA, PROCURE O RH.');
  END IF;

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
