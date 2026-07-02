import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Demissao, PeriodoDemissao } from '@/types/demissao';
import { toast } from 'sonner';
import { criarEventoENotificar } from '@/hooks/useEventosSistema';
import { registrarHistoricoQuadroSeTravado } from '@/hooks/useFuncionarios';
import { normalizarTextoSistema } from '@/lib/normalizacao';

const invalidarBaseFuncionarios = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'quadro'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'quadro', 'conferidos'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'ponto'] });
};

function nomesSituacaoPorTipoDesligamento(tipoDesligamento?: string | null) {
  const tipo = normalizarTextoSistema(tipoDesligamento) || '';
  if (tipo.includes('TERMINO') || tipo.includes('CONTRATO')) return ['TERMINO CONTRATO', 'TERMINO DE CONTRATO'];
  if (tipo.includes('PED')) return ['PEDIDO DEMISSAO', 'PED. DEMISSAO'];
  return ['DEMISSAO'];
}

async function buscarSituacaoDesligamento(tipoDesligamento?: string | null) {
  const { data, error } = await supabase
    .from('situacoes')
    .select('id, nome')
    .eq('ativa', true);
  if (error) throw error;

  const nomes = nomesSituacaoPorTipoDesligamento(tipoDesligamento);
  return data?.find((s) => nomes.includes(normalizarTextoSistema(s.nome) || ''))?.id;
}


// Eventos são registrados automaticamente na central de notificações


export function useDemissoes() {
  return useQuery({
    queryKey: ['demissoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demissoes')
        .select(`
          *,
          funcionario:funcionarios(
            id,
            nome_completo,
            matricula,
            data_admissao,
            cargo,
            turma,
            setor:setores!setor_id(id, nome, grupo)
          )
        `);
      
      if (error) throw error;
      return data as Demissao[];
    },
  });
}

export function useDemissoesPendentes() {
  return useQuery({
    queryKey: ['demissoes', 'pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demissoes')
        .select(`
          *,
          funcionario:funcionarios(
            id,
            nome_completo,
            matricula,
            data_admissao,
            cargo,
            turma,
            setor:setores!setor_id(id, nome, grupo)
          )
        `)
        .eq('realizado', false)
        .neq('tipo_desligamento', 'Pedido de Demissão')
        .order('data_prevista', { ascending: true });
      
      if (error) throw error;
      return data as Demissao[];
    },
  });
}

export function useDemissoesRealizadas() {
  return useQuery({
    queryKey: ['demissoes', 'realizadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demissoes')
        .select(`
          *,
          funcionario:funcionarios(
            id,
            nome_completo,
            matricula,
            data_admissao,
            cargo,
            turma,
            setor:setores!setor_id(id, nome, grupo)
          )
        `)
        .eq('realizado', true)
        .order('data_prevista', { ascending: false });
      
      if (error) throw error;
      return data as Demissao[];
    },
  });
}

export function usePeriodosDemissao() {
  return useQuery({
    queryKey: ['periodos-demissao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periodos_demissao')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      
      if (error) throw error;
      return data as PeriodoDemissao[];
    },
  });
}

interface CreateDemissaoInput {
  funcionario_id: string;
  tipo_desligamento?: string | null;
  data_prevista: string;
  data_exame_demissional?: string | null;
  hora_exame_demissional?: string | null;
  data_homologacao?: string | null;
  hora_homologacao?: string | null;
  observacoes?: string | null;
  // Para aviso de movimentação
  setor_nome?: string;
  criado_por_nome?: string;
  funcionario_nome?: string;
  setor_id?: string;
  turma?: string;
  // Flag para pular atualização de situação (quando já está na situação correta)
  skipSituacaoUpdate?: boolean;
}

