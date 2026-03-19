-- Remover tabela historico_integracoes e seus tipos ENUM relacionados
DROP TABLE IF EXISTS public.historico_integracoes CASCADE;

-- Remover ENUMs (se não estiverem sendo usados em outro lugar)
DROP TYPE IF EXISTS public.integracao_status CASCADE;
DROP TYPE IF EXISTS public.fretado_linha CASCADE;
DROP TYPE IF EXISTS public.tipo_integracao CASCADE;