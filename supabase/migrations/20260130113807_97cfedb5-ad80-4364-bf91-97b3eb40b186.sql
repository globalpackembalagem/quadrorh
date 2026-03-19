-- Atualizar enum ponto_tipo para incluir 'P' (Presente)
ALTER TYPE public.ponto_tipo ADD VALUE IF NOT EXISTS 'P';

-- Adicionar coluna para controlar se funcionário está ativo no período
ALTER TABLE public.registros_ponto 
ADD COLUMN IF NOT EXISTS ativo_no_periodo boolean NOT NULL DEFAULT true;