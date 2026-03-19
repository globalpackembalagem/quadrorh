import { useState } from 'react';
import { Plus, Edit, Building2 } from 'lucide-react';
import { useSetores, useCreateSetor, useUpdateSetor } from '@/hooks/useSetores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Setor } from '@/types/database';

export default function Setores() {
  const { data: setores = [], isLoading } = useSetores();
  const createSetor = useCreateSetor();
  const updateSetor = useUpdateSetor();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
  
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [contaNoQuadro, setContaNoQuadro] = useState(true);
  const [grupo, setGrupo] = useState('');

  const resetForm = () => {
    setNome('');
    setAtivo(true);
    setContaNoQuadro(true);
    setGrupo('');
    setEditingSetor(null);
  };

  const openEdit = (setor: Setor) => {
    setEditingSetor(setor);
    setNome(setor.nome);
    setAtivo(setor.ativo);
    setContaNoQuadro(setor.conta_no_quadro);
    setGrupo(setor.grupo || '');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      nome,
      ativo,
      conta_no_quadro: contaNoQuadro,
      grupo: grupo || null,
    };

    if (editingSetor) {
      await updateSetor.mutateAsync({ id: editingSetor.id, ...data });
    } else {
      await createSetor.mutateAsync(data);
    }

    setDialogOpen(false);
    resetForm();
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
          <h1 className="page-title">Setores</h1>
          <p className="page-description">Configure os setores da empresa</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Setor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {editingSetor ? 'Editar Setor' : 'Novo Setor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Setor</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Administrativo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grupo">Grupo (consolidação)</Label>
                <Input
                  id="grupo"
                  value={grupo}
                  onChange={(e) => setGrupo(e.target.value)}
                  placeholder="Ex: SOPRO A"
                />
                <p className="text-xs text-muted-foreground">
                  Setores com o mesmo grupo são exibidos juntos no dashboard
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativo</Label>
                  <p className="text-sm text-muted-foreground">
                    Setor disponível para uso
                  </p>
                </div>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Conta no Quadro</Label>
                  <p className="text-sm text-muted-foreground">
                    Funcionários contam nas estatísticas
                  </p>
                </div>
                <Switch checked={contaNoQuadro} onCheckedChange={setContaNoQuadro} />
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
                <Button type="submit" disabled={createSetor.isPending || updateSetor.isPending}>
                  {editingSetor ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Grupo</th>
                <th>Ativo</th>
                <th>Conta no Quadro</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {setores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum setor cadastrado</p>
                  </td>
                </tr>
              ) : (
                setores.map((setor) => (
                  <tr key={setor.id}>
                    <td className="font-medium">{setor.nome}</td>
                    <td className="text-muted-foreground">{setor.grupo || '-'}</td>
                    <td>
                      <Badge variant={setor.ativo ? 'default' : 'secondary'}>
                        {setor.ativo ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={setor.conta_no_quadro ? 'default' : 'secondary'}>
                        {setor.conta_no_quadro ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(setor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
