import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  UserMinus, AlertTriangle, UserPlus, RefreshCw, ArrowRightLeft, Bell,
  CheckCircle2, X, CheckCheck, ThumbsUp, ThumbsDown, RotateCcw, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { TurmaPendenteActions } from './TurmaPendenteActions';

interface AvisoNotificacao {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  referencia_id: string | null;
  created_at: string;
  lida: boolean;
}

const TIPO_BADGE_LABELS: Record<string, string> = {
  demissao_lancada: 'DEMISSÃO',
  pedido_demissao_lancado: 'PED. DEMISSÃO',
  evento_sistema_modal: 'AVISO RH',
  evento_sistema_sino: 'AVISO RH', // legado - todos agora são modal
  transferencia_pendente: 'TRANSFERÊNCIA EM ANÁLISE',
  transferencia_realizada: 'TRANSFERÊNCIA REALIZADA',
  divergencia_nova: 'DIVERGÊNCIA',
  divergencia_retorno: 'DIVERGÊNCIA',
  divergencia_feedback: 'DIVERGÊNCIA',
  previsao_admissao: 'PREVISÃO ADMISSÃO',
  previsao_confirmacao: 'PREVISÃO — INICIOU?',
  previsao_resposta: 'RESPOSTA PREVISÃO',
  admissao_confirmacao: 'ADMISSÃO — INICIOU?',
  admissao_resposta: 'RESPOSTA ADMISSÃO',
  experiencia_consulta: 'EXPERIÊNCIA — DECISÃO',
  experiencia_resposta: 'RESPOSTA EXPERIÊNCIA',
  cobertura_treinamento_consulta: 'COB/TREIN. — CONFIRMAR',
  cobertura_treinamento_resposta: 'RESPOSTA COB/TREIN.',
  turma_pendente_consulta: 'TURMA PENDENTE',
  turma_pendente_resposta: 'RESPOSTA TURMA',
};

