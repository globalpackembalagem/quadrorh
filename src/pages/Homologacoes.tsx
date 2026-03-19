import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Clock, Save, X, Download, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useDemissoes, useUpdateDemissao } from '@/hooks/useDemissoes';
import { Demissao } from '@/types/demissao';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
// xlsx-js-style loaded dynamically
import { useAuth } from '@/hooks/useAuth';

// Data mínima para exibir (a partir de fevereiro/2026)
const DATA_MINIMA = '2026-02-01';

interface EditingState {
  id: string;
  data_homologacao: Date | null;
  hora_homologacao: string;
  data_exame_demissional: Date | null;
  hora_exame_demissional: string;
}

interface NovoAgendamento {
  demissao_id: string;
  data_homologacao: Date | null;
  hora_homologacao: string;
  data_exame_demissional: Date | null;
  hora_exame_demissional: string;
}

export default function Homologacoes() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [novoAgendamento, setNovoAgendamento] = useState<NovoAgendamento>({
    demissao_id: '',
    data_homologacao: null,
    hora_homologacao: '',
    data_exame_demissional: null,
    hora_exame_demissional: '',
  });
  
  const { data: demissoes = [], isLoading } = useDemissoes();
  const updateDemissao = useUpdateDemissao();
  const { canEditHomologacoes } = useAuth();

  const isAfterMinDate = (d: Demissao) => {
    return (
      d.data_prevista >= DATA_MINIMA ||
      (d.data_homologacao ? d.data_homologacao >= DATA_MINIMA : false) ||
      (d.data_exame_demissional ? d.data_exame_demissional >= DATA_MINIMA : false)
    );
  };

  // Demissões sem agendamento (para o dialog de adicionar)
  const demissoesSemAgendamento = useMemo(() => {
    return demissoes
      .filter(d => !d.data_homologacao && !d.data_exame_demissional)
      .filter(isAfterMinDate)
      .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista));
  }, [demissoes]);

  // Agenda de Homologações (ordenada por data e horário)
  // Só mostra quem tem data de homologação OU data de exame
  const agendaHomologacoes = useMemo(() => {
    return demissoes
      .filter(d => !!d.data_homologacao || !!d.data_exame_demissional)
      .filter(isAfterMinDate)
      .sort((a, b) => {
        // Ordenar pela data mais próxima (homologação ou exame)
        const dataA = a.data_homologacao || a.data_exame_demissional || '';
        const dataB = b.data_homologacao || b.data_exame_demissional || '';
        const horaA = a.hora_homologacao || a.hora_exame_demissional || '00:00';
        const horaB = b.hora_homologacao || b.hora_exame_demissional || '00:00';
        return `${dataA}${horaA}`.localeCompare(`${dataB}${horaB}`);
      });
  }, [demissoes]);

  const handleStartEdit = (demissao: Demissao) => {
    setEditingId(demissao.id);
    setEditingData({
      id: demissao.id,
      // parseISO evita o bug de fuso horário do new Date('YYYY-MM-DD') (pode voltar 1 dia)
      data_homologacao: demissao.data_homologacao ? parseISO(demissao.data_homologacao) : null,
      hora_homologacao: demissao.hora_homologacao || '',
      data_exame_demissional: demissao.data_exame_demissional ? parseISO(demissao.data_exame_demissional) : null,
      hora_exame_demissional: demissao.hora_exame_demissional || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
  };

  const handleSaveEdit = async () => {
    if (!editingData) return;
    
    try {
      await updateDemissao.mutateAsync({
        id: editingData.id,
        data_homologacao: editingData.data_homologacao 
          ? format(editingData.data_homologacao, 'yyyy-MM-dd') 
          : null,
        hora_homologacao: editingData.hora_homologacao || null,
        data_exame_demissional: editingData.data_exame_demissional 
          ? format(editingData.data_exame_demissional, 'yyyy-MM-dd') 
          : null,
        hora_exame_demissional: editingData.hora_exame_demissional || null,
      });
      handleCancelEdit();
    } catch (error) {
      toast.error('Erro ao salvar alterações');
    }
  };

  // Adicionar novo agendamento
  const handleAddAgendamento = async () => {
    if (!novoAgendamento.demissao_id) {
      toast.error('Selecione uma demissão');
      return;
    }
    
    if (!novoAgendamento.data_homologacao && !novoAgendamento.data_exame_demissional) {
      toast.error('Informe pelo menos uma data (exame ou homologação)');
      return;
    }
    
    try {
      await updateDemissao.mutateAsync({
        id: novoAgendamento.demissao_id,
        data_homologacao: novoAgendamento.data_homologacao 
          ? format(novoAgendamento.data_homologacao, 'yyyy-MM-dd') 
          : null,
        hora_homologacao: novoAgendamento.hora_homologacao || null,
        data_exame_demissional: novoAgendamento.data_exame_demissional 
          ? format(novoAgendamento.data_exame_demissional, 'yyyy-MM-dd') 
          : null,
        hora_exame_demissional: novoAgendamento.hora_exame_demissional || null,
      });
      toast.success('Agendamento adicionado!');
      setDialogOpen(false);
      setNovoAgendamento({
        demissao_id: '',
        data_homologacao: null,
        hora_homologacao: '',
        data_exame_demissional: null,
        hora_exame_demissional: '',
      });
      setSearchTerm('');
    } catch (error) {
      toast.error('Erro ao adicionar agendamento');
    }
  };

  const demissaoSelecionada = demissoesSemAgendamento.find(d => d.id === novoAgendamento.demissao_id);

  const demissoesFiltradas = useMemo(() => {
    if (!searchTerm) return demissoesSemAgendamento;
    const termo = searchTerm.toLowerCase();
    return demissoesSemAgendamento.filter(d => 
      d.funcionario?.nome_completo.toLowerCase().includes(termo) ||
      d.funcionario?.matricula?.toLowerCase().includes(termo)
    );
  }, [demissoesSemAgendamento, searchTerm]);

  // Exportar para Excel
  const handleExportarExcel = async () => {
    const XLSX = await import('xlsx-js-style');
    const dados = agendaHomologacoes.map(d => ({
      Matrícula: d.funcionario?.matricula || '',
      Nome: d.funcionario?.nome_completo || '',
      Turma: d.funcionario?.turma || '',
      Setor: d.funcionario?.setor?.nome || '',
      Tipo: d.tipo_desligamento || '',
      'Data Demissão': format(parseISO(d.data_prevista), 'dd/MM/yyyy'),
      'Exame Demissional': d.data_exame_demissional ? format(parseISO(d.data_exame_demissional), 'dd/MM/yyyy') : '',
      'Hora Exame': d.hora_exame_demissional?.slice(0, 5) || '',
      'Homologação': d.data_homologacao ? format(parseISO(d.data_homologacao), 'dd/MM/yyyy') : '',
      'Hora Homologação': d.hora_homologacao?.slice(0, 5) || '',
      Status: d.realizado ? 'Realizada' : 'Pendente',
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Homologações');
    XLSX.writeFile(wb, `homologacoes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel exportado com sucesso!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">HOMOLOGAÇÕES</h1>
          <p className="page-description">
            AGENDA DE HOMOLOGAÇÕES E EXAMES DEMISSIONAIS
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={!canEditHomologacoes || demissoesSemAgendamento.length === 0}>
                <Plus className="h-4 w-4" />
                ADICIONAR
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Agendar Homologação / Exame</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 pt-4">
                {/* Seletor de demissão */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Funcionário</label>
                  {demissaoSelecionada ? (
                    <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                      <div>
                        <p className="font-medium">{demissaoSelecionada.funcionario?.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">
                          {demissaoSelecionada.funcionario?.matricula} • {demissaoSelecionada.tipo_desligamento} • {format(parseISO(demissaoSelecionada.data_prevista), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNovoAgendamento(prev => ({ ...prev, demissao_id: '' }));
                          setSearchTerm('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Command className="border rounded-md">
                      <CommandInput 
                        placeholder="Buscar por nome ou matrícula..." 
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                      />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty>Nenhuma demissão pendente encontrada</CommandEmpty>
                        <CommandGroup>
                          {demissoesFiltradas.slice(0, 10).map(d => (
                            <CommandItem
                              key={d.id}
                              value={d.id}
                              onSelect={() => {
                                setNovoAgendamento(prev => ({ ...prev, demissao_id: d.id }));
                                setSearchTerm('');
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{d.funcionario?.nome_completo}</span>
                                <span className="text-xs text-muted-foreground">
                                  {d.funcionario?.matricula} • {d.tipo_desligamento} • {format(parseISO(d.data_prevista), 'dd/MM/yyyy')}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  )}
                </div>

                {/* Exame Demissional */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Exame Demissional</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !novoAgendamento.data_exame_demissional && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {novoAgendamento.data_exame_demissional 
                            ? format(novoAgendamento.data_exame_demissional, 'dd/MM/yyyy') 
                            : 'Selecionar data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={novoAgendamento.data_exame_demissional || undefined}
                          onSelect={(date) => setNovoAgendamento(prev => ({...prev, data_exame_demissional: date || null}))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hora</label>
                    <Input
                      type="time"
                      value={novoAgendamento.hora_exame_demissional}
                      onChange={(e) => setNovoAgendamento(prev => ({...prev, hora_exame_demissional: e.target.value}))}
                    />
                  </div>
                </div>

                {/* Homologação */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Homologação</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !novoAgendamento.data_homologacao && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {novoAgendamento.data_homologacao 
                            ? format(novoAgendamento.data_homologacao, 'dd/MM/yyyy') 
                            : 'Selecionar data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={novoAgendamento.data_homologacao || undefined}
                          onSelect={(date) => setNovoAgendamento(prev => ({...prev, data_homologacao: date || null}))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Hora</label>
                    <Input
                      type="time"
                      value={novoAgendamento.hora_homologacao}
                      onChange={(e) => setNovoAgendamento(prev => ({...prev, hora_homologacao: e.target.value}))}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddAgendamento}
                    disabled={!novoAgendamento.demissao_id || (!novoAgendamento.data_homologacao && !novoAgendamento.data_exame_demissional) || updateDemissao.isPending}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={handleExportarExcel}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Agenda ({agendaHomologacoes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agendaHomologacoes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma homologação ou exame agendado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[80px]">Turma</TableHead>
                  <TableHead className="w-[150px]">Tipo</TableHead>
                  <TableHead className="w-[120px]">Dt Demissão</TableHead>
                  <TableHead className="w-[140px]">Exame Demissional</TableHead>
                  <TableHead className="w-[80px]">Hora</TableHead>
                  <TableHead className="w-[160px]">Homologação</TableHead>
                  <TableHead className="w-[100px]">Hora</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendaHomologacoes.map((demissao) => {
                  const isEditing = editingId === demissao.id;
                  
                  return (
                    <TableRow key={demissao.id} className="h-14">
                      <TableCell className="font-mono text-sm">
                        {demissao.funcionario?.matricula || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {demissao.funcionario?.nome_completo}
                      </TableCell>
                      <TableCell>{demissao.funcionario?.turma || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {demissao.tipo_desligamento || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(demissao.data_prevista), 'dd/MM/yyyy')}
                      </TableCell>
                      
                      {/* Exame Demissional */}
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    'flex-1 justify-start text-left font-normal',
                                    !editingData?.data_exame_demissional && 'text-muted-foreground'
                                  )}
                                >
                                  <CalendarIcon className="mr-1 h-3 w-3" />
                                  {editingData?.data_exame_demissional 
                                    ? format(editingData.data_exame_demissional, 'dd/MM/yy') 
                                    : 'Data'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={editingData?.data_exame_demissional || undefined}
                                  onSelect={(date) => setEditingData(prev => prev ? {...prev, data_exame_demissional: date || null} : null)}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            {editingData?.data_exame_demissional && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => setEditingData(prev => prev ? {...prev, data_exame_demissional: null, hora_exame_demissional: ''} : null)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          demissao.data_exame_demissional 
                            ? format(parseISO(demissao.data_exame_demissional), 'dd/MM/yyyy') 
                            : '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="time"
                            value={editingData?.hora_exame_demissional || ''}
                            onChange={(e) => setEditingData(prev => prev ? {...prev, hora_exame_demissional: e.target.value} : null)}
                            className="h-8 w-20"
                          />
                        ) : (
                          demissao.hora_exame_demissional?.slice(0, 5) || '-'
                        )}
                      </TableCell>
                      
                      {/* Homologação */}
                      <TableCell>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    'flex-1 justify-start text-left font-normal',
                                    !editingData?.data_homologacao && 'text-muted-foreground'
                                  )}
                                >
                                  <CalendarIcon className="mr-1 h-3 w-3" />
                                  {editingData?.data_homologacao 
                                    ? format(editingData.data_homologacao, 'dd/MM/yy') 
                                    : 'Data'}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={editingData?.data_homologacao || undefined}
                                  onSelect={(date) => setEditingData(prev => prev ? {...prev, data_homologacao: date || null} : null)}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            {editingData?.data_homologacao && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => setEditingData(prev => prev ? {...prev, data_homologacao: null, hora_homologacao: ''} : null)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          demissao.data_homologacao 
                            ? format(parseISO(demissao.data_homologacao), 'dd/MM/yyyy') 
                            : '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="time"
                            value={editingData?.hora_homologacao || ''}
                            onChange={(e) => setEditingData(prev => prev ? {...prev, hora_homologacao: e.target.value} : null)}
                            className="h-8 w-20"
                          />
                        ) : (
                          demissao.hora_homologacao?.slice(0, 5) || '-'
                        )}
                      </TableCell>
                      
                      
                      {/* Ações */}
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={updateDemissao.isPending}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartEdit(demissao)}
                          >
                            Editar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}