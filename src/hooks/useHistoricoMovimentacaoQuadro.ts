import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUsuario } from '@/contexts/UserContext';

export const TIPOS_MOVIMENTACAO_QUADRO = [
  'Admissao',
  'Demissao',
  'Transferencia / Troca de turno',
  'Auxilio-doenca',
  'Treinamento',
  'Ferias',
  'Retorno',
  'Correcao',
  'Outros',
] as const;

export type TipoMovimentacaoQuadro = typeof TIPOS_MOVIMENTACAO_QUADRO[number];

export interface HistoricoMovimentacaoQuadro {
  id: string;
  funcionario_id: string | null;
  funcionario_nome: string;
  matricula: string | null;
  tipo_movimentacao: TipoMovimentacaoQuadro | string;
  setor_origem_id: string | null;
  setor_origem_nome: string | null;
  setor_destino_id: string | null;
  setor_destino_nome: string | null;
  turma_origem: string | null;
  turma_destino: string | null;
  data_movimentacao: string;
  impacto: number;
  quantidade_antes: number | null;
  quantidade_depois: number | null;
  usuario_nome: string;
  observacao: string | null;
  referencia_tabela: string | null;
  referencia_id: string | null;
  created_at: string;
}

interface HistoricoFiltros {
  setorId?: string;
  dataInicio?: string;
  dataFim?: string;
  tipo?: string;
}

export function useHistoricoMovimentacaoQuadro(filtros: HistoricoFiltros = {}) {
  return useQuery({
    queryKey: ['historico_movimentacao_quadro', filtros],
    queryFn: async () => {
      let query = (supabase as any)
        .from('historico_movimentacao_quadro')
        .select('*')
        .order('data_movimentacao', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(2000);

      if (filtros.setorId && filtros.setorId !== 'todos') {
        query = query.or(`setor_origem_id.eq.${filtros.setorId},setor_destino_id.eq.${filtros.setorId}`);
      }

      if (filtros.dataInicio) {
        query = query.gte('data_movimentacao', filtros.dataInicio);
      }

      if (filtros.dataFim) {
        query = query.lte('data_movimentacao', filtros.dataFim);
      }

      if (filtros.tipo && filtros.tipo !== 'todos') {
        query = query.eq('tipo_movimentacao', filtros.tipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as HistoricoMovimentacaoQuadro[];
    },
  });
}

export function useRegistrarHistoricoMovimentacaoQuadro() {
  const queryClient = useQueryClient();
  const { usuarioAtual } = useUsuario();

  return useMutation({
    mutationFn: async (
      registro: Omit<HistoricoMovimentacaoQuadro, 'id' | 'created_at' | 'usuario_nome'>
    ) => {
      const { data, error } = await (supabase as any)
        .from('historico_movimentacao_quadro')
        .insert({
          ...registro,
          usuario_nome: usuarioAtual.nome || 'Sistema',
        })
        .select()
        .single();

      if (error) throw error;
      return data as HistoricoMovimentacaoQuadro;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico_movimentacao_quadro'] });
    },
  });
}
