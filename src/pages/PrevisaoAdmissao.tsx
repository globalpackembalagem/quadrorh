import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserPlus, Check, Search, Pencil, Trash2, Download, FileCheck, FileX, Clock, CheckCircle2, XCircle, History as HistoryIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// xlsx-js-style loaded dynamically
import { useFuncionarios, useUpdateFuncionario, useDeleteFuncionario } from '@/hooks/useFuncionarios';
import { criarEventoSistema } from '@/hooks/useEventosSistema';
import { useSituacoesAtivas } from '@/hooks/useSituacoes';
import { useSetoresAtivos } from '@/hooks/useSetores';
import { usePrevisaoDocumentos, usePrevisaoDocumentosHistorico, useUpdateDocumentoStatus } from '@/hooks/usePrevisaoDocumentos';
import { useAuth } from '@/hooks/useAuth';
import { Funcionario } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { EditarPrevisaoDialog } from '@/components/previsao/EditarPrevisaoDialog';
import { ImportarPrevisoes } from '@/components/previsao/ImportarPrevisoes';
import { NovaPrevisaoDialog } from '@/components/previsao/NovaPrevisaoDialog';
import { DocumentoStatusDialog } from '@/components/previsao/DocumentoStatusDialog';
import { toast } from 'sonner';

// Verificar se é o usuário REAL PARCERIA
function isRealParceria(nome: string) {
  return nome.toUpperCase() === 'REAL PARCERIA';
}

// Verificar se pode ver status de documentos (admin ou SONIA)
function canSeeDocStatus(nome: string, isAdmin: boolean) {
  return isAdmin || nome.toUpperCase() === 'SONIA' || isRealParceria(nome);
}

