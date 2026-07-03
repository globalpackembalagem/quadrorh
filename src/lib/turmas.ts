import { Setor } from '@/types/database';

export const TURMAS_SOPRO_VALIDAS = ['1A', '1B', '2A', '2B'] as const;
export const TURMAS_DECORACAO_VALIDAS = ['T1', 'T2'] as const;

export function normalizarTextoTurma(valor?: string | null) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function getTipoSetorTurma(setor?: Pick<Setor, 'nome' | 'grupo'> | null): 'SOPRO' | 'DECORACAO' | null {
  const texto = normalizarTextoTurma(`${setor?.nome || ''} ${setor?.grupo || ''}`);
  if (texto.includes('DECORACAO')) return 'DECORACAO';
  if (texto.includes('SOPRO')) return 'SOPRO';
  return null;
}

export function getTurmasPermitidasPorSetor(setor?: Pick<Setor, 'nome' | 'grupo'> | null): string[] {
  const tipo = getTipoSetorTurma(setor);
  if (tipo === 'SOPRO') return [...TURMAS_SOPRO_VALIDAS];
  if (tipo === 'DECORACAO') return [...TURMAS_DECORACAO_VALIDAS];
  return [];
}

export function validarTurmaPorSetor(setor: Pick<Setor, 'nome' | 'grupo'> | null | undefined, turma?: string | null) {
  const tipo = getTipoSetorTurma(setor);
  const turmaNormalizada = normalizarTextoTurma(turma);

  if (!tipo) return { valida: true, turma: turmaNormalizada || null, obrigatoria: false, permitidas: [] as string[] };

  const permitidas = getTurmasPermitidasPorSetor(setor);
  const valida = !!turmaNormalizada && permitidas.includes(turmaNormalizada);

  return {
    valida,
    turma: turmaNormalizada || null,
    obrigatoria: true,
    permitidas,
    mensagem: valida ? null : `TURMA OBRIGATORIA PARA ${tipo}: ${permitidas.join(', ')}`,
  };
}
