
-- Tabela de avisos de movimentação (aparece no centro da tela)
CREATE TABLE public.avisos_movimentacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL, -- 'admissao', 'demissao', 'pedido_demissao'
  quantidade integer NOT NULL DEFAULT 1,
  setor_nome text,
  mensagem text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  criado_por text
);

-- Tabela para rastrear quem já viu cada aviso (exibe apenas 1x)
CREATE TABLE public.avisos_movimentacao_lidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id uuid NOT NULL REFERENCES public.avisos_movimentacao(id) ON DELETE CASCADE,
  user_role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  lido_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(aviso_id, user_role_id)
);

-- RLS
ALTER TABLE public.avisos_movimentacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos_movimentacao_lidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total avisos_movimentacao" ON public.avisos_movimentacao
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total avisos_movimentacao_lidos" ON public.avisos_movimentacao_lidos
  FOR ALL USING (true) WITH CHECK (true);

-- Realtime para avisos
ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos_movimentacao;
