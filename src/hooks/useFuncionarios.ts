import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Funcionario, SexoTipo } from '@/types/database';
import { toast } from 'sonner';
import { criarEventoENotificar } from '@/hooks/useEventosSistema';
import { normalizarFuncionarioPayload } from '@/lib/normalizacao';
import { useAuth } from '@/hooks/useAuth';
import { funcionariosApi } from '@/lib/funcionariosApi';
import { notificarMovimentacaoLider } from '@/lib/notificarMovimentacaoLider';

const FUNCIONARIOS_STALE_TIME = 5 * 60 * 1000;
const FUNCIONARIOS_GC_TIME = 30 * 60 * 1000;

export const invalidarFuncionarios = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'quadro'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'quadro', 'conferidos'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'ponto'] });
};

const atualizarFuncionarioNoCache = (queryClient: QueryClient, funcionarioAtualizado: Funcionario | null | undefined) => {
  if (!funcionarioAtualizado?.id) return;
  const atualizarLista = (lista?: Funcionario[]) => {
    if (!Array.isArray(lista)) return lista;
    return lista.map((funcionario) =>
      funcionario.id === funcionarioAtualizado.id ? { ...funcionario, ...funcionarioAtualizado } : funcionario
    );
  };

  queryClient.setQueryData<Funcionario[]>(['funcionarios'], atualizarLista);
  queryClient.setQueryData<Funcionario[]>(['funcionarios', 'quadro'], atualizarLista);
  queryClient.setQueryData<Funcionario[]>(['funcionarios', 'quadro', 'conferidos'], atualizarLista);
  queryClient.setQueryData<Funcionario[]>(['funcionarios', 'ponto'], atualizarLista);
};

