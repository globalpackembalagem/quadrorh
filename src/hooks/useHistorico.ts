import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HistoricoAuditoria {
  id: string;
  tabela: string;
  operacao: string;
  registro_id: string;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  usuario_nome: string | null;
  created_at: string;
}

export function useHistoricoAuditoria(tabela?: string) {
  return useQuery({
    queryKey: ['historico_auditoria', tabela],
    queryFn: async () => {
      let query = supabase
        .from('historico_auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (tabela) {
        query = query.eq('tabela', tabela);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as HistoricoAuditoria[];
    },
  });
}

export function useRegistrarHistorico() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (registro: {
      tabela: string;
      operacao: 'INSERT' | 'UPDATE' | 'DELETE';
      registro_id: string;
      dados_anteriores?: Record<string, unknown> | null;
      dados_novos?: Record<string, unknown> | null;
      usuario_nome?: string | null;
    }) => {
      // Usando any para contornar tipos ainda não atualizados
      const { data, error } = await (supabase as unknown as { from: (table: string) => { insert: (data: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: unknown; error: Error | null }> } } } })
        .from('historico_auditoria')
        .insert({
          tabela: registro.tabela,
          operacao: registro.operacao,
          registro_id: registro.registro_id,
          dados_anteriores: registro.dados_anteriores ?? null,
          dados_novos: registro.dados_novos ?? null,
          usuario_nome: registro.usuario_nome ?? null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico_auditoria'] });
    },
  });
}
