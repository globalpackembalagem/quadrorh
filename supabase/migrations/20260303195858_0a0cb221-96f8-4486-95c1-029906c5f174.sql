
-- Trigger: ao atualizar funcionário, liberar armário automaticamente se necessário
CREATE OR REPLACE FUNCTION public.auto_liberar_armario_feminino()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _situacao_nome text;
BEGIN
  -- Se sexo mudou de feminino para masculino, liberar armário
  IF OLD.sexo = 'feminino' AND NEW.sexo = 'masculino' THEN
    UPDATE armarios_femininos 
    SET funcionario_id = NULL, observacoes = 'Liberado automaticamente - sexo alterado', updated_at = now()
    WHERE funcionario_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Se situação mudou, verificar se a nova situação é elegível
  IF OLD.situacao_id IS DISTINCT FROM NEW.situacao_id THEN
    SELECT nome INTO _situacao_nome FROM situacoes WHERE id = NEW.situacao_id;
    
    IF _situacao_nome NOT IN ('ATIVO', 'FÉRIAS', 'COB. FÉRIAS', 'AUXÍLIO DOENÇA', 'TREINAMENTO') THEN
      UPDATE armarios_femininos 
      SET funcionario_id = NULL, observacoes = 'Liberado automaticamente - situação: ' || COALESCE(_situacao_nome, 'desconhecida'), updated_at = now()
      WHERE funcionario_id = NEW.id;
    END IF;
  END IF;

  -- Se foi demitido (data_demissao preenchida), liberar armário
  IF OLD.data_demissao IS NULL AND NEW.data_demissao IS NOT NULL THEN
    UPDATE armarios_femininos 
    SET funcionario_id = NULL, observacoes = 'Liberado automaticamente - demissão', updated_at = now()
    WHERE funcionario_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_liberar_armario
BEFORE UPDATE ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.auto_liberar_armario_feminino();
