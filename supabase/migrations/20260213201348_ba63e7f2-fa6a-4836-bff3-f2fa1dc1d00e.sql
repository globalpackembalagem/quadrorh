-- Adicionar coluna para armazenar URL do PDF nos comunicados
ALTER TABLE public.comunicados 
ADD COLUMN arquivo_pdf_url TEXT NULL;

-- Criar bucket de storage para PDFs de comunicados
INSERT INTO storage.buckets (id, name, public)
VALUES ('comunicados-pdfs', 'comunicados-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para o bucket - público para leitura, admin para upload
CREATE POLICY "PDFs de comunicados são públicos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'comunicados-pdfs');

CREATE POLICY "Admin pode fazer upload de PDFs de comunicados" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'comunicados-pdfs' 
  AND (SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND perfil = 'admin' 
    AND ativo = true
  ))
);

CREATE POLICY "Admin pode deletar PDFs de comunicados" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'comunicados-pdfs' 
  AND (SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND perfil = 'admin' 
    AND ativo = true
  ))
);