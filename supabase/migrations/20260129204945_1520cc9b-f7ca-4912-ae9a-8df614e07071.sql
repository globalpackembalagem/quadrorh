
-- Adicionar campo grupo para consolidação visual dos setores
ALTER TABLE setores ADD COLUMN grupo TEXT;

-- Atualizar grupos para SOPRO (consolidar MOD + PRODUÇÃO G+P)
UPDATE setores SET grupo = 'SOPRO A' WHERE nome IN ('MOD - SOPRO A', 'PRODUÇÃO SOPRO G+P A');
UPDATE setores SET grupo = 'SOPRO B' WHERE nome IN ('MOD - SOPRO B', 'PRODUÇÃO SOPRO G+P B');
UPDATE setores SET grupo = 'SOPRO C' WHERE nome IN ('MOD - SOPRO C', 'PRODUÇÃO SOPRO G+P C');

-- Atualizar DECORAÇÃO existentes
UPDATE setores SET nome = 'DECORAÇÃO MOD DIA - T1', grupo = 'DECORAÇÃO DIA T1' WHERE nome = 'DECORAÇÃO MOD DIA';
UPDATE setores SET nome = 'DECORAÇÃO MOD NOITE - T1', grupo = 'DECORAÇÃO NOITE T1' WHERE nome = 'DECORAÇÃO MOD NOITE';

-- Inserir novos setores de DECORAÇÃO para T2
INSERT INTO setores (nome, grupo, ativo, conta_no_quadro) VALUES 
  ('DECORAÇÃO MOD DIA - T2', 'DECORAÇÃO DIA T2', true, true),
  ('DECORAÇÃO MOD NOITE - T2', 'DECORAÇÃO NOITE T2', true, true);
