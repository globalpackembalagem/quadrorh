import { useState } from 'react';
import { History, Lock, Calendar, User, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSnapshotsQuadro, SnapshotQuadro } from '@/hooks/useSnapshotsQuadro';
import { cn } from '@/lib/utils';

interface SnapshotHistoricoDialogProps {
  grupo: string;
  /** If provided, queries all these groups instead of just `grupo` */
  grupos?: string[];
}

export function SnapshotHistoricoDialog({ grupo, grupos }: SnapshotHistoricoDialogProps) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // If grupos array provided, fetch all (no single filter)
  const { data: allSnapshots = [], isLoading } = useSnapshotsQuadro();
  
  const snapshots = grupos
    ? allSnapshots.filter(s => grupos.includes(s.grupo))
    : allSnapshots.filter(s => s.grupo === grupo);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          HISTORICO TRAVADO
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            HISTORICO DE SNAPSHOTS - {grupo}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="space-y-3 pr-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            )}

            {!isLoading && snapshots.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Lock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>NENHUM SNAPSHOT TRAVADO AINDA</p>
                <p className="text-xs mt-1">TRAVE UMA DATA NOS CARDS DE TURMA PARA SALVAR</p>
              </div>
            )}

            {snapshots.map((snap) => (
              <SnapshotCard
                key={snap.id}
                snapshot={snap}
                expanded={expandedId === snap.id}
                onToggle={() => setExpandedId(prev => prev === snap.id ? null : snap.id)}
              />
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SnapshotCard({ snapshot, expanded, onToggle }: {
  snapshot: SnapshotQuadro;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detalhes = snapshot.detalhes as Record<string, unknown>;
  const movimentacoes = (snapshot.movimentacoes || []) as Array<Record<string, unknown>>;
  const diff = snapshot.diferenca;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="font-bold text-sm">
              {format(parseISO(snapshot.data_referencia), "dd/MM/yyyy", { locale: ptBR })}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {snapshot.travado_por} - {format(parseISO(snapshot.created_at), "HH:mm", { locale: ptBR })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Metrics summary */}
          <div className="text-right">
            <div className="text-lg font-bold tabular-nums">{snapshot.quadro_real}</div>
            <div className="text-xs text-muted-foreground">/ {snapshot.quadro_necessario}</div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "font-bold",
              diff > 0 && "border-success text-success",
              diff < 0 && "border-destructive text-destructive",
              diff === 0 && "border-muted-foreground text-muted-foreground"
            )}
          >
            {diff > 0 ? (
              <><TrendingUp className="h-3 w-3 mr-1" />+{diff}</>
            ) : diff < 0 ? (
              <><TrendingDown className="h-3 w-3 mr-1" />{diff}</>
            ) : (
              <><Minus className="h-3 w-3 mr-1" />OK</>
            )}
          </Badge>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4">
          {/* Breakdown */}
          {Object.keys(detalhes).length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase">DETALHAMENTO</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(detalhes).map(([key, val]) => (
                  <div key={key} className="flex justify-between items-center px-2 py-1.5 rounded bg-muted/50 text-xs">
                    <span className="text-muted-foreground">{String(key).replace(/_/g, ' ').toUpperCase()}</span>
                    <span className="font-bold tabular-nums">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Movimentacoes */}
          {movimentacoes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-muted-foreground mb-2 uppercase">
                MOVIMENTACOES ({movimentacoes.length})
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {movimentacoes.map((mov, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/30 text-xs">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {String(mov.tipo_movimentacao || mov.tipo || '')}
                    </Badge>
                    <span className="font-medium truncate">{String(mov.funcionario_nome || mov.nome || '')}</span>
                    {mov.data && (
                      <span className="text-muted-foreground ml-auto shrink-0">
                        {String(mov.data)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {movimentacoes.length === 0 && Object.keys(detalhes).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              SEM DETALHES ADICIONAIS
            </p>
          )}
        </div>
      )}
    </div>
  );
}
