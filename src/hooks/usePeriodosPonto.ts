import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PeriodoPonto, PeriodoStatus } from '@/types/database';
import { toast } from 'sonner';

export function usePeriodosPonto() {
  return useQuery({
    queryKey: ['periodos_ponto'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periodos_ponto')
        .select('*')
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data as PeriodoPonto[];
    },
  });
}

export function usePeriodosAbertos() {
  return useQuery({
    queryKey: ['periodos_ponto', 'abertos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periodos_ponto')
        .select('*')
        .eq('status', 'aberto')
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data as PeriodoPonto[];
    },
  });
}

export function useCreatePeriodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (periodo: { data_inicio: string; data_fim: string }) => {
      const { data, error } = await supabase
        .from('periodos_ponto')
        .insert({ ...periodo, status: 'aberto' as PeriodoStatus })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos_ponto'] });
      toast.success('Período criado com sucesso!');
    },
    onError: () => toast.error('Erro ao criar período'),
  });
}

export function useUpdatePeriodoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PeriodoStatus }) => {
      const { data, error } = await supabase
        .from('periodos_ponto')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos_ponto'] });
      toast.success('Status do período atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar período'),
  });
}

export function useDeletePeriodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('periodos_ponto').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos_ponto'] });
      toast.success('Período excluído com sucesso!');
    },
    onError: () => toast.error('Erro ao excluir período'),
  });
}
