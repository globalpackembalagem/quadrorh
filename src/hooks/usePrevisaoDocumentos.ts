import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PrevisaoDocumento {
  id: string;
  funcionario_id: string;
  status: string;
  atualizado_por: string;
  created_at: string;
  updated_at: string;
}

export interface PrevisaoDocumentoHistorico {
  id: string;
  funcionario_id: string;
  status_anterior: string | null;
  status_novo: string;
  usuario_nome: string;
  created_at: string;
}

export function usePrevisaoDocumentos() {
  return useQuery({
    queryKey: ['previsao_documentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('previsao_documentos')
        .select('*');
      if (error) throw error;
      return (data || []) as PrevisaoDocumento[];
    },
  });
}

export function usePrevisaoDocumentosHistorico(funcionarioId?: string) {
  return useQuery({
    queryKey: ['previsao_documentos_historico', funcionarioId],
    queryFn: async () => {
      let query = supabase
        .from('previsao_documentos_historico')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (funcionarioId) {
        query = query.eq('funcionario_id', funcionarioId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PrevisaoDocumentoHistorico[];
    },
    enabled: !!funcionarioId || funcionarioId === undefined,
  });
}

export function useUpdateDocumentoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      funcionarioId,
      status,
      usuarioNome,
    }: {
      funcionarioId: string;
      status: string;
      usuarioNome: string;
    }) => {
      // Get current status
      const { data: existing } = await supabase
        .from('previsao_documentos')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .maybeSingle();

      const statusAnterior = existing?.status || null;

      // Upsert document status
      const { error: upsertError } = await supabase
        .from('previsao_documentos')
        .upsert(
          {
            funcionario_id: funcionarioId,
            status,
            atualizado_por: usuarioNome,
          },
          { onConflict: 'funcionario_id' }
        );
      if (upsertError) throw upsertError;

      // Insert history
      const { error: histError } = await supabase
        .from('previsao_documentos_historico')
        .insert({
          funcionario_id: funcionarioId,
          status_anterior: statusAnterior,
          status_novo: status,
          usuario_nome: usuarioNome,
        });
      if (histError) throw histError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['previsao_documentos'] });
      queryClient.invalidateQueries({ queryKey: ['previsao_documentos_historico'] });
    },
  });
}
