import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HistoricoMovimentacao {
  id: string;
  grupo: string;
  tipo_movimentacao: string;
  funcionario_nome: string;
  data: string;
  quadro_anterior: number;
  quadro_novo: number;
  necessario: number;
  observacoes: string | null;
  criado_por: string | null;
  created_at: string;
}

export function useHistoricoMovimentacao(grupo?: string | string[]) {
  return useQuery({
    queryKey: ['historico_movimentacao', grupo],
    queryFn: async () => {
      let query = supabase
        .from('historico_movimentacao')
        .select('*')
        .order('created_at', { ascending: false })
        .gte('created_at', '2026-03-09T00:00:00')
        .limit(1000);

      if (grupo) {
        if (Array.isArray(grupo)) {
          if (grupo.length > 0) {
            query = query.in('grupo', grupo);
          }
        } else {
          query = query.eq('grupo', grupo);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as HistoricoMovimentacao[];
    },
  });
}

export function useRegistrarMovimentacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (registro: Omit<HistoricoMovimentacao, 'id' | 'created_at'>) => {
      // Verificar duplicidade: mesmo grupo, tipo, nome e data
      const { data: existente } = await supabase
        .from('historico_movimentacao')
        .select('id')
        .eq('grupo', registro.grupo)
        .eq('tipo_movimentacao', registro.tipo_movimentacao)
        .eq('funcionario_nome', registro.funcionario_nome.trim().toUpperCase())
        .eq('data', registro.data)
        .limit(1);

      if (existente && existente.length > 0) {
        throw new Error('Movimentação já registrada para este funcionário nesta data');
      }

      const { data, error } = await supabase
        .from('historico_movimentacao')
        .insert(registro)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico_movimentacao'] });
    },
  });
}

export function useDeletarMovimentacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('historico_movimentacao')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico_movimentacao'] });
    },
  });
}