export function useCreateDemissao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateDemissaoInput & { situacaoPedidoDemissaoId?: string; situacaoDemissaoId?: string }) => {
      // Separar campos extras do resto dos dados
      const { situacaoPedidoDemissaoId, situacaoDemissaoId, setor_nome, criado_por_nome, funcionario_nome, setor_id, turma, skipSituacaoUpdate, ...demissao } = input;
      
      const tipoNormalizado = normalizarTextoSistema(demissao.tipo_desligamento) || '';
      const nomesSituacaoAlvo = nomesSituacaoPorTipoDesligamento(demissao.tipo_desligamento);
      const situacaoAlvoManual = nomesSituacaoAlvo.some((nome) => nome.includes('PED'))
        ? situacaoPedidoDemissaoId
        : tipoNormalizado.includes('TERMINO') || tipoNormalizado.includes('CONTRATO')
          ? undefined
          : situacaoDemissaoId;
      const situacaoAlvo = situacaoAlvoManual || await buscarSituacaoDesligamento(demissao.tipo_desligamento);

      if (!situacaoAlvo && !skipSituacaoUpdate) {
        throw new Error('Situacao de desligamento nao encontrada.');
      }

      // Atualizar situação do funcionário para o tipo correspondente
      if (situacaoAlvo && !skipSituacaoUpdate) {
        const { data: funcionarioAntes } = await supabase
          .from('funcionarios')
          .select('*, setor:setores!setor_id(*), situacao:situacoes!situacao_id(*)')
          .eq('id', demissao.funcionario_id)
          .single();

        const updateData: Record<string, any> = { situacao_id: situacaoAlvo };
        updateData.data_demissao = demissao.data_prevista || new Date().toISOString().split('T')[0];
        const { error: funcError } = await supabase
          .from('funcionarios')
          .update(updateData)
          .eq('id', demissao.funcionario_id);
        
        if (funcError) throw funcError;
      
        const { data: funcionarioDepois } = await supabase
          .from('funcionarios')
          .select('*, setor:setores!setor_id(*), situacao:situacoes!situacao_id(*)')
          .eq('id', demissao.funcionario_id)
          .single();

        await registrarHistoricoQuadroSeTravado(funcionarioAntes as any, funcionarioDepois as any, criado_por_nome || 'SISTEMA', 'DEMISSAO');
      }

      // Criar demissão como realizada
      const { data, error } = await supabase
        .from('demissoes')
        .insert({
          ...demissao,
          realizado: true,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Remover registros de falta após a data da demissão
      if (demissao.data_prevista) {
        const { error: deleteError } = await supabase
          .from('registros_ponto')
          .delete()
          .eq('funcionario_id', demissao.funcionario_id)
          .gt('data', demissao.data_prevista);
        
        if (deleteError) {
          console.error('Erro ao limpar faltas pós-demissão:', deleteError);
        }
      }


      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['demissoes'] });
      invalidarBaseFuncionarios(queryClient);
      
      // Resolver divergências pendentes do funcionário desligado
      try {
        await supabase
          .from('divergencias_quadro')
          .update({
            resolvido: true,
            resolvido_por: 'SISTEMA',
            resolvido_em: new Date().toISOString(),
            status: 'resolvido',
            feedback_rh: 'Resolvido automaticamente — funcionário desligado',
          })
          .eq('funcionario_id', variables.funcionario_id)
          .eq('resolvido', false);
        queryClient.invalidateQueries({ queryKey: ['divergencias'] });
      } catch (err) {
        console.error('Erro ao resolver divergências do funcionário desligado:', err);
      }
      
      if (variables.tipo_desligamento === 'Pedido de Demissão') {
        toast.success('Pedido de Demissão registrado! Funcionário atualizado.');
      } else {
        toast.success('Demissão registrada! Funcionário marcado como desligado.');
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Erro ao registrar demissão');
    },
  });
}

