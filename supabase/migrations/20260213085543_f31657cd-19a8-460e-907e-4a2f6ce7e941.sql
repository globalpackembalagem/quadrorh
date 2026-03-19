-- Remover SUMIDO da contagem do quadro
UPDATE situacoes SET conta_no_quadro = false WHERE nome = 'SUMIDO';