import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUsuario } from '@/contexts/UserContext';

export interface HistoricoQuadro {
  id: string;
  tabela: string;
  registro_id: string;
  campo: string;
  valor_anterior: number;
  valor_novo: number;
  grupo: string | null;
  turma: string;
  usuario_nome: string;
  created_at: string;
}

export function useHistoricoQuadro(tabela?: string) {
  return useQuery({
    queryKey: ['historico_quadro', tabela],
    queryFn: async () => {
      let query = supabase
        .from('historico_quadro')
        .select('*')
        .order('created_at', { ascending: false })
        .gte('created_at', '2026-03-09T00:00:00')
        .limit(1000);
      
      if (tabela) {
        query = query.eq('tabela', tabela);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as HistoricoQuadro[];
    },
  });
}

export function useRegistrarHistoricoQuadro() {
  const queryClient = useQueryClient();
  const { usuarioAtual } = useUsuario();

  return useMutation({
    mutationFn: async (registro: Omit<HistoricoQuadro, 'id' | 'created_at' | 'usuario_nome'>) => {
      const { data, error } = await supabase
        .from('historico_quadro')
        .insert({
          ...registro,
          usuario_nome: usuarioAtual.nome,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico_quadro'] });
    },
  });
}

// Mapeamento de campos para labels mais legíveis
export const CAMPOS_LABELS: Record<string, string> = {
  aux_maquina_industria: 'Auxiliares em Máquina (Indústria)',
  reserva_ferias_industria: 'Reserva Férias (Indústria)',
  reserva_faltas_industria: 'Reserva Faltas (Indústria)',
  amarra_pallets: 'Amarra Pallets',
  revisao_frasco: 'Revisão Frasco',
  mod_sindicalista: 'MOD Sindicalista',
  controle_praga: 'Controle Praga',
  aux_maquina_gp: 'Auxiliares em Máquina (G+P)',
  reserva_faltas_gp: 'Reserva Faltas (G+P)',
  reserva_ferias_gp: 'Reserva Férias (G+P)',
  aumento_quadro: 'Aumento de Quadro',
  // Decoração
  aux_maquina: 'Auxiliares em Máquina',
  reserva_refeicao: 'Reserva Refeição',
  reserva_faltas: 'Reserva Faltas',
  reserva_ferias: 'Reserva Férias',
  apoio_topografia: 'Apoio Topografia',
  reserva_afastadas: 'Reserva Afastadas',
  reserva_covid: 'Reserva COVID',
};
