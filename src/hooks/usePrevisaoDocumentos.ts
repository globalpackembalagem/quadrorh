import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFiltroSetor } from '@/hooks/useFiltroSetor';

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
  const { aplicarFiltroSetor, setoresIds } = useFiltroSetor();
  const deveFiltrar = aplicarFiltroSetor;

  return useQuery({
    queryKey: ['previsao_documentos', deveFiltrar ? setoresIds : 'all'],
    queryFn: async () => {
      if (deveFiltrar && setoresIds.length === 0) return [];
      let query = supabase
        .from('previsao_documentos')
        .select('*, funcionario:funcionarios!inner(setor_id)');

      if (deveFiltrar) {
        query = query.in('funcionario.setor_id', setoresIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PrevisaoDocumento[];
    },
  });
}

export function usePrevisaoDocumentosHistorico(funcionarioId?: string) {
  const { aplicarFiltroSetor, setoresIds } = useFiltroSetor();
  const deveFiltrar = aplicarFiltroSetor;

  return useQuery({
    queryKey: ['previsao_documentos_historico', funcionarioId, deveFiltrar ? setoresIds : 'all'],
    queryFn: async () => {
      if (deveFiltrar && setoresIds.length === 0) return [];
      let query = supabase
        .from('previsao_documentos_historico')
        .select('*, funcionario:funcionarios!inner(setor_id)')
        .order('created_at', { ascending: false });
      
      if (funcionarioId) {
        query = query.eq('funcionario_id', funcionarioId);
      }

      if (deveFiltrar) {
        query = query.in('funcionario.setor_id', setoresIds);
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
