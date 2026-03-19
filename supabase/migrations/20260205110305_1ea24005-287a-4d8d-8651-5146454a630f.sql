-- Adicionar campo de transferência programada no funcionário
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS transferencia_programada boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS transferencia_data date,
ADD COLUMN IF NOT EXISTS transferencia_setor_id uuid REFERENCES public.setores(id);

-- Criar tabela de histórico de transferências
CREATE TABLE IF NOT EXISTS public.transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  setor_origem_id uuid NOT NULL REFERENCES public.setores(id),
  setor_destino_id uuid NOT NULL REFERENCES public.setores(id),
  data_programada date NOT NULL,
  data_efetivada date,
  efetivada boolean DEFAULT false,
  observacoes text,
  criado_por text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.transferencias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Qualquer pessoa pode ver transferencias" 
ON public.transferencias FOR SELECT USING (true);

CREATE POLICY "Qualquer pessoa pode inserir transferencias" 
ON public.transferencias FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar transferencias" 
ON public.transferencias FOR UPDATE USING (true);

CREATE POLICY "Qualquer pessoa pode deletar transferencias" 
ON public.transferencias FOR DELETE USING (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.transferencias;