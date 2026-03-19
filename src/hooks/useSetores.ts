import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Setor } from '@/types/database';
import { toast } from 'sonner';

export function useSetores() {
  return useQuery({
    queryKey: ['setores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('setores')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as Setor[];
    },
  });
}

export function useSetoresAtivos() {
  return useQuery({
    queryKey: ['setores', 'ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('setores')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as Setor[];
    },
  });
}

export function useCreateSetor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (setor: Omit<Setor, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('setores')
        .insert(setor)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      toast.success('Setor criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar setor');
    },
  });
}

export function useUpdateSetor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...setor }: Partial<Setor> & { id: string }) => {
      const { data, error } = await supabase
        .from('setores')
        .update(setor)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      toast.success('Setor atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar setor');
    },
  });
}
