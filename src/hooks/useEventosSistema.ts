import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Insere um evento na central de notificações apenas se não existir
 * outro evento pendente (notificado=false) com mesmo funcionario_nome + tipo.
 * Retorna o evento inserido ou null se duplicado.
 */
export async function inserirEventoSemDuplicata(evento: {
  tipo: string;
  descricao: string;
  funcionario_nome?: string | null;
  funcionario_id?: string | null;
  setor_nome?: string | null;
  setor_id?: string | null;
  turma?: string | null;
  criado_por?: string | null;
  dados_extra?: any;
  notificado?: boolean;
  quantidade?: number;
}) {
  // Verificar duplicata: mesmo tipo + mesmo funcionario_nome + pendente
  if (evento.funcionario_nome) {
    const { data: existente } = await supabase
      .from('eventos_sistema')
      .select('id')
      .eq('tipo', evento.tipo)
      .eq('funcionario_nome', evento.funcionario_nome)
      .eq('notificado', false)
      .limit(1);

    if (existente && existente.length > 0) {
      console.log(`Evento duplicado ignorado: ${evento.tipo} - ${evento.funcionario_nome}`);
      toast.info(`${evento.funcionario_nome?.toUpperCase()} já possui evento pendente do tipo "${evento.tipo}"`);
      return null;
    }
  }

  const { data, error } = await supabase
    .from('eventos_sistema')
    .insert({
      tipo: evento.tipo,
      descricao: evento.descricao,
      funcionario_nome: evento.funcionario_nome || null,
      funcionario_id: evento.funcionario_id || null,
      setor_nome: evento.setor_nome || null,
      setor_id: evento.setor_id || null,
      turma: evento.turma || null,
      criado_por: evento.criado_por || null,
      dados_extra: evento.dados_extra || null,
      notificado: evento.notificado ?? false,
      quantidade: evento.quantidade ?? 1,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export interface EventoSistema {
  id: string;
  tipo: string;
  descricao: string;
  funcionario_id: string | null;
  funcionario_nome: string | null;
  setor_id: string | null;
  setor_nome: string | null;
  turma: string | null;
  quantidade: number;
  dados_extra: any;
  notificado: boolean;
  notificado_em: string | null;
  notificado_tipo: string | null;
  criado_por: string | null;
  created_at: string;
}

export function useEventosSistema() {
  return useQuery({
    queryKey: ['eventos-sistema'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventos_sistema')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as EventoSistema[];
    },
  });
}

export function useEventosPendentes() {
  return useQuery({
    queryKey: ['eventos-sistema', 'pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventos_sistema')
        .select('*')
        .eq('notificado', false)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as EventoSistema[];
    },
  });
}

export function useDeleteEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('eventos_sistema')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
      toast.success('Evento removido!');
    },
    onError: () => {
      toast.error('Erro ao remover evento');
    },
  });
}

export function useCreateEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      tipo: string;
      descricao: string;
      funcionario_nome?: string | null;
      setor_id?: string | null;
      setor_nome?: string | null;
      turma?: string | null;
      criado_por?: string | null;
      dados_extra?: any;
    }) => {
      const { error } = await supabase.from('eventos_sistema').insert({
        tipo: params.tipo,
        descricao: params.descricao,
        funcionario_nome: params.funcionario_nome || null,
        setor_id: params.setor_id || null,
        setor_nome: params.setor_nome || null,
        turma: params.turma || null,
        criado_por: params.criado_por || null,
        dados_extra: params.dados_extra || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
      toast.success('Evento criado!');
    },
    onError: () => {
      toast.error('Erro ao criar evento');
    },
  });
}

export function useUpdateEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...params }: {
      id: string;
      tipo?: string;
      descricao?: string;
      funcionario_nome?: string | null;
      setor_id?: string | null;
      setor_nome?: string | null;
      turma?: string | null;
    }) => {
      const { error } = await supabase
        .from('eventos_sistema')
        .update(params)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
      toast.success('Evento atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar evento');
    },
  });
}

