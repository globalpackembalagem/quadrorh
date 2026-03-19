
-- Adicionar campo de status e retorno à tabela divergencias_quadro
ALTER TABLE public.divergencias_quadro 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS descricao_acao text,
ADD COLUMN IF NOT EXISTS feedback_rh text;