const TIPO_CONFIG: Record<string, { icon: typeof Bell; color: string; bgColor: string; borderColor: string; badgeClass: string }> = {
  demissao_lancada: { icon: UserMinus, color: 'text-destructive', bgColor: 'bg-red-50 dark:bg-red-950/30', borderColor: 'border-red-200 dark:border-red-800', badgeClass: 'bg-red-600 text-white' },
  pedido_demissao_lancado: { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800', badgeClass: 'bg-amber-600 text-white' },
  evento_sistema_modal: { icon: Bell, color: 'text-primary', bgColor: 'bg-primary/5', borderColor: 'border-primary/20', badgeClass: 'bg-primary text-primary-foreground' },
  evento_sistema_sino: { icon: Bell, color: 'text-primary', bgColor: 'bg-primary/5', borderColor: 'border-primary/20', badgeClass: 'bg-primary text-primary-foreground' },
  transferencia_pendente: { icon: ArrowRightLeft, color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950/30', borderColor: 'border-blue-200 dark:border-blue-800', badgeClass: 'bg-blue-600 text-white' },
  transferencia_realizada: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/30', borderColor: 'border-green-200 dark:border-green-800', badgeClass: 'bg-green-600 text-white' },
  divergencia_nova: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950/30', borderColor: 'border-orange-200 dark:border-orange-800', badgeClass: 'bg-orange-600 text-white' },
  divergencia_retorno: { icon: RefreshCw, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800', badgeClass: 'bg-amber-600 text-white' },
  divergencia_feedback: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/30', borderColor: 'border-green-200 dark:border-green-800', badgeClass: 'bg-green-600 text-white' },
  previsao_confirmacao: { icon: UserPlus, color: 'text-purple-600', bgColor: 'bg-purple-50 dark:bg-purple-950/30', borderColor: 'border-purple-200 dark:border-purple-800', badgeClass: 'bg-purple-600 text-white' },
  previsao_resposta: { icon: UserPlus, color: 'text-indigo-600', bgColor: 'bg-indigo-50 dark:bg-indigo-950/30', borderColor: 'border-indigo-200 dark:border-indigo-800', badgeClass: 'bg-indigo-600 text-white' },
  admissao_confirmacao: { icon: UserPlus, color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', borderColor: 'border-emerald-200 dark:border-emerald-800', badgeClass: 'bg-emerald-600 text-white' },
  admissao_resposta: { icon: UserPlus, color: 'text-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-950/30', borderColor: 'border-teal-200 dark:border-teal-800', badgeClass: 'bg-teal-600 text-white' },
  experiencia_consulta: { icon: UserPlus, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800', badgeClass: 'bg-amber-600 text-white' },
  experiencia_resposta: { icon: UserPlus, color: 'text-cyan-600', bgColor: 'bg-cyan-50 dark:bg-cyan-950/30', borderColor: 'border-cyan-200 dark:border-cyan-800', badgeClass: 'bg-cyan-600 text-white' },
  cobertura_treinamento_consulta: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950/30', borderColor: 'border-orange-200 dark:border-orange-800', badgeClass: 'bg-orange-600 text-white' },
  cobertura_treinamento_resposta: { icon: AlertTriangle, color: 'text-orange-600', bgColor: 'bg-orange-50 dark:bg-orange-950/30', borderColor: 'border-orange-200 dark:border-orange-800', badgeClass: 'bg-orange-700 text-white' },
  default: { icon: Bell, color: 'text-muted-foreground', bgColor: 'bg-muted/30', borderColor: 'border-border', badgeClass: 'bg-muted-foreground text-white' },
  turma_pendente_consulta: { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800', badgeClass: 'bg-amber-600 text-white' },
  turma_pendente_resposta: { icon: CheckCircle2, color: 'text-teal-600', bgColor: 'bg-teal-50 dark:bg-teal-950/30', borderColor: 'border-teal-200 dark:border-teal-800', badgeClass: 'bg-teal-600 text-white' },
};

function getTipoConfig(tipo: string) {
  return TIPO_CONFIG[tipo] || TIPO_CONFIG.default;
}

// sessionStorage helpers para controlar notificações já exibidas na sessão
const SEEN_KEY = 'notif_seen_ids';
const getSeenIds = (): Set<string> => {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
};
const addSeenIds = (ids: string[]) => {
  try {
    const current = getSeenIds();
    ids.forEach(id => current.add(id));
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...current]));
  } catch {}
};

export function CentralAvisosModal() {
  const { userRole, isVisualizacao, isAdmin } = useAuth();
  
  // RH e Admin só visualizam — nunca respondem SIM/NÃO
  const isRHUser = userRole?.perfil === 'rh_completo' || userRole?.perfil === 'rh_demissoes' || userRole?.perfil === 'admin';
  
  const [avisos, setAvisos] = useState<AvisoNotificacao[]>([]);
  const [visible, setVisible] = useState(false);
  const [cienteIds, setCienteIds] = useState<Set<string>>(new Set());
  const [filtroTurma, setFiltroTurma] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'enviada' | 'vista'>('todas');

  // Extrair turma do título/mensagem da notificação
  const extrairTurma = (aviso: AvisoNotificacao): string | null => {
    const texto = `${aviso.titulo} ${aviso.mensagem}`;
    // Procurar padrões como "TURMA A", "TURMA B", "TURMA C", "SOPRO A", etc.
    const match = texto.match(/\b(?:TURMA\s+)?([A-D])\b/i);
    if (match) return match[1].toUpperCase();
    // Procurar no título por setor com letra (ex: "MOI - SOPRO A")
    const matchSetor = texto.match(/(?:SOPRO|DECORAÇÃO|MOI)\s*[-]?\s*([A-D])\b/i);
    if (matchSetor) return matchSetor[1].toUpperCase();
    return null;
  };

  // Turmas disponíveis nos avisos atuais
  const turmasDisponiveis = [...new Set(avisos.map(extrairTurma).filter(Boolean))] as string[];
  turmasDisponiveis.sort();

  // Filtrar avisos
  const avisosFiltrados = avisos.filter(aviso => {
    if (filtroTurma) {
      const turma = extrairTurma(aviso);
      if (turma !== filtroTurma) return false;
    }
    if (filtroStatus === 'vista' && !cienteIds.has(aviso.id)) return false;
    if (filtroStatus === 'enviada' && cienteIds.has(aviso.id)) return false;
    return true;
  });

  const buscarAvisos = useCallback(async () => {
    if (isVisualizacao || !userRole?.id) return;

    // Verificar se este usuário tem permissão para receber notificações
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('recebe_notificacoes')
      .eq('id', userRole.id)
      .single();

    if (roleData && roleData.recebe_notificacoes === false) return;

    const { data } = await supabase
      .from('notificacoes')
      .select('id, titulo, mensagem, tipo, referencia_id, created_at, lida')
      .eq('user_role_id', userRole.id)
      .eq('lida', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      const seenIds = getSeenIds();
      const novas = (data as AvisoNotificacao[]).filter(a => !seenIds.has(a.id));
      if (novas.length > 0) {
        addSeenIds(data.map((a: any) => a.id));
        setAvisos(novas);
        setVisible(true);
      }
    }
  }, [isVisualizacao, userRole?.id]);

  useEffect(() => {
    buscarAvisos();
  }, [buscarAvisos]);

  // Realtime: escuta novas notificações
  useEffect(() => {
    if (isVisualizacao || !userRole?.id) return;

    const channel = supabase
      .channel('central-avisos-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        (payload) => {
          const notif = payload.new as any;
          if (notif.user_role_id === userRole.id && !notif.lida) {
            setAvisos(prev => {
              if (prev.some(a => a.id === notif.id)) return prev;
              return [notif as AvisoNotificacao, ...prev];
            });
            addSeenIds([notif.id]);
            setVisible(true);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isVisualizacao, userRole?.id]);

  // ESC para fechar
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleFecharTodos();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, avisos]);

  // Bloquear scroll
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  const marcarCiente = useCallback(async (id: string) => {
    // Capturar o aviso ANTES de qualquer state change para evitar stale closure
    const aviso = avisos.find(a => a.id === id);
    const referenciaId = aviso?.referencia_id;
    const avisoTipo = aviso?.tipo;
    
    setCienteIds(prev => new Set([...prev, id]));
    
    // Registrar CIENTE imediatamente (sem setTimeout) para garantir gravação
    try {
      // 1. Marcar notificação como lida
      await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
      
      // 2. Resolver evento_id
      let eventoId = referenciaId;

      // Se referencia_id está null, tentar encontrar o evento correspondente
      if (!eventoId && avisoTipo && userRole?.id) {
        try {
          const tipoBase = avisoTipo.replace('_lancada', '').replace('_lancado', '').replace('_pendente', '').replace('_confirmacao', '').replace('_consulta', '');
          const { data: eventoMatch } = await supabase
            .from('eventos_sistema')
            .select('id')
            .eq('tipo', tipoBase)
            .order('created_at', { ascending: false })
            .limit(1);
          if (eventoMatch && eventoMatch.length > 0) {
            eventoId = eventoMatch[0].id;
            await supabase.from('notificacoes').update({ referencia_id: eventoId }).eq('id', id);
          }
        } catch (err) {
          console.warn('[CIENTE] Fallback evento não encontrado:', err);
        }
      }

      // 3. Registrar quem viu (CIENTE)
      if (eventoId && userRole?.id && userRole?.nome) {
        const { error: vistaError } = await supabase.from('notificacoes_vistas').upsert({
          evento_id: eventoId,
          user_role_id: userRole.id,
          nome_gestor: userRole.nome,
        }, { onConflict: 'evento_id,user_role_id' });
        
        if (vistaError) {
          console.error('[CIENTE] Erro ao registrar vista:', vistaError);
        } else {
          console.log('[CIENTE] Vista registrada:', { eventoId, gestor: userRole.nome });
        }
      } else {
        console.warn('[CIENTE] Não foi possível registrar vista - dados faltando:', { eventoId, userId: userRole?.id, nome: userRole?.nome });
      }
    } catch (err) {
      console.error('[CIENTE] Erro geral ao marcar ciente:', err);
    }
    
    // 4. Remover da lista visual
    setAvisos(prev => {
      const next = prev.filter(a => a.id !== id);
      if (next.length === 0) setVisible(false);
      return next;
    });
    setCienteIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, [avisos, userRole?.id, userRole?.nome]);


  // Handler para confirmação de previsão (SIM/NÃO)
  const handleConfirmacaoPrevisao = useCallback(async (aviso: AvisoNotificacao, iniciou: boolean) => {
    if (!aviso.referencia_id || !userRole?.id) return;

    try {
      // Buscar o evento para pegar o funcionario_id
      const { data: evento } = await supabase
        .from('eventos_sistema')
        .select('funcionario_id, funcionario_nome, setor_nome, dados_extra')
        .eq('id', aviso.referencia_id)
        .single();

      if (!evento?.funcionario_id) {
        toast.error('Erro: funcionário não encontrado no evento');
        return;
      }

      const funcionarioNome = evento.funcionario_nome || 'N/A';

      if (iniciou) {
        // Buscar ID da situação ATIVO
        const { data: sitAtivo } = await supabase
          .from('situacoes')
          .select('id')
          .ilike('nome', 'ATIVO')
          .single();

        if (!sitAtivo) {
          toast.error('Situação ATIVO não encontrada');
          return;
        }

        // Atualizar funcionário para ATIVO
        await supabase
          .from('funcionarios')
          .update({ situacao_id: sitAtivo.id })
          .eq('id', evento.funcionario_id);

        toast.success(`${funcionarioNome} marcado como ATIVO!`);
      } else {
        toast.info(`${funcionarioNome} permanece em PREVISÃO`);
      }

      // Notificar administradores e RH
      const { data: admins } = await supabase
        .from('user_roles')
        .select('id, nome')
        .eq('ativo', true)
        .or('acesso_admin.eq.true,perfil.eq.rh_completo,perfil.eq.rh_demissoes');

      if (admins && admins.length > 0) {
        const statusText = iniciou ? '✅ INICIOU' : '❌ NÃO INICIOU';
        const notifAdmins = admins.map((admin: any) => ({
          user_role_id: admin.id,
          tipo: 'previsao_resposta',
          titulo: `RESPOSTA PREVISÃO — ${evento.setor_nome || ''}`,
          mensagem: `O gestor ${userRole.nome} respondeu sobre ${funcionarioNome}:\n\n${statusText}\n\n${iniciou ? 'Funcionário foi movido para ATIVO no quadro.' : 'Funcionário permanece em PREVISÃO.'}`,
          referencia_id: aviso.referencia_id,
        }));

        await supabase.from('notificacoes').insert(notifAdmins);
      }

      // Atualizar evento com a resposta
      await supabase
        .from('eventos_sistema')
        .update({
          dados_extra: {
            ...(typeof evento.dados_extra === 'object' ? evento.dados_extra : {}),
            confirmado: iniciou,
            confirmado_por: userRole.nome,
            confirmado_em: new Date().toISOString(),
          }
        })
        .eq('id', aviso.referencia_id);

      // Marcar notificação como lida
      marcarCiente(aviso.id);

    } catch (err: any) {
      console.error('Erro ao confirmar previsão:', err);
      toast.error('Erro ao processar confirmação');
    }
  }, [userRole?.id, userRole?.nome, marcarCiente]);

  // Handler para confirmação de admissão (SIM, INICIOU / NÃO INICIOU)
  const handleConfirmacaoAdmissao = useCallback(async (aviso: AvisoNotificacao, iniciou: boolean) => {
    if (!aviso.referencia_id || !userRole?.id) return;

    try {
      const { data: evento } = await supabase
        .from('eventos_sistema')
        .select('funcionario_id, funcionario_nome, setor_nome, dados_extra')
        .eq('id', aviso.referencia_id)
        .single();

      if (!evento?.funcionario_id) {
        toast.error('Erro: funcionário não encontrado no evento');
        return;
      }

      const funcionarioNome = evento.funcionario_nome || 'N/A';

      if (iniciou) {
        toast.success(`${funcionarioNome} — confirmado que INICIOU!`);
      } else {
        toast.info(`${funcionarioNome} — NÃO iniciou`);
      }

      // Notificar administradores e RH
      const { data: adminsERH } = await supabase
        .from('user_roles')
        .select('id, nome')
        .eq('ativo', true)
        .or('acesso_admin.eq.true,perfil.eq.rh_completo,perfil.eq.rh_demissoes');

      if (adminsERH && adminsERH.length > 0) {
        const statusText = iniciou ? '✅ INICIOU' : '❌ NÃO INICIOU';
        const notifAdmins = adminsERH.map((admin: any) => ({
          user_role_id: admin.id,
          tipo: 'admissao_resposta',
          titulo: `RESPOSTA ADMISSÃO — ${evento.setor_nome || ''}`,
          mensagem: `O gestor ${userRole.nome} respondeu sobre ${funcionarioNome}:\n\n${statusText}`,
          referencia_id: aviso.referencia_id,
        }));

        await supabase.from('notificacoes').insert(notifAdmins);
      }

      // Atualizar evento com a resposta
      await supabase
        .from('eventos_sistema')
        .update({
          dados_extra: {
            ...(typeof evento.dados_extra === 'object' ? evento.dados_extra : {}),
            admissao_confirmado: iniciou,
            admissao_confirmado_por: userRole.nome,
            admissao_confirmado_em: new Date().toISOString(),
          }
        })
        .eq('id', aviso.referencia_id);

      marcarCiente(aviso.id);
    } catch (err: any) {
      console.error('Erro ao confirmar admissão:', err);
      toast.error('Erro ao processar confirmação');
    }
  }, [userRole?.id, userRole?.nome, marcarCiente]);

  // Handler para consulta de experiência (EFETIVAR / DESLIGAR)
  const handleExperienciaDecisao = useCallback(async (aviso: AvisoNotificacao, decisao: 'efetivado' | 'demitido') => {
    if (!aviso.referencia_id || !userRole?.id) return;

    try {
      // Buscar o evento para pegar o funcionario_id e dados
      const { data: evento } = await supabase
        .from('eventos_sistema')
        .select('funcionario_id, funcionario_nome, setor_nome, turma, dados_extra')
        .eq('id', aviso.referencia_id)
        .single();

      if (!evento?.funcionario_id) {
        toast.error('Erro: funcionário não encontrado no evento');
        return;
      }

      const funcionarioNome = evento.funcionario_nome || 'N/A';
      const dadosExtra = (typeof evento.dados_extra === 'object' ? evento.dados_extra : {}) as Record<string, unknown>;

      // Salvar decisão na tabela experiencia_decisoes
      await supabase
        .from('experiencia_decisoes')
        .upsert({
          funcionario_id: evento.funcionario_id,
          decisao,
          criado_por: userRole.nome,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'funcionario_id' });

      // Registrar no histórico de auditoria
      await supabase
        .from('historico_auditoria')
        .insert([{
          tabela: 'experiencia_decisoes',
          operacao: 'INSERT',
          registro_id: evento.funcionario_id,
          dados_anteriores: null,
          dados_novos: {
            funcionario: funcionarioNome,
            setor: evento.setor_nome,
            turma: evento.turma,
            decisao: decisao === 'efetivado' ? 'EFETIVAR' : 'DESLIGAR',
            tipo_contrato: (dadosExtra as any).tipo_contrato || null,
            respondido_por: userRole.nome,
          },
          usuario_nome: userRole.nome,
        }]);

      const decisaoLabel = decisao === 'efetivado' ? '✅ EFETIVAR' : '❌ DESLIGAR';
      toast.success(`${funcionarioNome} — ${decisaoLabel}`);

      // Notificar administradores e RH
      const { data: adminsERH } = await supabase
        .from('user_roles')
        .select('id, nome')
        .eq('ativo', true)
        .or('acesso_admin.eq.true,perfil.eq.rh_completo,perfil.eq.rh_demissoes');

      if (adminsERH && adminsERH.length > 0) {
        const notifAdmins = adminsERH.map((admin: any) => ({
          user_role_id: admin.id,
          tipo: 'experiencia_resposta',
          titulo: `RESPOSTA EXPERIÊNCIA — ${evento.setor_nome || ''}`,
          mensagem: `O gestor ${userRole.nome} decidiu sobre ${funcionarioNome} (${evento.turma || ''}):\n\n${decisaoLabel}\n\n${dadosExtra.dias_info || ''}`,
          referencia_id: aviso.referencia_id,
        }));

        await supabase.from('notificacoes').insert(notifAdmins);
      }

      // Atualizar evento com a resposta
      await supabase
        .from('eventos_sistema')
        .update({
          dados_extra: {
            ...dadosExtra,
            experiencia_decisao: decisao,
            experiencia_decidido_por: userRole.nome,
            experiencia_decidido_em: new Date().toISOString(),
          }
        })
        .eq('id', aviso.referencia_id);

      // Marcar notificação como lida
      marcarCiente(aviso.id);

    } catch (err: any) {
      console.error('Erro ao processar decisão de experiência:', err);
      toast.error('Erro ao processar decisão');
    }
  }, [userRole?.id, userRole?.nome, marcarCiente]);

  // Handler para COB. FÉRIAS / TREINAMENTO (SIM ESTÁ / NÃO ESTÁ / JÁ RETORNOU)
  const handleCoberturaTreinamento = useCallback(async (aviso: AvisoNotificacao, resposta: 'sim_esta' | 'nao_esta' | 'ja_retornou') => {
    if (!aviso.referencia_id || !userRole?.id) return;

    try {
      const { data: evento } = await supabase
        .from('eventos_sistema')
        .select('funcionario_id, funcionario_nome, setor_nome, turma, dados_extra')
        .eq('id', aviso.referencia_id)
        .single();

      if (!evento?.funcionario_id) {
        toast.error('Erro: funcionário não encontrado no evento');
        return;
      }

      const funcionarioNome = evento.funcionario_nome || 'N/A';
      const dadosExtra = (typeof evento.dados_extra === 'object' ? evento.dados_extra : {}) as Record<string, unknown>;
      const situacaoAtual = (dadosExtra.situacao_nome as string) || '';

      if (resposta === 'sim_esta') {
        toast.success(`${funcionarioNome} — confirmado que ESTÁ em ${situacaoAtual}`);
      } else if (resposta === 'ja_retornou') {
        // Mudar situação para ATIVO
        const { data: sitAtivo } = await supabase
          .from('situacoes')
          .select('id')
          .ilike('nome', 'ATIVO')
          .single();

        if (sitAtivo) {
          await supabase
            .from('funcionarios')
            .update({ 
              situacao_id: sitAtivo.id,
              cobertura_funcionario_id: null,
              treinamento_setor_id: null,
            })
            .eq('id', evento.funcionario_id);
          toast.success(`${funcionarioNome} — retornou ao setor, situação alterada para ATIVO!`);
        }
      } else if (resposta === 'nao_esta') {
        // Gerar divergência automática
        await supabase
          .from('divergencias_quadro')
          .insert({
            funcionario_id: evento.funcionario_id,
            tipo_divergencia: `Funcionário consta como ${situacaoAtual} mas gestor informa que NÃO ESTÁ`,
            criado_por: userRole.nome,
            status: 'pendente',
            observacoes: `Resposta do gestor ${userRole.nome}: NÃO ESTÁ em ${situacaoAtual}. Verificar situação real do colaborador.`,
          });
        toast.warning(`${funcionarioNome} — divergência criada para análise do RH!`);
      }

      // Notificar administradores e RH
      const { data: adminsERH } = await supabase
        .from('user_roles')
        .select('id, nome')
        .eq('ativo', true)
        .or('acesso_admin.eq.true,perfil.eq.rh_completo,perfil.eq.rh_demissoes');

      if (adminsERH && adminsERH.length > 0) {
        const statusText = resposta === 'sim_esta' 
          ? '✅ SIM, ESTÁ' 
          : resposta === 'ja_retornou' 
            ? '↩ JÁ RETORNOU AO SETOR' 
            : '❌ NÃO ESTÁ';
        const notifAdmins = adminsERH.map((admin: any) => ({
          user_role_id: admin.id,
          tipo: 'cobertura_treinamento_resposta',
          titulo: `RESPOSTA COB/TREIN. — ${evento.setor_nome || ''}`,
          mensagem: `O gestor ${userRole.nome} respondeu sobre ${funcionarioNome} (${situacaoAtual}):\n\n${statusText}${resposta === 'nao_esta' ? '\n\n⚠️ Divergência criada automaticamente' : resposta === 'ja_retornou' ? '\n\n✅ Situação alterada para ATIVO' : ''}`,
          referencia_id: aviso.referencia_id,
        }));

        await supabase.from('notificacoes').insert(notifAdmins);
      }

      // Atualizar evento
      await supabase
        .from('eventos_sistema')
        .update({
          dados_extra: {
            ...dadosExtra,
            cobertura_resposta: resposta,
            cobertura_respondido_por: userRole.nome,
            cobertura_respondido_em: new Date().toISOString(),
          }
        })
        .eq('id', aviso.referencia_id);

      marcarCiente(aviso.id);
    } catch (err: any) {
      console.error('Erro ao processar resposta cob/treinamento:', err);
      toast.error('Erro ao processar resposta');
    }
  }, [userRole?.id, userRole?.nome, marcarCiente]);

  // Tipos que exigem confirmação do gestor — NÃO podem ser fechados sem responder
  // RH/Admin NUNCA é bloqueado — pode fechar tudo com CIENTE
  const TIPOS_EXIGEM_CONFIRMACAO = isRHUser 
    ? [] 
    : ['admissao_confirmacao', 'previsao_confirmacao', 'experiencia_consulta', 'cobertura_treinamento_consulta', 'turma_pendente_consulta'];

  const handleFecharTodos = useCallback(async () => {
    // Capturar avisos ANTES de limpar state
    const avisosSnapshot = [...avisos];
    const podeFechar = avisosSnapshot.filter(a => !TIPOS_EXIGEM_CONFIRMACAO.includes(a.tipo));
    const naoPodemFechar = avisosSnapshot.filter(a => TIPOS_EXIGEM_CONFIRMACAO.includes(a.tipo));

    if (podeFechar.length > 0) {
      try {
        const ids = podeFechar.map(a => a.id);
        await supabase.from('notificacoes').update({ lida: true }).in('id', ids);
        
        // Registrar CIENTE para os que podem fechar
        if (userRole?.id && userRole?.nome) {
          const avisosComRef = podeFechar.filter(a => a.referencia_id);
          const avisosSemRef = podeFechar.filter(a => !a.referencia_id);

          // Tentar resolver referencia_id para avisos sem ela
          for (const aviso of avisosSemRef) {
            try {
              const tipoBase = aviso.tipo.replace('_lancada', '').replace('_lancado', '').replace('_pendente', '').replace('_confirmacao', '').replace('_consulta', '');
              const { data: eventoMatch } = await supabase
                .from('eventos_sistema')
                .select('id')
                .eq('tipo', tipoBase)
                .order('created_at', { ascending: false })
                .limit(1);
              if (eventoMatch && eventoMatch.length > 0) {
                aviso.referencia_id = eventoMatch[0].id;
                await supabase.from('notificacoes').update({ referencia_id: eventoMatch[0].id }).eq('id', aviso.id);
                avisosComRef.push(aviso);
              }
            } catch (err) {
              console.warn('[CIENTE TODOS] Fallback erro:', err);
            }
          }

          const vistas = avisosComRef.map(a => ({
            evento_id: a.referencia_id!,
            user_role_id: userRole.id,
            nome_gestor: userRole.nome,
          }));
          if (vistas.length > 0) {
            const { error: vistaError } = await supabase
              .from('notificacoes_vistas')
              .upsert(vistas, { onConflict: 'evento_id,user_role_id' });
            
            if (vistaError) {
              console.error('[CIENTE TODOS] Erro ao registrar vistas:', vistaError);
            } else {
              console.log('[CIENTE TODOS] Vistas registradas:', vistas.length, 'para', userRole.nome);
            }
          } else {
            console.warn('[CIENTE TODOS] Nenhuma vista para registrar - avisosComRef:', avisosComRef.length);
          }
        } else {
          console.warn('[CIENTE TODOS] userRole incompleto:', { id: userRole?.id, nome: userRole?.nome });
        }
      } catch (err) {
        console.error('[CIENTE TODOS] Erro geral:', err);
      }
    }

    // Adicionar os que exigem confirmação ao sessionStorage
    if (naoPodemFechar.length > 0) {
      addSeenIds(naoPodemFechar.map(a => a.id));
      toast.info(`${naoPodemFechar.length} notificação(ões) pendente(s) de resposta — reaparecerão ao reabrir o sistema.`);
    }

    // Sempre fecha o modal
    setAvisos([]);
    setVisible(false);
  }, [avisos, userRole?.id, userRole?.nome]);

  if (!visible || avisos.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && handleFecharTodos()}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border-2 border-border bg-card shadow-2xl animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-full p-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">RH AVISA</h2>
              <p className="text-xs text-muted-foreground">
                {avisosFiltrados.length}/{avisos.length} aviso{avisos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleFecharTodos}
              className="gap-2 text-xs"
            >
              <CheckCheck className="h-4 w-4" />
              CIENTE DE TODOS
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={handleFecharTodos}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filtros */}
        {avisos.length > 1 && (
          <div className="px-4 py-2 border-b shrink-0 flex flex-wrap items-center gap-2 bg-muted/20">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground mr-1">Filtrar:</span>
            
            {/* Filtro por turma */}
            {turmasDisponiveis.length > 0 && (
              <>
                {turmasDisponiveis.map(turma => (
                  <Button
                    key={turma}
                    size="sm"
                    variant={filtroTurma === turma ? 'default' : 'outline'}
                    className="h-6 text-[10px] px-2 rounded-full"
                    onClick={() => setFiltroTurma(filtroTurma === turma ? null : turma)}
                  >
                    TURMA {turma}
                  </Button>
                ))}
                <span className="text-muted-foreground/40">|</span>
              </>
            )}
            
            {/* Filtro por status */}
            <Button
              size="sm"
              variant={filtroStatus === 'todas' ? 'default' : 'outline'}
              className="h-6 text-[10px] px-2 rounded-full"
              onClick={() => setFiltroStatus('todas')}
            >
              TODAS
            </Button>
            <Button
              size="sm"
              variant={filtroStatus === 'enviada' ? 'default' : 'outline'}
              className="h-6 text-[10px] px-2 rounded-full"
              onClick={() => setFiltroStatus('enviada')}
            >
              PENDENTES
            </Button>
            <Button
              size="sm"
              variant={filtroStatus === 'vista' ? 'default' : 'outline'}
              className="h-6 text-[10px] px-2 rounded-full"
              onClick={() => setFiltroStatus('vista')}
            >
              VISTAS
            </Button>

            {(filtroTurma || filtroStatus !== 'todas') && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] px-2 text-destructive"
                onClick={() => { setFiltroTurma(null); setFiltroStatus('todas'); }}
              >
                <X className="h-3 w-3 mr-1" /> Limpar
              </Button>
            )}
          </div>
        )}

        {/* Lista de avisos */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {avisosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum aviso encontrado com os filtros selecionados.
            </div>
          ) : avisosFiltrados.map((aviso) => {
            const config = getTipoConfig(aviso.tipo);
            const Icon = config.icon;
            const isCiente = cienteIds.has(aviso.id);

            return (
              <div
                key={aviso.id}
                className={cn(
                  'flex items-start gap-4 rounded-xl border-2 p-4 transition-all duration-300',
                  config.bgColor,
                  config.borderColor,
                  isCiente && 'opacity-0 scale-95 pointer-events-none'
                )}
              >
                {/* Ícone */}
                <div className={cn('rounded-full p-2.5 shrink-0 bg-card border', config.borderColor)}>
                  <Icon className={cn('h-5 w-5', config.color)} />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn(
                          'text-xs font-extrabold px-3 py-1 rounded-md uppercase tracking-wider shadow-sm border',
                          config.badgeClass,
                          'ring-2 ring-offset-1 ring-offset-card',
                          aviso.tipo === 'transferencia_pendente' && 'ring-blue-400 animate-pulse',
                          aviso.tipo === 'transferencia_realizada' && 'ring-green-400',
                          aviso.tipo === 'demissao_lancada' && 'ring-red-400',
                          aviso.tipo === 'pedido_demissao_lancado' && 'ring-amber-400',
                          aviso.tipo === 'experiencia_consulta' && 'ring-amber-400 animate-pulse',
                          aviso.tipo === 'cobertura_treinamento_consulta' && 'ring-orange-400 animate-pulse',
                          aviso.tipo === 'divergencia_nova' && 'ring-orange-400',
                          aviso.tipo === 'admissao_confirmacao' && 'ring-emerald-400 animate-pulse',
                          aviso.tipo === 'previsao_confirmacao' && 'ring-purple-400 animate-pulse',
                          aviso.tipo === 'turma_pendente_consulta' && 'ring-amber-400 animate-pulse',
                          !['transferencia_pendente','transferencia_realizada','demissao_lancada','pedido_demissao_lancado','experiencia_consulta','cobertura_treinamento_consulta','divergencia_nova','admissao_confirmacao','previsao_confirmacao','turma_pendente_consulta'].includes(aviso.tipo) && 'ring-border',
                        )}>
                          {TIPO_BADGE_LABELS[aviso.tipo] || 'AVISO'}
                        </span>
                      </div>
                      <p className={cn('font-bold text-base', config.color)}>{aviso.titulo}</p>
                      <p className="text-sm text-foreground mt-1 whitespace-pre-line leading-relaxed">
                        {aviso.mensagem}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
                      {format(new Date(aviso.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </Badge>
                  </div>

                  {/* Ações da mensagem */}
                  <div className="flex items-center gap-2 mt-3">
                    {isRHUser ? (
                      /* RH/Admin: sempre só CIENTE — apenas visualiza */
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn('gap-1.5 text-xs h-8', config.color, 'border-current')}
                        onClick={() => marcarCiente(aviso.id)}
                        disabled={isCiente}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        CIENTE
                      </Button>
                    ) : aviso.tipo === 'cobertura_treinamento_consulta' ? (
                      <>
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleCoberturaTreinamento(aviso, 'sim_esta')}
                          disabled={isCiente}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          SIM, ESTÁ
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5 text-xs h-8"
                          onClick={() => handleCoberturaTreinamento(aviso, 'nao_esta')}
                          disabled={isCiente}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                          NÃO ESTÁ
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-8 text-blue-600 border-blue-300"
                          onClick={() => handleCoberturaTreinamento(aviso, 'ja_retornou')}
                          disabled={isCiente}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          JÁ RETORNOU
                        </Button>
                      </>
                    ) : aviso.tipo === 'experiencia_consulta' ? (
                      <>
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleExperienciaDecisao(aviso, 'efetivado')}
                          disabled={isCiente}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          EFETIVAR
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5 text-xs h-8"
                          onClick={() => handleExperienciaDecisao(aviso, 'demitido')}
                          disabled={isCiente}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                          DESLIGAR
                        </Button>
                      </>
                    ) : (aviso.tipo === 'previsao_confirmacao' || aviso.tipo === 'admissao_confirmacao') ? (
                      <>
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => aviso.tipo === 'admissao_confirmacao' 
                            ? handleConfirmacaoAdmissao(aviso, true) 
                            : handleConfirmacaoPrevisao(aviso, true)}
                          disabled={isCiente}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          SIM, INICIOU
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1.5 text-xs h-8"
                          onClick={() => aviso.tipo === 'admissao_confirmacao' 
                            ? handleConfirmacaoAdmissao(aviso, false) 
                            : handleConfirmacaoPrevisao(aviso, false)}
                          disabled={isCiente}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                          NÃO INICIOU
                        </Button>
                      </>
                    ) : aviso.tipo === 'turma_pendente_consulta' ? (
                      <TurmaPendenteActions
                        aviso={aviso}
                        isCiente={isCiente}
                        userRoleName={userRole?.nome || ''}
                        onDone={marcarCiente}
                      />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn('gap-1.5 text-xs h-8', config.color, 'border-current')}
                        onClick={() => marcarCiente(aviso.id)}
                        disabled={isCiente}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        CIENTE
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 bg-muted/30 rounded-b-2xl">
          <p className="text-xs text-muted-foreground text-center">
            Clique em <strong>CIENTE</strong> para dar baixa. Notificações com botões de confirmação <strong>não somem</strong> até você responder.
          </p>
        </div>
      </div>
    </div>
  );
}