export function useEnviarNotificacaoEventos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventoIds,
      tipoNotificacao,
    }: {
      eventoIds: string[];
      tipoNotificacao: 'modal' | 'sino';
    }) => {
      const { data: eventos, error: evtError } = await supabase
        .from('eventos_sistema')
        .select('*')
        .in('id', eventoIds);

      if (evtError) throw evtError;
      if (!eventos || eventos.length === 0) throw new Error('Nenhum evento encontrado');

      // Agrupar eventos por tipo+setor+turma
      const grupos = new Map<string, {
        tipo: string; setor_nome: string; turma: string | null; setor_id: string | null;
        quantidade: number; funcionarios: string[]; evento_id: string;
        setor_origem_id?: string | null; setor_destino_id?: string | null;
        mensagem_personalizada?: string | null;
        destinatarios?: string[] | null;
      }>();
      
      eventos.forEach(ev => {
        const key = `${ev.tipo}|${ev.setor_nome || 'SEM SETOR'}|${ev.turma || ''}|${ev.id}`;
        const dadosExtra = (ev.dados_extra as any) || {};
        grupos.set(key, {
          tipo: ev.tipo,
          setor_nome: ev.setor_nome || 'SEM SETOR',
          turma: ev.turma,
          setor_id: ev.setor_id,
          quantidade: ev.quantidade || 1,
          funcionarios: ev.funcionario_nome ? [ev.funcionario_nome] : [],
          evento_id: ev.id,
          setor_origem_id: dadosExtra.setor_origem_id || null,
          setor_destino_id: dadosExtra.setor_destino_id || null,
          mensagem_personalizada: dadosExtra.mensagem_personalizada || null,
          destinatarios: dadosExtra.destinatarios || null,
        });
      });

      // Buscar todos os usuários ativos
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('id, perfil, setor_id, acesso_admin, recebe_notificacoes')
        .eq('ativo', true);

      if (!userRoles) throw new Error('Sem usuários');

      // Buscar setores adicionais dos gestores
      const { data: userRolesSetores } = await supabase
        .from('user_roles_setores')
        .select('user_role_id, setor_id');

      // Buscar todos os setores para mapear nome -> id quando setor_id está null
      const { data: todosSetores } = await supabase
        .from('setores')
        .select('id, nome');

      const setorNomeParaIds = new Map<string, string[]>();
      todosSetores?.forEach(s => {
        const nomeUpper = s.nome.toUpperCase();
        if (!setorNomeParaIds.has(nomeUpper)) setorNomeParaIds.set(nomeUpper, []);
        setorNomeParaIds.get(nomeUpper)!.push(s.id);
      });

      const notificacoes: any[] = [];

      grupos.forEach((grupo) => {
        const tipoLabel = getTipoLabel(grupo.tipo);
        const turmaStr = grupo.turma ? ` - ${grupo.turma}` : '';
        
        // Mensagem base
        const mensagemBase = `${tipoLabel} — ${grupo.setor_nome.toUpperCase()}${turmaStr}`;
        
        // Mensagem com nomes
        const nomesStr = grupo.funcionarios.length > 0 
          ? `\n${grupo.funcionarios.map(n => `• ${n.toUpperCase()}`).join('\n')}` 
          : '';

        // Mensagem personalizada adicional
        const msgPersonalizada = grupo.mensagem_personalizada
          ? `\n\n💬 ${grupo.mensagem_personalizada}`
          : '';

        // Destinatários fixos (quando admin selecionou manualmente)
        const destinatariosFixos = grupo.destinatarios && grupo.destinatarios.length > 0
          ? new Set(grupo.destinatarios)
          : null;

        // Resolver setor_ids do evento: usar setor_id direto, ou buscar por nome
        const setorIdsDoEvento = new Set<string>();
        if (grupo.setor_id) {
          setorIdsDoEvento.add(grupo.setor_id);
        } else if (grupo.setor_nome) {
          // Tentar encontrar setores pelo nome (parcial)
          const nomeEvento = grupo.setor_nome.toUpperCase();
          todosSetores?.forEach(s => {
            const nomeSetor = s.nome.toUpperCase();
            if (nomeSetor.includes(nomeEvento) || nomeEvento.includes(nomeSetor)) {
              setorIdsDoEvento.add(s.id);
            }
          });
        }
        if (grupo.setor_origem_id) setorIdsDoEvento.add(grupo.setor_origem_id);
        if (grupo.setor_destino_id) setorIdsDoEvento.add(grupo.setor_destino_id);

        userRoles.forEach(ur => {
          // Pular usuários sem permissão de receber notificações
          if (ur.recebe_notificacoes === false) return;

          // Se há destinatários fixos, só enviar para eles
          if (destinatariosFixos && !destinatariosFixos.has(ur.id)) return;

          const isAdmin = ur.acesso_admin;
          
          // Admin não recebe notificação — é quem envia
          if (isAdmin) return;
          
          const isRH = ur.perfil === 'rh_completo' || ur.perfil === 'rh_demissoes';
          
          // Setor do gestor (principal + adicionais)
          const setoresDoUsuario = new Set<string>();
          if (ur.setor_id) setoresDoUsuario.add(ur.setor_id);
          userRolesSetores?.forEach(s => {
            if (s.user_role_id === ur.id) setoresDoUsuario.add(s.setor_id);
          });

          // Verificar se é gestor do setor do evento
          let isGestorDaArea = false;
          for (const setorId of setorIdsDoEvento) {
            if (setoresDoUsuario.has(setorId)) {
              isGestorDaArea = true;
              break;
            }
          }

          // REGRA: Sem destinatários fixos, só envia para GESTORES DE SETOR do setor envolvido
          if (!destinatariosFixos) {
            if (ur.perfil !== 'gestor_setor') return;
            if (!isGestorDaArea) return;
          }

          // Para admissão: APENAS gestores do setor recebem notificação interativa (confirmar se iniciou)
          // RH recebe como visualização (evento_sistema_modal), NÃO como consulta interativa
          const isAdmissao = grupo.tipo === 'admissao' || grupo.tipo === 'ativacao';
          const isExperienciaConsulta = grupo.tipo === 'experiencia_consulta';
          const isCoberturaTreinamento = grupo.tipo === 'cobertura_treinamento';
          const isTurmaPendente = grupo.tipo === 'turma_pendente';
          const isGestorDoSetor = isGestorDaArea && ur.perfil !== 'visualizacao';

          let tipoNotif: string;
          if (isRH) {
            // RH SEMPRE recebe como visualização — nunca interativo
            tipoNotif = 'evento_sistema_modal';
          } else if (isTurmaPendente && isGestorDoSetor) {
            tipoNotif = 'turma_pendente_consulta';
          } else if (isCoberturaTreinamento && isGestorDoSetor) {
            tipoNotif = 'cobertura_treinamento_consulta';
          } else if (isExperienciaConsulta && isGestorDoSetor) {
            tipoNotif = 'experiencia_consulta';
          } else if (isAdmissao && isGestorDoSetor) {
            tipoNotif = 'admissao_confirmacao';
          } else if (tipoNotificacao === 'modal') {
            if (grupo.tipo === 'pedido_demissao') {
              tipoNotif = 'pedido_demissao_lancado';
            } else if (grupo.tipo === 'demissao') {
              tipoNotif = 'demissao_lancada';
            } else if (grupo.tipo === 'transferencia' || grupo.tipo === 'troca_turno') {
              tipoNotif = 'transferencia_pendente';
            } else {
              tipoNotif = 'evento_sistema_modal';
            }
          } else {
            tipoNotif = 'evento_sistema_modal';
          }

          // Gestores do setor sempre veem nomes completos
          const mensagem = `${mensagemBase}${nomesStr}${msgPersonalizada}`;

          notificacoes.push({
            user_role_id: ur.id,
            tipo: tipoNotif,
            titulo: tipoLabel,
            mensagem,
            referencia_id: grupo.evento_id,
          });
        });
      });

      if (notificacoes.length > 0) {
        const { error: notifError } = await supabase.from('notificacoes').insert(notificacoes);
        if (notifError) throw notifError;
      }

      // Marcar eventos como notificados
      const { error: updateError } = await supabase
        .from('eventos_sistema')
        .update({ 
          notificado: true, 
          notificado_em: new Date().toISOString(),
          notificado_tipo: tipoNotificacao,
        })
        .in('id', eventoIds);

      if (updateError) throw updateError;

      return { total: notificacoes.length, grupos: grupos.size, eventosCount: eventoIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
      toast.success(`${result.eventosCount} evento(s) enviado(s) para ${result.total} gestor(es)!`);
    },
    onError: (err: any) => {
      toast.error('Erro ao enviar notificações: ' + err.message);
    },
  });
}

