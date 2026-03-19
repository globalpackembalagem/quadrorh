import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Unlock, Calendar, Clock, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCreateLiberacao, useDeleteLiberacao, useLiberacoesFaltas, LiberacaoFalta } from '@/hooks/useLiberacoesFaltas';
import { useAuth } from '@/hooks/useAuth';

interface Setor {
  id: string;
  nome: string;
  conta_no_quadro?: boolean;
}

interface Periodo {
  data_inicio: string;
  data_fim: string;
}

interface LiberarDatasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setores: Setor[];
  periodo: Periodo | undefined;
}

export function LiberarDatasDialog({ open, onOpenChange, setores, periodo }: LiberarDatasDialogProps) {
  const { userRole } = useAuth();
  const { data: liberacoes = [] } = useLiberacoesFaltas();
  const createLiberacao = useCreateLiberacao();
  const deleteLiberacao = useDeleteLiberacao();

  const [selectedSetores, setSelectedSetores] = useState<Set<string>>(new Set());
  const [selectedDatas, setSelectedDatas] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'liberar' | 'ativas'>('liberar');

  const setoresDoQuadro = useMemo(() =>
    setores.filter(s => s.conta_no_quadro), [setores]);

  const diasPeriodo = useMemo(() => {
    if (!periodo) return [];
    return eachDayOfInterval({
      start: parseISO(periodo.data_inicio),
      end: parseISO(periodo.data_fim),
    });
  }, [periodo]);

  const toggleSetor = (id: string) => {
    setSelectedSetores(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleData = (dataStr: string) => {
    setSelectedDatas(prev => {
      const next = new Set(prev);
      if (next.has(dataStr)) next.delete(dataStr); else next.add(dataStr);
      return next;
    });
  };

  const selectAllSetores = () => {
    if (selectedSetores.size === setoresDoQuadro.length) {
      setSelectedSetores(new Set());
    } else {
      setSelectedSetores(new Set(setoresDoQuadro.map(s => s.id)));
    }
  };

  const handleLiberar = async () => {
    if (selectedSetores.size === 0) { toast.error('Selecione pelo menos um setor'); return; }
    if (selectedDatas.size === 0) { toast.error('Selecione pelo menos uma data'); return; }

    try {
      await createLiberacao.mutateAsync({
        setor_ids: Array.from(selectedSetores),
        datas: Array.from(selectedDatas),
        liberado_por: userRole?.nome || 'ADMIN',
      });
      toast.success(`${selectedDatas.size} data(s) liberada(s) para ${selectedSetores.size} setor(es)! Expira em 24h.`);
      setSelectedSetores(new Set());
      setSelectedDatas(new Set());
    } catch {
      toast.error('Erro ao liberar datas');
    }
  };

  const handleRevogar = async (lib: LiberacaoFalta) => {
    try {
      await deleteLiberacao.mutateAsync(lib.id);
      toast.success('Liberação revogada!');
    } catch {
      toast.error('Erro ao revogar');
    }
  };

  const getSetorNome = (setorId: string) =>
    setores.find(s => s.id === setorId)?.nome || 'Desconhecido';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-primary" />
            Liberar Datas para Gestores
          </DialogTitle>
          <DialogDescription>
            Selecione os setores e as datas que deseja liberar. A liberação expira em 24 horas.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={tab === 'liberar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('liberar')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Liberar Datas
          </Button>
          <Button
            variant={tab === 'ativas' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab('ativas')}
          >
            <Clock className="h-4 w-4 mr-1" />
            Ativas ({liberacoes.length})
          </Button>
        </div>

        {tab === 'liberar' && (
          <div className="flex-1 overflow-hidden space-y-4">
            {/* Setores */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold text-sm">Setores</Label>
                <Button variant="ghost" size="sm" onClick={selectAllSetores} className="text-xs h-6">
                  {selectedSetores.size === setoresDoQuadro.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
              </div>
              <ScrollArea className="h-28">
                <div className="flex flex-wrap gap-2">
                  {setoresDoQuadro.map(setor => (
                    <label
                      key={setor.id}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-pointer text-xs transition-colors ${
                        selectedSetores.has(setor.id) ? 'bg-primary/10 border-primary' : 'border-border hover:bg-muted'
                      }`}
                    >
                      <Checkbox
                        checked={selectedSetores.has(setor.id)}
                        onCheckedChange={() => toggleSetor(setor.id)}
                        className="h-3.5 w-3.5"
                      />
                      {setor.nome}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Datas */}
            <div>
              <Label className="font-semibold text-sm mb-2 block">
                Datas do Período ({selectedDatas.size} selecionada{selectedDatas.size !== 1 ? 's' : ''})
              </Label>
              <ScrollArea className="h-44">
                <div className="grid grid-cols-5 sm:grid-cols-7 gap-1">
                  {diasPeriodo.map(dia => {
                    const dataStr = format(dia, 'yyyy-MM-dd');
                    const isSelected = selectedDatas.has(dataStr);
                    const diaSemana = format(dia, 'EEE', { locale: ptBR }).toUpperCase().slice(0, 3);
                    const isWeekend = dia.getDay() === 0 || dia.getDay() === 6;
                    return (
                      <button
                        key={dataStr}
                        onClick={() => toggleData(dataStr)}
                        className={`flex flex-col items-center p-1.5 rounded-md border text-xs transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : isWeekend
                            ? 'border-border bg-muted/50 hover:bg-muted text-muted-foreground'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <span className="text-[10px] font-medium">{diaSemana}</span>
                        <span className="font-bold">{format(dia, 'dd')}</span>
                        <span className="text-[10px]">{format(dia, 'MMM', { locale: ptBR })}</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {tab === 'ativas' && (
          <ScrollArea className="flex-1 max-h-80">
            {liberacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma liberação ativa.</p>
            ) : (
              <div className="space-y-2">
                {liberacoes.map(lib => (
                  <div key={lib.id} className="flex items-center justify-between px-3 py-2 rounded-md border bg-card">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getSetorNome(lib.setor_id)}
                      </Badge>
                      <span className="text-sm font-medium">
                        {format(parseISO(lib.data_liberada), 'dd/MM/yyyy (EEE)', { locale: ptBR })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        por {lib.liberado_por}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Expira: {format(parseISO(lib.expira_em), 'dd/MM HH:mm')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevogar(lib)}
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {tab === 'liberar' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            <Button
              onClick={handleLiberar}
              disabled={selectedSetores.size === 0 || selectedDatas.size === 0 || createLiberacao.isPending}
            >
              {createLiberacao.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              Liberar ({selectedDatas.size} data{selectedDatas.size !== 1 ? 's' : ''})
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
