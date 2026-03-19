import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Lock, Unlock, Calendar, Trash2 } from 'lucide-react';
import { usePeriodosPonto, useCreatePeriodo, useUpdatePeriodoStatus, useDeletePeriodo } from '@/hooks/usePonto';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { PeriodoStatus } from '@/types/database';

export default function Periodos() {
  const { data: periodos = [], isLoading } = usePeriodosPonto();
  const createPeriodo = useCreatePeriodo();
  const updateStatus = useUpdatePeriodoStatus();
  const deletePeriodo = useDeletePeriodo();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [periodoToDelete, setPeriodoToDelete] = useState<{ id: string; periodo: string } | null>(null);

  const resetForm = () => {
    setDataInicio(undefined);
    setDataFim(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dataInicio || !dataFim) return;

    await createPeriodo.mutateAsync({
      data_inicio: format(dataInicio, 'yyyy-MM-dd'),
      data_fim: format(dataFim, 'yyyy-MM-dd'),
    });

    setDialogOpen(false);
    resetForm();
  };

  const toggleStatus = async (id: string, currentStatus: PeriodoStatus) => {
    const newStatus = currentStatus === 'aberto' ? 'fechado' : 'aberto';
    await updateStatus.mutateAsync({ id, status: newStatus });
  };

  const handleDeleteClick = (id: string, dataInicio: string, dataFim: string) => {
    const periodo = `${format(parseISO(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} - ${format(parseISO(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`;
    setPeriodoToDelete({ id, periodo });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (periodoToDelete) {
      await deletePeriodo.mutateAsync(periodoToDelete.id);
      setDeleteDialogOpen(false);
      setPeriodoToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Períodos de Ponto</h1>
          <p className="page-description">Gerencie os períodos de controle de ponto</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Período
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Novo Período</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dataInicio && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dataFim && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      disabled={(date) => dataInicio ? date < dataInicio : false}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={!dataInicio || !dataFim || createPeriodo.isPending}
                >
                  Criar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-warning/10 p-4 text-sm">
        <p className="font-medium text-warning">⚠️ Atenção</p>
        <p className="mt-1 text-muted-foreground">
          Períodos fechados não podem ser alterados. Feche um período apenas quando todos os registros estiverem corretos.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Status</th>
                <th className="w-[200px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {periodos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum período cadastrado</p>
                  </td>
                </tr>
              ) : (
                periodos.map((periodo) => (
                  <tr key={periodo.id}>
                    <td className="font-medium">
                      {format(parseISO(periodo.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} - {format(parseISO(periodo.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td>
                      <Badge variant={periodo.status === 'aberto' ? 'default' : 'secondary'}>
                        {periodo.status === 'aberto' ? (
                          <>
                            <Unlock className="mr-1 h-3 w-3" />
                            Aberto
                          </>
                        ) : (
                          <>
                            <Lock className="mr-1 h-3 w-3" />
                            Fechado
                          </>
                        )}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={periodo.status === 'aberto' ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => toggleStatus(periodo.id, periodo.status)}
                          disabled={updateStatus.isPending}
                        >
                          {periodo.status === 'aberto' ? (
                            <>
                              <Lock className="mr-1 h-3 w-3" />
                              Fechar
                            </>
                          ) : (
                            <>
                              <Unlock className="mr-1 h-3 w-3" />
                              Reabrir
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(periodo.id, periodo.data_inicio, periodo.data_fim)}
                          disabled={deletePeriodo.isPending}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o período <strong>{periodoToDelete?.periodo}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita e todos os registros de faltas deste período serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
