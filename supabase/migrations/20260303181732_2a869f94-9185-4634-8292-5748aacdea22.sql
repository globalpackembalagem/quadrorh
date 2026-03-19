
-- Remove a constraint unique antiga do numero sozinho
ALTER TABLE public.armarios_femininos DROP CONSTRAINT IF EXISTS armarios_femininos_numero_key;

-- Adiciona constraint unique composta (numero + local)
ALTER TABLE public.armarios_femininos ADD CONSTRAINT armarios_femininos_numero_local_key UNIQUE (numero, local);
