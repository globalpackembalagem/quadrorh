import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUsuario } from '@/contexts/UserContext';

export interface SistemaConfig {
  id: string;
  indisponiveis_situacao_ids?: string[] | null;
}

const SISTEMA_CONFIG_ID = '00000000-0000-0000-0000-000000000001';

export function useSistemaConfig() {
  const { data } = useQuery({
    queryKey: ['sistema-config'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('sistema_config')
        .select('*')
        .eq('id', SISTEMA_CONFIG_ID)
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
      const updatePayload = {
        ...payload,
        atualizado_por: usuarioAtual?.nome || 'SISTEMA',
      };

      const { error } = await (supabase as any)
        .from('sistema_config')
        .upsert({ id: SISTEMA_CONFIG_ID, ...updatePayload }, { onConflict: 'id' });
      if (error) throw error;
      return { id: SISTEMA_CONFIG_ID, ...updatePayload };
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(['sistema-config'], (atual: SistemaConfig | null | undefined) => ({
        ...(atual || {}),
        ...data,
      }));
      await queryClient.invalidateQueries({ queryKey: ['sistema-config'] });
      await queryClient.refetchQueries({ queryKey: ['sistema-config'] });
    },
  });
}
