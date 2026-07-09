import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AreaQuadroTrava } from '@/hooks/useFuncionarios';

function getSessionToken() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario_logado') || 'null');
    return usuario?.session_token || null;
  } catch {
    return null;
  }
}

export function useTravarQuadro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (area: AreaQuadroTrava) => {
      const sessionToken = getSessionToken();
      if (!sessionToken) throw new Error('Sessao expirada. Entre novamente.');

      const { data, error } = await supabase.functions.invoke('auth-handler', {
        body: {
          action: 'quadro_trava_gerenciar',
          session_token: sessionToken,
          area,
          acao: 'travar',
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.data;
    },
    onSuccess: (_, area) => {
      queryClient.invalidateQueries({ queryKey: ['quadro_travas'] });
      toast.success(`QUADRO ${area} TRAVADO COM SUCESSO`);
    },
    onError: () => {
      toast.error('ERRO AO TRAVAR QUADRO');
    },
  });
}