export function useFuncionariosRealtime() {
  const queryClient = useQueryClient();
  const invalidateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const agendarInvalidacao = () => {
      if (invalidateTimerRef.current) window.clearTimeout(invalidateTimerRef.current);
      invalidateTimerRef.current = window.setTimeout(() => {
        invalidarFuncionarios(queryClient);
        invalidateTimerRef.current = null;
      }, 1000);
    };

    const channel = supabase
      .channel('funcionarios-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funcionarios' }, agendarInvalidacao)
      .subscribe();

    return () => {
      if (invalidateTimerRef.current) window.clearTimeout(invalidateTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

function normalizarTextoHistorico(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '';
  return String(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function getSessionTokenHistoricoQuadro() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario_logado') || 'null');
    return usuario?.session_token || null;
  } catch {
    return null;
  }
}

function situacaoRetornaAutomaticoParaAtivo(nome?: string | null): boolean {
  const normalizado = normalizarTextoHistorico(nome);
  return normalizado === 'FERIAS'
    || normalizado.includes('TREINAMENTO')
    || normalizado.includes('COBERTURA')
    || normalizado.includes('COB FERIAS')
    || normalizado.includes('COB. FERIAS');
}

function contaNoQuadro(funcionario: any): boolean {
  if (typeof funcionario?.situacao?.conta_no_quadro === 'boolean') {
    return funcionario.situacao.conta_no_quadro === true && funcionario.situacao.ativa !== false;
  }

  const situacao = normalizarTextoHistorico(funcionario?.situacao?.nome);
  if (!situacao) return false;

  return ![
    'PREVISAO',
    'DEMISSAO',
    'PEDIDO DEMISSAO',
    'PEDIDO DE DEMISSAO',
    'PED. DEMISSAO',
    'TERMINO CONTRATO',
    'TERMINO DE CONTRATO',
    'DEM. JUSTA CAUSA',
    'DISPENSA S/ JUSTA CAUSA',
    'ANT. TERMINO',
  ].includes(situacao);
}

export const AREAS_QUADRO_TRAVA = [
  'SOPRO A',
  'SOPRO B',
  'SOPRO C',
  'DECORACAO DIA-T1',
  'DECORACAO DIA-T2',
  'DECORACAO NOITE-T1',
  'DECORACAO NOITE-T2',
] as const;

export type AreaQuadroTrava = typeof AREAS_QUADRO_TRAVA[number];

export function detectarAreaQuadro(funcionario: any): AreaQuadroTrava | null {
  const grupoSetor = (funcionario?.setor?.grupo || '').toUpperCase().trim();
  if (grupoSetor === 'SOPRO A' || grupoSetor === 'SOPRO B' || grupoSetor === 'SOPRO C') {
    return grupoSetor as AreaQuadroTrava;
  }

  const turmaFunc = (funcionario?.turma || '').toUpperCase().trim();
  const setorNome = (funcionario?.setor?.nome || '').toUpperCase();
  const isDia = setorNome.includes('DIA');
  const isNoite = setorNome.includes('NOITE');

  if (turmaFunc === 'T1' || turmaFunc === '1') {
    return isDia ? 'DECORACAO DIA-T1' : isNoite ? 'DECORACAO NOITE-T1' : null;
  }
  if (turmaFunc === 'T2' || turmaFunc === '2') {
    return isDia ? 'DECORACAO DIA-T2' : isNoite ? 'DECORACAO NOITE-T2' : null;
  }

  return null;
}

export async function contarFuncionariosDaArea(area: AreaQuadroTrava): Promise<number> {
  const pageSize = 1000;
  let page = 0;
  let total = 0;
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
      .range(from, to);

    if (error) throw error;

    const lote = (data || []) as Funcionario[];
    total += lote.filter((funcionario) => detectarAreaQuadro(funcionario) === area).length;
    hasMore = lote.length === pageSize;
    page++;
  }

  return total;
}

function tipoMovimentacaoQuadro(camposAlterados: string[], funcionarioAntes: any, funcionarioDepois: any): string {
  const situacaoDepois = normalizarTextoHistorico(funcionarioDepois?.situacao?.nome);

  if (camposAlterados.includes('SITUACAO')) {
    if (['DEMISSAO', 'PEDIDO DEMISSAO', 'PEDIDO DE DEMISSAO', 'PED. DEMISSAO', 'TERMINO CONTRATO', 'TERMINO DE CONTRATO', 'DEM. JUSTA CAUSA', 'DISPENSA S/ JUSTA CAUSA', 'ANT. TERMINO'].includes(situacaoDepois)) {
      return 'DEMISSAO';
    }
    if (situacaoDepois === 'ATIVO' && !contaNoQuadro(funcionarioAntes)) {
      return 'ADMISSAO';
    }
    if (situacaoDepois.includes('AUXILIO') || situacaoDepois.includes('DOENCA')) {
      return 'AUXILIO DOENCA';
    }
  }

  if (camposAlterados.includes('SETOR')) {
    return 'TROCA DE SETOR';
  }

  if (camposAlterados.includes('TURMA')) {
    return 'TROCA DE TURMA';
  }

  if (camposAlterados.some((campo) => campo.startsWith('TREINAMENTO'))) {
    return 'TREINAMENTO';
  }

  return 'CORRECAO';
}

function alteraQuadroVisual(camposAlterados: string[], funcionarioAntes: any, funcionarioDepois: any): boolean {
  const antesConta = contaNoQuadro(funcionarioAntes);
  const depoisConta = contaNoQuadro(funcionarioDepois);
  const setorAntes = normalizarTextoHistorico(funcionarioAntes?.setor?.nome);
  const setorDepois = normalizarTextoHistorico(funcionarioDepois?.setor?.nome);

  if (antesConta !== depoisConta) return true;
  if (antesConta && depoisConta && camposAlterados.includes('SETOR') && setorAntes !== setorDepois) return true;
  return false;
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

  await funcionariosApi.update({
      situacao_id: situacaoAtivo.id,
      cobertura_funcionario_id: null,
      cobertura_data_inicio: null,
      cobertura_data_fim: null,
      treinamento_setor_id: null,
    }, { in: { id: vencidos.map(f => f.id) } });
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
    detectarAreaQuadro(funcionarioAntes),
    detectarAreaQuadro(funcionarioDepois),
    areaDoFuncionario(funcionarioAntes),
    areaDoFuncionario(funcionarioDepois),
  ].filter(Boolean))) as Array<AreaQuadroTrava | 'SOPRO' | 'DECORACAO'>;

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

  const sessionToken = getSessionTokenHistoricoQuadro();
  if (!sessionToken) {
    console.error('[QUADRO] Sessao ausente para registrar historico do quadro');
    return;
  }

  const camposAlterados = registros.map((registro: { campo_alterado: string }) => registro.campo_alterado);
  if (!alteraQuadroVisual(camposAlterados, funcionarioAntes, funcionarioDepois)) {
    const { data, error } = await supabase.functions.invoke('auth-handler', {
      body: {
        action: 'quadro_historico_registrar',
        session_token: sessionToken,
        registros_quadro_historico: registros,
      },
    });
    if (error || data?.error) {
      console.error('[QUADRO] Erro ao registrar historico do quadro:', error || data?.error);
    }
    return;
  }

  const estavaNoQuadro = contaNoQuadro(funcionarioAntes);
  const ficaNoQuadro = contaNoQuadro(funcionarioDepois);
  const impacto = Number(ficaNoQuadro) - Number(estavaNoQuadro);
  const observacao = registros
    .map((registro: { campo_alterado: string; valor_anterior: string; valor_novo: string }) =>
      `${registro.campo_alterado}: ${registro.valor_anterior || '-'} -> ${registro.valor_novo || '-'}`
    )
    .join('; ');

  const tipoMovimentacao = tipoMovimentacaoQuadro(camposAlterados, funcionarioAntes, funcionarioDepois);
  const dataMovimentacao = funcionarioDepois.data_demissao || new Date().toISOString().slice(0, 10);

  const { data: candidatos } = await (supabase as any)
    .from('historico_movimentacao_quadro')
    .select('id, usuario_nome, turma_origem, turma_destino, setor_origem_nome, setor_destino_nome')
    .eq('funcionario_id', funcionarioDepois.id)
    .eq('tipo_movimentacao', tipoMovimentacao)
    .eq('data_movimentacao', dataMovimentacao)
    .limit(20);

  const igual = (a?: string | null, b?: string | null) =>
    normalizarTextoHistorico(a) === normalizarTextoHistorico(b);
  const existente = candidatos?.filter((item: any) =>
    igual(item.turma_origem, funcionarioAntes.turma)
    && igual(item.turma_destino, funcionarioDepois.turma)
    && igual(item.setor_origem_nome, funcionarioAntes.setor?.nome)
    && igual(item.setor_destino_nome, funcionarioDepois.setor?.nome)
  );

  if (existente?.length && existente[0].usuario_nome !== 'SISTEMA') return;

  const registroMovimentacao = {
      id: existente?.[0]?.id,
      funcionario_id: funcionarioDepois.id,
      funcionario_nome: funcionarioDepois.nome_completo,
      matricula: funcionarioDepois.matricula,
      tipo_movimentacao: tipoMovimentacao,
      setor_origem_id: funcionarioAntes.setor_id || funcionarioAntes.setor?.id || null,
      setor_origem_nome: funcionarioAntes.setor?.nome || null,
      setor_destino_id: funcionarioDepois.setor_id || funcionarioDepois.setor?.id || null,
      setor_destino_nome: funcionarioDepois.setor?.nome || null,
      turma_origem: funcionarioAntes.turma || null,
      turma_destino: funcionarioDepois.turma || null,
      data_movimentacao: dataMovimentacao,
      impacto,
      quantidade_antes: null,
      quantidade_depois: null,
      usuario_nome: usuarioNome,
      observacao,
      referencia_tabela: origem,
      referencia_id: funcionarioDepois.id,
  };

  const { data, error } = await supabase.functions.invoke('auth-handler', {
    body: {
      action: 'quadro_historico_registrar',
      session_token: sessionToken,
      registros_quadro_historico: registros,
      registro_movimentacao: registroMovimentacao,
    },
  });
  if (error || data?.error) {
    console.error('[QUADRO] Erro ao registrar historico/movimentacao do quadro:', error || data?.error);
  }
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

      const { error } = await funcionariosApi.delete({ eq: { id } });
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidarFuncionarios(queryClient);
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
    staleTime: FUNCIONARIOS_STALE_TIME,
    gcTime: FUNCIONARIOS_GC_TIME,
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
    staleTime: FUNCIONARIOS_STALE_TIME,
    gcTime: FUNCIONARIOS_GC_TIME,
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
    staleTime: FUNCIONARIOS_STALE_TIME,
    gcTime: FUNCIONARIOS_GC_TIME,
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
    staleTime: FUNCIONARIOS_STALE_TIME,
    gcTime: FUNCIONARIOS_GC_TIME,
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
      const { data, error } = await funcionariosApi.insert(funcionarioNormalizado, { single: true });
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      invalidarFuncionarios(queryClient);
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
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao cadastrar funcionário');
    },
  });
}

