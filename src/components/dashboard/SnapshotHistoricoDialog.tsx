import { useState } from 'react';
import { History, Lock, Calendar, User, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Users, ArrowRightLeft } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSnapshotsQuadro, SnapshotQuadro } from '@/hooks/useSnapshotsQuadro';
import { cn } from '@/lib/utils';

interface SnapshotHistoricoDialogProps {
  grupo: string;
  grupos?: string[];
}

export function SnapshotHistoricoDialog({ grupo, grupos }: SnapshotHistoricoDialogProps) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            HISTORICO DE SNAPSHOTS - {grupo}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh]">
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
                <p className="text-xs mt-1">CLIQUE NO CADEADO NOS CARDS DE TURMA PARA TRAVAR</p>
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

interface FuncionarioSnapshot {
  nome: string;
  matricula: string;
  situacao: string;
  cargo: string;
  empresa: string;
  setor: string;
}

function SnapshotCard({ snapshot, expanded, onToggle }: {
  snapshot: SnapshotQuadro;
  expanded: boolean;
  onToggle: () => void;
}) {
  const detalhes = snapshot.detalhes as Record<string, unknown>;
  const funcionarios = (detalhes.funcionarios || []) as FuncionarioSnapshot[];
  const movimentacoes = (snapshot.movimentacoes || []) as Array<Record<string, unknown>>;
  const diff = snapshot.diferenca;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="font-bold text-sm flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">{snapshot.grupo}</Badge>
              {format(parseISO(snapshot.data_referencia), "dd/MM/yyyy", { locale: ptBR })}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {snapshot.travado_por} - {format(parseISO(snapshot.created_at), "HH:mm", { locale: ptBR })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3">
          <Tabs defaultValue="funcionarios" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="funcionarios" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                FUNCIONARIOS ({funcionarios.length})
              </TabsTrigger>
              <TabsTrigger value="movimentacoes" className="text-xs">
                <ArrowRightLeft className="h-3 w-3 mr-1" />
                MOVIMENTACOES ({movimentacoes.length})
              </TabsTrigger>
              <TabsTrigger value="resumo" className="text-xs">
                RESUMO
              </TabsTrigger>
            </TabsList>

            <TabsContent value="funcionarios" className="mt-3">
              {funcionarios.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  SNAPSHOT ANTIGO - SEM LISTA DE FUNCIONARIOS
                </p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {funcionarios.sort((a, b) => a.nome.localeCompare(b.nome)).map((f, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded bg-muted/40 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                        <span className="font-medium truncate">{f.nome}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {f.matricula && (
                          <span className="text-muted-foreground">{f.matricula}</span>
                        )}
                        <Badge variant="outline" className="text-[9px]">
                          {f.situacao}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="movimentacoes" className="mt-3">
              {movimentacoes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  NENHUMA MOVIMENTACAO REGISTRADA
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {movimentacoes.map((mov, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded bg-muted/30 text-xs">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0",
                          String(mov.tipo_movimentacao || '').includes('ADMISS') && "border-success text-success",
                          String(mov.tipo_movimentacao || '').includes('DEMISS') && "border-destructive text-destructive",
                          String(mov.tipo_movimentacao || '').includes('TRANSFER') && "border-warning text-warning",
                        )}
                      >
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
              )}
            </TabsContent>

            <TabsContent value="resumo" className="mt-3">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(detalhes)
                  .filter(([key]) => key !== 'funcionarios')
                  .map(([key, val]) => (
                    <div key={key} className="flex justify-between items-center px-3 py-2 rounded bg-muted/50 text-xs">
                      <span className="text-muted-foreground">{String(key).replace(/_/g, ' ').toUpperCase()}</span>
                      <span className="font-bold tabular-nums">{String(val)}</span>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
