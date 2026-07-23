import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUsuario } from '@/contexts/UserContext';

export interface SistemaConfig {
  id: string;
  indisponiveis_situacao_ids?: string[] | null;
}

export function useSistemaConfig() {
  const { data } = useQuery({
    queryKey: ['sistema-config'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('sistema_config')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SistemaConfig | null;
    },
  });

  return {
    config: data,
    indisponiveisSituacaoIds: data?.indisponiveis_situacao_ids || [],
  };
}

export function useUpdateSistemaConfig() {
  const queryClient = useQueryClient();
  const { usuarioAtual } = useUsuario();

  return useMutation({
    mutationFn: async (payload: Partial<SistemaConfig>) => {
      const { data: atual, error: selectError } = await (supabase as any)
        .from('sistema_config')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (selectError) throw selectError;

      const updatePayload = {
        ...payload,
        atualizado_por: usuarioAtual?.nome || 'SISTEMA',
        updated_at: new Date().toISOString(),
      };

      if (atual?.id) {
        const { data, error } = await (supabase as any)
          .from('sistema_config')
          .update(updatePayload)
          .eq('id', atual.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await (supabase as any)
        .from('sistema_config')
        .insert(updatePayload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sistema-config'] });
    },
  });
}