// Helper principal: cria evento na Central de Notificações (pendente para revisão do RH)
// NÃO envia direto para gestores — o admin revisa e envia pela Central
export async function criarEventoENotificar(params: {
  tipo: string;
  descricao: string;
  funcionario_id?: string | null;
  funcionario_nome?: string | null;
  setor_id?: string | null;
  setor_nome?: string | null;
  turma?: string | null;
  quantidade?: number;
  dados_extra?: any;
  criado_por?: string | null;
  setor_origem_id?: string | null;
  setor_destino_id?: string | null;
  data_programada?: string | null;
}) {
  try {
    const dadosExtra = {
      ...(params.dados_extra || {}),
      ...(params.setor_origem_id ? { setor_origem_id: params.setor_origem_id } : {}),
      ...(params.setor_destino_id ? { setor_destino_id: params.setor_destino_id } : {}),
      ...(params.data_programada ? { data_programada: params.data_programada } : {}),
    };

    // Usar inserção sem duplicata — evento fica pendente (notificado=false) na Central
    await inserirEventoSemDuplicata({
      tipo: params.tipo,
      descricao: params.descricao,
      funcionario_id: params.funcionario_id || null,
      funcionario_nome: params.funcionario_nome || null,
      setor_id: params.setor_id || null,
      setor_nome: params.setor_nome || null,
      turma: params.turma || null,
      quantidade: params.quantidade || 1,
      dados_extra: Object.keys(dadosExtra).length > 0 ? dadosExtra : null,
      criado_por: params.criado_por || null,
      notificado: false,
    });
  } catch (e) {
    console.error('Erro ao criar evento na central:', e);
  }
}

