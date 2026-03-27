import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Funcionario } from '@/types/database';
import { useFiltroSetor } from '@/hooks/useFiltroSetor';

export function useFuncionariosPrevisao(options?: { ignorarFiltroSetor?: boolean }) {
  const { aplicarFiltroSetor, setoresIds } = useFiltroSetor();
  const deveFiltrar = aplicarFiltroSetor && !options?.ignorarFiltroSetor;

  return useQuery({
    queryKey: ['funcionarios', 'previsao', deveFiltrar ? setoresIds : 'all'],
    queryFn: async () => {
      if (deveFiltrar && setoresIds.length === 0) return [];
      let query = supabase
        .from('funcionarios')
        .select(`
          *,
          setor:setores!setor_id(*),
          situacao:situacoes!inner(*)
        `)
        .ilike('situacao.nome', '%PREVIS%')
        .order('nome_completo');

      if (deveFiltrar) {
        query = query.in('setor_id', setoresIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Funcionario[];
    },
  });
}
