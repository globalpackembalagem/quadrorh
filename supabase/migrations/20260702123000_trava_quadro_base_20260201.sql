-- Trava base do quadro solicitada para 01/02/2026 00:00.
-- Mantem apenas uma trava ativa por area para o historico de movimentacoes.

UPDATE public.quadro_travas
SET ativo = false
WHERE ativo = true
  AND area IN ('SOPRO', 'DECORACAO');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'quadro_travas'
      AND column_name = 'created_at'
  ) THEN
    INSERT INTO public.quadro_travas (area, usuario_nome, observacao, ativo, created_at)
    VALUES
      ('SOPRO', 'LUCIANO', 'TRAVA SOPRO - BASE 01/02/2026 00:00', true, timestamptz '2026-02-01 00:00:00-03'),
      ('DECORACAO', 'LUCIANO', 'TRAVA DECORACAO - BASE 01/02/2026 00:00', true, timestamptz '2026-02-01 00:00:00-03');
  ELSE
    INSERT INTO public.quadro_travas (area, usuario_nome, observacao, ativo)
    VALUES
      ('SOPRO', 'LUCIANO', 'TRAVA SOPRO - BASE 01/02/2026 00:00', true),
      ('DECORACAO', 'LUCIANO', 'TRAVA DECORACAO - BASE 01/02/2026 00:00', true);
  END IF;
END $$;