// Helper legado (mantido para compatibilidade)
export async function criarEventoSistema(params: {
  tipo: string;
  descricao: string;
  funcionario_id?: string | null;
  funcionario_nome?: string | null;
  setor_id?: string | null;
  setor_nome?: string | null;
  turma?: string | null;
  quantidade?: number;
  dados_extra?: any;
  criado_por?: string | null;
}) {
  return criarEventoENotificar(params);
}

function getTipoLabel(tipo: string): string {
  const labels: Record<string, string> = {
    admissao: 'ADMISSÃO',
    ativacao: 'ADMISSÃO',
    demissao: 'DEMISSÃO',
    pedido_demissao: 'PED. DEMISSÃO',
    transferencia: 'TRANSFERÊNCIA',
    troca_turno: 'TRANSFERÊNCIA',
    previsao_admissao: 'PREVISÃO DE ADMISSÃO',
    experiencia_consulta: 'CONSULTA EXPERIÊNCIA',
    cobertura_treinamento: 'COB. FÉRIAS / TREINAMENTO',
    cobertura_treinamento_consulta: 'COB. FÉRIAS / TREINAMENTO',
    cobertura_treinamento_resposta: 'RESPOSTA COB/TREIN.',
    turma_pendente: 'TURMA PENDENTE',
  };
  return labels[tipo] || tipo.toUpperCase();
}
