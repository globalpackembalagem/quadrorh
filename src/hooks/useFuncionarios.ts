import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Funcionario, SexoTipo } from '@/types/database';
import { toast } from 'sonner';
import { criarEventoENotificar } from '@/hooks/useEventosSistema';

export function useDeleteFuncionario() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast.success('Funcionário excluído com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message.includes('violates foreign key')) {
        toast.error('Não é possível excluir: funcionário possui registros vinculados');
      } else {
        toast.error('Erro ao excluir funcionário');
      }
    },
  });
}

export function useFuncionarios() {
  return useQuery({
    queryKey: ['funcionarios'],
    queryFn: async () => {
      // Buscar todos os funcionários em lotes para superar limite de 1000
      const pageSize = 1000;
      let allData: Funcionario[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        const { data, error } = await supabase
          .from('funcionarios')
          .select(`
            *,
            setor:setores!setor_id(*),
            situacao:situacoes(*)
          `)
          .order('nome_completo')
          .range(from, to);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...(data as Funcionario[])];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
  });
}

export function useFuncionariosNoQuadro() {
  return useQuery({
    queryKey: ['funcionarios', 'quadro'],
    queryFn: async () => {
      // Buscar em lotes para suportar mais de 1000 registros
      const pageSize = 1000;
      let allData: Funcionario[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        const { data, error } = await supabase
          .from('funcionarios')
          .select(`
            *,
            setor:setores!setor_id!inner(*),
            situacao:situacoes!inner(*)
          `)
          .eq('setor.conta_no_quadro', true)
          .eq('setor.ativo', true)
          .eq('situacao.conta_no_quadro', true)
          .eq('situacao.ativa', true)
          .order('nome_completo')
          .range(from, to);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...(data as Funcionario[])];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
  });
}

export function useFuncionariosNoPonto() {
  return useQuery({
    queryKey: ['funcionarios', 'ponto'],
    queryFn: async () => {
      // Buscar em lotes para suportar mais de 1000 registros
      const pageSize = 1000;
      let allData: Funcionario[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const from = page * pageSize;
        const to = from + pageSize - 1;
        
        const { data, error } = await supabase
          .from('funcionarios')
          .select(`
            *,
            setor:setores!setor_id!inner(*),
            situacao:situacoes!inner(*)
          `)
          .eq('situacao.entra_no_ponto', true)
          .eq('situacao.ativa', true)
          .order('nome_completo')
          .range(from, to);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...(data as Funcionario[])];
          hasMore = data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return allData;
    },
  });
}


interface CreateFuncionarioInput {
  nome_completo: string;
  sexo: SexoTipo;
  setor_id: string;
  situacao_id: string;
  observacoes?: string | null;
  empresa?: string;
  matricula?: string | null;
  data_admissao?: string | null;
  cargo?: string | null;
  centro_custo?: string | null;
  turma?: string | null;
  data_demissao?: string | null;
}

export function useCreateFuncionario() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (funcionario: CreateFuncionarioInput) => {
      const { data, error } = await supabase
        .from('funcionarios')
        .insert(funcionario)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast.success('Funcionário cadastrado com sucesso!');

      // Buscar nome do setor para a notificação
      const { data: setor } = await supabase
        .from('setores')
        .select('nome')
        .eq('id', variables.setor_id)
        .single();

      criarEventoENotificar({
        tipo: 'admissao',
        descricao: 'Nova admissão cadastrada',
        funcionario_nome: variables.nome_completo,
        setor_id: variables.setor_id,
        setor_nome: setor?.nome || '',
        turma: variables.turma || null,
      });
    },
    onError: () => {
      toast.error('Erro ao cadastrar funcionário');
    },
  });
}

export function useUpdateFuncionario() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, situacao_id, situacaoAtualNome, ...funcionario }: Partial<Funcionario> & { 
      id: string;
      situacaoAtualNome?: string; // Nome da situação atual para detectar mudança
    }) => {
      // Se está mudando de uma situação de demissão para ATIVO, limpar data_demissao
      const situacoesDesligamento = ['DEMISSÃO', 'PED. DEMISSÃO'];
      const estaVindoDeDesligamento = situacoesDesligamento.some(s => 
        situacaoAtualNome?.toUpperCase().includes(s.toUpperCase())
      );
      
      // Buscar nome da nova situação
      let novaSituacaoNome = '';
      if (situacao_id) {
        const { data: situacao } = await supabase
          .from('situacoes')
          .select('nome')
          .eq('id', situacao_id)
          .single();
        novaSituacaoNome = situacao?.nome || '';
      }
      
      const estaMudandoParaAtivo = novaSituacaoNome.toUpperCase() === 'ATIVO';
      
      // Se estava em demissão e está voltando para Ativo, limpa a data de demissão
      const updateData = {
        ...funcionario,
        situacao_id,
        ...(estaVindoDeDesligamento && estaMudandoParaAtivo ? { data_demissao: null } : {}),
      };
      
      const { data, error } = await supabase
        .from('funcionarios')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast.success('Funcionário atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar funcionário');
    },
  });
}
