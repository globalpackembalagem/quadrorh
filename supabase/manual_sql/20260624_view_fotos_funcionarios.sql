-- Preparacao para integracao QUADRO -> FOTOS.
-- Regra principal: o sistema FOTOS deve fazer UPSERT por quadro_funcionario_id.
-- Nunca deletar funcionarios ou fotos no FOTOS; desligados devem virar inativos.

CREATE OR REPLACE VIEW public.vw_fotos_funcionarios AS
SELECT
  f.id AS quadro_funcionario_id,
  f.nome_completo,
  f.matricula,
  f.cpf,
  s.nome AS setor,
  sit.nome AS situacao,
  f.data_admissao,
  f.data_demissao,
  f.updated_at,
  NOT (
    upper(coalesce(sit.nome, '')) LIKE '%DEMISS%'
    OR upper(coalesce(sit.nome, '')) LIKE '%DESLIG%'
    OR f.data_demissao IS NOT NULL
  ) AS ativo_fotos
FROM public.funcionarios f
LEFT JOIN public.setores s ON s.id = f.setor_id
LEFT JOIN public.situacoes sit ON sit.id = f.situacao_id;

COMMENT ON VIEW public.vw_fotos_funcionarios IS
  'View de leitura para integracao QUADRO -> FOTOS. Usar upsert no FOTOS por quadro_funcionario_id. Nunca deletar registros/fotos; usar ativo_fotos=false para desligados.';
