
-- Tabela para rastrear quem viu (clicou CIENTE) cada notificação
CREATE TABLE public.notificacoes_vistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID NOT NULL REFERENCES public.eventos_sistema(id) ON DELETE CASCADE,
  user_role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  nome_gestor TEXT NOT NULL,
  visto_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evento_id, user_role_id)
);

ALTER TABLE public.notificacoes_vistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total notificacoes_vistas" ON public.notificacoes_vistas
  FOR ALL USING (true) WITH CHECK (true);

-- Índice para buscas rápidas
CREATE INDEX idx_notificacoes_vistas_evento ON public.notificacoes_vistas(evento_id);
CREATE INDEX idx_notificacoes_vistas_user ON public.notificacoes_vistas(user_role_id);
