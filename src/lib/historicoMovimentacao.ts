import { supabase } from '@/integrations/supabase/client';

type SetorMovimentacao = {
  nome?: string | null;
  grupo?: string | null;
};

type FuncionarioQuadroRow = {
  id: string;
  turma: string | null;
  setor: {
    nome: string;
    grupo: string | null;
  } | null;
};

interface ResolverGrupoParams {
  setorNome?: string | null;
  setorGrupo?: string | null;
  turma?: string | null;
}

interface RegistrarMovimentacaoParams {
  grupo: string;
  tipoMovimentacao: string;
  funcionarioNome: string;
  data?: string | null;
  criadoPor?: string | null;
  observacoes?: string | null;
}

interface RegistrarTransferenciaParams {
  funcionarioNome: string;
  grupoOrigem: string;
  grupoDestino: string;
  data?: string | null;
  criadoPor?: string | null;
  observacoes?: string | null;
}

const PAGE_SIZE = 1000;

function normalizarTexto(valor?: string | null) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function calcularTotalPlanejadoSopro(dados: any) {
  const reservaRefeicaoIndustria = Math.round((dados?.aux_maquina_industria || 0) / 6);
  const reservaRefeicaoGP = Math.round((dados?.aux_maquina_gp || 0) / 6);

  return (
    (dados?.aux_maquina_industria || 0) +
    (dados?.reserva_ferias_industria || 0) +
    reservaRefeicaoIndustria +
    (dados?.reserva_faltas_industria || 0) +
    (dados?.amarra_pallets || 0) +
    (dados?.revisao_frasco || 0) +
    (dados?.mod_sindicalista || 0) +
    (dados?.controle_praga || 0) +
    (dados?.aux_maquina_gp || 0) +
    (dados?.reserva_faltas_gp || 0) +
    reservaRefeicaoGP +
    (dados?.reserva_ferias_gp || 0) +
    (dados?.aumento_quadro || 0)
  );
}

function calcularTotalPlanejadoDecoracao(dados: any) {
  const reservaRefeicaoAuto = Math.ceil((dados?.aux_maquina || 0) / 3);

  return (
    (dados?.aux_maquina || 0) +
    reservaRefeicaoAuto +
    (dados?.reserva_faltas || 0) +
    (dados?.reserva_ferias || 0) +
    (dados?.apoio_topografia || 0) +
    (dados?.reserva_afastadas || 0) +
    (dados?.reserva_covid || 0)
  );
}

function isSaida(tipoMovimentacao: string) {
  const tipo = normalizarTexto(tipoMovimentacao);
  return [
    'PEDIDO DE DEMISSAO',
    'DISPENSA',
    'TERMINO CONTRATO',
    'TERMINO DE CONTRATO',
    'TRANSFERENCIA SAIDA',
    'AFASTAMENTO',
  ].includes(tipo);
}

export function resolverGrupoMovimentacao({ setorNome, setorGrupo, turma }: ResolverGrupoParams) {
  const nomeNormalizado = normalizarTexto(setorNome);
  const grupoNormalizado = normalizarTexto(setorGrupo);
  const turmaNormalizada = normalizarTexto(turma);

  const matchSopro = grupoNormalizado.match(/SOPRO\s+([ABC])/);
  if (matchSopro) {
    return `SOPRO ${matchSopro[1]}`;
  }

  const isDecoracao =
    nomeNormalizado.includes('DECORACAO') ||
    grupoNormalizado.includes('DECORACAO') ||
    nomeNormalizado.includes('DIA') ||
    nomeNormalizado.includes('NOITE');

  if (!isDecoracao) {
    return null;
  }

  const periodo =
    grupoNormalizado.includes('NOITE') || nomeNormalizado.includes('NOITE')
      ? 'NOITE'
      : grupoNormalizado.includes('DIA') || nomeNormalizado.includes('DIA')
        ? 'DIA'
        : null;

  const turno =
    turmaNormalizada === '1' || turmaNormalizada === 'T1'
      ? 'T1'
      : turmaNormalizada === '2' || turmaNormalizada === 'T2'
        ? 'T2'
        : null;

  if (!periodo || !turno) {
    return null;
  }

  return `${periodo}-${turno}`;
}

