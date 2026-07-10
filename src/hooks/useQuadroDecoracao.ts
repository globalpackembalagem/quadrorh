import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QuadroDecoracao } from '@/types/database';
import { toast } from 'sonner';
import { useUsuario } from '@/contexts/UserContext';
import { criarNotificacaoAlteracaoQuadro } from '@/lib/quadroNotificacoes';

export function useQuadroDecoracao() {
  return useQuery({
    queryKey: ['quadro-decoracao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quadro_decoracao')
        .select('*')
        .order('turma');
      
      if (error) throw error;
      return data as QuadroDecoracao[];
    },
  });
}

export function useUpdateQuadroDecoracao() {
  const queryClient = useQueryClient();
  const { usuarioAtual } = useUsuario();
  
  return useMutation({
    mutationFn: async ({ id, data_inicio_notificacao, ...data }: Partial<QuadroDecoracao> & { id: string; data_inicio_notificacao?: string }) => {
      // Primeiro buscar os dados anteriores
      const { data: anterior, error: fetchError } = await supabase
        .from('quadro_decoracao')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      const { data: travaAtiva, error: travaError } = await (supabase as any)
        .from('quadro_travas')
        .select('id')
        .eq('area', 'DECORACAO')
        .eq('ativo', true)
        .maybeSingle();

      if (travaError) throw travaError;
      if (travaAtiva) {
        throw new Error('QUADRO DECORACAO TRAVADO');
      }

      // Atualizar o registro
      const { data: updated, error } = await supabase
        .from('quadro_decoracao')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Registrar histórico para cada campo alterado
      const camposAlterados = Object.keys(data).filter(
        key => key !== 'id' && key !== 'updated_at' && key !== 'created_at' && 
        anterior[key as keyof typeof anterior] !== data[key as keyof typeof data]
      );

      for (const campo of camposAlterados) {
        const valorAnterior = anterior[campo as keyof typeof anterior];
        const valorNovo = data[campo as keyof typeof data];
        
        await supabase.from('historico_quadro').insert({
          tabela: 'quadro_decoracao',
          registro_id: id,
          campo,
          valor_anterior: typeof valorAnterior === 'number' ? valorAnterior : 0,
          valor_novo: typeof valorNovo === 'number' ? valorNovo : 0,
          grupo: null,
          turma: anterior.turma,
          usuario_nome: usuarioAtual.nome,
        });

        try {
          await criarNotificacaoAlteracaoQuadro({
            tabela: 'quadro_decoracao',
            registroId: id,
            campo,
            valorAnterior: typeof valorAnterior === 'number' ? valorAnterior : 0,
            valorNovo: typeof valorNovo === 'number' ? valorNovo : 0,
	            grupo: 'DECORACAO',
	            turma: anterior.turma,
	            usuarioNome: usuarioAtual.nome,
	            dataInicio: data_inicio_notificacao,
	          });
        } catch (notificationError) {
          console.error('[QUADRO] Erro ao criar notificacao de alteracao:', notificationError);
        }
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quadro-decoracao'] });
      queryClient.invalidateQueries({ queryKey: ['historico_quadro'] });
      queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
      queryClient.invalidateQueries({ queryKey: ['historico-notificacoes-enviadas'] });
      toast.success('Quadro atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar quadro');
    },
  });
}
