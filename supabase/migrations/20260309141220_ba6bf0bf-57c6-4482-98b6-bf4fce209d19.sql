
-- Itinerários de fretado
CREATE TABLE public.fretado_itinerarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  valor_van numeric(10,2) NOT NULL DEFAULT 0,
  valor_micro numeric(10,2) NOT NULL DEFAULT 0,
  valor_onibus numeric(10,2) NOT NULL DEFAULT 0,
  pedagio numeric(10,2) NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.fretado_itinerarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total fretado_itinerarios" ON public.fretado_itinerarios FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.fretado_itinerarios (nome, valor_van, valor_micro, valor_onibus, pedagio) VALUES
  ('VÁRZEA PTA A', 275.00, 370.00, 441.66, 0),
  ('VÁRZEA PTA B', 275.00, 370.00, 441.66, 0),
  ('LOUVEIRA', 225.00, 320.00, 391.66, 0),
  ('CAMPINAS', 250.00, 345.00, 416.66, 16.80);

-- Valores extras de fretado
CREATE TABLE public.fretado_valores_extras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cidade text NOT NULL,
  valor_viagem numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.fretado_valores_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total fretado_valores_extras" ON public.fretado_valores_extras FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.fretado_valores_extras (cidade, valor_viagem) VALUES
  ('CAMPO LIMPO', 203.99), ('ITU', 412.54), ('CAMAÇARI', 265.08),
  ('VZA PAULISTA', 203.99), ('INDAIATUBA', 266.07), ('CAMPINAS', 182.13),
  ('JUNDIAÍ', 156.59), ('LOUVEIRA', 124.17), ('VINHEDO', 110.87),
  ('ITUPEVA', 170.55), ('JARAGUA', 475.15), ('NIVEA', 258.45), ('GUARULHOS', 506.75);

-- Histórico de alterações de valores
CREATE TABLE public.valor_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id uuid NOT NULL,
  tipo text NOT NULL,
  campo text NOT NULL,
  valor_anterior numeric(10,2) NOT NULL,
  valor_novo numeric(10,2) NOT NULL,
  motivo text NOT NULL,
  data_vigencia date NOT NULL,
  data_criacao timestamp with time zone NOT NULL DEFAULT now(),
  nome_registro text NOT NULL
);
ALTER TABLE public.valor_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total valor_historico" ON public.valor_historico FOR ALL USING (true) WITH CHECK (true);

-- Funcionários prestadores (importados de planilha)
CREATE TABLE public.prestadores_funcionarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matricula text NOT NULL,
  nome text NOT NULL DEFAULT '',
  centro_custo text NOT NULL DEFAULT '',
  codigo_estrutura text NOT NULL DEFAULT '',
  mes_referencia text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.prestadores_funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total prestadores_funcionarios" ON public.prestadores_funcionarios FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_prestadores_func_mes ON public.prestadores_funcionarios (mes_referencia);
CREATE UNIQUE INDEX idx_prestadores_func_unique ON public.prestadores_funcionarios (matricula, mes_referencia);

-- Registros de refeição
CREATE TABLE public.meal_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id text NOT NULL,
  employee_name text NOT NULL DEFAULT '',
  meal_type_id text NOT NULL DEFAULT '',
  cost_center_id text NOT NULL DEFAULT '',
  date date NOT NULL,
  time text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total meal_records" ON public.meal_records FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_meal_records_date ON public.meal_records (date);

-- Importações de fretado
CREATE TABLE public.fretado_imports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo text NOT NULL UNIQUE,
  import_date text NOT NULL,
  total_extras numeric(12,2) NOT NULL DEFAULT 0,
  total_diario numeric(12,2) NOT NULL DEFAULT 0,
  total_lotacao numeric(12,2) NOT NULL DEFAULT 0,
  total_pedagio numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.fretado_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total fretado_imports" ON public.fretado_imports FOR ALL USING (true) WITH CHECK (true);

-- Viagens de fretado
CREATE TABLE public.fretado_trips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id uuid NOT NULL REFERENCES public.fretado_imports(id) ON DELETE CASCADE,
  date date NOT NULL,
  entry_time text NOT NULL DEFAULT '',
  entry_destino text NOT NULL DEFAULT '',
  exit_time text NOT NULL DEFAULT '',
  exit_destino text NOT NULL DEFAULT '',
  onibus integer NOT NULL DEFAULT 0,
  micro integer NOT NULL DEFAULT 0,
  baixo integer NOT NULL DEFAULT 0,
  van integer NOT NULL DEFAULT 0,
  pedagio numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  sheet text NOT NULL
);
ALTER TABLE public.fretado_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total fretado_trips" ON public.fretado_trips FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX idx_fretado_trips_import ON public.fretado_trips (import_id);

-- Usuários de prestadores
CREATE TABLE public.prestadores_usuarios (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  setor text NOT NULL,
  telefone_whatsapp text NOT NULL DEFAULT '',
  modulos text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  data_cadastro timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.prestadores_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total prestadores_usuarios" ON public.prestadores_usuarios FOR ALL USING (true) WITH CHECK (true);

-- Meses fechados do rateio
CREATE TABLE public.rateio_meses_fechados (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mes text NOT NULL UNIQUE,
  fechado_em timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.rateio_meses_fechados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total rateio_meses_fechados" ON public.rateio_meses_fechados FOR ALL USING (true) WITH CHECK (true);
