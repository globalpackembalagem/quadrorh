import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Integracao } from '@/types/integracao';
import { toast } from 'sonner';

export function useIntegracoes(data?: string) {
  return useQuery({
    queryKey: ['integracoes', data],
    queryFn: async () => {
      let query = supabase
        .from('integracoes_lista')
        .select('*')
        .order('nome_completo', { ascending: true });

      if (data) {
        query = query.eq('data_integracao', data);
      }

      const { data: result, error } = await query;
      if (error) throw error;
      return result as Integracao[];
    },
  });
}

export function useMarcarPresenca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, presente, usuarioNome }: { id: string; presente: boolean; usuarioNome: string }) => {
      const { data, error } = await supabase
        .from('integracoes_lista')
        .update({
          presente,
          marcado_em: presente ? new Date().toISOString() : null,
          marcado_por_nome: presente ? usuarioNome : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao marcar presença:', error);
      toast.error('Erro ao atualizar status de presença.');
    },
  });
}

export function useImportIntegracoes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lista: Partial<Integracao>[]) => {
      const { data, error } = await supabase
        .from('integracoes_lista')
        .insert(lista);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes'] });
      toast.success('Lista importada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar lista de integrações.');
    },
  });
}

export function useDeleteIntegracao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integracoes_lista')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes'] });
      toast.success('Registro removido!');
    },
  });
}
