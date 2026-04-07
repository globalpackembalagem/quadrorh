import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SnapshotQuadro {
  id: string;
  grupo: string;
  data_referencia: string;
  quadro_real: number;
  quadro_necessario: number;
  diferenca: number;
  detalhes: Record<string, unknown>;
  movimentacoes: Array<Record<string, unknown>>;
  travado_por: string;
  created_at: string;
}

export function useSnapshotsQuadro(grupo?: string) {
  return useQuery({
    queryKey: ['snapshots_quadro', grupo],
    queryFn: async () => {
      let query = (supabase as any)
        .from('snapshots_quadro')
        .select('*')
        .order('data_referencia', { ascending: false })
        .limit(100);

      if (grupo) {
        query = query.eq('grupo', grupo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SnapshotQuadro[];
    },
  });
}

export function useSalvarSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (snapshot: Omit<SnapshotQuadro, 'id' | 'created_at'>) => {
      // Upsert: se já existe snapshot para grupo+data, substitui
      const { data, error } = await (supabase as any)
        .from('snapshots_quadro')
        .upsert(snapshot, { onConflict: 'grupo,data_referencia' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snapshots_quadro'] });
    },
  });
}
