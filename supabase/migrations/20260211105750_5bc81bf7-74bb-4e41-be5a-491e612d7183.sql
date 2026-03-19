
-- Add approval workflow columns to transferencias table
ALTER TABLE public.transferencias 
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente_gestores',
  ADD COLUMN IF NOT EXISTS gestor_origem_aprovado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gestor_origem_nome text,
  ADD COLUMN IF NOT EXISTS gestor_origem_aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS gestor_destino_aprovado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gestor_destino_nome text,
  ADD COLUMN IF NOT EXISTS gestor_destino_aprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS recusado_por text,
  ADD COLUMN IF NOT EXISTS motivo_recusa text,
  ADD COLUMN IF NOT EXISTS turma_destino text;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'transferencia_pendente', 'transferencia_aprovada', 'transferencia_recusada'
  titulo text NOT NULL,
  mensagem text NOT NULL,
  referencia_id uuid, -- ID da transferência relacionada
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total notificacoes" ON public.notificacoes
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
