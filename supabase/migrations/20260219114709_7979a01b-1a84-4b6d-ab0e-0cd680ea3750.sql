-- Tabela de histórico de acesso dos usuários
CREATE TABLE public.historico_acesso (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_role_id uuid NOT NULL,
  nome_usuario text NOT NULL,
  data_acesso timestamp with time zone NOT NULL DEFAULT now(),
  ip text NULL,
  navegador text NULL,
  dispositivo text NULL
);

-- Enable RLS
ALTER TABLE public.historico_acesso ENABLE ROW LEVEL SECURITY;

-- Política: acesso total (mesma lógica das outras tabelas do sistema)
CREATE POLICY "Acesso total historico_acesso"
ON public.historico_acesso
FOR ALL
USING (true)
WITH CHECK (true);

-- Índice para consultas por usuário e data
CREATE INDEX idx_historico_acesso_user_role ON public.historico_acesso(user_role_id);
CREATE INDEX idx_historico_acesso_data ON public.historico_acesso(data_acesso DESC);