export function useUpdateDemissao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...demissao }: Partial<Demissao> & { id: string }) => {
      const { data, error } = await supabase
        .from('demissoes')
        .update(demissao)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      if (data.funcionario_id && (demissao.data_prevista || demissao.tipo_desligamento !== undefined)) {
        const { data: funcionarioAntes } = await supabase
          .from('funcionarios')
          .select('*, setor:setores!setor_id(*), situacao:situacoes!situacao_id(*)')
          .eq('id', data.funcionario_id)
          .single();

        const updateFuncionario: Record<string, any> = {};
        if (demissao.data_prevista) {
          updateFuncionario.data_demissao = demissao.data_prevista;
        }
        if (demissao.tipo_desligamento !== undefined) {
          const situacaoAlvo = await buscarSituacaoDesligamento(demissao.tipo_desligamento);
          if (situacaoAlvo) {
            updateFuncionario.situacao_id = situacaoAlvo;
          }
        }

        const { error: funcError } = await supabase
          .from('funcionarios')
          .update(updateFuncionario)
          .eq('id', data.funcionario_id);
        if (funcError) throw funcError;

        const { data: funcionarioDepois } = await supabase
          .from('funcionarios')
          .select('*, setor:setores!setor_id(*), situacao:situacoes!situacao_id(*)')
          .eq('id', data.funcionario_id)
          .single();

        await registrarHistoricoQuadroSeTravado(funcionarioAntes as any, funcionarioDepois as any, 'SISTEMA', 'DEMISSAO');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demissoes'] });
      invalidarBaseFuncionarios(queryClient);
      toast.success('Demissão atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar demissão');
    },
  });
}

export function useToggleLancadoApdata() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, lancado_apdata }: { id: string; lancado_apdata: boolean }) => {
      const { data, error } = await supabase
        .from('demissoes')
        .update({ lancado_apdata })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['demissoes'] });
      toast.success(variables.lancado_apdata ? 'Marcado como lançado no APDATA!' : 'Desmarcado do APDATA');
    },
    onError: () => {
      toast.error('Erro ao atualizar status APDATA');
    },
  });
}

export function useRealizarDemissao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ demissaoId, funcionarioId, situacaoDemitidoId, setorNome, criadoPorNome, skipSituacaoUpdate }: { 
      demissaoId: string; 
      funcionarioId: string;
      situacaoDemitidoId: string;
      setorNome?: string;
      criadoPorNome?: string;
      skipSituacaoUpdate?: boolean;
    }) => {
      // 1. Buscar data_prevista da demissão
      const { data: demissaoData } = await supabase
        .from('demissoes')
        .select('data_prevista, funcionario_id, tipo_desligamento, observacoes')
        .eq('id', demissaoId)
        .single();


      // 2. Marcar demissão como realizada
      const { error: demissaoError } = await supabase
        .from('demissoes')
        .update({ realizado: true })
        .eq('id', demissaoId);
      
      if (demissaoError) throw demissaoError;

      // 3. Só atualiza situação se não for para pular
      if (!skipSituacaoUpdate) {
        const situacaoAlvo = await buscarSituacaoDesligamento(demissaoData?.tipo_desligamento) || situacaoDemitidoId;
        if (!situacaoAlvo) throw new Error('Situacao de desligamento nao encontrada.');

        const { data: funcionarioAntes } = await supabase
          .from('funcionarios')
          .select('*, setor:setores!setor_id(*), situacao:situacoes!situacao_id(*)')
          .eq('id', funcionarioId)
          .single();

        const { error: funcError } = await supabase
          .from('funcionarios')
          .update({ 
            situacao_id: situacaoAlvo,
            data_demissao: demissaoData?.data_prevista || new Date().toISOString().split('T')[0]
          })
          .eq('id', funcionarioId);
        
        if (funcError) throw funcError;

        const { data: funcionarioDepois } = await supabase
          .from('funcionarios')
          .select('*, setor:setores!setor_id(*), situacao:situacoes!situacao_id(*)')
          .eq('id', funcionarioId)
          .single();

        await registrarHistoricoQuadroSeTravado(funcionarioAntes as any, funcionarioDepois as any, criadoPorNome || 'SISTEMA', 'DEMISSAO');
      }

      // 4. Remover registros de falta após a data da demissão
      if (demissaoData?.data_prevista) {
        const { error: deleteError } = await supabase
          .from('registros_ponto')
          .delete()
          .eq('funcionario_id', funcionarioId)
          .gt('data', demissaoData.data_prevista);
        
        if (deleteError) {
          console.error('Erro ao limpar faltas pós-demissão:', deleteError);
        }
      }

    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['demissoes'] });
      invalidarBaseFuncionarios(queryClient);
      
      // Resolver divergências pendentes do funcionário desligado
      try {
        await supabase
          .from('divergencias_quadro')
          .update({
            resolvido: true,
            resolvido_por: 'SISTEMA',
            resolvido_em: new Date().toISOString(),
            status: 'resolvido',
            feedback_rh: 'Resolvido automaticamente — funcionário desligado',
          })
          .eq('funcionario_id', variables.funcionarioId)
          .eq('resolvido', false);
        queryClient.invalidateQueries({ queryKey: ['divergencias'] });
      } catch (err) {
        console.error('Erro ao resolver divergências do funcionário desligado:', err);
      }

      toast.success('Demissão realizada! Funcionário removido do quadro.');
    },
    onError: () => {
      toast.error('Erro ao realizar demissão');
    },
  });
}

