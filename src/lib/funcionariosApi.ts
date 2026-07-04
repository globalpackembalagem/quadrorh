import { supabase } from '@/integrations/supabase/client';

type FuncionariosFilters = {
  eq?: Record<string, unknown>;
  in?: Record<string, unknown[]>;
  ilike?: Record<string, string>;
  select?: string;
  single?: boolean;
};

type FuncionariosWriteResult<T = any> = {
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

async function writeFuncionarios<T = any>(
  operation: 'insert' | 'update' | 'upsert' | 'delete',
  payload?: unknown,
  filters?: FuncionariosFilters
): Promise<FuncionariosWriteResult<T>> {
  const sessionToken = getSessionToken();
  if (!sessionToken) return { data: null, error: new Error('Sessao expirada. Entre novamente.') };

  const { data, error } = await supabase.functions.invoke('auth-handler', {
    body: {
      action: 'funcionarios_write',
      session_token: sessionToken,
      operation,
      payload,
      filters,
    },
  });

  if (error) return { data: null, error };
  if (data?.error) return { data: null, error: new Error(data.error) };
  return { data: data?.data ?? null, error: null };
}

export const funcionariosApi = {
  insert: <T = any>(payload: unknown, filters?: FuncionariosFilters) =>
    writeFuncionarios<T>('insert', payload, filters),
  update: <T = any>(payload: unknown, filters: FuncionariosFilters) =>
    writeFuncionarios<T>('update', payload, filters),
  upsert: <T = any>(payload: unknown, filters?: FuncionariosFilters) =>
    writeFuncionarios<T>('upsert', payload, filters),
  delete: <T = any>(filters: FuncionariosFilters) =>
    writeFuncionarios<T>('delete', undefined, filters),
};
