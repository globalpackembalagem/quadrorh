import { useState, useEffect } from 'react';
import { UserPlus, UserMinus, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAvisosNaoLidos, useMarcarTodosAvisosLidos, AvisoMovimentacao } from '@/hooks/useAvisosMovimentacao';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const TIPO_CONFIG: Record<string, { icon: typeof UserPlus; label: string; color: string; bgColor: string }> = {
  admissao: {
    icon: UserPlus,
    label: 'ADMISSÃO',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
  },
  demissao: {
    icon: UserMinus,
    label: 'DEMISSÃO',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
  },
  pedido_demissao: {
    icon: AlertTriangle,
    label: 'PEDIDO DE DEMISSÃO',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
  },
};

export function AvisoMovimentacaoModal() {
  const { userRole, isVisualizacao, isAdmin } = useAuth();
  const userRoleId = userRole?.id;

  // Só mostra para gestores e admin (não visualização)
  const shouldFetch = !isVisualizacao && !!userRoleId && userRoleId !== 'visualizacao';

  const { data: avisosNaoLidos = [] } = useAvisosNaoLidos(shouldFetch ? userRoleId : undefined);
  const marcarTodosLidos = useMarcarTodosAvisosLidos();

  const [currentTypeIndex, setCurrentTypeIndex] = useState(0);
  const [open, setOpen] = useState(false);

  // Agrupar avisos por tipo
  const avisosPorTipo = avisosNaoLidos.reduce((acc, aviso) => {
    if (!acc[aviso.tipo]) acc[aviso.tipo] = [];
    acc[aviso.tipo].push(aviso);
    return acc;
  }, {} as Record<string, AvisoMovimentacao[]>);

  const tipos = Object.keys(avisosPorTipo);

  // Abrir modal quando há avisos não lidos
  useEffect(() => {
    if (avisosNaoLidos.length > 0 && !open) {
      setCurrentTypeIndex(0);
      setOpen(true);
    }
  }, [avisosNaoLidos.length]);

  if (!shouldFetch || tipos.length === 0) return null;

  const tipoAtual = tipos[currentTypeIndex];
  const avisosDoTipo = avisosPorTipo[tipoAtual] || [];
  const config = TIPO_CONFIG[tipoAtual] || TIPO_CONFIG.demissao;
  const Icon = config.icon;

  // Somar quantidades do tipo atual
  const totalQuantidade = avisosDoTipo.reduce((sum, a) => sum + a.quantidade, 0);

  const handleClose = () => {
    // Marcar avisos do tipo atual como lidos
    const idsDoTipo = avisosDoTipo.map(a => a.id);
    if (userRoleId) {
      marcarTodosLidos.mutate({ avisoIds: idsDoTipo, userRoleId });
    }

    // Avançar para próximo tipo ou fechar
    if (currentTypeIndex < tipos.length - 1) {
      setCurrentTypeIndex(prev => prev + 1);
    } else {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", config.color)} />
            <span className={config.color}>{config.label}</span>
          </DialogTitle>
          <DialogDescription>Avisos de movimentação de pessoal pendentes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Resumo principal */}
          <div className={cn("rounded-lg border p-4 text-center", config.bgColor)}>
            <p className={cn("text-3xl font-bold", config.color)}>{totalQuantidade}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {tipoAtual === 'admissao' && 'funcionário(s) admitido(s)'}
              {tipoAtual === 'demissao' && 'funcionário(s) demitido(s)'}
              {tipoAtual === 'pedido_demissao' && 'pedido(s) de demissão'}
            </p>
          </div>

          {/* Detalhes por setor */}
          <div className="space-y-2">
            {avisosDoTipo.map(aviso => (
              <div key={aviso.id} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-md">
                <span className="text-sm font-medium">
                  {aviso.setor_nome || 'Geral'}
                </span>
                <span className={cn("text-sm font-bold", config.color)}>
                  {aviso.quantidade}
                </span>
              </div>
            ))}
          </div>

          {/* Indicador de mais tipos */}
          {tipos.length > 1 && (
            <p className="text-xs text-muted-foreground text-center">
              {currentTypeIndex + 1} de {tipos.length} avisos
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <Button onClick={handleClose} className="w-full">
            {currentTypeIndex < tipos.length - 1 ? 'Próximo Aviso' : 'Entendido'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
