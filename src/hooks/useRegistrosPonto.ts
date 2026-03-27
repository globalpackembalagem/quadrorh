import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RegistroPonto, PontoTipo } from '@/types/database';
import { toast } from 'sonner';

export function useRegistrosPonto(periodoId?: string) {
  return useQuery({
    queryKey: ['registros_ponto', periodoId],
    queryFn: async () => {
      const pageSize = 1000;
      let allData: RegistroPonto[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('registros_ponto')
          .select(`*, funcionario:funcionarios(*, setor:setores!setor_id(*), situacao:situacoes(*))`)
          .order('data', { ascending: false })
          .range(from, to);

        if (periodoId) {
          query = query.eq('periodo_id', periodoId);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...(data as RegistroPonto[])];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      return allData;
    },
    enabled: !!periodoId,
  });
}

export function useRegistrosPontoHoje() {
  const hoje = new Date().toISOString().split('T')[0];
  return useQuery({
    queryKey: ['registros_ponto', 'hoje'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registros_ponto')
        .select(`*, funcionario:funcionarios(*, setor:setores!setor_id(*), situacao:situacoes(*))`)
        .eq('data', hoje);
      if (error) throw error;
      return data as RegistroPonto[];
    },
  });
}

export function useCreateRegistroPonto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (registro: {
      funcionario_id: string;
      data: string;
      periodo_id: string;
      tipo: PontoTipo;
      observacao?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('registros_ponto')
        .insert(registro)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros_ponto'] });
      toast.success('Registro salvo!');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Já existe um registro para este funcionário nesta data');
      } else {
        toast.error('Erro ao salvar registro');
      }
    },
  });
}

export function useDeleteRegistroPonto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('registros_ponto').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros_ponto'] });
      toast.success('Registro removido!');
    },
    onError: () => toast.error('Erro ao remover registro'),
  });
}
