// Lógica da Escala Panama 2-2-3 para Decoração
// Ciclo de 14 dias a partir da referência 05/01/2026 (segunda-feira = dia 0)

const CICLO_T1 = [true, true, false, false, true, true, true, false, false, true, true, false, false, false];
const CICLO_T2 = CICLO_T1.map(v => !v);

// Referência: Segunda-feira 05/01/2026 = dia 0 do ciclo
const REFERENCIA = new Date(2026, 0, 5);

/**
 * Verifica se a turma (T1 ou T2) está trabalhando na data fornecida.
 * Retorna true = TRABALHA, false = FOLGA
 */
export function getTrabalhaOuFolga(date: Date, turma: 'T1' | 'T2'): boolean {
  const diffMs = date.getTime() - REFERENCIA.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const ciclo = turma === 'T1' ? CICLO_T1 : CICLO_T2;
  const idx = ((diffDias % 14) + 14) % 14;
  return ciclo[idx];
}

/**
 * Verifica se um funcionário da Decoração está de folga pela escala Panama em uma data.
 * Retorna null se o funcionário não é da Decoração ou não tem turma T1/T2.
 * Retorna true se está de FOLGA, false se está TRABALHANDO.
 */
export function isFolgaEscalaDecoracao(
  setorNome: string | null | undefined,
  turma: string | null | undefined,
  data: Date
): boolean | null {
  if (!setorNome) return null;

  const setorUpper = setorNome.toUpperCase();
  const isDecoracao =
    setorUpper.includes('DECORAÇÃO') || setorUpper.includes('DECORACAO');

  if (!isDecoracao) return null;

  const turmaUpper = (turma || '').toUpperCase().trim();
  let turmaNormalizada: 'T1' | 'T2' | null = null;

  if (turmaUpper === 'T1' || turmaUpper === '1') turmaNormalizada = 'T1';
  else if (turmaUpper === 'T2' || turmaUpper === '2') turmaNormalizada = 'T2';

  if (!turmaNormalizada) return null;

  // Está de FOLGA se NÃO trabalha nesse dia
  return !getTrabalhaOuFolga(data, turmaNormalizada);
}
