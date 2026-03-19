-- Backfill notificacoes_vistas for all read notifications that are missing
INSERT INTO notificacoes_vistas (evento_id, user_role_id, nome_gestor, visto_em)
SELECT DISTINCT n.referencia_id, n.user_role_id, ur.nome, 
  COALESCE(
    (SELECT MAX(n2.created_at) FROM notificacoes n2 WHERE n2.id = n.id), 
    now()
  )
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