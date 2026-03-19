import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell, UserPlus, UserMinus, AlertTriangle, ArrowRightLeft, CheckCircle2,
  ThumbsUp, ThumbsDown, ClipboardList, ChevronLeft, ChevronRight,
  Monitor, Users, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const now = () => format(new Date(), "dd/MM HH:mm", { locale: ptBR });

interface ModeloNotificacao {
  tipo: string;
  badge: string;
  icon: typeof Bell;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeClass: string;
  titulo: string;
  mensagem: string;
  acoes: 'ciente' | 'sim_nao' | 'efetivar_desligar' | 'cobertura_treinamento';
  entrega: 'modal';
  destino: string;
}

const MODELOS: ModeloNotificacao[] = [
  {
    tipo: 'admissao_confirmacao',
    badge: 'ADMISSÃO',
    icon: UserPlus,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    badgeClass: 'bg-emerald-600 text-white',
    titulo: 'ADMISSÃO',
    mensagem: 'SOPRO A — TURMA 1A\n\n👤 MARIA DA SILVA\n\nO funcionário iniciou no setor?',
    acoes: 'sim_nao',
    entrega: 'modal',
    destino: 'Gestor do setor',
  },
  {
    tipo: 'admissao_resposta',
    badge: '↩ RESPOSTA ADMISSÃO',
    icon: UserPlus,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    badgeClass: 'bg-emerald-700 text-white',
    titulo: 'RESPOSTA — ADMISSÃO',
    mensagem: 'SOPRO A — TURMA 1A\n\n👤 MARIA DA SILVA\n\n✅ SIM, INICIOU\nRespondido por: GESTOR CARLOS\nem 25/02/2026 às 08:30',
    acoes: 'ciente',
    entrega: 'modal',
    destino: 'Admin / RH',
  },
  {
    tipo: 'demissao_lancada',
    badge: 'DEMISSÃO',
    icon: UserMinus,
    color: 'text-destructive',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    badgeClass: 'bg-red-600 text-white',
    titulo: 'DEMISSÃO',
    mensagem: 'DECORAÇÃO T1 — TURMA T1\n\n👤 JOÃO PEREIRA',
    acoes: 'ciente',
    entrega: 'modal',
    destino: 'Gestor do setor',
  },
  {
    tipo: 'pedido_demissao_lancado',
    badge: 'PED. DEMISSÃO',
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeClass: 'bg-amber-600 text-white',
    titulo: 'PEDIDO DEMISSÃO',
    mensagem: 'MOD SOPRO — TURMA 2B\n\n👤 ANA SANTOS',
    acoes: 'ciente',
    entrega: 'modal',
    destino: 'Gestor do setor',
  },
  {
    tipo: 'transferencia_pendente',
    badge: 'TRANSFERÊNCIA EM ANÁLISE',
    icon: ArrowRightLeft,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeClass: 'bg-blue-600 text-white',
    titulo: 'TRANSFERÊNCIA EM ANÁLISE',
    mensagem: '👤 CARLOS LIMA\n\nDE: SOPRO B · TURMA 1B\nPARA: DECORAÇÃO T1 · TURMA T1\n\n📝 Observação Gestor Origem: —\n📝 Observação Gestor Destino: —',
    acoes: 'ciente',
    entrega: 'modal',
    destino: 'Gestores origem e destino',
  },
  {
    tipo: 'transferencia_resposta',
    badge: '↩ RESPOSTA TRANSFERÊNCIA',
    icon: ArrowRightLeft,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeClass: 'bg-blue-700 text-white',
    titulo: 'RESPOSTA — TRANSFERÊNCIA',
    mensagem: '👤 CARLOS LIMA\n\nDE: SOPRO B · TURMA 1B\nPARA: DECORAÇÃO T1 · TURMA T1\n\n📝 Obs. Gestor Origem: "Bom funcionário, recomendo"\n📝 Obs. Gestor Destino: "Aceito, preciso de reforço"\n\nRespondido em 25/02/2026',
    acoes: 'ciente',
    entrega: 'modal',
    destino: 'Admin / RH',
  },
  {
    tipo: 'transferencia_realizada',
    badge: 'TRANSFERÊNCIA REALIZADA',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    badgeClass: 'bg-green-600 text-white',
    titulo: 'TRANSFERÊNCIA REALIZADA',
    mensagem: '👤 CARLOS LIMA\n\nDE: SOPRO B · TURMA 1B\nPARA: DECORAÇÃO T1 · TURMA T1\n\n📅 Data: 25/02/2026\n✅ Transferência concluída',
    acoes: 'ciente',
    entrega: 'modal',
    destino: 'Gestores origem e destino',
  },
  {
    tipo: 'divergencia_nova',
    badge: 'DIVERGÊNCIA',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    badgeClass: 'bg-orange-600 text-white',
    titulo: 'DIVERGÊNCIA',
    mensagem: 'SOPRO A — TURMA 1A\n\n👤 PEDRO ALVES\n\nFalta não justificada em 20/02/2026',
    acoes: 'ciente',
    entrega: 'modal',
    destino: 'Gestor do setor',
  },
  {
    tipo: 'experiencia_consulta',
    badge: 'EXPERIÊNCIA',
    icon: ClipboardList,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeClass: 'bg-amber-600 text-white',
    titulo: 'EXPERIÊNCIA',
    mensagem: 'MOD SOPRO — TURMA 2B\n\n👤 ROBERTO ALVES\n🆔 TEMP-0042\n\nCompleta 90 dias em 28/02/2026.\nQual a decisão? (Obrigatório responder)',
    acoes: 'efetivar_desligar',
    entrega: 'modal',
    destino: 'Gestor do setor',
  },
  {
    tipo: 'experiencia_resposta',
    badge: '↩ RESPOSTA EXPERIÊNCIA',
    icon: ClipboardList,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeClass: 'bg-amber-700 text-white',
    titulo: 'RESPOSTA — EXPERIÊNCIA',
    mensagem: 'MOD SOPRO — TURMA 2B\n\n👤 ROBERTO ALVES\n🆔 TEMP-0042\n\n✅ EFETIVAR\nRespondido por: GESTOR MARCOS\nem 26/02/2026 às 10:15',
    acoes: 'ciente',
    entrega: 'modal',
    destino: 'Admin / RH',
  },
  {
    tipo: 'cobertura_treinamento_consulta',
    badge: 'COB. FÉRIAS / TREINAMENTO',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    badgeClass: 'bg-orange-600 text-white',
    titulo: 'COB. FÉRIAS / TREINAMENTO',
    mensagem: 'SOPRO A — TURMA 1A\n\n👤 MARIA DA SILVA\n📋 Situação: COB. FÉRIAS\n\nO funcionário está nesta situação?',
    acoes: 'cobertura_treinamento',
    entrega: 'modal',
    destino: 'Gestor do setor',
  },
  {
    tipo: 'cobertura_treinamento_resposta',
    badge: '↩ RESPOSTA COB/TREIN.',
    icon: Users,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-200 dark:border-orange-800',
    badgeClass: 'bg-orange-700 text-white',
    titulo: 'RESPOSTA — COB. FÉRIAS / TREINAMENTO',
    mensagem: 'SOPRO A — TURMA 1A\n\n👤 MARIA DA SILVA\n📋 Situação: COB. FÉRIAS\n\n✅ SIM, ESTÁ\nRespondido por: GESTOR CARLOS\nem 25/02/2026 às 08:30',
    acoes: 'ciente',
    entrega: 'modal',
    destino: 'Admin / RH',
  },
  {
    tipo: 'evento_sistema_modal',
    badge: 'AVISO DO RH',
    icon: Bell,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/20',
    badgeClass: 'bg-primary text-primary-foreground',
    titulo: 'AVISO DO RH',
    mensagem: 'Atenção gestores: amanhã haverá reunião de alinhamento às 14h na sala de treinamento.\n\n💬 Mensagem personalizada do RH.',
    acoes: 'ciente',
    entrega: 'modal',
    destino: 'Todos os gestores',
  },
];

