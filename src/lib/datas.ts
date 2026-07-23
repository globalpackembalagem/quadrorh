import { format, isValid, parseISO } from 'date-fns';

export function parseDataSegura(valor?: string | null) {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  const data = texto.includes('T') ? new Date(texto) : parseISO(texto);
  return isValid(data) ? data : null;
}

export function formatarDataSegura(valor?: string | null, formato = 'dd/MM/yyyy', fallback = '-') {
  const data = parseDataSegura(valor);
  return data ? format(data, formato) : fallback;
}

export function formatarDataHoraSegura(valor?: string | null, fallback = '-') {
  const data = parseDataSegura(valor);
  return data
    ? data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : fallback;
}
