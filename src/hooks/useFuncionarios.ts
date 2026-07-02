import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Funcionario, SexoTipo } from '@/types/database';
import { toast } from 'sonner';
import { criarEventoENotificar } from '@/hooks/useEventosSistema';
import { normalizarFuncionarioPayload } from '@/lib/normalizacao';
import { useAuth } from '@/hooks/useAuth';

export const invalidarFuncionarios = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'quadro'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'quadro', 'conferidos'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'ponto'] });
};

export function useFuncionariosRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('funcionarios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funcionarios' }, () => {
        invalidarFuncionarios(queryClient);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

function normalizarTextoHistorico(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '';
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function situacaoRetornaAutomaticoParaAtivo(nome?: string | null): boolean {
  const normalizado = normalizarTextoHistorico(nome);
  return normalizado === 'FERIAS'
    || normalizado.includes('TREINAMENTO')
    || normalizado.includes('COBERTURA')
    || normalizado.includes('COB FERIAS')
    || normalizado.includes('COB. FERIAS');
}

async function retornarSituacoesVencidasParaAtivo(funcionarios: Funcionario[]) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const vencidos = funcionarios.filter((funcionario) => {
    if (!funcionario.cobertura_data_fim) return false;
    if (!situacaoRetornaAutomaticoParaAtivo(funcionario.situacao?.nome)) return false;

    const fim = new Date(`${funcionario.cobertura_data_fim}T00:00:00`);
    return !Number.isNaN(fim.getTime()) && fim < hoje;
  });

  if (vencidos.length === 0) return;

  const { data: situacaoAtivo, error: situacaoError } = await supabase
    .from('situacoes')
    .select('id')
    .eq('nome', 'ATIVO')
    .single();

  if (situacaoError || !situacaoAtivo?.id) return;

  await supabase
    .from('funcionarios')
    .update({
      situacao_id: situacaoAtivo.id,
      cobertura_funcionario_id: null,
      cobertura_data_inicio: null,
      cobertura_data_fim: null,
      treinamento_setor_id: null,
    })
    .in('id', vencidos.map(f => f.id));
}

function areaDoFuncionario(funcionario: any): 'SOPRO' | 'DECORACAO' | null {
  const texto = normalizarTextoHistorico(`${funcionario?.setor?.nome || ''} ${funcionario?.setor?.grupo || ''}`);
  if (texto.includes('DECORACAO')) return 'DECORACAO';
  if (texto.includes('SOPRO')) return 'SOPRO';
  return null;
}

export async function registrarHistoricoQuadroSeTravado(funcionarioAntes: any, funcionarioDepois: any, usuarioNome: string, origem = 'FUNCIONARIOS') {
  if (!funcionarioAntes || !funcionarioDepois) return;

  const areas = Array.from(new Set([
    areaDoFuncionario(funcionarioAntes),
    areaDoFuncionario(funcionarioDepois),
  ].filter(Boolean))) as Array<'SOPRO' | 'DECORACAO'>;

  if (areas.length === 0) return;

  const { data: travas, error: travasError } = await (supabase as any)
    .from('quadro_travas')
    .select('id, area')
    .in('area', areas)
    .eq('ativo', true);

  if (travasError || !travas?.length) return;

  const campos = [
    { campo: 'SETOR', antes: funcionarioAntes.setor?.nome, depois: funcionarioDepois.setor?.nome },
    { campo: 'TURMA', antes: funcionarioAntes.turma, depois: funcionarioDepois.turma },
    { campo: 'SITUACAO', antes: funcionarioAntes.situacao?.nome, depois: funcionarioDepois.situacao?.nome },
    { campo: 'DATA_ADMISSAO', antes: funcionarioAntes.data_admissao, depois: funcionarioDepois.data_admissao },
    { campo: 'DATA_DEMISSAO', antes: funcionarioAntes.data_demissao, depois: funcionarioDepois.data_demissao },
    { campo: 'CARGO', antes: funcionarioAntes.cargo, depois: funcionarioDepois.cargo },
    { campo: 'EMPRESA', antes: funcionarioAntes.empresa, depois: funcionarioDepois.empresa },
    { campo: 'COBERTURA_INICIO', antes: funcionarioAntes.cobertura_data_inicio, depois: funcionarioDepois.cobertura_data_inicio },
    { campo: 'COBERTURA_FIM', antes: funcionarioAntes.cobertura_data_fim, depois: funcionarioDepois.cobertura_data_fim },
    { campo: 'COBERTURA_FUNCIONARIO', antes: funcionarioAntes.cobertura_funcionario_id, depois: funcionarioDepois.cobertura_funcionario_id },
    { campo: 'TREINAMENTO_SETOR', antes: funcionarioAntes.treinamento_setor_id, depois: funcionarioDepois.treinamento_setor_id },
  ];

  const registros = travas.flatMap((trava: { id: string }) => campos
    .filter(({ antes, depois }) => normalizarTextoHistorico(antes) !== normalizarTextoHistorico(depois))
    .map(({ campo, antes, depois }) => ({
      trava_id: trava.id,
      funcionario_id: funcionarioDepois.id,
      funcionario_nome: funcionarioDepois.nome_completo,
      matricula: funcionarioDepois.matricula,
      campo_alterado: campo,
      valor_anterior: normalizarTextoHistorico(antes),
      valor_novo: normalizarTextoHistorico(depois),
      usuario_nome: usuarioNome,
      origem,
    })));

  if (registros.length === 0) return;

  await (supabase as any)
    .from('quadro_historico')
    .insert(registros);
}

export function useDeleteFuncionario() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error: armarioError } = await supabase
        .from('armarios_femininos')
        .update({ funcionario_id: null })
        .eq('funcionario_id', id);
      if (armarioError) throw armarioError;

      const { error } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidarFuncionarios(queryClient);
      toast.success('FuncionÃ¡rio excluÃ­do com sucesso!');
    },
    onError: (error: Error) => {
      if (error.message.includes('violates foreign key')) {
        toast.error('NÃ£o Ã© possÃ­vel excluir: funcionÃ¡rio possui registros vinculados');
      } else {
        toast.error('Erro ao excluir funcionÃ¡rio');
      }
    },
  });
}

