-- Criar tabela de categorias de comunicados
CREATE TABLE public.comunicados_categorias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de comunicados
CREATE TABLE public.comunicados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id UUID NOT NULL REFERENCES public.comunicados_categorias(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  fixado BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comunicados_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública (sem login necessário)
CREATE POLICY "Categorias são públicas para leitura" 
ON public.comunicados_categorias 
FOR SELECT 
USING (true);

CREATE POLICY "Comunicados são públicos para leitura" 
ON public.comunicados 
FOR SELECT 
USING (true);

-- Políticas de escrita apenas para admin
CREATE POLICY "Apenas admin pode inserir categorias" 
ON public.comunicados_categorias 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

CREATE POLICY "Apenas admin pode atualizar categorias" 
ON public.comunicados_categorias 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

CREATE POLICY "Apenas admin pode deletar categorias" 
ON public.comunicados_categorias 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

CREATE POLICY "Apenas admin pode inserir comunicados" 
ON public.comunicados 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

CREATE POLICY "Apenas admin pode atualizar comunicados" 
ON public.comunicados 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

CREATE POLICY "Apenas admin pode deletar comunicados" 
ON public.comunicados 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND perfil = 'admin' 
  AND ativo = true
));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_comunicados_categorias_updated_at
BEFORE UPDATE ON public.comunicados_categorias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comunicados_updated_at
BEFORE UPDATE ON public.comunicados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir categorias padrão
INSERT INTO public.comunicados_categorias (slug, nome, descricao, icone, ordem) VALUES
('fretado', 'FRETADO', 'Informações sobre transporte fretado: itinerários, horários, pontos de parada e avisos.', 'Bus', 1),
('cesta-basica', 'CESTA BÁSICA', 'Informações sobre o benefício da cesta básica: quem tem direito, datas e critérios.', 'ShoppingBasket', 2),
('wellhub', 'WELLHUB (GYMPASS)', 'Informações sobre o benefício Wellhub: como funciona, quem pode usar e regras.', 'Dumbbell', 3),
('app-apdata', 'APP APDATA', 'Orientações sobre o aplicativo APDATA: funções, uso e comunicados do sistema.', 'Smartphone', 4);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.comunicados_categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comunicados;