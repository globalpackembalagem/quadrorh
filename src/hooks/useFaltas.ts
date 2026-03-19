import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PeriodoPonto, RegistroPonto, PontoTipo, PeriodoStatus } from '@/types/database';
import { toast } from 'sonner';
import { addMonths, format, parseISO } from 'date-fns';

export function usePeriodosFaltas() {
  return useQuery({
    queryKey: ['periodos_faltas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periodos_ponto')
        .select('*')
        .order('data_inicio', { ascending: false });
      
      if (error) throw error;
      return data as PeriodoPonto[];
    },
  });
}

export function usePeriodosAbertos() {
  return useQuery({
    queryKey: ['periodos_faltas', 'abertos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periodos_ponto')
        .select('*')
        .eq('status', 'aberto')
        .order('data_inicio', { ascending: false });
      
      if (error) throw error;
      return data as PeriodoPonto[];
    },
  });
}

export function useCreatePeriodoProximoMes() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Buscar último período
      const { data: ultimoPeriodo, error: fetchError } = await supabase
        .from('periodos_ponto')
        .select('*')
        .order('data_inicio', { ascending: false })
        .limit(1)
        .single();

      let dataInicio: Date;
      let dataFim: Date;

      if (ultimoPeriodo) {
        // Próximo período: dia 14 do mês seguinte ao último período
        const ultimaDataFim = parseISO(ultimoPeriodo.data_fim);
        dataInicio = new Date(ultimaDataFim);
        dataInicio.setDate(dataInicio.getDate() + 1); // Dia 14
        dataFim = addMonths(dataInicio, 1);
        dataFim.setDate(13); // Dia 13 do mês seguinte
      } else {
        // Primeiro período: começar do dia 14 do mês atual
        const hoje = new Date();
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 14);
        dataFim = addMonths(dataInicio, 1);
        dataFim.setDate(13);
      }

      const { data, error } = await supabase
        .from('periodos_ponto')
        .insert({
          data_inicio: format(dataInicio, 'yyyy-MM-dd'),
          data_fim: format(dataFim, 'yyyy-MM-dd'),
          status: 'aberto' as PeriodoStatus
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos_faltas'] });
      toast.success('Período criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar período');
    },
  });
}

export function useUpdatePeriodoStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PeriodoStatus }) => {
      const { data, error } = await supabase
        .from('periodos_ponto')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos_faltas'] });
      toast.success('Status do período atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar período');
    },
  });
}

export function useRegistrosFaltas(periodoId?: string) {
  return useQuery({
    queryKey: ['registros_faltas', periodoId],
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
          .select(`
            *,
            funcionario:funcionarios(*, setor:setores!setor_id(*), situacao:situacoes(*))
          `)
          .order('data', { ascending: true })
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
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateRegistroFalta() {
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
        .insert({ ...registro, ativo_no_periodo: true })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros_faltas'] });
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Já existe um registro para esta data');
      } else {
        toast.error('Erro ao salvar registro');
      }
    },
  });
}

export function useUpdateRegistroFalta() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, tipo, observacao }: { id: string; tipo: PontoTipo; observacao?: string | null }) => {
      const { data, error } = await supabase
        .from('registros_ponto')
        .update({ tipo, ...(observacao !== undefined ? { observacao } : {}) })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros_faltas'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar registro');
    },
  });
}

export function useDeleteRegistroFalta() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('registros_ponto')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros_faltas'] });
    },
    onError: () => {
      toast.error('Erro ao remover registro');
    },
  });
}

// Hook para buscar funcionários elegíveis para o período (Ativos, Férias e Sumidos)
export function useFuncionariosFaltas(periodoId?: string, periodo?: PeriodoPonto) {
  return useQuery({
    queryKey: ['funcionarios_faltas', periodoId],
    queryFn: async () => {
      // Buscar situações que entram no ponto (Ativo e Férias)
      const { data: situacoesNoPonto, error: sitError } = await supabase
        .from('situacoes')
        .select('id, nome')
        .eq('entra_no_ponto', true)
        .eq('ativa', true);
      
      if (sitError) throw sitError;
      
      // Buscar situação SUMIDO separadamente (conta no quadro mas não entra no ponto normalmente)
      const { data: situacaoSumido, error: sumidoError } = await supabase
        .from('situacoes')
        .select('id, nome')
        .ilike('nome', '%SUMIDO%')
        .eq('ativa', true);
      
      if (sumidoError) throw sumidoError;
      
      // Combinar os IDs de situações
      const situacaoIds = [
        ...(situacoesNoPonto?.map(s => s.id) || []),
        ...(situacaoSumido?.map(s => s.id) || [])
      ];
      
      if (situacaoIds.length === 0) return [];

      // Buscar funcionários em lotes para superar limite de 1000
      const pageSize = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        const { data, error } = await supabase
          .from('funcionarios')
          .select('*, setor:setores!setor_id(*), situacao:situacoes(*)')
          .in('situacao_id', situacaoIds)
          .order('nome_completo')
          .range(from, to);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      // Filtrar: só mostrar funcionários que foram admitidos antes do fim do período
      // e que não foram demitidos antes do início do período
      // Se não tem data_demissao mas está desligado, usa data atual
      if (periodo) {
        const periodoInicio = parseISO(periodo.data_inicio);
        const periodoFim = parseISO(periodo.data_fim);
        const hoje = format(new Date(), 'yyyy-MM-dd');

        return allData.filter(func => {
          if (func.data_admissao) {
            const admissao = parseISO(func.data_admissao);
            if (admissao > periodoFim) return false;
          }
          
          // Para data de demissão, usar data atual se não tem data_demissao mas está desligado
          const situacaoNome = (func.situacao?.nome || '').toUpperCase();
          const isDesligado = situacaoNome.includes('DEMISSÃO') || situacaoNome.includes('DEMISS') || situacaoNome.includes('PED. DEMISSÃO');
          const dataDemissaoEfetiva = func.data_demissao || (isDesligado ? hoje : null);
          
          if (dataDemissaoEfetiva) {
            const demissao = parseISO(dataDemissaoEfetiva);
            // Exclui se demissão foi antes do início do período
            if (demissao < periodoInicio) return false;
          }
          
          return true;
        });
      }

      return allData;
    },
    enabled: !!periodoId && !!periodo,
    // Manter dados anteriores enquanto refetch (evita "sumir" a tabela)
    placeholderData: (previousData) => previousData,
  });
}
