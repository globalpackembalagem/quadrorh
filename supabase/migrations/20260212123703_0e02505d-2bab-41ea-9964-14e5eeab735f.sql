-- 1. Add 'tipo' column to trocas_turno to differentiate between transfer and shift change
ALTER TABLE public.trocas_turno 
ADD COLUMN tipo text DEFAULT 'troca_turno' CHECK (tipo IN ('troca_turno', 'transferencia'));

-- 2. Migrate existing transferencias data to trocas_turno
INSERT INTO public.trocas_turno (
  id, funcionario_id, setor_origem_id, setor_destino_id,
  turma_origem, turma_destino, data_programada, observacoes,
  criado_por, status, efetivada, data_efetivada,
  gestor_origem_aprovado, gestor_destino_aprovado,
  created_at, updated_at, tipo
)
SELECT 
  t.id, t.funcionario_id, t.setor_origem_id, t.setor_destino_id,
  NULL as turma_origem, t.turma_destino, t.data_programada, t.observacoes,
  t.criado_por, 'pendente_rh'::text as status, t.efetivada, t.data_efetivada,
  true as gestor_origem_aprovado, true as gestor_destino_aprovado,
  t.created_at, COALESCE(t.updated_at, now()), 'transferencia'::text
FROM public.transferencias t
WHERE NOT EXISTS (
  SELECT 1 FROM public.trocas_turno tt 
  WHERE tt.id = t.id
);

-- 3. Update funcionarios table to remove transfer-specific fields (cleanup)
ALTER TABLE public.funcionarios
DROP COLUMN IF EXISTS transferencia_programada,
DROP COLUMN IF EXISTS transferencia_data,
DROP COLUMN IF EXISTS transferencia_setor_id;

-- 4. Drop the transferencias table (data is now in trocas_turno)
DROP TABLE IF EXISTS public.transferencias CASCADE;