export function useFuncionarios() {
  return useQuery({
    queryKey: ['funcionarios'],
    queryFn: async () => {
      // Buscar todos os funcionÃ¡rios em lotes para superar limite de 1000
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
      
      await retornarSituacoesVencidasParaAtivo(allData);
      return allData;
    },
  });
}

export function useFuncionariosQuadroConferido() {
  const funcionariosQuadro = useFuncionariosNoQuadro();

  return useQuery({
    queryKey: ['funcionarios', 'quadro', 'conferidos'],
    enabled: !funcionariosQuadro.isLoading && !funcionariosQuadro.error,
    queryFn: async () => {
      const { data: conferidos, error: conferenciaError } = await (supabase as any)
        .from('conferencia_funcionarios')
        .select('funcionario_id')
        .eq('status', 'CONFERIDO');

      if (conferenciaError) throw conferenciaError;

      const idsConferidos = new Set<string>((conferidos || []).map((item: { funcionario_id: string }) => item.funcionario_id));
      if (idsConferidos.size === 0) return [];

      return (funcionariosQuadro.data || []).filter((funcionario) => idsConferidos.has(funcionario.id));
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
  cpf?: string | null;
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
      const funcionarioNormalizado = normalizarFuncionarioPayload(funcionario);
      const { data, error } = await supabase
        .from('funcionarios')
        .insert(funcionarioNormalizado)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      invalidarFuncionarios(queryClient);
      toast.success('FuncionÃ¡rio cadastrado com sucesso!');

      // Buscar nome do setor para a notificaÃ§Ã£o
      const { data: setor } = await supabase
        .from('setores')
        .select('nome')
        .eq('id', variables.setor_id)
        .single();

      criarEventoENotificar({
        tipo: 'admissao',
        descricao: 'Nova admissÃ£o cadastrada',
        funcionario_nome: variables.nome_completo,
        setor_id: variables.setor_id,
        setor_nome: setor?.nome || '',
        turma: variables.turma || null,
      });
    },
    onError: () => {
      toast.error('Erro ao cadastrar funcionÃ¡rio');
    },
  });
}

export function useUpdateFuncionario() {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, situacao_id, situacaoAtualNome, ...funcionario }: Partial<Funcionario> & { 
      id: string;
      situacaoAtualNome?: string; // Nome da situaÃ§Ã£o atual para detectar mudanÃ§a
    }) => {
      // Se estÃ¡ mudando de uma situaÃ§Ã£o de demissÃ£o para ATIVO, limpar data_demissao
      const situacoesDesligamento = ['DEMISSAO', 'PED. DEMISSAO', 'PEDIDO DEMISSAO', 'TERMINO CONTRATO'];
      const estaVindoDeDesligamento = situacoesDesligamento.some(s => 
        normalizarTextoHistorico(situacaoAtualNome).includes(s)
      );
      
      // Buscar nome da nova situaÃ§Ã£o
      let novaSituacaoNome = '';
      if (situacao_id) {
        const { data: situacao } = await supabase
          .from('situacoes')
          .select('nome')
          .eq('id', situacao_id)
          .single();
        novaSituacaoNome = situacao?.nome || '';
      }
      
      const estaMudandoParaAtivo = normalizarTextoHistorico(novaSituacaoNome) === 'ATIVO';
      
      // Se estava em demissÃ£o e estÃ¡ voltando para Ativo, limpa a data de demissÃ£o
      const updateData = normalizarFuncionarioPayload({
        ...funcionario,
        situacao_id,
        ...(estaVindoDeDesligamento && estaMudandoParaAtivo ? { data_demissao: null } : {}),
      });
      
      const { data: funcionarioAntes } = await supabase
        .from('funcionarios')
        .select(`
          *,
          setor:setores!setor_id(*),
          situacao:situacoes(*)
        `)
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('funcionarios')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          setor:setores!setor_id(*),
          situacao:situacoes(*)
        `)
        .single();
      
      if (error) throw error;

      await registrarHistoricoQuadroSeTravado(funcionarioAntes as any, data as any, userRole?.nome || 'SISTEMA');
      return data;
    },
    onSuccess: () => {
      invalidarFuncionarios(queryClient);
      toast.success('FuncionÃ¡rio atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar funcionario');
    },
  });
}

