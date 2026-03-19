
-- Adicionar campos de data à tabela experiencia_decisoes
ALTER TABLE public.experiencia_decisoes
ADD COLUMN data_programada date,
ADD COLUMN data_prevista date;
