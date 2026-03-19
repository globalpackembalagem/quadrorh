-- Tabela para armazenar o quadro planejado por grupo e turma
CREATE TABLE public.quadro_planejado (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo TEXT NOT NULL, -- SOPRO, DECORAÇÃO, etc.
  turma TEXT NOT NULL, -- A, B, C
  
  -- GLOBALPACK
  aux_maquina_industria INTEGER NOT NULL DEFAULT 0,
  reserva_ferias_industria INTEGER NOT NULL DEFAULT 0,
  reserva_faltas_industria INTEGER NOT NULL DEFAULT 0,
  amarra_pallets INTEGER NOT NULL DEFAULT 0,
  revisao_frasco INTEGER NOT NULL DEFAULT 0,
  mod_sindicalista INTEGER NOT NULL DEFAULT 0,
  controle_praga INTEGER NOT NULL DEFAULT 0,
  
  -- G+P
  aux_maquina_gp INTEGER NOT NULL DEFAULT 0,
  reserva_faltas_gp INTEGER NOT NULL DEFAULT 0,
  reserva_ferias_gp INTEGER NOT NULL DEFAULT 0,
  
  -- Aumento de quadro
  aumento_quadro INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(grupo, turma)
);

-- Enable RLS
ALTER TABLE public.quadro_planejado ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (como as outras tabelas)
CREATE POLICY "Qualquer pessoa pode ver quadro planejado"
ON public.quadro_planejado
FOR SELECT
USING (true);

CREATE POLICY "Qualquer pessoa pode inserir quadro planejado"
ON public.quadro_planejado
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Qualquer pessoa pode atualizar quadro planejado"
ON public.quadro_planejado
FOR UPDATE
USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_quadro_planejado_updated_at
BEFORE UPDATE ON public.quadro_planejado
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais para SOPRO
INSERT INTO public.quadro_planejado (grupo, turma, aux_maquina_industria, reserva_ferias_industria, reserva_faltas_industria, amarra_pallets, revisao_frasco, mod_sindicalista, controle_praga, aux_maquina_gp, reserva_faltas_gp, reserva_ferias_gp, aumento_quadro)
VALUES 
  ('SOPRO', 'A', 84, 8, 12, 2, 2, 1, 3, 30, 1, 0, 0),
  ('SOPRO', 'B', 84, 5, 20, 2, 2, 0, 3, 30, 1, 0, 0),
  ('SOPRO', 'C', 84, 8, 12, 2, 2, 0, 3, 30, 1, 0, 0),
  ('DECORAÇÃO', 'A', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('DECORAÇÃO', 'B', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0),
  ('DECORAÇÃO', 'C', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);