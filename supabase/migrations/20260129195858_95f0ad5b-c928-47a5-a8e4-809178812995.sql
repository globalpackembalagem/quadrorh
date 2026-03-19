-- Adicionar novos campos à tabela funcionarios
ALTER TABLE public.funcionarios
ADD COLUMN empresa text DEFAULT 'GLOBALPACK',
ADD COLUMN matricula text,
ADD COLUMN data_admissao date,
ADD COLUMN cargo text,
ADD COLUMN centro_custo text,
ADD COLUMN turma text,
ADD COLUMN data_demissao date;

-- Criar índice para busca por matrícula
CREATE INDEX idx_funcionarios_matricula ON public.funcionarios(matricula);

-- Criar índice para busca por empresa
CREATE INDEX idx_funcionarios_empresa ON public.funcionarios(empresa);