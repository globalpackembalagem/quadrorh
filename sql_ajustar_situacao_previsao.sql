CREATE EXTENSION IF NOT EXISTS unaccent;

INSERT INTO public.situacoes (nome, ativa, conta_no_quadro, entra_no_ponto)
SELECT 'PREVISAO', true, false, false
WHERE NOT EXISTS (
  SELECT 1
  FROM public.situacoes
  WHERE upper(unaccent(nome)) = 'PREVISAO'
);

UPDATE public.situacoes
SET
  nome = 'PREVISAO',
  ativa = true,
  conta_no_quadro = false,
  entra_no_ponto = false
WHERE upper(unaccent(nome)) = 'PREVISAO';
