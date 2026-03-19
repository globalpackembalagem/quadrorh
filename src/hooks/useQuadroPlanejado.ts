import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QuadroPlanejado } from '@/types/database';
import { toast } from 'sonner';
import { useUsuario } from '@/contexts/UserContext';

export function useQuadroPlanejado(grupo: string) {
  return useQuery({
    queryKey: ['quadro-planejado', grupo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quadro_planejado')
        .select('*')
        .eq('grupo', grupo)
        .order('turma');
      
      if (error) throw error;
      return data as QuadroPlanejado[];
    },
  });
}

export function useUpdateQuadroPlanejado() {
  const queryClient = useQueryClient();
  const { usuarioAtual } = useUsuario();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<QuadroPlanejado> & { id: string }) => {
      // Primeiro buscar os dados anteriores
      const { data: anterior, error: fetchError } = await supabase
        .from('quadro_planejado')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;

      // Atualizar o registro
      const { data: updated, error } = await supabase
        .from('quadro_planejado')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Registrar histórico para cada campo alterado
      const camposAlterados = Object.keys(data).filter(
        key => key !== 'id' && key !== 'updated_at' && key !== 'created_at' && 
        (anterior as Record<string, unknown>)[key] !== (data as Record<string, unknown>)[key]
      );

      for (const campo of camposAlterados) {
        const valorAnterior = anterior[campo as keyof typeof anterior];
        const valorNovo = data[campo as keyof typeof data];
        
        await supabase.from('historico_quadro').insert({
          tabela: 'quadro_planejado',
          registro_id: id,
          campo,
          valor_anterior: typeof valorAnterior === 'number' ? valorAnterior : 0,
          valor_novo: typeof valorNovo === 'number' ? valorNovo : 0,
          grupo: anterior.grupo,
          turma: anterior.turma,
          usuario_nome: usuarioAtual.nome,
        });
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quadro-planejado'] });
      queryClient.invalidateQueries({ queryKey: ['historico_quadro'] });
      toast.success('Quadro atualizado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar quadro');
    },
  });
}
