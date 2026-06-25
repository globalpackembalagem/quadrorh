-- Armario public link: allow all employee situations except dismissal flows.
-- QR code and URL remain unchanged.
CREATE OR REPLACE FUNCTION public.armario_link_situacao_permitida(p_situacao text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  WITH normalizada AS (
    SELECT upper(
      translate(
        trim(coalesce(p_situacao, '')),
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
      )
    ) AS valor
  )
  SELECT NOT (
    valor LIKE '%DEMISSAO%'
    OR valor LIKE '%PEDIDO%'
    OR valor LIKE '%TERMINO DE CONTRATO%'
    OR valor LIKE '%TERMINO CONTRATO%'
  )
  FROM normalizada;
$$;
