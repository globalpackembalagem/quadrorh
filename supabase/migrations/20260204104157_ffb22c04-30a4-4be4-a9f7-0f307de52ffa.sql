-- Criar enum para status da integração
CREATE TYPE public.integracao_status AS ENUM ('convocado', 'compareceu', 'aprovado', 'reprovado', 'faltou');

-- Criar enum para linhas de fretado
CREATE TYPE public.fretado_linha AS ENUM ('NAO', 'VARZEA_A', 'VARZEA_B', 'CAMPINAS', 'LOUVEIRA', 'VINHEDO');

-- Criar tabela de histórico de integrações
CREATE TABLE public.historico_integracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  setor_id UUID REFERENCES public.setores(id) NOT NULL,
  sexo public.sexo_tipo NOT NULL,
  indicacao TEXT,
  fretado public.fretado_linha NOT NULL DEFAULT 'NAO',
  ponto_referencia TEXT,
  camisa TEXT,
  calca TEXT,
  sapato TEXT,
  oculos BOOLEAN NOT NULL DEFAULT false,
  status public.integracao_status NOT NULL DEFAULT 'convocado',
  data_integracao DATE NOT NULL DEFAULT CURRENT_DATE,
  previsao_funcionario_id UUID REFERENCES public.funcionarios(id),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historico_integracoes ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (como as outras tabelas do sistema)
CREATE POLICY "Qualquer pessoa pode ver historico_integracoes" 
ON public.historico_integracoes 
FOR SELECT 
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir historico_integracoes" 
ON public.historico_integracoes 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar historico_integracoes" 
ON public.historico_integracoes 
FOR UPDATE 
USING (true);

CREATE POLICY "Qualquer pessoa pode deletar historico_integracoes" 
ON public.historico_integracoes 
FOR DELETE 
USING (true);

-- Índices para performance
CREATE INDEX idx_historico_integracoes_data ON public.historico_integracoes(data_integracao);
CREATE INDEX idx_historico_integracoes_status ON public.historico_integracoes(status);
CREATE INDEX idx_historico_integracoes_setor ON public.historico_integracoes(setor_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_historico_integracoes_updated_at
BEFORE UPDATE ON public.historico_integracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();