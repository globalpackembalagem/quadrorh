-- Adicionar 'DF' (Day OFF) ao enum ponto_tipo
ALTER TYPE public.ponto_tipo ADD VALUE IF NOT EXISTS 'DF';