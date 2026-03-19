
-- Tabela de configuração do sistema (validade e bloqueio)
CREATE TABLE public.sistema_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_bloqueado boolean NOT NULL DEFAULT false,
  data_validade date NULL,
  dias_validade integer NULL,
  motivo_bloqueio text NULL,
  atualizado_por text NOT NULL DEFAULT 'SISTEMA',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sistema_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer pessoa pode ver sistema_config" ON public.sistema_config FOR SELECT USING (true);
CREATE POLICY "Qualquer pessoa pode atualizar sistema_config" ON public.sistema_config FOR UPDATE USING (true);
CREATE POLICY "Qualquer pessoa pode inserir sistema_config" ON public.sistema_config FOR INSERT WITH CHECK (true);

-- Inserir configuração padrão (sistema liberado, sem validade)
INSERT INTO public.sistema_config (sistema_bloqueado, data_validade, dias_validade, atualizado_por)
VALUES (false, null, null, 'LUCIANO');
