import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { criarEventoENotificar, inserirEventoSemDuplicata } from '@/hooks/useEventosSistema';
import { registrarHistoricoQuadroSeTravado } from '@/hooks/useFuncionarios';

const invalidarBaseFuncionarios = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'quadro'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'quadro', 'conferidos'] });
  queryClient.invalidateQueries({ queryKey: ['funcionarios', 'ponto'] });
};


export interface TrocaTurno {
  id: string;
  funcionario_id: string;
  setor_origem_id: string;
  turma_origem: string | null;
  setor_destino_id: string;
  turma_destino: string | null;
  tipo: 'troca_turno' | 'transferencia';
  status: string;
  observacoes: string | null;
  criado_por: string;
  efetivada: boolean;
  data_efetivada: string | null;
  data_programada: string | null;
  motivo_recusa: string | null;
  recusado_por: string | null;
  created_at: string;
  updated_at: string;
  // Legacy fields (kept for backward compat but unused in new flow)
  gestor_origem_aprovado: boolean;
  gestor_destino_aprovado: boolean;
  gestor_origem_nome: string | null;
  gestor_destino_nome: string | null;
  gestor_origem_aprovado_em: string | null;
  gestor_destino_aprovado_em: string | null;
  funcionario?: {
    id: string;
    nome_completo: string;
    matricula: string | null;
    turma: string | null;
    setor: { nome: string } | null;
  };
  setor_origem?: { nome: string };
  setor_destino?: { nome: string };
}

const selectQuery = `
  *,
  funcionario:funcionarios(id, nome_completo, matricula, turma, setor:setores!setor_id(nome)),
  setor_origem:setores!setor_origem_id(nome),
  setor_destino:setores!setor_destino_id(nome)
`;

const autoEfetivadasNaSessao = new Set<string>();

export function useTrocasTurno() {
  return useQuery({
    queryKey: ['trocas_turno'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trocas_turno')
        .select(selectQuery)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as TrocaTurno[];
    },
  });
}

export function useTrocasTurnoPendentes() {
  return useQuery({
    queryKey: ['trocas_turno', 'pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trocas_turno')
        .select(selectQuery)
        .in('status', ['pendente_rh'])
        .eq('efetivada', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as TrocaTurno[];
    },
  });
}

export function useCriarTrocaTurno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      funcionario_id: string;
      setor_origem_id: string;
      turma_origem?: string | null;
      setor_destino_id: string;
      turma_destino?: string | null;
      observacoes?: string;
      criado_por: string;
      data_programada?: string | null;
      tipo?: 'troca_turno' | 'transferencia';
    }) => {
      const { data, error } = await supabase
        .from('trocas_turno')
        .insert({
          ...params,
          tipo: params.tipo || 'troca_turno',
          status: 'pendente_rh',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['trocas_turno'] });
      toast.success('Movimentação criada com sucesso!');
      
      // Buscar nomes dos setores para a notificação
      const [{ data: setorOrigem }, { data: setorDestino }] = await Promise.all([
        supabase.from('setores').select('nome').eq('id', variables.setor_origem_id).single(),
        supabase.from('setores').select('nome').eq('id', variables.setor_destino_id).single(),
      ]);
      
      const { data: funcionario } = await supabase
        .from('funcionarios')
        .select('nome_completo')
        .eq('id', variables.funcionario_id)
        .single();

      criarEventoENotificar({
        tipo: variables.tipo === 'transferencia' ? 'transferencia' : 'troca_turno',
        descricao: `Solicitação de ${variables.tipo === 'transferencia' ? 'transferência' : 'troca de turno'}`,
        funcionario_id: variables.funcionario_id,
        funcionario_nome: funcionario?.nome_completo || null,
        setor_id: variables.setor_origem_id,
        setor_nome: setorOrigem?.nome || '',
        turma: variables.turma_origem || null,
        criado_por: variables.criado_por || null,
        setor_origem_id: variables.setor_origem_id,
        setor_destino_id: variables.setor_destino_id,
        data_programada: variables.data_programada || null,
        dados_extra: {
          setor_destino: setorDestino?.nome || '',
          turma_destino: variables.turma_destino || null,
          setor_origem_id: variables.setor_origem_id,
          setor_destino_id: variables.setor_destino_id,
        },
      });
    },
    onError: () => {
      toast.error('Erro ao criar movimentação');
    },
  });
}

