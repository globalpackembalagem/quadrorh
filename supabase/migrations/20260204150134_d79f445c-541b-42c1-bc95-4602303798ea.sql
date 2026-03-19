-- Criar enum para tipo de integração
CREATE TYPE public.tipo_integracao AS ENUM ('1a', '2a', 'admissao');

-- Adicionar coluna tipo_integracao à tabela historico_integracoes
ALTER TABLE public.historico_integracoes
ADD COLUMN tipo_integracao public.tipo_integracao NOT NULL DEFAULT '1a';