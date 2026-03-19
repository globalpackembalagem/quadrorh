
-- Add empresa column to prestadores_funcionarios
ALTER TABLE public.prestadores_funcionarios 
ADD COLUMN empresa text NOT NULL DEFAULT '';

-- Drop existing unique constraint on matricula,mes_referencia and recreate with empresa
-- First find and drop the existing constraint
DO $$ 
BEGIN
  -- Try to drop the constraint if it exists
  ALTER TABLE public.prestadores_funcionarios DROP CONSTRAINT IF EXISTS prestadores_funcionarios_matricula_mes_referencia_key;
  ALTER TABLE public.prestadores_funcionarios DROP CONSTRAINT IF EXISTS unique_matricula_mes;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create new unique constraint including empresa
ALTER TABLE public.prestadores_funcionarios 
ADD CONSTRAINT prestadores_funcionarios_matricula_mes_empresa_key 
UNIQUE (matricula, mes_referencia, empresa);

-- Create rateio_excecoes table
CREATE TABLE public.rateio_excecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL, -- 'cargo' or 'nome'
  valor text NOT NULL,
  empresa text NOT NULL DEFAULT '', -- optional: filter by empresa
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tipo, valor, empresa)
);

-- Enable RLS
ALTER TABLE public.rateio_excecoes ENABLE ROW LEVEL SECURITY;

-- Allow full access (same pattern as other prestadores tables)
CREATE POLICY "Acesso total rateio_excecoes" ON public.rateio_excecoes
FOR ALL USING (true) WITH CHECK (true);