export default function PrevisaoAdmissao() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroSetores, setFiltroSetores] = useState<string[]>([]);
  const [filtroGrupo, setFiltroGrupo] = useState<string | null>(null);
  const [tabAtiva, setTabAtiva] = useState('candidatos');
  const [parceriaTab, setParceriaTab] = useState('pendentes');
  const [filtroEmpresas, setFiltroEmpresas] = useState<string[]>([]);
  const [filtroTurmas, setFiltroTurmas] = useState<string[]>([]);
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [docDialogFuncionario, setDocDialogFuncionario] = useState<Funcionario | null>(null);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
  const [actionsDialogOpen, setActionsDialogOpen] = useState(false);
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const { data: funcionarios = [], isLoading } = useFuncionarios();
  const { data: situacoes = [] } = useSituacoesAtivas();
  const { data: setores = [] } = useSetoresAtivos();
  const { data: documentos = [] } = usePrevisaoDocumentos();
  const { userRole, isAdmin } = useAuth();
  const updateFuncionario = useUpdateFuncionario();
  const deleteFuncionario = useDeleteFuncionario();
  const updateDocStatus = useUpdateDocumentoStatus();

  const isParceria = isRealParceria(userRole.nome);
  const showDocStatus = canSeeDocStatus(userRole.nome, isAdmin);
  const showHistorico = isAdmin || userRole.nome.toUpperCase() === 'SONIA';
  const { data: todosHistorico = [] } = usePrevisaoDocumentosHistorico(showHistorico ? undefined : '__none__');

  // Map documentos by funcionario_id
  const docMap = useMemo(() => {
    const map = new Map<string, string>();
    documentos.forEach(d => map.set(d.funcionario_id, d.status));
    return map;
  }, [documentos]);

  // Buscar situações necessárias
  const situacaoPrevisao = situacoes.find(s => 
    s.nome.toUpperCase().includes('PREVISÃO') || s.nome.toUpperCase().includes('PREVISAO')
  );
  const situacaoAtivo = situacoes.find(s => s.nome.toUpperCase() === 'ATIVO');

  // Ordem customizada dos setores
  const ordemSetores: Record<string, number> = {
    'MOD - SOPRO A': 1,
    'PRODUÇÃO SOPRO G+P A': 2,
    'DECORAÇÃO MOD DIA': 3,
    'MOD - SOPRO B': 4,
    'PRODUÇÃO SOPRO G+P B': 5,
    'MOD - SOPRO C': 6,
    'PRODUÇÃO SOPRO G+P C': 7,
    'DECORAÇÃO MOD NOITE': 8,
  };

  // Filtrar funcionários com situação PREVISÃO
  const funcionariosPrevisao = useMemo(() => {
    let filtered = funcionarios
      .filter(f => 
        f.situacao?.nome?.toUpperCase().includes('PREVISÃO') || 
        f.situacao?.nome?.toUpperCase().includes('PREVISAO')
      );

    // REAL PARCERIA: só vê TEMP
    if (isParceria) {
      filtered = filtered.filter(f => f.matricula?.toUpperCase().startsWith('TEMP'));
    }

    return filtered.sort((a, b) => {
      const dataA = a.data_admissao ? parseISO(a.data_admissao).getTime() : Infinity;
      const dataB = b.data_admissao ? parseISO(b.data_admissao).getTime() : Infinity;
      if (dataA !== dataB) return dataA - dataB;
      
      const setorNomeA = a.setor?.nome?.toUpperCase() || '';
      const setorNomeB = b.setor?.nome?.toUpperCase() || '';
      const ordemA = ordemSetores[setorNomeA] ?? 999;
      const ordemB = ordemSetores[setorNomeB] ?? 999;
      return ordemA - ordemB;
    });
  }, [funcionarios, isParceria]);

  // Resumo por setor (não muda)
  const resumoPorSetorTurma = useMemo(() => {
    const grupos: Record<string, number> = {};
    funcionariosPrevisao.forEach(f => {
      const setorNome = f.setor?.nome || 'Sem Setor';
      const turma = f.turma || '';
      const chave = turma ? `${setorNome} - ${turma}` : setorNome;
      grupos[chave] = (grupos[chave] || 0) + 1;
    });
    return grupos;
  }, [funcionariosPrevisao]);

  // Empresas únicas
  const empresasUnicas = useMemo(() => {
    const empresas = new Set<string>();
    funcionariosPrevisao.forEach(f => {
      if (f.empresa) empresas.add(f.empresa);
    });
    return Array.from(empresas).sort();
  }, [funcionariosPrevisao]);

  const turmasValidas = ['T1', 'T2'];

  // Aplicar filtros
  const funcionariosFiltrados = useMemo(() => {
    return funcionariosPrevisao.filter(f => {
      if (searchTerm) {
        const termo = searchTerm.toLowerCase();
        const matchTexto = f.nome_completo.toLowerCase().includes(termo) ||
          (f.matricula && f.matricula.toLowerCase().includes(termo)) ||
          (f.setor?.nome && f.setor.nome.toLowerCase().includes(termo));
        if (!matchTexto) return false;
      }
      if (filtroSetores.length > 0 && !filtroSetores.includes(f.setor_id)) return false;
      if (filtroEmpresas.length > 0 && (!f.empresa || !filtroEmpresas.includes(f.empresa))) return false;
      if (filtroTurmas.length > 0 && (!f.turma || !filtroTurmas.includes(f.turma))) return false;
      // Filtro por grupo rápido
      if (filtroGrupo) {
        const grupo = f.setor?.grupo?.toUpperCase() || '';
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        if (filtroGrupo === 'SOPRO A' && grupo !== 'SOPRO A') return false;
        if (filtroGrupo === 'SOPRO B' && grupo !== 'SOPRO B') return false;
        if (filtroGrupo === 'SOPRO C' && grupo !== 'SOPRO C') return false;
        if (filtroGrupo === 'DECORAÇÃO DIA' && !(setorNome.includes('DECORAÇÃO') && setorNome.includes('DIA'))) return false;
        if (filtroGrupo === 'DECORAÇÃO NOITE' && !(setorNome.includes('DECORAÇÃO') && setorNome.includes('NOITE'))) return false;
      }
      return true;
    });
  }, [funcionariosPrevisao, searchTerm, filtroSetores, filtroEmpresas, filtroTurmas, filtroGrupo]);

  // Ativar funcionário
  const handleAtivar = async (funcionarioId: string) => {
    if (!situacaoAtivo) {
      toast.error('Situação ATIVO não encontrada');
      return;
    }
    const func = funcionarios.find(f => f.id === funcionarioId);
    const situacaoAtualNome = func?.situacao?.nome || '';
    
    try {
      // Atualizar situação para ATIVO e definir data_admissao se não existir
      await updateFuncionario.mutateAsync({ 
        id: funcionarioId, 
        situacao_id: situacaoAtivo.id,
        situacaoAtualNome,
        ...(!func?.data_admissao ? { data_admissao: format(new Date(), 'yyyy-MM-dd') } : {}),
      });
      
      // Criar evento na central de notificações
      if (func) {
        const setorNome = setores.find(s => s.id === func.setor_id)?.nome || '';
        await criarEventoSistema({
          tipo: 'admissao',
          descricao: `Funcionário ${func.nome_completo} admitido (Previsão → Ativo)`,
          funcionario_id: func.id,
          funcionario_nome: func.nome_completo,
          setor_id: func.setor_id,
          setor_nome: setorNome,
          turma: func.turma,
          criado_por: userRole.nome,
        });
      }
      
      toast.success('Funcionário ativado e movido para o quadro!');
    } catch (err) {
      console.error('Erro ao ativar funcionário:', err);
    }
  };

  const handleExcluir = async (funcionarioId: string) => {
    await deleteFuncionario.mutateAsync(funcionarioId);
  };

  const handleExportar = async () => {
    const XLSX = await import('xlsx-js-style');
    if (funcionariosFiltrados.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }
    const dados = funcionariosFiltrados.map(f => ({
      'Empresa': f.empresa || 'GLOBALPACK',
      'Matrícula': f.matricula || '-',
      'Nome': f.nome_completo,
      'Setor': f.setor?.nome || '-',
      'Turma': f.turma || '-',
      'Cargo': f.cargo || '-',
      'Data Prevista': f.data_admissao 
        ? format(parseISO(f.data_admissao), 'dd/MM/yyyy', { locale: ptBR })
        : '-',
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Previsão Admissão');
    ws['!cols'] = [
      { wch: 12 }, { wch: 10 }, { wch: 35 }, { wch: 20 }, { wch: 8 }, { wch: 25 }, { wch: 12 },
    ];
    XLSX.writeFile(wb, `previsao_admissao_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success(`${funcionariosFiltrados.length} registros exportados!`);
  };

  const getDocStatusBadge = (funcionarioId: string) => {
    const status = docMap.get(funcionarioId);
    switch (status) {
      case 'documentos_ok':
        return <Badge className="bg-green-600 text-white gap-1 text-xs"><CheckCircle2 className="h-3 w-3" /> OK</Badge>;
      case 'falta_documentos':
        return <Badge variant="destructive" className="gap-1 text-xs"><XCircle className="h-3 w-3" /> FALTA</Badge>;
      default:
        return <Badge variant="outline" className="gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> PENDENTE</Badge>;
    }
  };

  // Contagem de docs OK para Real Parceria
  const docsOkCount = useMemo(() => {
    return funcionariosPrevisao.filter(f => docMap.get(f.id) === 'documentos_ok').length;
  }, [funcionariosPrevisao, docMap]);

  const docsPendenteCount = useMemo(() => {
    return funcionariosPrevisao.filter(f => docMap.get(f.id) !== 'documentos_ok').length;
  }, [funcionariosPrevisao, docMap]);

  // Separar funcionários por status de documento para REAL PARCERIA
  const funcionariosDocsOk = useMemo(() => {
    return funcionariosFiltrados.filter(f => docMap.get(f.id) === 'documentos_ok');
  }, [funcionariosFiltrados, docMap]);

  const funcionariosDocsPendente = useMemo(() => {
    return funcionariosFiltrados.filter(f => docMap.get(f.id) !== 'documentos_ok');
  }, [funcionariosFiltrados, docMap]);

  const handleExportarParceria = async () => {
    const XLSX = await import('xlsx-js-style');
    if (funcionariosFiltrados.length === 0) {
      toast.error('Nenhum registro para exportar');
      return;
    }
    const dados = funcionariosFiltrados.map(f => ({
      'Nome': f.nome_completo,
      'Setor': f.setor?.nome || '-',
      'Cargo': f.cargo || '-',
      'Documentos': docMap.get(f.id) === 'documentos_ok' ? 'OK' : 'PENDENTE',
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidatos');
    ws['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 25 }, { wch: 15 }];
    XLSX.writeFile(wb, `candidatos_documentos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success(`${funcionariosFiltrados.length} registros exportados!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // ===================== VIEW REAL PARCERIA =====================
  if (isParceria) {
    return (
      <div className="space-y-6">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">PREVISÃO DE ADMISSÃO</h1>
            <p className="page-description">CANDIDATOS TEMPORÁRIOS EM PROCESSO</p>
          </div>
          <Button variant="outline" onClick={handleExportarParceria} disabled={funcionariosFiltrados.length === 0} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
            <div className="text-sm font-medium text-muted-foreground">Total Candidatos</div>
            <div className="text-4xl font-bold text-primary mt-1">{funcionariosPrevisao.length}</div>
          </div>
          <div className="rounded-xl border-2 border-green-500/20 bg-green-50 p-5">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" /> Documentos OK</div>
            <div className="text-4xl font-bold text-green-600 mt-1">{docsOkCount}</div>
          </div>
          <div className="rounded-xl border-2 border-amber-500/20 bg-amber-50 p-5">
            <div className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4 text-amber-600" /> Pendentes</div>
            <div className="text-4xl font-bold text-amber-600 mt-1">{docsPendenteCount}</div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs separando Pendentes e OK */}
        <Tabs value={parceriaTab} onValueChange={setParceriaTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pendentes" className="gap-1">
              <Clock className="h-3.5 w-3.5" /> Pendentes ({funcionariosDocsPendente.length})
            </TabsTrigger>
            <TabsTrigger value="ok" className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Documentos OK ({funcionariosDocsOk.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="mt-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-50">
                    <TableHead>NOME</TableHead>
                    <TableHead>SETOR</TableHead>
                    <TableHead>CARGO</TableHead>
                    <TableHead className="text-center">DOCUMENTOS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionariosDocsPendente.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Todos os documentos foram confirmados! 🎉
                      </TableCell>
                    </TableRow>
                  ) : (
                    funcionariosDocsPendente.map((func) => (
                      <TableRow
                        key={func.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => {
                          setDocDialogFuncionario(func);
                          setDocDialogOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{func.nome_completo}</TableCell>
                        <TableCell>{func.setor?.nome || '-'}</TableCell>
                        <TableCell>{func.cargo || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300">
                            <Clock className="h-3 w-3" /> PENDENTE
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="ok" className="mt-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-green-50">
                    <TableHead>NOME</TableHead>
                    <TableHead>SETOR</TableHead>
                    <TableHead>CARGO</TableHead>
                    <TableHead className="text-center">DOCUMENTOS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionariosDocsOk.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum documento confirmado ainda
                      </TableCell>
                    </TableRow>
                  ) : (
                    funcionariosDocsOk.map((func) => (
                      <TableRow
                        key={func.id}
                        className="hover:bg-muted/30"
                      >
                        <TableCell className="font-medium">{func.nome_completo}</TableCell>
                        <TableCell>{func.setor?.nome || '-'}</TableCell>
                        <TableCell>{func.cargo || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-600 text-white gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3" /> OK
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <DocumentoStatusDialog
          funcionario={docDialogFuncionario}
          currentStatus={docDialogFuncionario ? docMap.get(docDialogFuncionario.id) || null : null}
          open={docDialogOpen}
          onOpenChange={setDocDialogOpen}
        />
      </div>
    );
  }

  // ===================== VIEW NORMAL (Admin/SONIA/Gestores) =====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">PREVISÃO DE ADMISSÃO</h1>
          <p className="page-description">GERENCIE CANDIDATOS PREVISTOS PARA CONTRATAÇÃO</p>
        </div>
        {!isParceria && <NovaPrevisaoDialog />}
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
          <div className="text-sm font-medium text-muted-foreground">Total em Previsão</div>
          <div className="text-4xl font-bold text-primary mt-1">{funcionariosPrevisao.length}</div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {(() => {
            const fixedGroups = [
              'SOPRO A', 'SOPRO B', 'SOPRO C',
              'DECORAÇÃO MOD DIA - T1', 'DECORAÇÃO MOD DIA - T2',
              'DECORAÇÃO MOD NOITE - T1', 'DECORAÇÃO MOD NOITE - T2',
            ];

            const countByGroup = (label: string) => {
              if (label.startsWith('SOPRO')) {
                const turma = label.split(' ')[1];
                return funcionariosPrevisao.filter(f => {
                  const grupo = f.setor?.grupo?.toUpperCase() || '';
                  return grupo === `SOPRO ${turma}`;
                }).length;
              }
              const isDia = label.includes('DIA');
              const turmaNum = label.includes('T1') ? 'T1' : 'T2';
              return funcionariosPrevisao.filter(f => {
                const setorNome = f.setor?.nome?.toUpperCase() || '';
                const turma = f.turma?.toUpperCase() || '';
                return setorNome.includes(isDia ? 'DIA' : 'NOITE') 
                  && setorNome.includes('DECORAÇÃO')
                  && (turma === turmaNum || turma === turmaNum.replace('T', ''));
              }).length;
            };

            return fixedGroups.map(label => {
              const count = countByGroup(label);
              return (
                <div
                  key={label}
                  className={`rounded-xl border p-4 transition-all ${
                    count > 0 
                      ? 'border-primary/30 bg-primary/5 shadow-sm' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="text-xs font-medium text-muted-foreground leading-tight min-h-[2rem] flex items-center">
                    {label}
                  </div>
                  <div className={`text-3xl font-bold mt-2 tabular-nums ${
                    count > 0 ? 'text-primary' : 'text-muted-foreground/40'
                  }`}>
                    {count}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Tabs para Admin/SONIA */}
      {showHistorico ? (
        <Tabs value={tabAtiva} onValueChange={setTabAtiva}>
          <TabsList>
            <TabsTrigger value="candidatos">CANDIDATOS</TabsTrigger>
            <TabsTrigger value="historico" className="gap-1">
              <HistoryIcon className="h-3.5 w-3.5" /> HISTÓRICO DOCUMENTOS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="candidatos" className="space-y-4 mt-4">
            {/* Quick group filters */}
            <div className="flex flex-wrap gap-2">
              {['SOPRO A', 'SOPRO B', 'SOPRO C', 'DECORAÇÃO DIA', 'DECORAÇÃO NOITE'].map(grupo => (
                <Button
                  key={grupo}
                  size="sm"
                  variant={filtroGrupo === grupo ? 'default' : 'outline'}
                  className="text-xs font-bold"
                  onClick={() => setFiltroGrupo(filtroGrupo === grupo ? null : grupo)}
                >
                  {grupo}
                </Button>
              ))}
              {filtroGrupo && (
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setFiltroGrupo(null)}>
                  Limpar filtro
                </Button>
              )}
            </div>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, matrícula ou setor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-[180px]">
                <MultiSelect
                  options={setores.map(s => ({ value: s.id, label: s.nome }))}
                  selected={filtroSetores}
                  onChange={setFiltroSetores}
                  placeholder="Setor"
                  searchPlaceholder="Buscar setor..."
                />
              </div>
              <div className="w-[150px]">
                <MultiSelect
                  options={empresasUnicas.map(e => ({ value: e, label: e }))}
                  selected={filtroEmpresas}
                  onChange={setFiltroEmpresas}
                  placeholder="Empresa"
                  searchPlaceholder="Buscar empresa..."
                />
              </div>
              <div className="w-[120px]">
                <MultiSelect
                  options={turmasValidas.map(t => ({ value: t, label: t }))}
                  selected={filtroTurmas}
                  onChange={setFiltroTurmas}
                  placeholder="Turma"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleExportar}
                disabled={funcionariosFiltrados.length === 0}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
              <ImportarPrevisoes setores={setores} situacaoPrevisao={situacaoPrevisao} />
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>EMPRESA</TableHead>
                    <TableHead>MATRÍCULA</TableHead>
                    <TableHead className="min-w-[220px]">NOME</TableHead>
                    <TableHead>SETOR</TableHead>
                    <TableHead>TURMA</TableHead>
                    <TableHead>CARGO</TableHead>
                    <TableHead>DATA PREVISTA</TableHead>
                    {showDocStatus && <TableHead className="text-center">DOCS</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funcionariosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={showDocStatus ? 8 : 7} className="text-center py-8 text-muted-foreground">
                        Nenhuma previsão de admissão encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    funcionariosFiltrados.map((func) => (
                      <TableRow
                        key={func.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => {
                          setSelectedFuncionario(func);
                          setActionsDialogOpen(true);
                        }}
                      >
                        <TableCell>
                          <Badge variant={func.empresa === 'GLOBALPACK' ? 'default' : 'secondary'}>
                            {func.empresa || 'GLOBALPACK'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{func.matricula || '-'}</TableCell>
                        <TableCell className="min-w-[220px]">
                          <div>
                            <span className="font-medium">{func.nome_completo}</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Incluído em {format(parseISO(func.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{func.setor?.nome || '-'}</TableCell>
                        <TableCell>{func.turma || '-'}</TableCell>
                        <TableCell>{func.cargo || '-'}</TableCell>
                        <TableCell>
                          {func.data_admissao
                            ? format(parseISO(func.data_admissao), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        {showDocStatus && (
                          <TableCell className="text-center">
                            {getDocStatusBadge(func.id)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>DATA/HORA</TableHead>
                    <TableHead>CANDIDATO</TableHead>
                    <TableHead>ALTERADO POR</TableHead>
                    <TableHead className="text-center">STATUS ANTERIOR</TableHead>
                    <TableHead className="text-center">NOVO STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todosHistorico.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum registro de alteração ainda
                      </TableCell>
                    </TableRow>
                  ) : (
                    todosHistorico.map((h) => {
                      const func = funcionarios.find(f => f.id === h.funcionario_id);
                      return (
                        <TableRow key={h.id} className="hover:bg-muted/30">
                          <TableCell className="text-sm">
                            {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium">
                            {func?.nome_completo || 'Funcionário removido'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{h.usuario_nome}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {h.status_anterior ? (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                {h.status_anterior === 'documentos_ok' ? 'OK' : h.status_anterior === 'pendente' ? 'PENDENTE' : h.status_anterior.toUpperCase()}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`gap-1 text-xs ${h.status_novo === 'documentos_ok' ? 'bg-green-600 text-white' : ''}`}>
                              <CheckCircle2 className="h-3 w-3" />
                              {h.status_novo === 'documentos_ok' ? 'DOCUMENTOS OK' : h.status_novo === 'pendente' ? 'PENDENTE' : h.status_novo.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {/* Quick group filters */}
          <div className="flex flex-wrap gap-2">
            {['SOPRO A', 'SOPRO B', 'SOPRO C', 'DECORAÇÃO DIA', 'DECORAÇÃO NOITE'].map(grupo => (
              <Button
                key={grupo}
                size="sm"
                variant={filtroGrupo === grupo ? 'default' : 'outline'}
                className="text-xs font-bold"
                onClick={() => setFiltroGrupo(filtroGrupo === grupo ? null : grupo)}
              >
                {grupo}
              </Button>
            ))}
            {filtroGrupo && (
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setFiltroGrupo(null)}>
                Limpar filtro
              </Button>
            )}
          </div>
          {/* Filters - sem tabs para quem não vê histórico */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, matrícula ou setor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-[180px]">
              <MultiSelect
                options={setores.map(s => ({ value: s.id, label: s.nome }))}
                selected={filtroSetores}
                onChange={setFiltroSetores}
                placeholder="Setor"
                searchPlaceholder="Buscar setor..."
              />
            </div>
            <div className="w-[150px]">
              <MultiSelect
                options={empresasUnicas.map(e => ({ value: e, label: e }))}
                selected={filtroEmpresas}
                onChange={setFiltroEmpresas}
                placeholder="Empresa"
                searchPlaceholder="Buscar empresa..."
              />
            </div>
            <div className="w-[120px]">
              <MultiSelect
                options={turmasValidas.map(t => ({ value: t, label: t }))}
                selected={filtroTurmas}
                onChange={setFiltroTurmas}
                placeholder="Turma"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleExportar}
              disabled={funcionariosFiltrados.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <ImportarPrevisoes setores={setores} situacaoPrevisao={situacaoPrevisao} />
          </div>

          {/* Table */}
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>EMPRESA</TableHead>
                  <TableHead>MATRÍCULA</TableHead>
                  <TableHead className="max-w-[200px]">NOME</TableHead>
                  <TableHead>SETOR</TableHead>
                  <TableHead>TURMA</TableHead>
                  <TableHead>CARGO</TableHead>
                  <TableHead>DATA PREVISTA</TableHead>
                  {showDocStatus && <TableHead className="text-center">DOCS</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcionariosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showDocStatus ? 8 : 7} className="text-center py-8 text-muted-foreground">
                      Nenhuma previsão de admissão encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  funcionariosFiltrados.map((func) => (
                    <TableRow
                      key={func.id}
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        setSelectedFuncionario(func);
                        setActionsDialogOpen(true);
                      }}
                    >
                      <TableCell>
                        <Badge variant={func.empresa === 'GLOBALPACK' ? 'default' : 'secondary'}>
                          {func.empresa || 'GLOBALPACK'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{func.matricula || '-'}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="font-medium truncate block">{func.nome_completo}</span>
                      </TableCell>
                      <TableCell>{func.setor?.nome || '-'}</TableCell>
                      <TableCell>{func.turma || '-'}</TableCell>
                      <TableCell>{func.cargo || '-'}</TableCell>
                      <TableCell>
                        {func.data_admissao
                          ? format(parseISO(func.data_admissao), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      {showDocStatus && (
                        <TableCell className="text-center">
                          {getDocStatusBadge(func.id)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Dialog de Ações - clique na linha */}
      <Dialog open={actionsDialogOpen} onOpenChange={setActionsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedFuncionario?.nome_completo}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant="outline"
              className="justify-start gap-2"
              onClick={() => {
                setEditingFuncionario(selectedFuncionario);
                setActionsDialogOpen(false);
                setEditDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="default"
              className="justify-start gap-2"
              onClick={async () => {
                if (selectedFuncionario) {
                  await handleAtivar(selectedFuncionario.id);
                  setActionsDialogOpen(false);
                }
              }}
              disabled={updateFuncionario.isPending}
            >
              <Check className="h-4 w-4" />
              Ativar Funcionário
            </Button>
            {showDocStatus && (
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => {
                  setDocDialogFuncionario(selectedFuncionario);
                  setActionsDialogOpen(false);
                  setDocDialogOpen(true);
                }}
              >
                <FileCheck className="h-4 w-4" />
                Documentos
              </Button>
            )}
            {isAdmin && selectedFuncionario && docMap.get(selectedFuncionario.id) === 'documentos_ok' && (
              <Button
                variant="outline"
                className="justify-start gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={async () => {
                  if (selectedFuncionario) {
                    await updateDocStatus.mutateAsync({
                      funcionarioId: selectedFuncionario.id,
                      status: 'pendente',
                      usuarioNome: userRole.nome,
                    });
                    toast.success('Documento retornado para PENDENTE');
                    setActionsDialogOpen(false);
                  }
                }}
                disabled={updateDocStatus.isPending}
              >
                <Clock className="h-4 w-4" />
                Retornar Doc. para Pendente
              </Button>
            )}
            <Button
              variant="destructive"
              className="justify-start gap-2"
              onClick={() => {
                setActionsDialogOpen(false);
                setConfirmExcluirOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={confirmExcluirOpen} onOpenChange={setConfirmExcluirOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Previsão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a previsão de admissão de{' '}
              <strong>{selectedFuncionario?.nome_completo}</strong>?
              <br />Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedFuncionario) handleExcluir(selectedFuncionario.id);
                setConfirmExcluirOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Edição */}
      <EditarPrevisaoDialog
        funcionario={editingFuncionario}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      {/* Dialog de Documentos */}
      <DocumentoStatusDialog
        funcionario={docDialogFuncionario}
        currentStatus={docDialogFuncionario ? docMap.get(docDialogFuncionario.id) || null : null}
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
      />
    </div>
  );
}