async function carregarFuncionariosNoQuadro() {
  let page = 0;
  let hasMore = true;
  const registros: FuncionarioQuadroRow[] = [];

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('funcionarios')
      .select(`
        id,
        turma,
        setor:setores!setor_id!inner(nome, grupo),
        situacao:situacoes!inner(conta_no_quadro, ativa)
      `)
      .eq('setor.conta_no_quadro', true)
      .eq('setor.ativo', true)
      .eq('situacao.conta_no_quadro', true)
      .eq('situacao.ativa', true)
      .range(from, to);

    if (error) throw error;

    const lote = (data || []) as unknown as FuncionarioQuadroRow[];
    registros.push(...lote);
    hasMore = lote.length === PAGE_SIZE;
    page += 1;
  }

  return registros;
}

async function calcularQuadroNecessario(grupo: string) {
  if (grupo.startsWith('SOPRO ')) {
    const turma = grupo.replace('SOPRO ', '').trim();
    const { data, error } = await supabase
      .from('quadro_planejado')
      .select('*')
      .eq('turma', turma)
      .maybeSingle();

    if (error) throw error;
    return data ? calcularTotalPlanejadoSopro(data) : 0;
  }

  const { data, error } = await supabase
    .from('quadro_decoracao')
    .select('*')
    .eq('turma', grupo)
    .maybeSingle();

  if (error) throw error;
  return data ? calcularTotalPlanejadoDecoracao(data) : 0;
}

async function calcularEstadoAtualGrupo(grupo: string) {
  const [funcionariosNoQuadro, necessario] = await Promise.all([
    carregarFuncionariosNoQuadro(),
    calcularQuadroNecessario(grupo),
  ]);

  const quadroNovo = funcionariosNoQuadro.filter((funcionario) => {
    const grupoFuncionario = resolverGrupoMovimentacao({
      setorNome: funcionario.setor?.nome,
      setorGrupo: funcionario.setor?.grupo,
      turma: funcionario.turma,
    });

    return grupoFuncionario === grupo;
  }).length;

  return {
    quadroNovo,
    necessario,
  };
}

export async function registrarMovimentacaoQuadro({
  grupo,
  tipoMovimentacao,
  funcionarioNome,
  data,
  criadoPor,
  observacoes,
}: RegistrarMovimentacaoParams) {
  const { quadroNovo, necessario } = await calcularEstadoAtualGrupo(grupo);
  const quadroAnterior = isSaida(tipoMovimentacao) ? quadroNovo + 1 : Math.max(quadroNovo - 1, 0);

  const { error } = await supabase
    .from('historico_movimentacao')
    .insert({
      grupo,
      tipo_movimentacao: tipoMovimentacao,
      funcionario_nome: funcionarioNome.trim().toUpperCase(),
      data: data || new Date().toISOString().split('T')[0],
      quadro_anterior: quadroAnterior,
      quadro_novo: quadroNovo,
      necessario,
      observacoes: observacoes || null,
      criado_por: criadoPor || null,
    });

  if (error) throw error;
}

export async function registrarTransferenciaHistorico({
  funcionarioNome,
  grupoOrigem,
  grupoDestino,
  data,
  criadoPor,
  observacoes,
}: RegistrarTransferenciaParams) {
  await Promise.all([
    registrarMovimentacaoQuadro({
      grupo: grupoOrigem,
      tipoMovimentacao: 'TRANSFERÊNCIA SAÍDA',
      funcionarioNome,
      data,
      criadoPor,
      observacoes,
    }),
    registrarMovimentacaoQuadro({
      grupo: grupoDestino,
      tipoMovimentacao: 'TRANSFERÊNCIA ENTRADA',
      funcionarioNome,
      data,
      criadoPor,
      observacoes,
    }),
  ]);
}

export async function buscarContextoFuncionario(funcionarioId: string) {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('id, nome_completo, turma, setor:setores!setor_id(nome, grupo)')
    .eq('id', funcionarioId)
    .single();

  if (error) throw error;

  return data as {
    id: string;
    nome_completo: string;
    turma: string | null;
    setor: SetorMovimentacao | null;
  };
}
