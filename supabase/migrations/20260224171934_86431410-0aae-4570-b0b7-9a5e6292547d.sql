ALTER TABLE public.funcionarios 
  ADD COLUMN tamanho_calca text NULL,
  ADD COLUMN tamanho_camiseta text NULL,
  ADD COLUMN tamanho_calcado text NULL,
  ADD COLUMN usa_oculos boolean NULL DEFAULT false;