export function useUpdateFuncionario() {
  const queryClient = useQueryClient();
  const { userRole, isAdmin } = useAuth();
  
  return useMutation({
    mutationFn: async ({ id, situacao_id, situacaoAtualNome, ...funcionario }: Partial<Funcionario> & { 
      id: string;
      situacaoAtualNome?: string; // Nome da situação atual para detectar mudança
    }) => {
      // Se está mudando de uma situação de demissão para ATIVO, limpar data_demissao
      const situacoesDesligamento = ['DEMISSAO', 'PED. DEMISSAO', 'PEDIDO DEMISSAO', 'TERMINO CONTRATO'];
      const estaVindoDeDesligamento = situacoesDesligamento.some(s => 
        normalizarTextoHistorico(situacaoAtualNome).includes(s)
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
      
      const estaMudandoParaAtivo = normalizarTextoHistorico(novaSituacaoNome) === 'ATIVO';
      
      // Se estava em demissão e está voltando para Ativo, limpa a data de demissão
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

      const { data, error } = await funcionariosApi.update(updateData, {
        eq: { id },
        select: `
          *,
          setor:setores!setor_id(*),
          situacao:situacoes(*)
        `,
        single: true,
      });
      
      if (error) throw error;

      await registrarHistoricoQuadroSeTravado(funcionarioAntes as any, data as any, userRole?.nome || 'SISTEMA');
      const antes = funcionarioAntes as any;
      const depois = data as any;
      const mudouTurma = (antes?.turma || '') !== (depois?.turma || '');
      const mudouSetor = (antes?.setor_id || '') !== (depois?.setor_id || '');

      if (!isAdmin && (mudouTurma || mudouSetor)) {
        await notificarMovimentacaoLider({
          titulo: mudouSetor ? 'ALTERACAO DE SETOR/TURMA' : 'ALTERACAO DE TURMA',
          mensagem: `${(depois?.nome_completo || '').toUpperCase()}\nLider: ${(userRole?.nome || 'SISTEMA').toUpperCase()}\nOrigem: ${(antes?.setor?.nome || '-').toUpperCase()}${antes?.turma ? ` / ${antes.turma}` : ''}\nDestino: ${(depois?.setor?.nome || '-').toUpperCase()}${depois?.turma ? ` / ${depois.turma}` : ''}`,
          referenciaId: depois?.id || null,
        });
      }
      return data;
    },
    onSuccess: (data) => {
      atualizarFuncionarioNoCache(queryClient, data as Funcionario);
      invalidarFuncionarios(queryClient);
      toast.success('Funcionário atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao atualizar funcionario');
    },
  });
}

