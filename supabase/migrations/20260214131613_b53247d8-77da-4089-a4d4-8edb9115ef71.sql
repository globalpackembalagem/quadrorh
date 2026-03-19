-- Adicionar campo de tempo de inatividade em minutos (padrão 4 minutos)
ALTER TABLE public.user_roles ADD COLUMN tempo_inatividade integer NOT NULL DEFAULT 4;