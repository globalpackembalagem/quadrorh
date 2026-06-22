import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type AreaQuadroTrava = 'SOPRO' | 'DECORACAO';

export function useTravarQuadro() {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();

  return useMutation({
    mutationFn: async (area: AreaQuadroTrava) => {
      const usuarioNome = userRole?.nome || 'SISTEMA';

      const { error: updateError } = await (supabase as any)
        .from('quadro_travas')
        .update({ ativo: false })
        .eq('area', area)
        .eq('ativo', true);

      if (updateError) throw updateError;

      const { error: insertError } = await (supabase as any)
        .from('quadro_travas')
        .insert({
          area,
          usuario_nome: usuarioNome,
          observacao: `TRAVA ${area}`,
          ativo: true,
        });

      if (insertError) throw insertError;
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
