import { supabase } from '@/integrations/supabase/client';

type PontoTabela = 'periodos_ponto' | 'registros_ponto';
type PontoOperation = 'insert' | 'update' | 'delete';

type PontoFilters = {
  eq?: Record<string, unknown>;
  in?: Record<string, unknown[]>;
  select?: string;
  single?: boolean;
};

type PontoWriteResult<T = any> = {
  data: T | null;
  error: Error | null;
};

function getSessionToken() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario_logado') || 'null');
    return usuario?.session_token || null;
  } catch {
    return null;
  }
}

async function writePonto<T = any>(
  tabela: PontoTabela,
  operation: PontoOperation,
  payload?: unknown,
  filters?: PontoFilters
): Promise<PontoWriteResult<T>> {
  const sessionToken = getSessionToken();
  if (!sessionToken) return { data: null, error: new Error('Sessao expirada. Entre novamente.') };

  const { data, error } = await supabase.functions.invoke('auth-handler', {
    body: {
      action: 'ponto_write',
      session_token: sessionToken,
      tabela,
      operation,
      payload,
      filters,
    },
  });

  if (error) return { data: null, error };
  if (data?.error) return { data: null, error: new Error(data.error) };
  return { data: data?.data ?? null, error: null };
}

export const pontoApi = {
  insert: <T = any>(tabela: PontoTabela, payload: unknown, filters?: PontoFilters) =>
    writePonto<T>(tabela, 'insert', payload, filters),
  update: <T = any>(tabela: PontoTabela, payload: unknown, filters: PontoFilters) =>
    writePonto<T>(tabela, 'update', payload, filters),
  delete: <T = any>(tabela: PontoTabela, filters: PontoFilters) =>
    writePonto<T>(tabela, 'delete', undefined, filters),
};
