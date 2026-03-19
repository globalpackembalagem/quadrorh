import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LiberacaoFalta {
  id: string;
  setor_id: string;
  data_liberada: string;
  liberado_por: string;
  expira_em: string;
  created_at: string;
}

export function useLiberacoesFaltas() {
  return useQuery({
    queryKey: ['liberacoes_faltas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liberacoes_faltas' as any)
        .select('*')
        .gte('expira_em', new Date().toISOString())
        .order('data_liberada', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LiberacaoFalta[];
    },
  });
}

export function useCreateLiberacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      setor_ids: string[];
      datas: string[];
      liberado_por: string;
    }) => {
      const expira_em = new Date();
      expira_em.setHours(expira_em.getHours() + 24);

      const rows = params.setor_ids.flatMap(setor_id =>
        params.datas.map(data_liberada => ({
          setor_id,
          data_liberada,
          liberado_por: params.liberado_por,
          expira_em: expira_em.toISOString(),
        }))
      );

      const { error } = await supabase
        .from('liberacoes_faltas' as any)
        .upsert(rows as any, { onConflict: 'setor_id,data_liberada' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liberacoes_faltas'] });
    },
  });
}

export function useDeleteLiberacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('liberacoes_faltas' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liberacoes_faltas'] });
    },
  });
}
