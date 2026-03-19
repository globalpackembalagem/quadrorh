
-- Tabela para registrar status de documentos de previsão de admissão
CREATE TABLE public.previsao_documentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pendente', -- pendente, documentos_ok, falta_documentos
  atualizado_por text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Histórico de mudanças de documentos
CREATE TABLE public.previsao_documentos_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id uuid NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  status_anterior text,
  status_novo text NOT NULL,
  usuario_nome text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.previsao_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.previsao_documentos_historico ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (mesma estratégia do sistema)
CREATE POLICY "Qualquer pessoa pode ver previsao_documentos" ON public.previsao_documentos FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir previsao_documentos" ON public.previsao_documentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode atualizar previsao_documentos" ON public.previsao_documentos FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode deletar previsao_documentos" ON public.previsao_documentos FOR DELETE USING (true);

CREATE POLICY "Qualquer pessoa pode ver previsao_documentos_historico" ON public.previsao_documentos_historico FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode inserir previsao_documentos_historico" ON public.previsao_documentos_historico FOR INSERT WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_previsao_documentos_updated_at
  BEFORE UPDATE ON public.previsao_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Unique constraint: um status por funcionário
ALTER TABLE public.previsao_documentos ADD CONSTRAINT previsao_documentos_funcionario_unique UNIQUE (funcionario_id);
