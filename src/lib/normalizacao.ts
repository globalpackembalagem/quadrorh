export function removerAcentos(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizarTextoSistema(valor?: string | null): string | null {
  if (valor === null || valor === undefined) return null;
  const normalizado = removerAcentos(String(valor)).trim().toUpperCase();
  return normalizado || null;
}

export function normalizarFuncionarioPayload<T extends Record<string, any>>(payload: T): T {
  const camposTexto = ['nome_completo', 'matricula', 'cargo', 'turma', 'observacoes'];
  const normalizado = { ...payload };

  camposTexto.forEach((campo) => {
    if (campo in normalizado) {
      normalizado[campo as keyof T] = normalizarTextoSistema(normalizado[campo]) as T[keyof T];
    }
  });

  return normalizado;
}
