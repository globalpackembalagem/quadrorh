import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { UserMinus, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DemissaoAlerta {
  id: string;
  titulo: string;
  mensagem: string;
  referencia_id: string | null;
  tipo: string;
}

const extrairResumoDemissao = (mensagem?: string) => {
  if (!mensagem) return '';

  const linhasLimpas = mensagem
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^o gestor\b/i.test(l))
    .filter((l) => !/ci[eê]ncia/i.test(l));

  const colaborador = linhasLimpas.find((l) => !l.startsWith('📍') && !l.startsWith('📅'));
  const setor = linhasLimpas.find((l) => l.startsWith('📍'));
  const data = linhasLimpas.find((l) => l.startsWith('📅'));

  return [colaborador, setor, data].filter(Boolean).join('\n');
};

const montarMensagemRetornoCiencia = (nomeGestor: string, tipoLabel: string, mensagemOrigem?: string) => {
  const resumo = extrairResumoDemissao(mensagemOrigem);
  return resumo
    ? `${nomeGestor} deu CIÊNCIA em ${tipoLabel}:\n${resumo}`
    : `${nomeGestor} deu CIÊNCIA em ${tipoLabel}.`;
};

export function DemissaoAlertaCentral() {
  const { userRole, isVisualizacao } = useAuth();
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<DemissaoAlerta[]>([]);
  const [visible, setVisible] = useState(false);

  const fecharAlerta = useCallback(async (id: string) => {
    // 1. Marcar notificação como lida
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    
    // 2. Registrar na tabela notificacoes_vistas para rastreamento de ciência
    const alerta = alertas.find(a => a.id === id);
    let jaTinhaCiencia = false;

    if (alerta?.referencia_id && userRole?.id) {
      const { data: vistaExistente } = await supabase
        .from('notificacoes_vistas')
        .select('id')
        .eq('evento_id', alerta.referencia_id)
        .eq('user_role_id', userRole.id)
        .limit(1)
        .maybeSingle();

      jaTinhaCiencia = !!vistaExistente;

      await supabase.from('notificacoes_vistas').upsert({
        evento_id: alerta.referencia_id,
        user_role_id: userRole.id,
        nome_gestor: userRole?.nome || 'DESCONHECIDO',
      }, { onConflict: 'evento_id,user_role_id' });
    } else if (userRole?.id) {
      // Tentar encontrar evento pelo tipo
      const tipoBase = alerta?.tipo?.replace('_lancada', '').replace('_lancado', '') || '';
      if (tipoBase) {
        const { data: eventoMatch } = await supabase
          .from('eventos_sistema')
          .select('id')
          .eq('tipo', tipoBase)
          .order('created_at', { ascending: false })
          .limit(1);
        if (eventoMatch?.[0]) {
          const { data: vistaExistente } = await supabase
            .from('notificacoes_vistas')
            .select('id')
            .eq('evento_id', eventoMatch[0].id)
            .eq('user_role_id', userRole.id)
            .limit(1)
            .maybeSingle();

          jaTinhaCiencia = !!vistaExistente;

          await supabase.from('notificacoes_vistas').upsert({
            evento_id: eventoMatch[0].id,
            user_role_id: userRole.id,
            nome_gestor: userRole?.nome || 'DESCONHECIDO',
          }, { onConflict: 'evento_id,user_role_id' });
        }
      }
    }

    // Enviar notificação de retorno para Admin/RH
    const eventoIdFinal = alerta?.referencia_id;
    if (eventoIdFinal && userRole?.id && userRole?.nome && !jaTinhaCiencia) {
      try {
        const { data: adminsERH } = await supabase
          .from('user_roles')
          .select('id')
          .eq('ativo', true)
          .ilike('nome', 'LUCIANO');

        if (adminsERH && adminsERH.length > 0) {
          const tipoLabel = alerta?.tipo === 'pedido_demissao_lancado' ? 'PEDIDO DE DEMISSÃO' : 'DEMISSÃO';
          const notifRetorno = adminsERH
            .filter((a: any) => a.id !== userRole.id)
            .map((admin: any) => ({
              user_role_id: admin.id,
              tipo: 'ciencia_retorno',
              titulo: `✅ CIÊNCIA — ${tipoLabel}`,
              mensagem: montarMensagemRetornoCiencia(userRole.nome, tipoLabel, alerta?.mensagem),
              referencia_id: eventoIdFinal,
            }));

          if (notifRetorno.length > 0) {
            await supabase.from('notificacoes').insert(notifRetorno);
          }
        }
      } catch (err) {
        console.warn('[DEMISSAO ALERTA] Erro ao enviar notificação de retorno:', err);
      }
    }

    setAlertas(prev => {
      const next = prev.filter(a => a.id !== id);
      if (next.length === 0) setVisible(false);
      return next;
    });
  }, [alertas, userRole]);

  const verDetalhes = useCallback((alerta: DemissaoAlerta) => {
    fecharAlerta(alerta.id);
    navigate('/demissoes');
  }, [fecharAlerta, navigate]);

  // Auto-close after 3s
  useEffect(() => {
    if (alertas.length === 0) return;
    const timer = setTimeout(() => {
      // Close first alert
      if (alertas[0]) fecharAlerta(alertas[0].id);
    }, 8000);
    return () => clearTimeout(timer);
  }, [alertas, fecharAlerta]);

  // ESC to close
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && alertas[0]) {
        fecharAlerta(alertas[0].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, alertas, fecharAlerta]);

  // Block scroll
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  useEffect(() => {
    if (isVisualizacao || !userRole?.id) return;

    // Fetch unread on mount
    const fetchPendentes = async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('id, titulo, mensagem, referencia_id, tipo')
        .eq('user_role_id', userRole.id)
        .in('tipo', ['demissao_lancada', 'pedido_demissao_lancado', 'evento_sistema_modal'])
        .eq('lida', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        setAlertas(data);
        setVisible(true);
      }
    };

    fetchPendentes();

    // Realtime listener
    const channel = supabase
      .channel('demissao-alerta-central')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificacoes' },
        (payload) => {
          const notif = payload.new as any;
          if (
            (notif.tipo === 'demissao_lancada' || notif.tipo === 'pedido_demissao_lancado' || notif.tipo === 'evento_sistema_modal') &&
            notif.user_role_id === userRole.id
          ) {
            setAlertas(prev => {
              if (prev.some(a => a.id === notif.id)) return prev;
              return [{
                id: notif.id,
                titulo: notif.titulo,
                mensagem: notif.mensagem,
                referencia_id: notif.referencia_id,
                tipo: notif.tipo,
              }, ...prev];
            });
            setVisible(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isVisualizacao, userRole?.id]);

  if (!visible || alertas.length === 0) return null;

  const alerta = alertas[0];
  const isPedido = alerta.tipo === 'pedido_demissao_lancado';
  const isEvento = alerta.tipo === 'evento_sistema_modal';
  const Icon = isPedido ? AlertTriangle : UserMinus;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={() => fecharAlerta(alerta.id)}
    >
      <div
        className={cn(
          "relative max-w-md w-full mx-4 rounded-xl border-2 shadow-2xl p-6",
          "bg-card border-border",
          "animate-scale-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => fecharAlerta(alerta.id)}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="flex items-start gap-4">
          <div className={cn(
            "rounded-full p-3 shrink-0",
            isPedido ? "bg-accent" : "bg-destructive/10"
          )}>
            <Icon className={cn(
              "h-7 w-7",
              isPedido ? "text-accent-foreground" : "text-destructive"
            )} />
          </div>
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold text-base text-foreground">{alerta.titulo}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{alerta.mensagem}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <Button
            size="sm"
            className="flex-1 gap-2"
            onClick={() => verDetalhes(alerta)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            VER DETALHES
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => fecharAlerta(alerta.id)}
          >
            FECHAR
          </Button>
        </div>

        {/* Counter */}
        {alertas.length > 1 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            {alertas.length} notificação(ões) pendente(s)
          </p>
        )}
      </div>
    </div>
  );
}
