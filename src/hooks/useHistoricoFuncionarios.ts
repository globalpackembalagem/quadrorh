import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUsuario } from '@/contexts/UserContext';
import type { Json } from '@/integrations/supabase/types';

export interface RegistroHistorico {
  tabela: string;
  operacao: string;
  registro_id: string;
  dados_anteriores?: Record<string, Json> | null;
  dados_novos?: Record<string, Json> | null;
}

export function useRegistrarHistoricoFuncionario() {
  const queryClient = useQueryClient();
  const { usuarioAtual } = useUsuario();

  return useMutation({
    mutationFn: async (registro: RegistroHistorico) => {
      const { data, error } = await supabase
        .from('historico_auditoria')
        .insert({
          tabela: registro.tabela,
          operacao: registro.operacao,
          registro_id: registro.registro_id,
          dados_anteriores: registro.dados_anteriores ?? null,
          dados_novos: registro.dados_novos ?? null,
          usuario_nome: usuarioAtual.nome,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historico_auditoria'] });
    },
  });
}

// Função auxiliar para formatar dados do funcionário para o histórico
export function formatarDadosFuncionario(
  funcionario: Record<string, unknown>, 
  setores: Array<{ id: string; nome: string }>, 
  situacoes: Array<{ id: string; nome: string }>
): Record<string, Json> {
  const setor = setores.find(s => s.id === funcionario.setor_id);
  const situacao = situacoes.find(s => s.id === funcionario.situacao_id);
  
  return {
    nome: (funcionario.nome_completo as string) || null,
    empresa: (funcionario.empresa as string) || null,
    matricula: (funcionario.matricula as string) || null,
    setor: setor?.nome || (funcionario.setor_id as string) || null,
    turma: (funcionario.turma as string) || null,
    situacao: situacao?.nome || (funcionario.situacao_id as string) || null,
    cargo: (funcionario.cargo as string) || null,
    sexo: (funcionario.sexo as string) || null,
    data_admissao: (funcionario.data_admissao as string) || null,
    data_demissao: (funcionario.data_demissao as string) || null,
    observacoes: (funcionario.observacoes as string) || null,
    transferencia_programada: (funcionario.transferencia_programada as boolean) || false,
    transferencia_data: (funcionario.transferencia_data as string) || null,
  };
}
