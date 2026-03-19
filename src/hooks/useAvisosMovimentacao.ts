import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface AvisoMovimentacao {
  id: string;
  tipo: string;
  quantidade: number;
  setor_nome: string | null;
  mensagem: string;
  created_at: string;
  criado_por: string | null;
}

// Busca avisos não lidos para o user_role_id atual
export function useAvisosNaoLidos(userRoleId: string | undefined) {
  const queryClient = useQueryClient();

  // Realtime
  useEffect(() => {
    if (!userRoleId) return;
    const channel = supabase
      .channel('avisos-movimentacao-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'avisos_movimentacao' }, () => {
        queryClient.invalidateQueries({ queryKey: ['avisos-movimentacao', userRoleId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userRoleId, queryClient]);

  return useQuery({
    queryKey: ['avisos-movimentacao', userRoleId],
    queryFn: async () => {
      if (!userRoleId) return [];

      // Buscar IDs já lidos por este user
      const { data: lidos } = await supabase
        .from('avisos_movimentacao_lidos')
        .select('aviso_id')
        .eq('user_role_id', userRoleId);

      const lidosIds = (lidos || []).map(l => l.aviso_id);

      // Buscar todos os avisos dos últimos 30 dias
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      const { data: avisos, error } = await supabase
        .from('avisos_movimentacao')
        .select('*')
        .gte('created_at', trintaDiasAtras.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filtrar os não lidos
      return (avisos as AvisoMovimentacao[]).filter(a => !lidosIds.includes(a.id));
    },
    enabled: !!userRoleId,
  });
}

// Marcar aviso como lido
export function useMarcarAvisoLido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ avisoId, userRoleId }: { avisoId: string; userRoleId: string }) => {
      const { error } = await supabase
        .from('avisos_movimentacao_lidos')
        .insert({ aviso_id: avisoId, user_role_id: userRoleId });
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos-movimentacao'] });
    },
  });
}

// Marcar múltiplos avisos como lidos
export function useMarcarTodosAvisosLidos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ avisoIds, userRoleId }: { avisoIds: string[]; userRoleId: string }) => {
      const inserts = avisoIds.map(aviso_id => ({ aviso_id, user_role_id: userRoleId }));
      const { error } = await supabase
        .from('avisos_movimentacao_lidos')
        .upsert(inserts, { onConflict: 'aviso_id,user_role_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avisos-movimentacao'] });
    },
  });
}

// Criar aviso de movimentação
export async function criarAvisoMovimentacao(
  tipo: 'admissao' | 'demissao' | 'pedido_demissao',
  quantidade: number,
  setorNome: string | null,
  criadoPor: string
) {
  const tipoLabel = {
    admissao: 'admitido(s)',
    demissao: 'demitido(s)',
    pedido_demissao: 'pedido(s) de demissão',
  };

  const mensagem = setorNome
    ? `${quantidade} ${tipoLabel[tipo]} - ${setorNome}`
    : `${quantidade} ${tipoLabel[tipo]}`;

  await supabase.from('avisos_movimentacao').insert({
    tipo,
    quantidade,
    setor_nome: setorNome,
    mensagem,
    criado_por: criadoPor,
  });
}
