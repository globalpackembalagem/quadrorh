import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Funcionario } from '@/types/database';

export function useFuncionariosPrevisao() {
  return useQuery({
    queryKey: ['funcionarios', 'previsao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funcionarios')
        .select(`
          *,
          setor:setores!setor_id(*),
          situacao:situacoes!inner(*)
        `)
        .ilike('situacao.nome', '%PREVIS%')
        .order('nome_completo');

      if (error) throw error;
      return (data || []) as Funcionario[];
    },
  });
}
