import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CriarDivergenciaInput {
  funcionario_id: string;
  tipo_divergencia: string;
  observacoes?: string;
}

export function useCriarDivergenciaAuto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ funcionario_id, tipo_divergencia, observacoes }: CriarDivergenciaInput) => {
      // Verificar se já existe divergência não resolvida para este funcionário com mesmo tipo
      const { data: existente } = await supabase
        .from('divergencias_quadro')
        .select('id')
        .eq('funcionario_id', funcionario_id)
        .eq('tipo_divergencia', tipo_divergencia)
        .eq('resolvido', false)
        .maybeSingle();
      
      // Se já existe uma divergência pendente, não cria outra
      if (existente) {
        return existente;
      }
      
      const { data, error } = await supabase
        .from('divergencias_quadro')
        .insert({
          funcionario_id,
          tipo_divergencia,
          observacoes: observacoes || null,
          criado_por: 'SISTEMA',
          resolvido: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divergencias'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar divergência automática:', error);
    },
  });
}

// Função auxiliar para determinar se deve criar divergência baseado na situação
export function devecriarDivergencia(situacaoNome: string): { criar: boolean; tipo: string } {
  const nome = situacaoNome?.toUpperCase() || '';
  
  if (nome.includes('SUMIDO')) {
    return { criar: true, tipo: 'FUNCIONÁRIO SUMIDO - AGUARDANDO ANÁLISE RH' };
  }
  
  if (nome.includes('TREINAMENTO')) {
    return { criar: true, tipo: 'FUNCIONÁRIO EM TREINAMENTO - VERIFICAR ALOCAÇÃO' };
  }
  
  if (nome.includes('COB') && nome.includes('FÉRIAS') || nome === 'COBERTURA FÉRIAS') {
    return { criar: true, tipo: 'COBERTURA DE FÉRIAS - VERIFICAR VÍNCULO' };
  }
  
  return { criar: false, tipo: '' };
}
