
-- Tabela para configuração de capacidade de armários por local
CREATE TABLE public.armarios_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  local text NOT NULL UNIQUE,
  total integer NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.armarios_config ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (controle na aplicação)
CREATE POLICY "Qualquer pessoa pode ver armarios_config" ON public.armarios_config FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode atualizar armarios_config" ON public.armarios_config FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode inserir armarios_config" ON public.armarios_config FOR INSERT WITH CHECK (true);

-- Dados iniciais
INSERT INTO public.armarios_config (local, total) VALUES
  ('SOPRO', 400),
  ('DECORACAO', 100),
  ('CONTAINER', 50);
