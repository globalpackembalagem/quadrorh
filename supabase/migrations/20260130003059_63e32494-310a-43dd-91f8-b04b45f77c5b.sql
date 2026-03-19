-- Tabela de divergências de quadro
CREATE TABLE public.divergencias_quadro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id),
  tipo_divergencia TEXT NOT NULL, -- COB. FÉRIAS, SUMIDO, TREINAMENTO
  criado_por TEXT NOT NULL, -- identificador do gestor que criou
  observacoes TEXT,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  resolvido_por TEXT,
  resolvido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.divergencias_quadro ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Qualquer pessoa pode ver divergencias" 
ON public.divergencias_quadro 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir divergencias" 
ON public.divergencias_quadro 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar divergencias" 
ON public.divergencias_quadro 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer pessoa pode deletar divergencias" 
ON public.divergencias_quadro 
FOR DELETE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_divergencias_quadro_updated_at
BEFORE UPDATE ON public.divergencias_quadro
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();