
-- Backfill: update notificacoes with null referencia_id by matching to eventos_sistema
-- Match by tipo mapping and approximate time
UPDATE notificacoes n
SET referencia_id = matched.evento_id
FROM (
  SELECT DISTINCT ON (n2.id) n2.id as notif_id, es.id as evento_id
  FROM notificacoes n2
  JOIN eventos_sistema es ON (
    -- Map notification tipo back to event tipo
    (n2.tipo = 'demissao_lancada' AND es.tipo = 'demissao')
    OR (n2.tipo = 'pedido_demissao_lancado' AND es.tipo = 'pedido_demissao')
    OR (n2.tipo = 'transferencia_pendente' AND es.tipo = 'transferencia')
    OR (n2.tipo = 'divergencia_nova' AND es.tipo = 'divergencia_nova')
    OR (n2.tipo = 'evento_sistema_modal' AND es.tipo IN ('demissao', 'pedido_demissao', 'transferencia', 'admissao'))
  )
  WHERE n2.referencia_id IS NULL
    AND es.created_at <= n2.created_at + interval '1 hour'
    AND es.created_at >= n2.created_at - interval '1 hour'
  ORDER BY n2.id, ABS(EXTRACT(EPOCH FROM (n2.created_at - es.created_at)))
) matched
WHERE n.id = matched.notif_id
  AND n.referencia_id IS NULL;

-- Now backfill notificacoes_vistas for read notifications that still lack records
INSERT INTO notificacoes_vistas (evento_id, user_role_id, nome_gestor, visto_em)
SELECT DISTINCT n.referencia_id, n.user_role_id, ur.nome, n.created_at
FROM notificacoes n
JOIN user_roles ur ON ur.id = n.user_role_id
WHERE n.lida = true 
  AND n.referencia_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notificacoes_vistas nv 
    WHERE nv.evento_id = n.referencia_id 
      AND nv.user_role_id = n.user_role_id
  )
ON CONFLICT (evento_id, user_role_id) DO NOTHING;
