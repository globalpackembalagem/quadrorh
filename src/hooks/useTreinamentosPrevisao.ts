import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TreinamentoPrevisao {
  id: string;
  funcionario_id: string;
  nome_completo: string;
  matricula: string | null;
  empresa: string | null;
  setor_nome: string | null;
  setor_grupo: string | null;
  turma: string | null;
  cargo: string | null;
  data_previsao: string | null;
  treinamento_inicio: string;
  treinamento_expiracao: string;
  status: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

/** Compute real-time status based on expiration */
function computeStatus(t: TreinamentoPrevisao): string {
  if (!t.ativo) return 'INATIVO';
  const now = new Date();
  const exp = new Date(t.treinamento_expiracao);
  return now >= exp ? 'TREINAMENTO EXPIRADO' : 'EM TREINAMENTO';
}

export function enrichStatus(t: TreinamentoPrevisao): TreinamentoPrevisao & { statusReal: string } {
  return { ...t, statusReal: computeStatus(t) };
}

export function useTreinamentosPrevisao() {
  return useQuery({
    queryKey: ['treinamentos_previsao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treinamentos_previsao')
        .select('*')
        .eq('ativo', true)
        .order('treinamento_inicio', { ascending: false });
      if (error) throw error;
      return (data || []) as TreinamentoPrevisao[];
    },
  });
}

export function useTreinamentosPrevisaoTodos() {
  return useQuery({
    queryKey: ['treinamentos_previsao', 'todos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treinamentos_previsao')
        .select('*')
        .order('treinamento_inicio', { ascending: false });
      if (error) throw error;
      return (data || []) as TreinamentoPrevisao[];
    },
  });
}

export function useCreateTreinamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      funcionario_id: string;
      nome_completo: string;
      matricula?: string | null;
      empresa?: string | null;
      setor_nome?: string | null;
      setor_grupo?: string | null;
      turma?: string | null;
      cargo?: string | null;
      data_previsao?: string | null;
    }) => {
      // Verificar se já existe registro ativo para este funcionário (evitar duplicatas)
      const { data: existing } = await supabase
        .from('treinamentos_previsao')
        .select('id')
        .eq('funcionario_id', record.funcionario_id)
        .eq('ativo', true)
        .maybeSingle();

      if (existing) {
        console.log('[Treinamento] Registro já existe para funcionário, ignorando duplicata:', record.funcionario_id);
        return existing;
      }

      const { data, error } = await supabase
        .from('treinamentos_previsao')
        .insert({
          funcionario_id: record.funcionario_id,
          nome_completo: record.nome_completo,
          matricula: record.matricula ?? null,
          empresa: record.empresa ?? null,
          setor_nome: record.setor_nome ?? null,
          setor_grupo: record.setor_grupo ?? null,
          turma: record.turma ?? null,
          cargo: record.cargo ?? null,
          data_previsao: record.data_previsao ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treinamentos_previsao'] });
    },
  });
}

/** Map a sector group label (e.g. "SOPRO A") to treinamento records */
export function filterByGrupo(treinamentos: TreinamentoPrevisao[], grupoLabel: string): TreinamentoPrevisao[] {
  const label = grupoLabel.toUpperCase();
  return treinamentos.filter(t => {
    const sg = (t.setor_grupo || '').toUpperCase();
    const sn = (t.setor_nome || '').toUpperCase();
    const turma = (t.turma || '').toUpperCase().trim();

    // SOPRO A/B/C
    if (label === 'SOPRO A') return sg.includes('SOPRO A') || sn.includes('SOPRO') && sn.includes(' A');
    if (label === 'SOPRO B') return sg.includes('SOPRO B') || sn.includes('SOPRO') && sn.includes(' B');
    if (label === 'SOPRO C') return sg.includes('SOPRO C') || sn.includes('SOPRO') && sn.includes(' C');

    // DECORAÇÃO
    const isDia = sg.includes('DIA') || sn.includes('DIA');
    const isNoite = sg.includes('NOITE') || sn.includes('NOITE');
    if (label === 'DIA - T1' || label === 'DIA T1') return isDia && (turma === 'T1' || turma === '1');
    if (label === 'DIA - T2' || label === 'DIA T2') return isDia && (turma === 'T2' || turma === '2');
    if (label === 'NOITE - T1' || label === 'NOITE T1') return isNoite && (turma === 'T1' || turma === '1');
    if (label === 'NOITE - T2' || label === 'NOITE T2') return isNoite && (turma === 'T2' || turma === '2');

    return false;
  });
}

export type StatusIndicator = 'green' | 'orange' | 'red';

export function getStatusIndicator(treinamentos: TreinamentoPrevisao[]): StatusIndicator {
  if (treinamentos.length === 0) return 'orange';
  const enriched = treinamentos.map(enrichStatus);
  const emTreinamento = enriched.filter(t => t.statusReal === 'EM TREINAMENTO');
  if (emTreinamento.length > 0) return 'green';
  return 'red';
}

export function countEmTreinamento(treinamentos: TreinamentoPrevisao[]): number {
  return treinamentos.map(enrichStatus).filter(t => t.statusReal === 'EM TREINAMENTO').length;
}
