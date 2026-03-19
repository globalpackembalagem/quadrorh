import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TipoDesligamento {
  id: string;
  nome: string;
  descricao: string | null;
  emoji: string;
  tem_exame_demissional: boolean;
  tem_homologacao: boolean;
  ativo: boolean;
  ordem: number;
  template_texto: string | null;
  created_at: string;
  updated_at: string;
}

export interface TipoDesligamentoInsert {
  nome: string;
  descricao?: string;
  emoji?: string;
  tem_exame_demissional?: boolean;
  tem_homologacao?: boolean;
  ativo?: boolean;
  ordem?: number;
  template_texto?: string;
}

export function useTiposDesligamento() {
  return useQuery({
    queryKey: ['tipos_desligamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipos_desligamento')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as TipoDesligamento[];
    },
  });
}

export function useTiposDesligamentoAtivos() {
  return useQuery({
    queryKey: ['tipos_desligamento', 'ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipos_desligamento')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as TipoDesligamento[];
    },
  });
}

export function useCreateTipoDesligamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TipoDesligamentoInsert) => {
      const { data, error } = await supabase
        .from('tipos_desligamento')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tipos_desligamento'] });
      toast.success('Tipo de desligamento criado!');
    },
    onError: () => toast.error('Erro ao criar tipo de desligamento.'),
  });
}

export function useUpdateTipoDesligamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TipoDesligamento> & { id: string }) => {
      const { error } = await supabase
        .from('tipos_desligamento')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tipos_desligamento'] });
      toast.success('Tipo de desligamento atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar tipo de desligamento.'),
  });
}

export function useDeleteTipoDesligamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tipos_desligamento')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tipos_desligamento'] });
      toast.success('Tipo de desligamento excluído!');
    },
    onError: () => toast.error('Erro ao excluir tipo de desligamento.'),
  });
}
