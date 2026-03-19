
-- Adicionar campos de data início e fim para coberturas/treinamentos
ALTER TABLE public.funcionarios 
ADD COLUMN cobertura_data_inicio date DEFAULT NULL,
ADD COLUMN cobertura_data_fim date DEFAULT NULL;
