import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { inserirEventoSemDuplicata } from '@/hooks/useEventosSistema';
import { toast } from 'sonner';

export interface Divergencia {
  id: string;
  funcionario_id: string;
  tipo_divergencia: string;
  criado_por: string;
  observacoes: string | null;
  resolvido: boolean;
  resolvido_por: string | null;
  resolvido_em: string | null;
  status: string;
  descricao_acao: string | null;
  feedback_rh: string | null;
  created_at: string;
  updated_at: string;
  funcionario?: {
    id: string;
    nome_completo: string;
    matricula: string | null;
    turma: string | null;
    setor: {
      nome: string;
      grupo: string | null;
    } | null;
  };
}

const DIVERGENCIA_SELECT = `
  *,
  funcionario:funcionarios(
    id,
    nome_completo,
    matricula,
    turma,
    setor:setores!setor_id(nome, grupo)
  )
`;

export function useDivergencias() {
  return useQuery({
    queryKey: ['divergencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divergencias_quadro')
        .select(DIVERGENCIA_SELECT)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Divergencia[];
    },
  });
}

export function useDivergenciasPendentes() {
  return useQuery({
    queryKey: ['divergencias', 'pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divergencias_quadro')
        .select(DIVERGENCIA_SELECT)
        .eq('resolvido', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Divergencia[];
    },
  });
}

export function useCreateDivergencia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (divergencia: {
      funcionario_id: string;
      tipo_divergencia: string;
      criado_por: string;
      observacoes?: string;
    }) => {
      const { data, error } = await supabase
        .from('divergencias_quadro')
        .insert(divergencia)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['divergencias'] });
      toast.success('Divergência registrada com sucesso!');
      
      // Buscar nome do funcionário para o evento
      let funcNome = 'N/A';
      try {
        const { data: func } = await supabase
          .from('funcionarios')
          .select('nome_completo, setor_id, turma, setores:setor_id(nome)')
          .eq('id', data.funcionario_id)
          .single();
        if (func) funcNome = func.nome_completo;

        const eventoInserido = await inserirEventoSemDuplicata({
          tipo: 'divergencia_nova',
          descricao: `NOVA DIVERGÊNCIA — ${funcNome.toUpperCase()}`,
          funcionario_nome: funcNome,
          funcionario_id: data.funcionario_id,
          setor_id: func?.setor_id || null,
          setor_nome: (func as any)?.setores?.nome || null,
          turma: func?.turma || null,
          criado_por: data.criado_por || 'GESTOR',
          dados_extra: {
            tipo_divergencia: data.tipo_divergencia,
            observacoes: data.observacoes,
            mensagem_personalizada: `Gestor: ${data.criado_por?.toUpperCase() || 'N/A'} | Tipo: ${data.tipo_divergencia} | ${data.observacoes || 'Sem observações'}`,
          },
        });
        queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });

        const eventoId = eventoInserido?.id || null;

        // Enviar notificação direta para ADMIN e RH
        const { data: adminsRH } = await supabase
          .from('user_roles')
          .select('id, nome')
          .eq('ativo', true)
          .eq('recebe_notificacoes', true)
          .in('perfil', ['admin', 'rh_completo', 'rh_demissoes']);

        if (adminsRH && adminsRH.length > 0) {
          const notificacoes = adminsRH.map(ur => ({
            user_role_id: ur.id,
            tipo: 'divergencia_nova',
            titulo: `🚨 DIVERGÊNCIA: ${data.tipo_divergencia}`,
            mensagem: `📌 Tipo: ${data.tipo_divergencia}\n👤 Funcionário: ${funcNome.toUpperCase()}\n🏭 Setor: ${(func as any)?.setores?.nome?.toUpperCase() || 'N/A'} | Turma: ${func?.turma || 'N/A'}\n\n📝 Criado por: ${data.criado_por?.toUpperCase() || 'N/A'}\n📋 ${data.observacoes || 'Sem observações'}`,
            lida: false,
            referencia_id: eventoId,
          }));

          await supabase.from('notificacoes').insert(notificacoes);
        }
      } catch (err) {
        console.error('Erro ao criar evento de divergência:', err);
      }
    },
    onError: () => {
      toast.error('Erro ao registrar divergência');
    },
  });
}

export function useAguardarDivergencia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, descricao_acao }: { id: string; descricao_acao: string }) => {
      const { data, error } = await supabase
        .from('divergencias_quadro')
        .update({
          status: 'aguardando',
          descricao_acao,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divergencias'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar divergência');
    },
  });
}

export function useFeedbackDivergencia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, feedback_rh, resolvido_por }: { id: string; feedback_rh: string; resolvido_por: string }) => {
      const { data, error } = await supabase
        .from('divergencias_quadro')
        .update({
          status: 'resolvido',
          feedback_rh,
          resolvido: true,
          resolvido_por,
          resolvido_em: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divergencias'] });
    },
    onError: () => {
      toast.error('Erro ao enviar feedback');
    },
  });
}

export function useResolveDivergencia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, resolvido_por }: { id: string; resolvido_por: string }) => {
      const { data, error } = await supabase
        .from('divergencias_quadro')
        .update({
          resolvido: true,
          resolvido_por,
          resolvido_em: new Date().toISOString(),
          status: 'resolvido',
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divergencias'] });
      toast.success('Divergência resolvida!');
    },
    onError: () => {
      toast.error('Erro ao resolver divergência');
    },
  });
}

export function useDeleteDivergencia() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('divergencias_quadro')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['divergencias'] });
      toast.success('Divergência removida!');
    },
    onError: () => {
      toast.error('Erro ao remover divergência');
    },
  });
}
