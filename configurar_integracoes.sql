-- Execute este script no SQL Editor do seu Supabase para criar a tabela de Integrações

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

-- 2. Habilitar o Realtime para atualizações instantâneas
ALTER PUBLICATION supabase_realtime ADD TABLE public.integracoes_lista;

-- 3. Habilitar RLS (Segurança)
ALTER TABLE public.integracoes_lista ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de acesso (Acesso total para usuários autenticados para simplificar)
CREATE POLICY "Permitir leitura para todos autenticados" 
ON public.integracoes_lista FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserção por admins" 
ON public.integracoes_lista FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir atualização por todos autenticados" 
ON public.integracoes_lista FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Permitir exclusão por admins" 
ON public.integracoes_lista FOR DELETE 
TO authenticated 
USING (true);

-- 5. Função para atualizar o campo updated_at automaticamente
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

-- 6. Adicionar campos de permissão na tabela de usuários (user_roles)
-- Nota: Verifique se esses campos já não foram adicionados via código.
-- Se houver erro aqui, é porque as colunas já existem, pode ignorar.
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS pode_visualizar_integracoes boolean DEFAULT true;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS pode_editar_integracoes boolean DEFAULT false;
