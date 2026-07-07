export function normalizarNomeUsuario(valor?: string | null) {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

export function getTempoInatividadeMinutos(nome?: string | null) {
  return normalizarNomeUsuario(nome) === 'LUCIANO' ? 10 : 5;
}
