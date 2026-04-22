-- 1. Criar a tabela
CREATE TABLE IF NOT EXISTS public.integracoes_lista (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome_completo text NOT NULL,
    data_integracao date NOT NULL,
    presente boolean DEFAULT false,
    marcado_em timestamptz,
    marcado_por_id uuid,
    marcado_por_nome text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Habilitar o Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.integracoes_lista;

-- 3. Habilitar RLS
ALTER TABLE public.integracoes_lista ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acesso
CREATE POLICY "Permitir leitura para todos autenticados" 
ON public.integracoes_lista FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserção por todos autenticados" 
ON public.integracoes_lista FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir atualização por todos autenticados" 
ON public.integracoes_lista FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Permitir exclusão por todos autenticados" 
ON public.integracoes_lista FOR DELETE 
TO authenticated 
USING (true);

-- 5. Trigger updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.integracoes_lista
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();