export function removerAcentos(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizarTextoSistema(valor?: string | null): string | null {
  if (valor === null || valor === undefined) return null;
  const normalizado = removerAcentos(String(valor)).trim().toUpperCase();
  return normalizado || null;
}

export function normalizarFuncionarioPayload<T extends Record<string, any>>(payload: T): T {
  const camposTexto = [
    'nome_completo',
    'matricula',
    'cargo',
    'turma',
    'observacoes',
    'empresa',
    'centro_custo',
    'cpf',
    'tamanho_uniforme',
    'tamanho_calca',
    'tamanho_camiseta',
    'tamanho_calcado',
  ];
  const normalizado = { ...payload };

  camposTexto.forEach((campo) => {
    if (campo in normalizado) {
      normalizado[campo as keyof T] = normalizarTextoSistema(normalizado[campo]) as T[keyof T];
    }
  });

  return normalizado;
}

const CAMPOS_PRESERVADOS = /(email|senha|password|cpf|token|secret|chave|key|url|link)/i;

export function instalarNormalizacaoGlobalCampos(): () => void {
  let normalizando = false;

  const normalizarCampo = (event: Event) => {
    if (normalizando) return;

    const campo = event.target;
    const entradaTexto = campo instanceof HTMLInputElement
      && ['text', 'search', 'tel'].includes(campo.type);
    const areaTexto = campo instanceof HTMLTextAreaElement;

    if (!entradaTexto && !areaTexto) return;
    if (campo.dataset.noNormalize === 'true') return;

    const identificador = `${campo.name || ''} ${campo.id || ''} ${campo.autocomplete || ''}`;
    if (CAMPOS_PRESERVADOS.test(identificador)) return;

    const normalizado = removerAcentos(campo.value).toUpperCase();
    if (normalizado === campo.value) return;

    const inicio = campo.selectionStart;
    const fim = campo.selectionEnd;

    const prototipo = entradaTexto ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const setterNativo = Object.getOwnPropertyDescriptor(prototipo, 'value')?.set;
    if (!setterNativo) return;

    setterNativo.call(campo, normalizado);
    if (inicio !== null && fim !== null) campo.setSelectionRange(inicio, fim);

    normalizando = true;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    normalizando = false;
  };

  document.addEventListener('input', normalizarCampo);
  return () => document.removeEventListener('input', normalizarCampo);
}