export function useDeleteDemissao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('demissoes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demissoes'] });
      toast.success('Demissão cancelada!');
    },
    onError: () => {
      toast.error('Erro ao cancelar demissão');
    },
  });
}

// Hook para períodos
export function useCreatePeriodoDemissao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (periodo: Omit<PeriodoDemissao, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('periodos_demissao')
        .insert(periodo)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-demissao'] });
      toast.success('Período criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar período');
    },
  });
}

export function useUpdatePeriodoDemissao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...periodo }: Partial<PeriodoDemissao> & { id: string }) => {
      const { data, error } = await supabase
        .from('periodos_demissao')
        .update(periodo)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-demissao'] });
      toast.success('Período atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar período');
    },
  });
}

export function useDeletePeriodoDemissao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('periodos_demissao')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periodos-demissao'] });
      toast.success('Período removido!');
    },
    onError: () => {
      toast.error('Erro ao remover período');
    },
  });
}

export function useImportDemissoesDoCadastro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ mes, ano }: { mes: number; ano: number }) => {
      const dataInicio = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
      const dataFim = new Date(ano, mes, 0).toISOString().split('T')[0];

      // 1. Buscar todos os funcionários com data_demissao no mês e situação contendo "DEMISS"
      const { data: funcionarios, error: funcError } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, data_demissao, situacao:situacoes!situacao_id(nome)')
        .gte('data_demissao', dataInicio)
        .lte('data_demissao', dataFim);
      
      if (funcError) throw funcError;

      const paraImportar = funcionarios?.filter(f => {
        const situacaoNome = normalizarTextoSistema((f.situacao as any)?.nome) || '';
        return situacaoNome.includes('DEMISS') || situacaoNome.includes('TERMINO CONTRATO');
      }) || [];

      if (paraImportar.length === 0) return { count: 0 };

      // 2. Buscar demissões já existentes para esses funcionários para não duplicar
      const idsImportar = paraImportar.map(f => f.id);
      const { data: existentes, error: existsError } = await supabase
        .from('demissoes')
        .select('funcionario_id')
        .in('funcionario_id', idsImportar);
      
      if (existsError) throw existsError;

      const idsExistentes = new Set(existentes?.map(e => e.funcionario_id) || []);
      const novos = paraImportar.filter(f => !idsExistentes.has(f.id));

      if (novos.length === 0) return { count: 0 };

      // 3. Criar os registros de demissão
      const payloads = novos.map(f => {
        const situacaoNome = normalizarTextoSistema((f.situacao as any)?.nome) || '';
        const tipoDesligamento = situacaoNome.includes('PED')
          ? 'Pedido de Demissao'
          : situacaoNome.includes('TERMINO') || situacaoNome.includes('CONTRATO')
            ? 'Termino de Contrato'
            : 'Demissao';
        
        return {
          funcionario_id: f.id,
          data_prevista: f.data_demissao,
          tipo_desligamento: tipoDesligamento,
          realizado: true,
          observacoes: 'Importado do cadastro de Funcionários'
        };
      });

      const { error: insertError } = await supabase
        .from('demissoes')
        .insert(payloads);
      
      if (insertError) throw insertError;

      return { count: novos.length };
    },
    onSuccess: (result) => {
      if (result.count > 0) {
        queryClient.invalidateQueries({ queryKey: ['demissoes'] });
        invalidarBaseFuncionarios(queryClient);
        toast.success(`${result.count} demissões importadas com sucesso!`);
      } else {
        toast.info('Nenhuma nova demissão para importar deste mês.');
      }
    },
    onError: (error) => {
      console.error('Erro na importação:', error);
      toast.error('Erro ao importar demissões do cadastro.');
    }
  });
}





