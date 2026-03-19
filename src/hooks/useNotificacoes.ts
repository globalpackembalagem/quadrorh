import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface Notificacao {
  id: string;
  user_role_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  referencia_id: string | null;
  lida: boolean;
  created_at: string;
}

export function useNotificacoes(userRoleId: string | undefined) {
  const queryClient = useQueryClient();

  // Subscribe to realtime
  useEffect(() => {
    if (!userRoleId) return;

    const channel = supabase
      .channel('notificacoes-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notificacoes', userRoleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRoleId, queryClient]);

  return useQuery({
    queryKey: ['notificacoes', userRoleId],
    queryFn: async () => {
      if (!userRoleId) return [];
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_role_id', userRoleId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notificacao[];
    },
    enabled: !!userRoleId,
  });
}

export function useNotificacoesNaoLidas(userRoleId: string | undefined) {
  return useQuery({
    queryKey: ['notificacoes', userRoleId, 'nao-lidas'],
    queryFn: async () => {
      if (!userRoleId) return 0;
      const { count, error } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('user_role_id', userRoleId)
        .eq('lida', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userRoleId,
  });
}

export function useMarcarNotificacaoLida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

export function useMarcarTodasLidas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userRoleId: string) => {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('user_role_id', userRoleId)
        .eq('lida', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    },
  });
}

export async function criarNotificacoesParaGestores(
  setorOrigemId: string,
  setorDestinoId: string,
  titulo: string,
  mensagem: string,
  referenciaId: string
) {
  // Buscar gestores dos setores envolvidos
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('id, setor_id')
    .eq('ativo', true)
    .in('perfil', ['gestor_setor']);

  const { data: userRolesSetores } = await supabase
    .from('user_roles_setores')
    .select('user_role_id, setor_id');

  if (!userRoles) return;

  const gestoresIds = new Set<string>();

  userRoles.forEach(ur => {
    // Verificar setor principal
    if (ur.setor_id === setorOrigemId || ur.setor_id === setorDestinoId) {
      gestoresIds.add(ur.id);
    }
    // Verificar setores adicionais
    const setoresAdicionais = userRolesSetores?.filter(urs => urs.user_role_id === ur.id) || [];
    setoresAdicionais.forEach(sa => {
      if (sa.setor_id === setorOrigemId || sa.setor_id === setorDestinoId) {
        gestoresIds.add(ur.id);
      }
    });
  });

  if (gestoresIds.size === 0) return;

  const notificacoes = Array.from(gestoresIds).map(userRoleId => ({
    user_role_id: userRoleId,
    tipo: 'transferencia_pendente',
    titulo,
    mensagem,
    referencia_id: referenciaId,
  }));

  await supabase.from('notificacoes').insert(notificacoes);
}