const MENU_LABELS: Record<string, string> = {
  admissao_confirmacao: 'Admissão',
  admissao_resposta: '↩ Resp. Admissão',
  demissao_lancada: 'Demissão',
  pedido_demissao_lancado: 'Ped. Demissão',
  transferencia_pendente: 'Transf. Análise',
  transferencia_resposta: '↩ Resp. Transf.',
  transferencia_realizada: 'Transf. Realizada',
  divergencia_nova: 'Divergência',
  experiencia_consulta: 'Experiência',
  experiencia_resposta: '↩ Resp. Experiência',
  cobertura_treinamento_consulta: 'Cob/Trein.',
  cobertura_treinamento_resposta: '↩ Resp. Cob/Trein.',
  evento_sistema_modal: 'Aviso RH',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ModeloCard({ modelo }: { modelo: ModeloNotificacao }) {
  const Icon = modelo.icon;
  
  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-xl border-2 p-5 transition-all',
        modelo.bgColor,
        modelo.borderColor
      )}
    >
      <div className={cn('rounded-full p-3 shrink-0 bg-card border', modelo.borderColor)}>
        <Icon className={cn('h-6 w-6', modelo.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider', modelo.badgeClass)}>
                {modelo.badge}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border bg-red-100 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
                <Monitor className="h-3 w-3" />
                MODAL
              </span>
            </div>
            <p className={cn('font-bold text-base', modelo.color)}>{modelo.titulo}</p>
            <p className="text-sm text-foreground mt-2 whitespace-pre-line leading-relaxed">
              {modelo.mensagem}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">
            {now()}
          </Badge>
        </div>

        {/* Destino + Histórico */}
        <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
          <span className="font-semibold">📨 Para: {modelo.destino}</span>
          <span>•</span>
          <span>📋 Registrado no histórico</span>
        </div>

        <div className="flex items-center gap-2 mt-3">
          {modelo.acoes === 'efetivar_desligar' ? (
            <>
              <Button size="sm" className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white" disabled>
                <ThumbsUp className="h-3.5 w-3.5" />
                EFETIVAR
              </Button>
              <Button size="sm" variant="destructive" className="gap-1.5 text-xs h-8" disabled>
                <ThumbsDown className="h-3.5 w-3.5" />
                DESLIGAR
              </Button>
            </>
          ) : modelo.acoes === 'cobertura_treinamento' ? (
            <>
              <Button size="sm" className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700 text-white" disabled>
                <ThumbsUp className="h-3.5 w-3.5" />
                SIM, ESTÁ
              </Button>
              <Button size="sm" variant="destructive" className="gap-1.5 text-xs h-8" disabled>
                <ThumbsDown className="h-3.5 w-3.5" />
                NÃO ESTÁ
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 text-blue-600 border-blue-300" disabled>
                <RotateCcw className="h-3.5 w-3.5" />
                JÁ RETORNOU
              </Button>
            </>
          ) : modelo.acoes === 'sim_nao' ? (
            <>
              <Button size="sm" className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700 text-white" disabled>
                <ThumbsUp className="h-3.5 w-3.5" />
                SIM, INICIOU
              </Button>
              <Button size="sm" variant="destructive" className="gap-1.5 text-xs h-8" disabled>
                <ThumbsDown className="h-3.5 w-3.5" />
                NÃO INICIOU
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className={cn('gap-1.5 text-xs h-8', modelo.color, 'border-current')} disabled>
              <CheckCircle2 className="h-3.5 w-3.5" />
              CIENTE
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GaleriaModelosModal({ open, onOpenChange }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const modelo = MODELOS[activeIndex];

  const prev = () => setActiveIndex(i => (i === 0 ? MODELOS.length - 1 : i - 1));
  const next = () => setActiveIndex(i => (i === MODELOS.length - 1 ? 0 : i + 1));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            GALERIA DE MODELOS — VISÃO DO GESTOR
          </DialogTitle>
          <DialogDescription className="text-xs">
            <span className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-red-600"><Monitor className="h-3.5 w-3.5" /> MODAL = aparece na tela do gestor</span>
              <span className="flex items-center gap-1">📋 Tudo registrado no histórico</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Menu de tipos */}
        <div className="px-6 flex flex-wrap gap-1.5">
          {MODELOS.map((m, idx) => (
            <button
              key={m.tipo}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                'text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all',
                idx === activeIndex
                  ? cn(m.badgeClass, 'shadow-sm')
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
              )}
            >
              {MENU_LABELS[m.tipo]}
            </button>
          ))}
        </div>

        {/* Card do modelo ativo */}
        <div className="px-6 py-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            {activeIndex + 1} de {MODELOS.length} — tipo: {modelo.tipo}
          </p>
          <ModeloCard modelo={modelo} />
        </div>

        {/* Navegação + Fechar */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prev} className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              ANTERIOR
            </Button>
            <Button variant="outline" size="sm" onClick={next} className="gap-1">
              PRÓXIMO
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            FECHAR
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
