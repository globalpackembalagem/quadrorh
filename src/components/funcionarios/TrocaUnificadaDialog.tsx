import { useState, useMemo } from 'react';
import { ArrowRightLeft, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCriarTrocaTurno } from '@/hooks/useTrocasTurno';
import { useSetoresAtivos } from '@/hooks/useSetores';
import { useAuth } from '@/hooks/useAuth';
import { useRegistrarHistoricoFuncionario } from '@/hooks/useHistoricoFuncionarios';
import { Funcionario } from '@/types/database';
import { toast } from 'sonner';

interface TrocaUnificadaDialogProps {
  funcionarios: Funcionario[];
}

export function TrocaUnificadaDialog({ funcionarios }: TrocaUnificadaDialogProps) {
  const { isVisualizacao, canEditFuncionarios, isAdmin, userRole } = useAuth();
  const { data: setores = [] } = useSetoresAtivos();
  const criarTroca = useCriarTrocaTurno();
  const registrarHistorico = useRegistrarHistoricoFuncionario();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [setorDestinoId, setSetorDestinoId] = useState('');
  const [turmaDestino, setTurmaDestino] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataProgramada, setDataProgramada] = useState('');

  const turmasDisponiveis = useMemo(() => {
    if (!setorDestinoId) {
      // Fallback baseado no setor atual do funcionário
      const setorNome = selectedFuncionario?.setor?.nome?.toUpperCase() || '';
      if (setorNome.includes('SOPRO') || setorNome.includes('PRODUÇÃO')) return ['1A', '1B', '2A', '2B'];
      if (setorNome.includes('DECORAÇÃO') || setorNome.includes('DECORACAO')) return ['T1', 'T2'];
      return ['T1', 'T2', '1A', '1B', '2A', '2B'];
    }
    const setorDest = setores.find(s => s.id === setorDestinoId);
    const nomeUpper = setorDest?.nome?.toUpperCase() || '';
    const grupoUpper = setorDest?.grupo?.toUpperCase() || '';
    if (nomeUpper.includes('SOPRO') || nomeUpper.includes('PRODUÇÃO') || grupoUpper.startsWith('SOPRO')) return ['1A', '1B', '2A', '2B'];
    if (nomeUpper.includes('DECORAÇÃO') || nomeUpper.includes('DECORACAO') || grupoUpper.includes('DECORAÇÃO')) return ['T1', 'T2'];
    return [];
  }, [setorDestinoId, setores, selectedFuncionario]);
  const canCreate = isAdmin || canEditFuncionarios;

  const funcionariosFiltrados = useMemo(() => {
    const ativos = funcionarios.filter(f => {
      const sit = f.situacao?.nome?.toUpperCase() || '';
      return sit === 'ATIVO' || sit === 'FÉRIAS' || sit === 'SUMIDO';
    });

    if (!search) return ativos;
    const s = search.toLowerCase();
    return ativos.filter(f =>
      f.nome_completo.toLowerCase().includes(s) ||
      f.matricula?.toLowerCase().includes(s)
    );
  }, [funcionarios, search]);

  const setoresDisponiveis = useMemo(() => {
    const filtrados = selectedFuncionario
      ? setores.filter(s => s.id !== selectedFuncionario.setor_id)
      : setores;
    // Setores do quadro primeiro, depois o restante
    return [...filtrados].sort((a, b) => {
      if (a.conta_no_quadro && !b.conta_no_quadro) return -1;
      if (!a.conta_no_quadro && b.conta_no_quadro) return 1;
      return a.nome.localeCompare(b.nome);
    });
  }, [setores, selectedFuncionario]);

  const resetFields = () => {
    setSelectedFuncionario(null);
    setSetorDestinoId('');
    setTurmaDestino('');
    setObservacoes('');
    setDataProgramada('');
    setSearch('');
  };

  const handleSubmit = async () => {
    if (!selectedFuncionario || !setorDestinoId) {
      toast.error('Selecione o funcionário e o setor de destino');
      return;
    }

    setIsLoading(true);
    try {
      const setorOrigem = setores.find(s => s.id === selectedFuncionario.setor_id);
      const setorDestino = setores.find(s => s.id === setorDestinoId);
      const nomeUsuario = userRole?.nome || 'Sistema';

      // Determinar tipo automaticamente: se muda setor = transferencia, se só turma = troca_turno
      const tipo = setorDestinoId !== selectedFuncionario.setor_id ? 'transferencia' : 'troca_turno';

      await criarTroca.mutateAsync({
        funcionario_id: selectedFuncionario.id,
        setor_origem_id: selectedFuncionario.setor_id,
        turma_origem: selectedFuncionario.turma,
        setor_destino_id: setorDestinoId,
        turma_destino: turmaDestino || null,
        observacoes: observacoes || undefined,
        criado_por: nomeUsuario,
        data_programada: dataProgramada || null,
        tipo,
      });

      await registrarHistorico.mutateAsync({
        tabela: 'funcionarios',
        operacao: tipo === 'transferencia' ? 'TRANSFERENCIA' : 'TROCA_TURNO',
        registro_id: selectedFuncionario.id,
        dados_anteriores: {
          nome: selectedFuncionario.nome_completo,
          setor: setorOrigem?.nome,
          turma: selectedFuncionario.turma,
        },
        dados_novos: {
          nome: selectedFuncionario.nome_completo,
          setor_destino: setorDestino?.nome,
          turma_destino: turmaDestino || selectedFuncionario.turma,
          data_programada: dataProgramada || null,
          solicitado_por: nomeUsuario,
        },
      });

      resetFields();
    } catch (error) {
      console.error('Erro ao criar movimentação:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVisualizacao || !canCreate) return null;

  return (
    <>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <ArrowRightLeft className="h-4 w-4" />
        Movimentação
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetFields(); }}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Nova Movimentação
            </DialogTitle>
            <DialogDescription>
              Selecione o tipo, funcionário e destino. A movimentação ficará pendente para efetivação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-3 flex-1 overflow-hidden flex flex-col">

            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou matrícula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0">
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Funcionário selecionado */}
            {selectedFuncionario && (
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{selectedFuncionario.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedFuncionario.setor?.nome} • Turma: {selectedFuncionario.turma || '-'} • {selectedFuncionario.matricula || 'Sem matrícula'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetFields} className="h-6 w-6 p-0">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Setor de Destino *</Label>
                    <Select value={setorDestinoId} onValueChange={setSetorDestinoId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {setoresDisponiveis.filter(s => s.conta_no_quadro).length > 0 && (
                          <SelectItem value="__header_quadro" disabled className="text-[10px] font-bold text-muted-foreground">— SETORES DO QUADRO —</SelectItem>
                        )}
                        {setoresDisponiveis.filter(s => s.conta_no_quadro).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                        {setoresDisponiveis.filter(s => !s.conta_no_quadro).length > 0 && (
                          <SelectItem value="__header_outros" disabled className="text-[10px] font-bold text-muted-foreground">— OUTROS SETORES —</SelectItem>
                        )}
                        {setoresDisponiveis.filter(s => !s.conta_no_quadro).map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Turma no Destino</Label>
                    <Select value={turmaDestino} onValueChange={setTurmaDestino}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Manter atual" />
                      </SelectTrigger>
                      <SelectContent>
                        {turmasDisponiveis.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Data Programada (opcional)</Label>
                  <Input
                    type="date"
                    value={dataProgramada}
                    onChange={(e) => setDataProgramada(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Se informada, será efetivada automaticamente nesta data.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Motivo da movimentação (opcional)"
                    rows={2}
                    className="text-xs"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isLoading || criarTroca.isPending || !setorDestinoId}
                  className="w-full h-9"
                >
                  {isLoading || criarTroca.isPending ? 'Salvando...' : 'Criar Movimentação'}
                </Button>
              </div>
            )}

            {/* Lista de funcionários */}
            <div className="flex-1 overflow-y-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Nome</th>
                    <th className="text-left p-2 font-medium">Setor</th>
                    <th className="text-left p-2 font-medium">Turma</th>
                    <th className="text-left p-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {funcionariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-muted-foreground">
                        Nenhum funcionário encontrado
                      </td>
                    </tr>
                  ) : (
                    funcionariosFiltrados.map(f => (
                      <tr
                        key={f.id}
                        className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedFuncionario?.id === f.id ? 'bg-primary/10' : ''}`}
                        onClick={() => { setSelectedFuncionario(f); setSetorDestinoId(''); setTurmaDestino(''); }}
                      >
                        <td className="p-2 font-medium">{f.nome_completo}</td>
                        <td className="p-2 whitespace-nowrap">{f.setor?.nome}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-[10px]">{f.turma || '-'}</Badge>
                        </td>
                        <td className="p-2">{f.situacao?.nome}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              {funcionariosFiltrados.length} funcionário(s)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
