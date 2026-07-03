import { Setor } from '@/types/database';

export const TURMAS_SOPRO_VALIDAS = ['1A', '1B', '2A', '2B'] as const;
export const TURMAS_DECORACAO_VALIDAS = ['T1', 'T2'] as const;
const SETORES_SOPRO_OFICIAIS = [
  'MOD - SOPRO A',
  'MOD - SOPRO B',
  'MOD - SOPRO C',
  'PRODUCAO SOPRO G+P A',
  'PRODUCAO SOPRO G+P B',
  'PRODUCAO SOPRO G+P C',
];
const SETORES_DECORACAO_OFICIAIS = [
  'DECORACAO MOD DIA',
  'DECORACAO MOD NOITE',
];

export function normalizarTextoTurma(valor?: string | null) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function getTipoSetorTurma(setor?: Pick<Setor, 'nome' | 'grupo'> | null): 'SOPRO' | 'DECORACAO' | null {
  const nome = normalizarTextoTurma(setor?.nome);
  if (SETORES_DECORACAO_OFICIAIS.includes(nome)) return 'DECORACAO';
  if (SETORES_SOPRO_OFICIAIS.includes(nome)) return 'SOPRO';
  return null;
}

export function getTurmasPermitidasPorSetor(setor?: Pick<Setor, 'nome' | 'grupo'> | null): string[] {
  const tipo = getTipoSetorTurma(setor);
  if (tipo === 'SOPRO') return [...TURMAS_SOPRO_VALIDAS];
  if (tipo === 'DECORACAO') return [...TURMAS_DECORACAO_VALIDAS];
  return [];
}

export function validarTurmaPorSetor(
  setor: Pick<Setor, 'nome' | 'grupo'> | null | undefined,
  turma?: string | null,
  situacao?: string | null
) {
  const tipo = getTipoSetorTurma(setor);
  const turmaNormalizada = normalizarTextoTurma(turma);
  const situacaoNormalizada = normalizarTextoTurma(situacao);
  const todasPermitidas = [...TURMAS_SOPRO_VALIDAS, ...TURMAS_DECORACAO_VALIDAS] as string[];

  if (!tipo) {
    const valida = !turmaNormalizada || todasPermitidas.includes(turmaNormalizada);
    return {
      valida,
      turma: turmaNormalizada || null,
      obrigatoria: false,
      permitidas: [] as string[],
      mensagem: valida ? null : `TURMA INVALIDA: USE ${todasPermitidas.join(', ')}`,
    };
  }

  const permitidas = getTurmasPermitidasPorSetor(setor);
  const turmaPreenchidaValida = !!turmaNormalizada && permitidas.includes(turmaNormalizada);
  const soproPodeSemTurma = tipo === 'SOPRO';
  const valida = turmaPreenchidaValida || (soproPodeSemTurma && !turmaNormalizada);
  const obrigatoria = tipo === 'DECORACAO' || (tipo === 'SOPRO' && situacaoNormalizada !== 'PREVISAO');

  return {
    valida,
    turma: turmaNormalizada || null,
    obrigatoria,
    permitidas,
    mensagem: valida ? null : `TURMA OBRIGATORIA PARA ${tipo}: ${permitidas.join(', ')}`,
  };
}
