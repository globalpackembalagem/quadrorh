-- Allow deleting only candidates that are still in admission forecast.
-- This keeps active employees protected from accidental deletes.
DROP POLICY IF EXISTS "Sistema pode deletar candidatos previsao"
ON public.funcionarios;

CREATE POLICY "Sistema pode deletar candidatos previsao"
ON public.funcionarios
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.situacoes s
    WHERE s.id = funcionarios.situacao_id
      AND upper(
        translate(
          coalesce(s.nome, ''),
          'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
          'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
        )
      ) LIKE '%PREVIS%'
  )
);

DROP POLICY IF EXISTS "Sistema pode deletar previsao_documentos"
ON public.previsao_documentos;

CREATE POLICY "Sistema pode deletar previsao_documentos"
ON public.previsao_documentos
FOR DELETE
TO public
USING (true);
