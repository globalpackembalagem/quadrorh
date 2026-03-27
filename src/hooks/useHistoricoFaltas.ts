import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HistoricoFalta {
  id: string;
  registro_ponto_id: string;
  funcionario_id: string;
  periodo_id: string;
  data: string;
  tipo_anterior: string | null;
  tipo_novo: string;
  operacao: string;
  usuario_nome: string;
  created_at: string;
}

export function useHistoricoFaltas(periodoId?: string) {
  return useQuery({
    queryKey: ['historico_faltas', periodoId],
    queryFn: async () => {
      let query = supabase
        .from('historico_faltas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (periodoId) {
        query = query.eq('periodo_id', periodoId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as HistoricoFalta[];
    },
  });
}

export function useRegistrarHistoricoFalta() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (registro: {
      registro_ponto_id: string;
      funcionario_id: string;
      periodo_id: string;
      data: string;
      tipo_anterior: string | null;
      tipo_novo: string;
      operacao: 'INSERT' | 'UPDATE' | 'DELETE';
      usuario_nome: string;
    }) => {
      // Usando cast para contornar tipos ainda não atualizados
      const { data, error } = await (supabase as unknown as { 
        from: (table: string) => { 
          insert: (data: Record<string, unknown>) => { 
            select: () => { 
              single: () => Promise<{ data: unknown; error: Error | null }> 
            } 
          } 
        } 
      })
        .from('historico_faltas')
        .insert({
          registro_ponto_id: registro.registro_ponto_id,
          funcionario_id: registro.funcionario_id,
          periodo_id: registro.periodo_id,
          data: registro.data,
          tipo_anterior: registro.tipo_anterior,
          tipo_novo: registro.tipo_novo,
          operacao: registro.operacao,
          usuario_nome: registro.usuario_nome,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico_faltas'] });
    },
  });
}
