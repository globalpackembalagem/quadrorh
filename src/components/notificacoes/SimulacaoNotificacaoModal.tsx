import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, ArrowRightLeft, AlertTriangle, ExternalLink, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EventoSistema } from '@/hooks/useEventosSistema';

const TIPO_CONFIG: Record<string, { icon: typeof UserPlus; label: string; color: string; bgColor: string; badge?: string }> = {
  admissao:         { icon: UserPlus,       label: 'ADMISSÃO',             color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800', badge: 'ADMITIDO' },
  ativacao:         { icon: UserPlus,       label: 'ADMISSÃO',             color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800', badge: 'ADMITIDO' },
  demissao:         { icon: UserMinus,      label: 'DEMISSÃO',             color: 'text-destructive', bgColor: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' },
  pedido_demissao:  { icon: AlertTriangle,  label: 'PED. DEMISSÃO',        color: 'text-amber-600',   bgColor: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',         badge: 'PENDENTE' },
  transferencia:    { icon: ArrowRightLeft, label: 'TRANSFERÊNCIA',        color: 'text-blue-600',    bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',             badge: 'EM ANÁLISE' },
  troca_turno:      { icon: ArrowRightLeft, label: 'TRANSFERÊNCIA',        color: 'text-blue-600',    bgColor: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',             badge: 'EM ANÁLISE' },
};

function getMensagemRica(evento: EventoSistema): { linha1: string; linha2: string; linha3?: string } {
  const dados = (evento.dados_extra as any) || {};
  const setorOrigem = (evento.setor_nome || '—').toUpperCase();
  const funcionario = evento.funcionario_nome?.toUpperCase() || '';

  if (evento.tipo === 'transferencia' || evento.tipo === 'troca_turno') {
    const setorDestino = (dados.setor_destino || dados.setor_destino_nome || '—').toUpperCase();
    const turmaOrigem = evento.turma ? `TURMA ${evento.turma}` : '';
    const turmaDestino = dados.turma_destino ? `TURMA ${dados.turma_destino}` : '';
    const linha2 = `${setorOrigem}${turmaOrigem ? ` · ${turmaOrigem}` : ''} → ${setorDestino}${turmaDestino ? ` · ${turmaDestino}` : ''}`;
    const dataProg = dados.data_programada
      ? `📅 Programado para: ${new Date(dados.data_programada + 'T12:00:00').toLocaleDateString('pt-BR')}`
      : undefined;
    return { linha1: funcionario, linha2, linha3: dataProg };
  }

  if (evento.tipo === 'pedido_demissao') {
    return {
      linha1: funcionario,
      linha2: `${setorOrigem}${evento.turma ? ` · TURMA ${evento.turma}` : ''}`,
      linha3: '⚠️ Aguardando confirmação do RH',
    };
  }

  return {
    linha1: funcionario,
    linha2: `${setorOrigem}${evento.turma ? ` · TURMA ${evento.turma}` : ''}`,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventos: EventoSistema[];
  tipoNotificacao: 'modal' | 'sino';
}

export function SimulacaoNotificacaoModal({ open, onOpenChange, eventos, tipoNotificacao }: Props) {
  if (eventos.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4" />
            SIMULAÇÃO — VISÃO DO GESTOR ({tipoNotificacao === 'modal' ? 'MODAL' : 'SINO'})
          </DialogTitle>
          <DialogDescription className="text-xs">
            Abaixo está exatamente como a notificação aparecerá para o gestor
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold bg-muted/50 rounded px-2 py-1 text-center">
            ↓ PRÉVIA DA NOTIFICAÇÃO ↓
          </div>
        </div>

        {tipoNotificacao === 'modal' ? (
          <div className="mx-6 mb-6">
            {/* Simula o modal como o gestor verá */}
            <div className="rounded-xl border-2 shadow-lg p-5 bg-card border-border space-y-4">
              {eventos.map((evento) => {
                const config = TIPO_CONFIG[evento.tipo] || TIPO_CONFIG.demissao;
                const Icon = config.icon;
                const msg = getMensagemRica(evento);
                return (
                  <div key={evento.id} className="flex items-start gap-3">
                    <div className={cn("rounded-full p-2.5 shrink-0 border", config.bgColor)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-foreground">{config.label}</h3>
                        {config.badge && (
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border", config.bgColor, config.color)}>
                            {config.badge}
                          </span>
                        )}
                      </div>
                      {msg.linha1 && (
                        <p className="text-sm font-medium text-foreground mt-1 leading-relaxed">{msg.linha1}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{msg.linha2}</p>
                      {msg.linha3 && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{msg.linha3}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              <div className="flex gap-3 pt-2 border-t">
                <Button size="sm" className="flex-1 gap-2" disabled>
                  <ExternalLink className="h-3.5 w-3.5" />
                  VER DETALHES
                </Button>
                <Button variant="outline" size="sm" className="flex-1" disabled>
                  FECHAR
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-6 mb-6">
            {/* Simula notificação tipo sino */}
            <div className="space-y-2">
              {eventos.map((evento) => {
                const config = TIPO_CONFIG[evento.tipo] || TIPO_CONFIG.demissao;
                const Icon = config.icon;
                const msg = getMensagemRica(evento);
                return (
                  <div key={evento.id} className="flex items-center gap-3 rounded-lg border p-3 bg-card">
                    <div className={cn("rounded-full p-1.5 shrink-0 border", config.bgColor)}>
                      <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">
                        {config.label}{config.badge ? ` · ${config.badge}` : ''}
                      </p>
                      {msg.linha1 && (
                        <p className="text-[10px] text-foreground/80 font-medium truncate">{msg.linha1}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground truncate">{msg.linha2}</p>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                O gestor verá estas notificações ao clicar no ícone de sino
              </p>
            </div>
          </div>
        )}

        <div className="px-6 pb-6">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            FECHAR SIMULAÇÃO
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
