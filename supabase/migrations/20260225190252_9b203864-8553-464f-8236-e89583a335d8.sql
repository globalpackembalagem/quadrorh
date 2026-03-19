
-- Tabela de controle de armários femininos
CREATE TABLE public.armarios_femininos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero integer NOT NULL UNIQUE,
  funcionario_id uuid REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Criar todos os 401 armários
INSERT INTO public.armarios_femininos (numero)
SELECT generate_series(1, 401);

-- Enable RLS
ALTER TABLE public.armarios_femininos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Qualquer pessoa pode ver armarios" ON public.armarios_femininos FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode atualizar armarios" ON public.armarios_femininos FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode inserir armarios" ON public.armarios_femininos FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer pessoa pode deletar armarios" ON public.armarios_femininos FOR DELETE USING (true);

-- Trigger updated_at
CREATE TRIGGER update_armarios_femininos_updated_at
  BEFORE UPDATE ON public.armarios_femininos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
