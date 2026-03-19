import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUsuario } from '@/contexts/UserContext';

/**
 * Mostra toast discreto para admin quando alguém acessa o sistema
 * e quando um gestor visualiza uma notificação modal.
 */
export function useLoginNotification() {
  const { usuarioAtual } = useUsuario();
  const isAdmin = usuarioAtual?.acesso_admin;
  const meuNome = usuarioAtual?.nome?.toUpperCase();
  const meuId = usuarioAtual?.id;

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-monitor')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'historico_acesso' },
        (payload) => {
          const nome = (payload.new as any)?.nome_usuario || 'Alguém';
          if (nome.toUpperCase() === meuNome) return;

          toast.info(`🟢 ${nome} entrou no sistema`, {
            duration: 4000,
            position: 'bottom-left',
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes_vistas' },
        (payload) => {
          const row = payload.new as any;
          // Não notificar sobre si mesmo
          if (row.user_role_id === meuId) return;

          const nomeGestor = row.nome_gestor || 'Alguém';
          toast.info(`👁️ ${nomeGestor} viu a notificação`, {
            duration: 5000,
            position: 'bottom-left',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, meuNome, meuId]);
}
