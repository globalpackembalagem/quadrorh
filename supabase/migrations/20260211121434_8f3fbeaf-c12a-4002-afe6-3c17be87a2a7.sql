
-- Tabela para solicitações de troca de turno
CREATE TABLE public.trocas_turno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  setor_origem_id uuid NOT NULL REFERENCES public.setores(id),
  turma_origem text,
  setor_destino_id uuid NOT NULL REFERENCES public.setores(id),
  turma_destino text,
  status text NOT NULL DEFAULT 'pendente_gestores',
  gestor_origem_aprovado boolean DEFAULT false,
  gestor_origem_nome text,
  gestor_origem_aprovado_em timestamptz,
  gestor_destino_aprovado boolean DEFAULT false,
  gestor_destino_nome text,
  gestor_destino_aprovado_em timestamptz,
  motivo_recusa text,
  recusado_por text,
  observacoes text,
  criado_por text NOT NULL,
  efetivada boolean DEFAULT false,
  data_efetivada date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.trocas_turno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode ver trocas_turno" ON public.trocas_turno FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir trocas_turno" ON public.trocas_turno FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar trocas_turno" ON public.trocas_turno FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar trocas_turno" ON public.trocas_turno FOR DELETE USING (true);

-- Trigger updated_at
CREATE TRIGGER update_trocas_turno_updated_at
  BEFORE UPDATE ON public.trocas_turno
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.trocas_turno;
