CREATE OR REPLACE FUNCTION public.registrar_historico_quadro_planejado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'name', 'SISTEMA');
BEGIN
  IF OLD.reserva_faltas_industria IS DISTINCT FROM NEW.reserva_faltas_industria THEN
    INSERT INTO public.historico_quadro (tabela, registro_id, campo, valor_anterior, valor_novo, grupo, turma, usuario_nome)
    VALUES ('quadro_planejado', NEW.id, 'reserva_faltas_industria', OLD.reserva_faltas_industria, NEW.reserva_faltas_industria, NEW.grupo, NEW.turma, v_usuario);
  END IF;

  IF OLD.reserva_faltas_gp IS DISTINCT FROM NEW.reserva_faltas_gp THEN
    INSERT INTO public.historico_quadro (tabela, registro_id, campo, valor_anterior, valor_novo, grupo, turma, usuario_nome)
    VALUES ('quadro_planejado', NEW.id, 'reserva_faltas_gp', OLD.reserva_faltas_gp, NEW.reserva_faltas_gp, NEW.grupo, NEW.turma, v_usuario);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_historico_quadro_decoracao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'name', 'SISTEMA');
BEGIN
  IF OLD.reserva_faltas IS DISTINCT FROM NEW.reserva_faltas THEN
    INSERT INTO public.historico_quadro (tabela, registro_id, campo, valor_anterior, valor_novo, grupo, turma, usuario_nome)
    VALUES ('quadro_decoracao', NEW.id, 'reserva_faltas', OLD.reserva_faltas, NEW.reserva_faltas, NULL, NEW.turma, v_usuario);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_historico_quadro_planejado_reserva_faltas ON public.quadro_planejado;
CREATE TRIGGER trg_historico_quadro_planejado_reserva_faltas
AFTER UPDATE OF reserva_faltas_industria, reserva_faltas_gp ON public.quadro_planejado
FOR EACH ROW
EXECUTE FUNCTION public.registrar_historico_quadro_planejado();

DROP TRIGGER IF EXISTS trg_historico_quadro_decoracao_reserva_faltas ON public.quadro_decoracao;
CREATE TRIGGER trg_historico_quadro_decoracao_reserva_faltas
AFTER UPDATE OF reserva_faltas ON public.quadro_decoracao
FOR EACH ROW
EXECUTE FUNCTION public.registrar_historico_quadro_decoracao();
