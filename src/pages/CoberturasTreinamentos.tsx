import { useState, useMemo } from 'react';
import { Users, Edit, RefreshCw, Bell, Loader2, CalendarDays, Plus, Search, Download } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFuncionarios, useUpdateFuncionario } from '@/hooks/useFuncionarios';
import { useSituacoesAtivas } from '@/hooks/useSituacoes';
import { useSetoresAtivos } from '@/hooks/useSetores';
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Funcionario } from '@/types/database';
// xlsx-js-style loaded dynamically

const FILTROS_SETOR = [
  { value: 'TODOS', label: 'TODOS' },
  { value: 'SOPRO A', label: 'SOPRO A' },
  { value: 'SOPRO B', label: 'SOPRO B' },
  { value: 'SOPRO C', label: 'SOPRO C' },
  { value: 'DEC. DIA T1', label: 'DEC. DIA T1' },
  { value: 'DEC. DIA T2', label: 'DEC. DIA T2' },
  { value: 'DEC. NOITE T1', label: 'DEC. NOITE T1' },
  { value: 'DEC. NOITE T2', label: 'DEC. NOITE T2' },
];

export default function CoberturasTreinamentos() {
  const { data: funcionarios = [], isLoading, refetch } = useFuncionarios();
  const { data: situacoes = [] } = useSituacoesAtivas();
  const { data: setores = [] } = useSetoresAtivos();
  const updateFuncionario = useUpdateFuncionario();
  const { canEditFuncionarios, userRole, isAdmin } = useAuth();
  const { usuarioAtual } = useUsuario();
  const queryClient = useQueryClient();
  
  const [isEnviando, setIsEnviando] = useState(false);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [editingFunc, setEditingFunc] = useState<Funcionario | null>(null);
  const [showNovoDialog, setShowNovoDialog] = useState(false);
  const [buscaNovo, setBuscaNovo] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('TODOS');
  const [novoFormData, setNovoFormData] = useState({
    funcionario_id: '',
    situacao_id: '',
    observacoes: '',
    cobertura_data_inicio: '',
    cobertura_data_fim: '',
  });
  const [formData, setFormData] = useState({
    situacao_id: '',
    setor_id: '',
    observacoes: '',
    cobertura_data_inicio: '',
    cobertura_data_fim: '',
  });

  // Helper: verifica se o funcionário pertence ao filtro de setor selecionado
  const matchFiltroSetor = (f: Funcionario) => {
    if (filtroSetor === 'TODOS') return true;
    const grupo = f.setor?.grupo?.toUpperCase() || '';
    const setorNome = f.setor?.nome?.toUpperCase() || '';
    const turma = f.turma?.toUpperCase() || '';
    
    switch (filtroSetor) {
      case 'SOPRO A': return grupo.startsWith('SOPRO') && setorNome.includes(' A');
      case 'SOPRO B': return grupo.startsWith('SOPRO') && setorNome.includes(' B');
      case 'SOPRO C': return grupo.startsWith('SOPRO') && setorNome.includes(' C');
      case 'DEC. DIA T1': return grupo.includes('DECORAÇÃO') && grupo.includes('DIA') && turma === 'T1';
      case 'DEC. DIA T2': return grupo.includes('DECORAÇÃO') && grupo.includes('DIA') && turma === 'T2';
      case 'DEC. NOITE T1': return grupo.includes('DECORAÇÃO') && grupo.includes('NOITE') && turma === 'T1';
      case 'DEC. NOITE T2': return grupo.includes('DECORAÇÃO') && grupo.includes('NOITE') && turma === 'T2';
      default: return true;
    }
  };

  // Filtrar funcionários em COB. FÉRIAS ou TREINAMENTO
  const funcionariosFiltrados = useMemo(() => {
    return funcionarios.filter(f => {
      const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
      const isCobTrein = situacaoNome.includes('COB') || 
             situacaoNome.includes('COBERTURA') || 
             situacaoNome.includes('TREINAMENTO');
      if (!isCobTrein) return false;
      
      // Gestor: filtrar apenas seus setores
      if (!isAdmin && usuarioAtual.setoresIds && usuarioAtual.setoresIds.length > 0) {
        if (!usuarioAtual.setoresIds.includes(f.setor_id)) return false;
      }
      
      return matchFiltroSetor(f);
    });
  }, [funcionarios, filtroSetor, isAdmin, usuarioAtual.setoresIds]);

  // Separar por tipo
  const coberturaFerias = funcionariosFiltrados.filter(f => {
    const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
    return situacaoNome.includes('COB') || situacaoNome.includes('COBERTURA');
  });

  const treinamento = funcionariosFiltrados.filter(f => {
    const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
    return situacaoNome.includes('TREINAMENTO');
  });

  // Situações de COB/TREINAMENTO para o select do novo dialog
  const situacoesCobTrein = useMemo(() => {
    return situacoes.filter(s => {
      const nome = s.nome?.toUpperCase() || '';
      return nome.includes('COB') || nome.includes('COBERTURA') || nome.includes('TREINAMENTO');
    });
  }, [situacoes]);

  // Funcionários disponíveis para adicionar (que NÃO estão já em COB/TREINAMENTO)
  const funcionariosDisponiveis = useMemo(() => {
    const idsJaFiltrados = new Set(funcionariosFiltrados.map(f => f.id));
    return funcionarios
      .filter(f => !idsJaFiltrados.has(f.id))
      .filter(f => {
        if (!buscaNovo) return true;
        const busca = buscaNovo.toUpperCase();
        return (
          f.nome_completo?.toUpperCase().includes(busca) ||
          f.matricula?.toUpperCase().includes(busca)
        );
      })
      .slice(0, 50);
  }, [funcionarios, funcionariosFiltrados, buscaNovo]);

  const handleNovoSave = async () => {
    if (!novoFormData.funcionario_id || !novoFormData.situacao_id) {
      toast.error('Selecione o funcionário e a situação.');
      return;
    }
    try {
      const { error } = await supabase.from('funcionarios').update({
        situacao_id: novoFormData.situacao_id,
        observacoes: novoFormData.observacoes || null,
        cobertura_data_inicio: novoFormData.cobertura_data_inicio || null,
        cobertura_data_fim: novoFormData.cobertura_data_fim || null,
      }).eq('id', novoFormData.funcionario_id);
      if (error) throw error;
      toast.success('Funcionário adicionado à cobertura/treinamento!');
      setShowNovoDialog(false);
      setNovoFormData({ funcionario_id: '', situacao_id: '', observacoes: '', cobertura_data_inicio: '', cobertura_data_fim: '' });
      setBuscaNovo('');
      refetch();
    } catch (err) {
      toast.error('Erro ao salvar.');
      console.error(err);
    }
  };

  const handleEdit = (func: Funcionario) => {
    setEditingFunc(func);
    setFormData({
      situacao_id: func.situacao_id || '',
      setor_id: func.setor_id || '',
      observacoes: func.observacoes || '',
      cobertura_data_inicio: (func as any).cobertura_data_inicio || '',
      cobertura_data_fim: (func as any).cobertura_data_fim || '',
    });
  };

  const handleSave = async () => {
    if (!editingFunc) return;

    try {
      await updateFuncionario.mutateAsync({
        id: editingFunc.id,
        situacao_id: formData.situacao_id,
        setor_id: formData.setor_id,
        observacoes: formData.observacoes,
        situacaoAtualNome: editingFunc.situacao?.nome,
      });

      // Atualizar datas de cobertura diretamente
      const { error } = await supabase.from('funcionarios').update({
        cobertura_data_inicio: formData.cobertura_data_inicio || null,
        cobertura_data_fim: formData.cobertura_data_fim || null,
      }).eq('id', editingFunc.id);
      if (error) throw error;
      setEditingFunc(null);
      toast.success('Funcionário atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar funcionário');
    }
  };

  const enviarIndividual = async (func: Funcionario) => {
    setEnviandoId(func.id);
    try {
      const { error } = await supabase.from('eventos_sistema').insert({
        tipo: 'cobertura_treinamento',
        descricao: `COB/TREIN. — ${func.nome_completo}`,
        funcionario_id: func.id,
        funcionario_nome: func.nome_completo,
        setor_id: func.setor_id,
        setor_nome: func.setor?.nome || null,
        turma: func.turma || null,
        criado_por: userRole?.nome || 'ADMIN',
        dados_extra: {
          situacao_nome: func.situacao?.nome || '',
          empresa: func.empresa,
          matricula: func.matricula,
        },
        notificado: false,
      });
      if (error) throw error;
      toast.success(`${func.nome_completo} enviado para a Central!`);
      queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
    } catch (err) {
      toast.error('Erro ao enviar para a Central.');
      console.error(err);
    } finally {
      setEnviandoId(null);
    }
  };

  const enviarParaCentral = async () => {
    if (funcionariosFiltrados.length === 0) {
      toast.info('Nenhum funcionário em COB. FÉRIAS ou TREINAMENTO.');
      return;
    }
    setIsEnviando(true);
    try {
      const eventosParaInserir = funcionariosFiltrados.map((func) => ({
        tipo: 'cobertura_treinamento',
        descricao: `COB/TREIN. — ${func.nome_completo}`,
        funcionario_id: func.id,
        funcionario_nome: func.nome_completo,
        setor_id: func.setor_id,
        setor_nome: func.setor?.nome || null,
        turma: func.turma || null,
        criado_por: userRole?.nome || 'ADMIN',
        dados_extra: {
          situacao_nome: func.situacao?.nome || '',
          empresa: func.empresa,
          matricula: func.matricula,
        },
        notificado: false,
      }));

      const { error } = await supabase.from('eventos_sistema').insert(eventosParaInserir);
      if (error) throw error;

      toast.success(`${eventosParaInserir.length} funcionário(s) enviados para a Central de Notificações!`);
      queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
    } catch (err) {
      toast.error('Erro ao enviar para a Central.');
      console.error(err);
    } finally {
      setIsEnviando(false);
    }
  };

  const exportarExcel = async () => {
    const XLSX = await import('xlsx-js-style');
    if (funcionariosFiltrados.length === 0) {
      toast.info('Nenhum funcionário para exportar.');
      return;
    }
    const dados = funcionariosFiltrados.map(f => ({
      'EMPRESA': f.empresa || '',
      'MATRÍCULA': f.matricula || '',
      'NOME': f.nome_completo,
      'SETOR': f.setor?.nome || '',
      'TURMA': f.turma || '',
      'SITUAÇÃO': f.situacao?.nome || '',
      'INÍCIO': (f as any).cobertura_data_inicio ? format(parseISO((f as any).cobertura_data_inicio), 'dd/MM/yyyy') : '',
      'TÉRMINO': (f as any).cobertura_data_fim ? format(parseISO((f as any).cobertura_data_fim), 'dd/MM/yyyy') : '',
      'OBSERVAÇÕES': f.observacoes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'COB_TREINAMENTO');
    XLSX.writeFile(wb, `COB_FERIAS_TREINAMENTO_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Excel exportado!');
  };

  const renderTable = (lista: Funcionario[], titulo: string, cor: string) => (
    <Card className="mb-6">
      <CardHeader className={`${cor} text-white rounded-t-lg`}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          {titulo} ({lista.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {lista.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Nenhum funcionário nesta situação
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">EMPRESA</TableHead>
                <TableHead className="w-[100px]">MATRÍCULA</TableHead>
                <TableHead>NOME</TableHead>
                <TableHead>SETOR</TableHead>
                <TableHead>TURMA</TableHead>
                <TableHead>SITUAÇÃO</TableHead>
                <TableHead className="text-center">INÍCIO</TableHead>
                <TableHead className="text-center">TÉRMINO</TableHead>
                <TableHead>OBSERVAÇÕES</TableHead>
                <TableHead className="w-[80px] text-center">AÇÃO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((func) => (
                <TableRow key={func.id}>
                  <TableCell className="font-medium text-xs">
                    {func.empresa || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {func.matricula || '-'}
                  </TableCell>
                  <TableCell className="font-medium">
                    {func.nome_completo}
                  </TableCell>
                  <TableCell className="text-sm">
                    {func.setor?.nome || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {func.turma || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className="bg-orange-500/10 text-orange-600 border-orange-500/30"
                    >
                      {func.situacao?.nome || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {(func as any).cobertura_data_inicio 
                      ? format(parseISO((func as any).cobertura_data_inicio), 'dd/MM/yyyy')
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {(func as any).cobertura_data_fim 
                      ? (() => {
                          const fim = parseISO((func as any).cobertura_data_fim);
                          const diasRestantes = differenceInDays(fim, new Date());
                          return (
                            <div className="flex flex-col items-center gap-0.5">
                              <span>{format(fim, 'dd/MM/yyyy')}</span>
                              {diasRestantes >= 0 && diasRestantes <= 7 && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                  {diasRestantes === 0 ? 'HOJE' : `${diasRestantes}d`}
                                </Badge>
                              )}
                            </div>
                          );
                        })()
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {func.observacoes || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => enviarIndividual(func)}
                        className="h-8 w-8 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                        disabled={enviandoId === func.id}
                        title="Enviar para Central de Notificações"
                      >
                        {enviandoId === func.id 
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Bell className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(func)}
                        className="h-8 w-8 p-0"
                        disabled={!canEditFuncionarios}
                        title={canEditFuncionarios ? 'Editar' : 'Entre no modo RH para editar'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">COB. FÉRIAS / TREINAMENTO</h1>
          <p className="page-description">
            FUNCIONÁRIOS EM COBERTURA DE FÉRIAS OU TREINAMENTO
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setShowNovoDialog(true)}
            className="gap-2"
            disabled={!canEditFuncionarios}
          >
            <Plus className="h-4 w-4" />
            NOVO
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarExcel}
            disabled={funcionariosFiltrados.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            EXCEL
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            ATUALIZAR
          </Button>
        </div>
      </div>

      {/* Filtros de Setor */}
      <div className="flex flex-wrap gap-2">
        {FILTROS_SETOR.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroSetor(f.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              filtroSetor === f.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:bg-accent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{funcionariosFiltrados.length}</div>
            <p className="text-sm text-muted-foreground">TOTAL</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
             <div className="text-2xl font-bold text-primary">{coberturaFerias.length}</div>
             <p className="text-sm text-muted-foreground">COBERTURA DE FÉRIAS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">{treinamento.length}</div>
            <p className="text-sm text-muted-foreground">TREINAMENTO</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas */}
      {renderTable(coberturaFerias, 'COBERTURA DE FÉRIAS', 'bg-primary')}
      {renderTable(treinamento, 'TREINAMENTO', 'bg-warning')}

      {/* Dialog de Edição */}
      <Dialog open={!!editingFunc} onOpenChange={(open) => !open && setEditingFunc(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
          </DialogHeader>
          
          {editingFunc && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{editingFunc.nome_completo}</p>
                <p className="text-sm text-muted-foreground">
                  {editingFunc.matricula} - {editingFunc.setor?.nome}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Situação</Label>
                <Select
                  value={formData.situacao_id}
                  onValueChange={(value) => setFormData({ ...formData, situacao_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a situação" />
                  </SelectTrigger>
                  <SelectContent>
                    {situacoes.map((sit) => (
                      <SelectItem key={sit.id} value={sit.id}>
                        {sit.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Setor</Label>
                <Select
                  value={formData.setor_id}
                  onValueChange={(value) => setFormData({ ...formData, setor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map((set) => (
                      <SelectItem key={set.id} value={set.id}>
                        {set.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Data Início
                  </Label>
                  <Input
                    type="date"
                    value={formData.cobertura_data_inicio}
                    onChange={(e) => setFormData({ ...formData, cobertura_data_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Data Término
                  </Label>
                  <Input
                    type="date"
                    value={formData.cobertura_data_fim}
                    onChange={(e) => setFormData({ ...formData, cobertura_data_fim: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Input
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingFunc(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={updateFuncionario.isPending}>
                  {updateFuncionario.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Novo COB/TREINAMENTO */}
      <Dialog open={showNovoDialog} onOpenChange={(open) => { if (!open) { setShowNovoDialog(false); setBuscaNovo(''); setNovoFormData({ funcionario_id: '', situacao_id: '', observacoes: '', cobertura_data_inicio: '', cobertura_data_fim: '' }); } }}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Adicionar COB. FÉRIAS / TREINAMENTO</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Busca de funcionário */}
            <div className="space-y-2">
              <Label>Buscar Funcionário</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={buscaNovo}
                  onChange={(e) => setBuscaNovo(e.target.value)}
                  placeholder="Nome ou matrícula..."
                  className="pl-9"
                />
              </div>
              {buscaNovo && funcionariosDisponiveis.length > 0 && !novoFormData.funcionario_id && (
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {funcionariosDisponiveis.map(f => (
                    <button
                      key={f.id}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                      onClick={() => {
                        setNovoFormData({ ...novoFormData, funcionario_id: f.id });
                        setBuscaNovo(f.nome_completo);
                      }}
                    >
                      <span className="font-medium">{f.nome_completo}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{f.matricula} — {f.setor?.nome}</span>
                    </button>
                  ))}
                </div>
              )}
              {novoFormData.funcionario_id && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">Selecionado</Badge>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setNovoFormData({ ...novoFormData, funcionario_id: '' }); setBuscaNovo(''); }}>Limpar</Button>
                </div>
              )}
            </div>

            {/* Situação */}
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select
                value={novoFormData.situacao_id}
                onValueChange={(value) => setNovoFormData({ ...novoFormData, situacao_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione COB. FÉRIAS ou TREINAMENTO" />
                </SelectTrigger>
                <SelectContent>
                  {situacoesCobTrein.map((sit) => (
                    <SelectItem key={sit.id} value={sit.id}>
                      {sit.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Data Início
                </Label>
                <Input
                  type="date"
                  value={novoFormData.cobertura_data_inicio}
                  onChange={(e) => setNovoFormData({ ...novoFormData, cobertura_data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Data Término
                </Label>
                <Input
                  type="date"
                  value={novoFormData.cobertura_data_fim}
                  onChange={(e) => setNovoFormData({ ...novoFormData, cobertura_data_fim: e.target.value })}
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={novoFormData.observacoes}
                onChange={(e) => setNovoFormData({ ...novoFormData, observacoes: e.target.value })}
                placeholder="Observações..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowNovoDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNovoSave} disabled={!novoFormData.funcionario_id || !novoFormData.situacao_id}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
