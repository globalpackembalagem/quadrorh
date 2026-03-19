-- Tabela de eventos do sistema (captura automática de tudo)
CREATE TABLE public.eventos_sistema (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL, -- 'admissao', 'demissao', 'pedido_demissao', 'transferencia', 'ativacao'
  descricao text NOT NULL,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  funcionario_nome text,
  setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL,
  setor_nome text,
  turma text,
  quantidade integer DEFAULT 1,
  dados_extra jsonb,
  notificado boolean DEFAULT false,
  notificado_em timestamptz,
  notificado_tipo text, -- 'modal' ou 'sino'
  criado_por text,
  created_at timestamptz DEFAULT now()
);

-- RLS permissiva (sistema local)
ALTER TABLE public.eventos_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total eventos_sistema" ON public.eventos_sistema FOR ALL USING (true) WITH CHECK (true);

-- Index para busca rápida
CREATE INDEX idx_eventos_sistema_created ON public.eventos_sistema(created_at DESC);
CREATE INDEX idx_eventos_sistema_tipo ON public.eventos_sistema(tipo);
CREATE INDEX idx_eventos_sistema_notificado ON public.eventos_sistema(notificado);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.eventos_sistema;