
-- Tabela para configurar horários de envio automático de notificações de previsão por setor
CREATE TABLE public.previsao_horarios_notificacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_grupo TEXT NOT NULL, -- ex: 'SOPRO A', 'SOPRO B', 'DECORAÇÃO DIA'
  horario TIME NOT NULL, -- horário de envio
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_envio DATE, -- data do último envio (para evitar duplicatas no mesmo dia)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setor_grupo)
);

-- Enable RLS
ALTER TABLE public.previsao_horarios_notificacao ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Qualquer pessoa pode ver horarios notificacao"
ON public.previsao_horarios_notificacao FOR SELECT USING (true);

CREATE POLICY "Qualquer pessoa pode inserir horarios notificacao"
ON public.previsao_horarios_notificacao FOR INSERT WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar horarios notificacao"
ON public.previsao_horarios_notificacao FOR UPDATE USING (true);

CREATE POLICY "Qualquer pessoa pode deletar horarios notificacao"
ON public.previsao_horarios_notificacao FOR DELETE USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_previsao_horarios_updated_at
BEFORE UPDATE ON public.previsao_horarios_notificacao
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir horários padrão
INSERT INTO public.previsao_horarios_notificacao (setor_grupo, horario) VALUES
  ('SOPRO A', '08:00'),
  ('SOPRO B', '16:00'),
  ('SOPRO C', '23:30'),
  ('DECORAÇÃO DIA', '08:00'),
  ('DECORAÇÃO NOITE', '20:00');
