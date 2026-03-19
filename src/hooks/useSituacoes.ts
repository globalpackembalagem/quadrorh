import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Situacao } from '@/types/database';
import { toast } from 'sonner';

export function useSituacoes() {
  return useQuery({
    queryKey: ['situacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('situacoes')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as Situacao[];
    },
  });
}

export function useSituacoesAtivas() {
  return useQuery({
    queryKey: ['situacoes', 'ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('situacoes')
        .select('*')
        .eq('ativa', true)
        .order('nome');
      
      if (error) throw error;
      return data as Situacao[];
    },
  });
}

export function useCreateSituacao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (situacao: Omit<Situacao, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('situacoes')
        .insert(situacao)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situacoes'] });
      toast.success('Situação criada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar situação');
    },
  });
}

export function useUpdateSituacao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...situacao }: Partial<Situacao> & { id: string }) => {
      const { data, error } = await supabase
        .from('situacoes')
        .update(situacao)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situacoes'] });
      toast.success('Situação atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar situação');
    },
  });
}
