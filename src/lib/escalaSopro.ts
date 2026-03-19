/**
 * Escala de trabalho do SOPRO aos finais de semana.
 * Seg-Sex: todos trabalham normalmente.
 * Sáb/Dom: segue ciclo de 4 semanas com turmas 1A, 1B, 2A, 2B.
 *
 * Referência: Sábado 07/02/2026 = índice 0
 *   Sábado ciclo: ['2A', '1B', '2B', '1A']
 *   Domingo ciclo: ['2B', '1A', '2A', '1B']
 */

const SAT_CYCLE: string[] = ['2A', '1B', '2B', '1A'];
const SUN_CYCLE: string[] = ['2B', '1A', '2A', '1B'];

// Reference Saturday: 2026-02-07
const REF_SAT = new Date(2026, 1, 7); // month is 0-indexed

function weeksBetween(d1: Date, d2: Date): number {
  const ms = d2.getTime() - d1.getTime();
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

/**
 * Retorna a turma que trabalha em um determinado dia de fim de semana.
 * Retorna null se for dia de semana (seg-sex).
 */
export function getTurmaSoproFimDeSemana(date: Date): string | null {
  const dayOfWeek = date.getDay(); // 0=Dom, 6=Sab

  if (dayOfWeek === 6) {
    // Sábado
    const weeks = weeksBetween(REF_SAT, date);
    const idx = ((weeks % 4) + 4) % 4;
    return SAT_CYCLE[idx];
  }

  if (dayOfWeek === 0) {
    // Domingo - referência é o domingo seguinte ao sábado ref: 08/02/2026
    const refSun = new Date(2026, 1, 8);
    const weeks = weeksBetween(refSun, date);
    const idx = ((weeks % 4) + 4) % 4;
    return SUN_CYCLE[idx];
  }

  return null; // dia de semana
}

export const TURMAS_ESCALA_SOPRO = ['1A', '1B', '2A', '2B'] as const;

/**
 * Verifica se um funcionário do SOPRO está de folga pela escala de fim de semana.
 * Retorna null se não é do SOPRO ou não tem turma 1A/1B/2A/2B.
 * Retorna true se está de FOLGA, false se está TRABALHANDO.
 * Seg-Sex: todos trabalham (retorna false).
 * Sáb/Dom: só a turma escalada trabalha, as demais folgam.
 */
export function isFolgaEscalaSopro(
  setorNome: string | null | undefined,
  turma: string | null | undefined,
  data: Date
): boolean | null {
  if (!setorNome) return null;

  const setorUpper = setorNome.toUpperCase();
  if (!setorUpper.includes('SOPRO')) return null;

  const turmaUpper = (turma || '').toUpperCase().trim();
  if (!['1A', '1B', '2A', '2B'].includes(turmaUpper)) return null;

  const dayOfWeek = data.getDay();

  // Seg-Sex: todos trabalham
  if (dayOfWeek >= 1 && dayOfWeek <= 5) return false;

  // Fim de semana: verificar qual turma trabalha
  const turmaEscalada = getTurmaSoproFimDeSemana(data);
  if (!turmaEscalada) return null;

  // Se a turma do funcionário é a escalada, trabalha (não é folga)
  return turmaUpper !== turmaEscalada;
}
