-- Migrar registros existentes de 'S' para 'SS'
UPDATE registros_ponto SET tipo = 'SS' WHERE tipo = 'S';
UPDATE historico_faltas SET tipo_novo = 'SS' WHERE tipo_novo = 'S';
UPDATE historico_faltas SET tipo_anterior = 'SS' WHERE tipo_anterior = 'S';
UPDATE divergencias_ponto SET tipo_solicitado = 'SS' WHERE tipo_solicitado = 'S';
UPDATE divergencias_ponto SET tipo_atual = 'SS' WHERE tipo_atual = 'S';
