import { useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUsuario } from '@/contexts/UserContext';
import { toast } from 'sonner';

const FORCE_LOGOUT_KEY = 'force_logout_checked_at';

export function useForceLogout() {
  const { sairModoRH, isRHMode } = useUsuario();

  // Verifica a cada 15 segundos se há um force-logout mais recente que o login
  useQuery({
    queryKey: ['force-logout-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('force_logout')
        .select('triggered_at')
        .order('triggered_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const lastForceLogout = new Date(data[0].triggered_at).getTime();
      const sessionExpiry = Number(localStorage.getItem('usuario_sessao_expira') || '0');
      const loginTimestamp = Number(localStorage.getItem('login_timestamp') || '0');
      // Usar login_timestamp se disponível, senão calcular a partir da expiração
      const loginTime = loginTimestamp > 0 ? loginTimestamp : (sessionExpiry - (12 * 60 * 60 * 1000));

      // Se o force-logout é mais recente que o login do usuário
      if (lastForceLogout > loginTime) {
        const lastChecked = Number(localStorage.getItem(FORCE_LOGOUT_KEY) || '0');
        if (lastForceLogout > lastChecked) {
          console.log('[ForceLogout] Logout forçado detectado');
          localStorage.setItem(FORCE_LOGOUT_KEY, String(Date.now()));
          sairModoRH();
          toast.info('Sessão encerrada pelo administrador.', {
            description: 'Faça login novamente para continuar.',
          });
          window.location.href = '/';
        }
      }

      return data[0];
    },
    enabled: isRHMode,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const forceLogoutAll = useCallback(async (adminName: string) => {
    const { error } = await supabase.from('force_logout').insert({
      triggered_by: adminName,
    });
    if (error) throw error;
    toast.success('Comando de logout enviado! Todos os usuários serão desconectados em até 15 segundos.');
  }, []);

  return { forceLogoutAll };
}
