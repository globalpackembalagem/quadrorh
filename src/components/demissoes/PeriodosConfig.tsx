import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  usePeriodosDemissao,
  useCreatePeriodoDemissao,
  useUpdatePeriodoDemissao,
  useDeletePeriodoDemissao,
} from '@/hooks/useDemissoes';
import { PeriodoDemissao } from '@/types/demissao';

export function PeriodosConfig() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPeriodo, setNewPeriodo] = useState({
    nome: '',
    data_inicio: '',
    data_fim: '',
  });
  const [editData, setEditData] = useState({
    nome: '',
    data_inicio: '',
    data_fim: '',
  });
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: periodos = [], isLoading } = usePeriodosDemissao();
  const createPeriodo = useCreatePeriodoDemissao();
  const updatePeriodo = useUpdatePeriodoDemissao();
  const deletePeriodo = useDeletePeriodoDemissao();

  const handleCreate = async () => {
    if (!newPeriodo.nome || !newPeriodo.data_inicio || !newPeriodo.data_fim) return;
    
    await createPeriodo.mutateAsync({
      nome: newPeriodo.nome,
      data_inicio: newPeriodo.data_inicio,
      data_fim: newPeriodo.data_fim,
      ordem: periodos.length + 1,
      ativo: true,
    });
    
    setNewPeriodo({ nome: '', data_inicio: '', data_fim: '' });
    setShowNewForm(false);
  };

  const handleEdit = (periodo: PeriodoDemissao) => {
    setEditingId(periodo.id);
    setEditData({
      nome: periodo.nome,
      data_inicio: periodo.data_inicio,
      data_fim: periodo.data_fim,
    });
  };

  const handleSaveEdit = async (id: string) => {
    await updatePeriodo.mutateAsync({
      id,
      nome: editData.nome,
      data_inicio: editData.data_inicio,
      data_fim: editData.data_fim,
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deletePeriodo.mutateAsync(id);
  };

  if (isLoading) {
    return <div className="text-center py-4">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure os períodos semanais para controle de término de contratos.
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Data Início</TableHead>
            <TableHead>Data Fim</TableHead>
            <TableHead className="w-[120px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {periodos.map((periodo) => (
            <TableRow key={periodo.id}>
              {editingId === periodo.id ? (
                <>
                  <TableCell>
                    <Input
                      value={editData.nome}
                      onChange={(e) => setEditData({ ...editData, nome: e.target.value })}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={editData.data_inicio}
                      onChange={(e) => setEditData({ ...editData, data_inicio: e.target.value })}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={editData.data_fim}
                      onChange={(e) => setEditData({ ...editData, data_fim: e.target.value })}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSaveEdit(periodo.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{periodo.nome}</TableCell>
                  <TableCell>
                    {format(new Date(periodo.data_inicio), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(periodo.data_fim), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(periodo)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(periodo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Novo Período */}
      {showNewForm ? (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Nome</Label>
              <Input
                placeholder="Ex: 01/01 a 10/01"
                value={newPeriodo.nome}
                onChange={(e) => setNewPeriodo({ ...newPeriodo, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={newPeriodo.data_inicio}
                onChange={(e) => setNewPeriodo({ ...newPeriodo, data_inicio: e.target.value })}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={newPeriodo.data_fim}
                onChange={(e) => setNewPeriodo({ ...newPeriodo, data_fim: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={createPeriodo.isPending}>
              Salvar
            </Button>
            <Button variant="outline" onClick={() => setShowNewForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setShowNewForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Período
        </Button>
      )}
    </div>
  );
}
