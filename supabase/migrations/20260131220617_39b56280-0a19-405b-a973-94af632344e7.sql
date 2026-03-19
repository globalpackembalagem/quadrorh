-- Adicionar coluna para marcar se foi lançado no APDATA
ALTER TABLE public.demissoes 
ADD COLUMN IF NOT EXISTS lancado_apdata boolean NOT NULL DEFAULT false;