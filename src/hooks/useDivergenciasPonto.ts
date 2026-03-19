import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DivergenciaPonto {
  id: string;
  funcionario_id: string;
  periodo_id: string;
  data: string;
  tipo_atual: string | null;
  tipo_solicitado: string;
  motivo: string | null;
  criado_por: string;
  resolvido: boolean;
  resolvido_por: string | null;
  resolvido_em: string | null;
  created_at: string;
  updated_at: string;
  funcionario?: {
    id: string;
    nome_completo: string;
    setor?: {
      id: string;
      nome: string;
    };
  };
  periodo?: {
    id: string;
    data_inicio: string;
    data_fim: string;
  };
}

export function useDivergenciasPonto(periodoId?: string) {
  return useQuery({
    queryKey: ['divergencias_ponto', periodoId],
    queryFn: async () => {
      let query = supabase
        .from('divergencias_ponto')
        .select(`
          *,
          funcionario:funcionarios(id, nome_completo, setor:setores!setor_id(id, nome)),
          periodo:periodos_ponto(id, data_inicio, data_fim)
        `)
        .order('created_at', { ascending: false });
      
      if (periodoId) {
        query = query.eq('periodo_id', periodoId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as DivergenciaPonto[];
    },
  });
}

export function useDivergenciasPontoPendentes() {
  return useQuery({
    queryKey: ['divergencias_ponto', 'pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divergencias_ponto')
        .select(`
          *,
          funcionario:funcionarios(id, nome_completo, setor:setores!setor_id(id, nome)),
          periodo:periodos_ponto(id, data_inicio, data_fim)
        `)
        .eq('resolvido', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as DivergenciaPonto[];
    },
  });
}

export function useCreateDivergenciaPonto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (divergencia: {
      funcionario_id: string;
      periodo_id: string;
      data: string;
      tipo_atual: string | null;
      tipo_solicitado: string;
      motivo?: string;
      criado_por: string;
    }) => {
      const { data, error } = await supabase
        .from('divergencias_ponto')
        .insert(divergencia)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divergencias_ponto'] });
      toast.success('DIVERGÊNCIA DE PONTO CRIADA!');
    },
    onError: () => {
      toast.error('ERRO AO CRIAR DIVERGÊNCIA');
    },
  });
}

export function useResolveDivergenciaPonto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, resolvido_por, aplicar }: { 
      id: string; 
      resolvido_por: string;
      aplicar: boolean;
    }) => {
      // Se aplicar = true, primeiro atualiza o registro de ponto
      if (aplicar) {
        // Busca a divergência para pegar os dados
        const { data: divergencia, error: fetchError } = await supabase
          .from('divergencias_ponto')
          .select('*')
          .eq('id', id)
          .single();
        
        if (fetchError) throw fetchError;
        
        // Verifica se já existe registro para essa data
        const { data: registroExistente } = await supabase
          .from('registros_ponto')
          .select('id')
          .eq('funcionario_id', divergencia.funcionario_id)
          .eq('periodo_id', divergencia.periodo_id)
          .eq('data', divergencia.data)
          .maybeSingle();
        
        const tipoSolicitado = divergencia.tipo_solicitado as 'P' | 'F' | 'A';
        
        if (tipoSolicitado === 'P') {
          // Se é Presente, remove o registro
          if (registroExistente) {
            const { error: delError } = await supabase
              .from('registros_ponto')
              .delete()
              .eq('id', registroExistente.id);
            if (delError) throw delError;
          }
        } else {
          // Atualiza ou cria registro
          if (registroExistente) {
            const { error: updateError } = await supabase
              .from('registros_ponto')
              .update({ tipo: tipoSolicitado })
              .eq('id', registroExistente.id);
            if (updateError) throw updateError;
          } else {
            const { error: insertError } = await supabase
              .from('registros_ponto')
              .insert([{
                funcionario_id: divergencia.funcionario_id,
                periodo_id: divergencia.periodo_id,
                data: divergencia.data,
                tipo: tipoSolicitado,
                ativo_no_periodo: true,
              }]);
            if (insertError) throw insertError;
          }
        }
      }
      
      // Marca como resolvido
      const { data, error } = await supabase
        .from('divergencias_ponto')
        .update({
          resolvido: true,
          resolvido_por,
          resolvido_em: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['divergencias_ponto'] });
      queryClient.invalidateQueries({ queryKey: ['registros_faltas'] });
      toast.success(variables.aplicar ? 'DIVERGÊNCIA APLICADA E RESOLVIDA!' : 'DIVERGÊNCIA CANCELADA!');
    },
    onError: () => {
      toast.error('ERRO AO RESOLVER DIVERGÊNCIA');
    },
  });
}

export function useDeleteDivergenciaPonto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('divergencias_ponto')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divergencias_ponto'] });
      toast.success('DIVERGÊNCIA EXCLUÍDA!');
    },
    onError: () => {
      toast.error('ERRO AO EXCLUIR DIVERGÊNCIA');
    },
  });
}
