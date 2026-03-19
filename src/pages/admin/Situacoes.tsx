import { useState } from 'react';
import { Plus, Edit, FileText, Download } from 'lucide-react';
// xlsx-js-style loaded dynamically
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useSituacoes, useCreateSituacao, useUpdateSituacao } from '@/hooks/useSituacoes';
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
import { Situacao } from '@/types/database';

export default function Situacoes() {
  const { data: situacoes = [], isLoading } = useSituacoes();
  const createSituacao = useCreateSituacao();
  const updateSituacao = useUpdateSituacao();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSituacao, setEditingSituacao] = useState<Situacao | null>(null);
  
  const [nome, setNome] = useState('');
  const [ativa, setAtiva] = useState(true);
  const [contaNoQuadro, setContaNoQuadro] = useState(true);
  const [entraNoPonto, setEntraNoPonto] = useState(true);

  const resetForm = () => {
    setNome('');
    setAtiva(true);
    setContaNoQuadro(true);
    setEntraNoPonto(true);
    setEditingSituacao(null);
  };

  const exportarRelatorio = async () => {
    const XLSX = await import('xlsx-js-style');
    if (situacoes.length === 0) {
      toast.error('Nenhuma situação para exportar');
      return;
    }
    const dados = situacoes.map(s => ({
      'Situação': s.nome,
      'Ativa': s.ativa ? 'SIM' : 'NÃO',
      'Conta no Quadro': s.conta_no_quadro ? 'SIM' : 'NÃO',
      'Entra no Ponto': s.entra_no_ponto ? 'SIM' : 'NÃO',
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Situações');
    XLSX.writeFile(wb, `Relatorio_Situacoes_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`);
    toast.success('Relatório exportado!');
  };

  const openEdit = (situacao: Situacao) => {
    setEditingSituacao(situacao);
    setNome(situacao.nome);
    setAtiva(situacao.ativa);
    setContaNoQuadro(situacao.conta_no_quadro);
    setEntraNoPonto(situacao.entra_no_ponto);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      nome,
      ativa,
      conta_no_quadro: contaNoQuadro,
      entra_no_ponto: entraNoPonto,
    };

    if (editingSituacao) {
      await updateSituacao.mutateAsync({ id: editingSituacao.id, ...data });
    } else {
      await createSituacao.mutateAsync(data);
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
          <h1 className="page-title">Situações</h1>
          <p className="page-description">Configure as regras centrais do sistema</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Situação
            </Button>
          </DialogTrigger>
          <Button variant="outline" onClick={exportarRelatorio}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Relatório
          </Button>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {editingSituacao ? 'Editar Situação' : 'Nova Situação'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Situação</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Ativo, Férias, Afastado"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Ativa</Label>
                  <p className="text-sm text-muted-foreground">
                    Situação disponível para uso
                  </p>
                </div>
                <Switch checked={ativa} onCheckedChange={setAtiva} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Conta no Quadro</Label>
                  <p className="text-sm text-muted-foreground">
                    Funcionário entra nas estatísticas
                  </p>
                </div>
                <Switch checked={contaNoQuadro} onCheckedChange={setContaNoQuadro} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Entra no Ponto</Label>
                  <p className="text-sm text-muted-foreground">
                    Funcionário aparece no controle de ponto
                  </p>
                </div>
                <Switch checked={entraNoPonto} onCheckedChange={setEntraNoPonto} />
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
                <Button type="submit" disabled={createSituacao.isPending || updateSituacao.isPending}>
                  {editingSituacao ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-info/10 p-4 text-sm">
        <p className="font-medium text-info">💡 Regras Centrais</p>
        <p className="mt-1 text-muted-foreground">
          As situações definem as regras do sistema. Altere aqui para ajustar automaticamente todo o comportamento.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Ativa</th>
                <th>Conta no Quadro</th>
                <th>Entra no Ponto</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {situacoes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma situação cadastrada</p>
                  </td>
                </tr>
              ) : (
                situacoes.map((situacao) => (
                  <tr key={situacao.id}>
                    <td className="font-medium">{situacao.nome}</td>
                    <td>
                      <Badge variant={situacao.ativa ? 'default' : 'secondary'}>
                        {situacao.ativa ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={situacao.conta_no_quadro ? 'default' : 'secondary'}>
                        {situacao.conta_no_quadro ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={situacao.entra_no_ponto ? 'default' : 'secondary'}>
                        {situacao.entra_no_ponto ? 'Sim' : 'Não'}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(situacao)}
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
