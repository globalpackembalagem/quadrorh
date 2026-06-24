CREATE INDEX IF NOT EXISTS idx_funcionarios_cpf_digits
ON public.funcionarios ((regexp_replace(coalesce(cpf, ''), '\D', '', 'g')));