export function useCancelarTrocaTurno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; cancelado_por: string }) => {
      const { data, error } = await supabase
        .from('trocas_turno')
        .update({
          status: 'cancelado',
          recusado_por: params.cancelado_por,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas_turno'] });
      toast.success('Movimentação cancelada.');
    },
    onError: () => {
      toast.error('Erro ao cancelar');
    },
  });
}

export function useExcluirTrocaTurno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trocas_turno')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas_turno'] });
      toast.success('Movimentação excluída!');
    },
    onError: () => {
      toast.error('Erro ao excluir movimentação');
    },
  });
}

export function useEditarTrocaTurno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      setor_destino_id: string;
      turma_destino?: string | null;
      observacoes?: string | null;
      data_programada?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('trocas_turno')
        .update({
          setor_destino_id: params.setor_destino_id,
          turma_destino: params.turma_destino ?? null,
          observacoes: params.observacoes ?? null,
          data_programada: params.data_programada ?? null,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas_turno'] });
      toast.success('Solicitação atualizada!');
    },
    onError: () => {
      toast.error('Erro ao atualizar solicitação');
    },
  });
}

export function useEfetivarTrocaTurno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      funcionario_id: string;
      setor_destino_id: string;
      turma_destino?: string | null;
      usuario_nome?: string;
    }) => {
      // 0. Buscar dados atuais do funcionário para o histórico
      const { data: funcAtual } = await supabase
        .from('funcionarios')
        .select('*, setor:setores!setor_id(*), situacao:situacoes!situacao_id(*)')
        .eq('id', params.funcionario_id)
        .single();

      // Buscar nome do setor destino
      const { data: setorDestino } = await supabase
        .from('setores')
        .select('nome')
        .eq('id', params.setor_destino_id)
        .single();

      // 1. Efetivar a troca
      const { error: tErr } = await supabase
        .from('trocas_turno')
        .update({
          status: 'aprovado',
          efetivada: true,
          data_efetivada: new Date().toISOString().split('T')[0],
        })
        .eq('id', params.id);

      if (tErr) throw tErr;

      // 2. Remover registros de falta após a data programada da transferência
      const { data: trocaInfo } = await supabase
        .from('trocas_turno')
        .select('data_programada, tipo')
        .eq('id', params.id)
        .single();

      if (trocaInfo?.data_programada) {
        const { error: delFaltasErr } = await supabase
          .from('registros_ponto')
          .delete()
          .eq('funcionario_id', params.funcionario_id)
          .gt('data', trocaInfo.data_programada);
        
        if (delFaltasErr) {
          console.error('Erro ao limpar faltas pós-transferência:', delFaltasErr);
        }
      }

      // 3. Atualizar funcionário
      const updateFunc: Record<string, unknown> = {
        setor_id: params.setor_destino_id,
      };
      if (params.turma_destino) {
        updateFunc.turma = params.turma_destino;
      } else if (trocaInfo?.tipo === 'transferencia') {
        updateFunc.turma = null;
      }

      const { error: fErr } = await supabase
        .from('funcionarios')
        .update(updateFunc)
        .eq('id', params.funcionario_id);

      if (fErr) throw fErr;

      const { data: funcDepois } = await supabase
        .from('funcionarios')
        .select('*, setor:setores!setor_id(*), situacao:situacoes!situacao_id(*)')
        .eq('id', params.funcionario_id)
        .single();

      await registrarHistoricoQuadroSeTravado(funcAtual as any, funcDepois as any, params.usuario_nome || 'SISTEMA', 'TROCA_TURNO');

      // 4. Registrar no histórico com dados detalhados
      const setorOrigemNome = (funcAtual?.setor as any)?.nome || 'Desconhecido';
      const setorDestinoNome = setorDestino?.nome || 'Desconhecido';

      await supabase.from('historico_auditoria').insert({
        tabela: 'funcionarios',
        operacao: 'MOVIMENTACAO_EFETIVADA',
        registro_id: params.funcionario_id,
        usuario_nome: params.usuario_nome || 'Sistema',
        dados_anteriores: {
          setor: setorOrigemNome,
          setor_id: funcAtual?.setor_id || null,
          turma: funcAtual?.turma || null,
        },
        dados_novos: {
          setor: setorDestinoNome,
          setor_id: params.setor_destino_id,
          turma: params.turma_destino || funcAtual?.turma || null,
          data_efetivada: new Date().toISOString().split('T')[0],
        },
      });

      // 5. Buscar dados completos da troca para notificação
      const { data: trocaData } = await supabase
        .from('trocas_turno')
        .select('funcionario:funcionarios!funcionario_id(nome_completo), setor_origem_id, setor_destino_id, turma_origem, turma_destino')
        .eq('id', params.id)
        .single();

      const funcNome = (trocaData?.funcionario as any)?.nome_completo || 'Funcionário';
      const turmaDestinoStr = params.turma_destino ? ` turma ${params.turma_destino}` : '';

      // 6. Criar evento na Central de Notificações (não enviar direto ao gestor)
      const eventoTransferencia = await inserirEventoSemDuplicata({
        tipo: 'transferencia',
        descricao: `TRANSFERÊNCIA REALIZADA — ${funcNome.toUpperCase()}`,
        funcionario_id: params.funcionario_id,
        funcionario_nome: funcNome.toUpperCase(),
        setor_id: trocaData?.setor_origem_id || funcAtual?.setor_id || null,
        setor_nome: setorOrigemNome.toUpperCase(),
        turma: trocaData?.turma_origem || funcAtual?.turma || null,
        criado_por: params.usuario_nome || 'SISTEMA',
        dados_extra: {
          setor_destino: setorDestinoNome.toUpperCase(),
          turma_destino: params.turma_destino || trocaData?.turma_destino || null,
          setor_origem_id: trocaData?.setor_origem_id || funcAtual?.setor_id || null,
          setor_destino_id: params.setor_destino_id,
          mensagem_personalizada: `${funcNome.toUpperCase()} | ${setorOrigemNome.toUpperCase()} → ${setorDestinoNome.toUpperCase()}${turmaDestinoStr.toUpperCase()}`,
        },
      });

      const setorIdsEnvolvidos = [
        trocaData?.setor_origem_id || funcAtual?.setor_id || null,
        params.setor_destino_id,
      ].filter(Boolean) as string[];

      if (eventoTransferencia && setorIdsEnvolvidos.length > 0) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('id, perfil, setor_id, recebe_notificacoes')
          .eq('ativo', true)
          .eq('perfil', 'gestor_setor');

        const { data: rolesSetores } = await supabase
          .from('user_roles_setores')
          .select('user_role_id, setor_id')
          .in('setor_id', setorIdsEnvolvidos);

        const destinatarios = new Set<string>();
        const rolesHabilitadas = new Set<string>();
        (roles || []).forEach((role: any) => {
          if (role.recebe_notificacoes === false) return;
          rolesHabilitadas.add(role.id);
          if (role.setor_id && setorIdsEnvolvidos.includes(role.setor_id)) destinatarios.add(role.id);
        });
        (rolesSetores || []).forEach((rel: any) => {
          if (rolesHabilitadas.has(rel.user_role_id)) destinatarios.add(rel.user_role_id);
        });

        const notificacoes = Array.from(destinatarios).map(userRoleId => ({
          user_role_id: userRoleId,
          tipo: 'transferencia_pendente',
          titulo: 'TRANSFERENCIA REALIZADA',
          mensagem: `${funcNome.toUpperCase()} | ${setorOrigemNome.toUpperCase()} -> ${setorDestinoNome.toUpperCase()}${turmaDestinoStr.toUpperCase()}`,
          referencia_id: (eventoTransferencia as any).id,
        }));

        if (notificacoes.length > 0) {
          const { error: notifError } = await supabase.from('notificacoes').insert(notificacoes);
          if (notifError) console.error('Erro ao notificar gestores da transferencia:', notifError);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas_turno'] });
      invalidarBaseFuncionarios(queryClient);
      toast.success('Movimentação efetivada!');
    },
    onError: () => {
      toast.error('Erro ao efetivar movimentação');
    },
  });
}

export function useAutoEfetivarTrocasProgramadas(trocas: TrocaTurno[]) {
  const efetivarTroca = useEfetivarTrocaTurno();

  useEffect(() => {
    if (efetivarTroca.isPending) return;

    const hoje = new Date().toISOString().split('T')[0];
    const trocaVencida = trocas.find(t =>
      t.data_programada &&
      t.data_programada <= hoje &&
      !t.efetivada &&
      t.status === 'pendente_rh' &&
      !autoEfetivadasNaSessao.has(t.id)
    );

    if (!trocaVencida) return;

    autoEfetivadasNaSessao.add(trocaVencida.id);
    efetivarTroca.mutate({
      id: trocaVencida.id,
      funcionario_id: trocaVencida.funcionario_id,
      setor_destino_id: trocaVencida.setor_destino_id,
      turma_destino: trocaVencida.turma_destino,
      usuario_nome: 'Sistema - data programada',
    });
  }, [trocas, efetivarTroca]);
}
