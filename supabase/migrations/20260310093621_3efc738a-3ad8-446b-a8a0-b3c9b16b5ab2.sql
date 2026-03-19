
-- Add prestador columns to armarios_femininos
ALTER TABLE armarios_femininos ADD COLUMN IF NOT EXISTS nome_prestador text;
ALTER TABLE armarios_femininos ADD COLUMN IF NOT EXISTS setor_prestador text;

-- Create table for prestador sectors configuration
CREATE TABLE IF NOT EXISTS armarios_setores_prestador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE armarios_setores_prestador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total armarios_setores_prestador" ON armarios_setores_prestador FOR ALL USING (true) WITH CHECK (true);

-- Insert default SPSP sector
INSERT INTO armarios_setores_prestador (nome) VALUES ('SPSP') ON CONFLICT (nome) DO NOTHING;
