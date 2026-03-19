
-- Criar tabela de tipos de desligamento gerenciável pelos administradores
CREATE TABLE public.tipos_desligamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  emoji text DEFAULT '📋',
  tem_exame_demissional boolean NOT NULL DEFAULT true,
  tem_homologacao boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  template_texto text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tipos_desligamento ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ver (usado na carta de desligamento)
CREATE POLICY "Qualquer pessoa pode ver tipos_desligamento"
ON public.tipos_desligamento FOR SELECT
USING (true);

-- Apenas admins podem inserir
CREATE POLICY "Apenas admin pode inserir tipos_desligamento"
ON public.tipos_desligamento FOR INSERT
WITH CHECK (true);

-- Apenas admins podem atualizar
CREATE POLICY "Apenas admin pode atualizar tipos_desligamento"
ON public.tipos_desligamento FOR UPDATE
USING (true);

-- Apenas admins podem deletar
CREATE POLICY "Apenas admin pode deletar tipos_desligamento"
ON public.tipos_desligamento FOR DELETE
USING (true);

-- Trigger de updated_at
CREATE TRIGGER update_tipos_desligamento_updated_at
BEFORE UPDATE ON public.tipos_desligamento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir os tipos padrão
INSERT INTO public.tipos_desligamento (nome, descricao, emoji, tem_exame_demissional, tem_homologacao, ordem, template_texto) VALUES
(
  'Pedido de Demissão',
  'Colaborador solicita desligamento voluntário',
  '✋',
  true,
  true,
  1,
  'Comunicamos que o(a) colaborador(a) {NOME}, ocupante do cargo de {CARGO}, manifestou formalmente seu pedido de demissão, sendo o último dia de trabalho em {DATA_DESLIGAMENTO}.\n\nAgradecemos pelos serviços prestados e desejamos sucesso em seus projetos futuros.'
),
(
  'Dispensa S/ Justa Causa',
  'Empresa dispensa o colaborador sem justa causa',
  '📋',
  true,
  true,
  2,
  'Comunicamos que o(a) colaborador(a) {NOME}, ocupante do cargo de {CARGO}, está sendo dispensado(a) sem justa causa, sendo o último dia de trabalho em {DATA_DESLIGAMENTO}.\n\nTodos os direitos trabalhistas previstos em lei serão devidamente cumpridos.'
),
(
  'Dem. Justa Causa',
  'Dispensa motivada por infração disciplinar',
  '⚠️',
  false,
  false,
  3,
  'Comunicamos que o(a) colaborador(a) {NOME}, ocupante do cargo de {CARGO}, está sendo dispensado(a) por justa causa, nos termos do artigo 482 da Consolidação das Leis do Trabalho (CLT), sendo o último dia de trabalho em {DATA_DESLIGAMENTO}.\n\nA empresa mantém registros documentados das ocorrências que motivaram esta decisão.'
),
(
  'Término de Contrato',
  'Encerramento de contrato por prazo determinado',
  '📅',
  true,
  false,
  4,
  'Comunicamos que o contrato de trabalho por prazo determinado do(a) colaborador(a) {NOME}, ocupante do cargo de {CARGO}, chega ao seu término em {DATA_DESLIGAMENTO}, conforme previsto no instrumento contratual firmado entre as partes.\n\nAgradecemos pela dedicação e comprometimento durante o período contratual.'
),
(
  'Ant. Término',
  'Encerramento antecipado de contrato temporário',
  '⏩',
  true,
  false,
  5,
  'Comunicamos que o contrato de trabalho por prazo determinado do(a) colaborador(a) {NOME}, ocupante do cargo de {CARGO}, será encerrado antecipadamente em {DATA_DESLIGAMENTO}, nos termos do artigo 479 da Consolidação das Leis do Trabalho (CLT).\n\nTodos os direitos legais decorrentes da rescisão antecipada serão devidamente observados.'
);
