-- Adicionar campos específicos para situações especiais
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS cobertura_funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS treinamento_setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sumido_desde date;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_funcionarios_cobertura ON public.funcionarios(cobertura_funcionario_id) WHERE cobertura_funcionario_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funcionarios_treinamento ON public.funcionarios(treinamento_setor_id) WHERE treinamento_setor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_funcionarios_sumido ON public.funcionarios(sumido_desde) WHERE sumido_desde IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.funcionarios.cobertura_funcionario_id IS 'ID do funcionário que está sendo coberto (para situação Cobertura de Férias)';
COMMENT ON COLUMN public.funcionarios.treinamento_setor_id IS 'ID do setor onde está treinando (para situação Treinamento)';
COMMENT ON COLUMN public.funcionarios.sumido_desde IS 'Data desde quando o funcionário está sumido';