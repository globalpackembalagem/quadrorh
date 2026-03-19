import { useState, useMemo, useCallback } from 'react';
import { Search, Users, Trash2, Plus, X, ArrowRightLeft, Upload, Undo2, History, ChevronDown, ChevronUp, Filter, Download, Type } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';
import { useFuncionarios, useUpdateFuncionario, useDeleteFuncionario, useCreateFuncionario } from '@/hooks/useFuncionarios';
import { useCreateDemissao } from '@/hooks/useDemissoes';
import { useSetores, useSetoresAtivos } from '@/hooks/useSetores';
import { useSituacoes, useSituacoesAtivas } from '@/hooks/useSituacoes';
import { useAuth } from '@/hooks/useAuth';
import { useRegistrarHistoricoFuncionario, formatarDadosFuncionario } from '@/hooks/useHistoricoFuncionarios';
import { useHistoricoAuditoria } from '@/hooks/useHistorico';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImportarFuncionarios } from '@/components/funcionarios/ImportarFuncionarios';
import { ImportarTurmasDialog } from '@/components/funcionarios/ImportarTurmasDialog';
import { ExportarFuncionariosDialog } from '@/components/funcionarios/ExportarFuncionariosDialog';
import { ZerarBaseDialog } from '@/components/funcionarios/ZerarBaseDialog';
import { CamposSituacaoEspecial } from '@/components/funcionarios/CamposSituacaoEspecial';
import { TrocaUnificadaDialog } from '@/components/funcionarios/TrocaUnificadaDialog';
import { useCriarDivergenciaAuto, devecriarDivergencia } from '@/hooks/useDivergenciasAuto';

import { Funcionario, SexoTipo, EmpresaTipo } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// xlsx-js-style loaded dynamically
import { toast } from 'sonner';

// ─── Componente de Histórico ──────────────────────────────────────────────────
function HistoricoTab() {
  const { data: historico = [], isLoading } = useHistoricoAuditoria('funcionarios');
  const [search, setSearch] = useState('');
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [filtroTurma, setFiltroTurma] = useState(false);

  const toggleExpandido = (id: string) => setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

  const filteredHistorico = historico.filter(h => {
    const dadosNovos = h.dados_novos as Record<string, unknown> | null;
    const dadosAnteriores = h.dados_anteriores as Record<string, unknown> | null;

    if (filtroTurma) {
      const turmaAnterior = dadosAnteriores?.turma;
      const turmaNova = dadosNovos?.turma;
      if (JSON.stringify(turmaAnterior) === JSON.stringify(turmaNova)) return false;
    }

    if (!search) return true;
    const s = search.toLowerCase();
    const nomeNovo = dadosNovos?.nome as string || '';
    const nomeAnterior = dadosAnteriores?.nome as string || '';
    return (
      h.usuario_nome?.toLowerCase().includes(s) ||
      h.operacao.toLowerCase().includes(s) ||
      nomeNovo.toLowerCase().includes(s) ||
      nomeAnterior.toLowerCase().includes(s)
    );
  });

  const exportarExcel = async () => {
    if (!filteredHistorico.length) return;
    const XLSX = await import('xlsx-js-style');
    const dados = filteredHistorico.map(h => {
      const n = h.dados_novos as Record<string, unknown> | null;
      const a = h.dados_anteriores as Record<string, unknown> | null;
      return {
        'Data': format(parseISO(h.created_at), 'dd/MM/yyyy HH:mm'),
        'Usuário': h.usuario_nome || '',
        'Operação': h.operacao,
        'Funcionário': (n?.nome || a?.nome || '') as string,
        'Turma Anterior': (a?.turma || '') as string,
        'Turma Nova': (n?.turma || '') as string,
        'Setor Anterior': (a?.setor || '') as string,
        'Setor Novo': (n?.setor || '') as string,
      };
    });
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    XLSX.writeFile(wb, `Historico_Funcionarios_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const getOpLabel = (op: string) => ({ INSERT: 'Criação', UPDATE: 'Edição', DELETE: 'Exclusão', TRANSFERENCIA: 'Transferência' }[op] || op);
  const getOpVariant = (op: string): 'default' | 'secondary' | 'destructive' | 'outline' =>
    ({ INSERT: 'default', UPDATE: 'secondary', DELETE: 'destructive', TRANSFERENCIA: 'outline' } as Record<string, 'default' | 'secondary' | 'destructive' | 'outline'>)[op] || 'outline';

  const formatarValor = (valor: unknown): string => {
    if (valor === null || valor === undefined) return '-';
    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
    if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}$/)) return format(parseISO(valor), 'dd/MM/yyyy');
    return String(valor);
  };

  const renderDiferencas = (ant: Record<string, unknown> | null, nov: Record<string, unknown> | null) => {
    if (!ant && !nov) return null;
    const campos = new Set([...Object.keys(ant || {}), ...Object.keys(nov || {})]);
    const diffs: Array<{ campo: string; anterior: unknown; novo: unknown }> = [];
    campos.forEach(campo => {
      const vAnt = ant?.[campo], vNov = nov?.[campo];
      if (JSON.stringify(vAnt) !== JSON.stringify(vNov)) diffs.push({ campo, anterior: vAnt, novo: vNov });
    });
    if (!diffs.length) return null;
    const labels: Record<string, string> = { nome: 'Nome', empresa: 'Empresa', matricula: 'Matrícula', setor: 'Setor', turma: 'Turma', situacao: 'Situação', cargo: 'Cargo', sexo: 'Sexo', data_admissao: 'Data Admissão', data_demissao: 'Data Demissão', observacoes: 'Observações' };
    return (
      <div className="mt-2 space-y-1 text-xs">
        {diffs.map(({ campo, anterior, novo }) => (
          <div key={campo} className="flex flex-wrap gap-1 items-center">
            <span className="font-medium text-muted-foreground">{labels[campo] || campo}:</span>
            {anterior != null && <span className="line-through text-destructive">{formatarValor(anterior)}</span>}
            {anterior != null && novo != null && <span className="text-muted-foreground">→</span>}
            {novo != null && <span className="text-primary font-medium">{formatarValor(novo)}</span>}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome, usuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button size="sm" variant={filtroTurma ? 'default' : 'outline'} onClick={() => setFiltroTurma(!filtroTurma)} className="gap-1">
          <Filter className="h-3 w-3" /> SÓ TURMAS
        </Button>
        <Button size="sm" variant="outline" onClick={exportarExcel} disabled={!filteredHistorico.length}>
          <Download className="h-3 w-3 mr-1" /> EXCEL
        </Button>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredHistorico.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum histórico encontrado</p>
          </div>
        ) : (
          filteredHistorico.map(h => {
            const dadosNovos = h.dados_novos as Record<string, unknown> | null;
            const dadosAnteriores = h.dados_anteriores as Record<string, unknown> | null;
            const nomeFuncionario = (dadosNovos?.nome || dadosAnteriores?.nome || 'Funcionário') as string;
            const isExp = expandidos[h.id];
            return (
              <div key={h.id} className="rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getOpVariant(h.operacao)}>{getOpLabel(h.operacao)}</Badge>
                      <span className="font-medium truncate">{nomeFuncionario}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium">{h.usuario_nome}</span>
                      <span className="mx-1">•</span>
                      <span>{format(parseISO(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                    </div>
                    {isExp && renderDiferencas(dadosAnteriores, dadosNovos)}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => toggleExpandido(h.id)} className="shrink-0">
                    {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="text-xs text-muted-foreground text-center">Exibindo últimos 100 registros</div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Funcionarios() {
  const { data: funcionarios = [], isLoading } = useFuncionarios();
  const { data: setores = [] } = useSetores();
  const { data: setoresAtivos = [] } = useSetoresAtivos();
  const { data: todasSituacoes = [] } = useSituacoes();
  const { data: situacoesAtivas = [] } = useSituacoesAtivas();
  const { canEditFuncionarios, isVisualizacao, isAdmin, isRHMode } = useAuth();
  const updateFuncionario = useUpdateFuncionario();
  const deleteFuncionario = useDeleteFuncionario();
  const createFuncionario = useCreateFuncionario();
  const createDemissao = useCreateDemissao();
  const criarDivergencia = useCriarDivergenciaAuto();
  const registrarHistorico = useRegistrarHistoricoFuncionario();


  // Estado para o prompt de demissão ao mudar situação
  const [demissaoPromptOpen, setDemissaoPromptOpen] = useState(false);
  const [demissaoPromptData, setDemissaoPromptData] = useState<{
    funcionarioId: string;
    funcionarioNome: string;
    setorNome: string;
    isPedido: boolean;
  } | null>(null);

  // Gestor não-admin mas logado
  const isGestor = isRHMode && !isAdmin;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importarTurmasOpen, setImportarTurmasOpen] = useState(false);
  const [turmaFilter, setTurmaFilter] = useFilterPersistence<string>('func_turma', 'TODOS');
  const [grupoFilter, setGrupoFilter] = useFilterPersistence<'TODOS' | 'SOPRO' | 'DECORACAO'>('func_grupo', 'TODOS');
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);

  // Form state
  const [empresa, setEmpresa] = useState<EmpresaTipo>('GLOBALPACK');
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [cargo, setCargo] = useState('');
  const [setorId, setSetorId] = useState('');
  const [turma, setTurma] = useState('');
  const [situacaoId, setSituacaoId] = useState('');
  const [sexo, setSexo] = useState<SexoTipo>('masculino');
  const [dataDemissao, setDataDemissao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [coberturaFuncionarioId, setCoberturaFuncionarioId] = useState('');
  const [treinamentoSetorId, setTreinamentoSetorId] = useState('');
  const [sumidoDesde, setSumidoDesde] = useState('');
  const [naoEMeuFuncionario, setNaoEMeuFuncionario] = useState(false);

  // funcionariosAtivosParaContagem mantido para compatibilidade com view do gestor
  const funcionariosAtivosParaContagem = useMemo(() => {
    return funcionarios.filter(f => {
      const sitNome = f.situacao?.nome?.toUpperCase() || '';
      return sitNome !== 'DEMISSÃO' && sitNome !== 'PED. DEMISSÃO';
    });
  }, [funcionarios]);

  // Turmas de cada grupo
  const TURMAS_SOPRO = ['1A', '1B', '2A', '2B', 'X', 'XX'];
  const TURMAS_DECORACAO = ['T1', 'T2'];

  // Funcionários pré-filtrados pelo grupo selecionado
  const funcionariosDoGrupo = useMemo(() => {
    if (grupoFilter === 'TODOS') return funcionarios;
    if (grupoFilter === 'SOPRO') {
      return funcionarios.filter(f => {
        const grupo = (f.setor as any)?.grupo?.toUpperCase() || '';
        return grupo.startsWith('SOPRO');
      });
    }
    if (grupoFilter === 'DECORACAO') {
      return funcionarios.filter(f => {
        const grupo = (f.setor as any)?.grupo?.toUpperCase() || '';
        return grupo.startsWith('DECORAÇÃO') || grupo.startsWith('DECORACAO');
      });
    }
    return funcionarios;
  }, [funcionarios, grupoFilter]);

  const funcionariosAtivosGrupo = useMemo(() => {
    return funcionariosDoGrupo.filter(f => {
      const sitNome = f.situacao?.nome?.toUpperCase() || '';
      return sitNome !== 'DEMISSÃO' && sitNome !== 'PED. DEMISSÃO';
    });
  }, [funcionariosDoGrupo]);

  // Apenas ATIVO e FÉRIAS para contagens nos filtros
  const funcionariosAtivosFeriasGrupo = useMemo(() => {
    return funcionariosDoGrupo.filter(f => {
      const sitNome = f.situacao?.nome?.toUpperCase() || '';
      return sitNome === 'ATIVO' || sitNome === 'FÉRIAS';
    });
  }, [funcionariosDoGrupo]);

  const turmaOptions = useMemo(() => {
    const turmasPermitidas = grupoFilter === 'SOPRO'
      ? TURMAS_SOPRO
      : grupoFilter === 'DECORACAO'
      ? TURMAS_DECORACAO
      : null;

    const turmas = new Map<string, number>();
    funcionariosAtivosFeriasGrupo.forEach(f => {
      const t = f.turma || 'SEM TURMA';
      if (t === 'SEM TURMA') {
        // SEM TURMA: contar apenas funcionários dos setores do quadro (SOPRO e DECORAÇÃO)
        const grupo = (f.setor as any)?.grupo?.toUpperCase() || '';
        const isQuadroSoproDeco = grupo.startsWith('SOPRO') || grupo.startsWith('DECORAÇÃO') || grupo.startsWith('DECORACAO');
        if (isQuadroSoproDeco) {
          turmas.set(t, (turmas.get(t) || 0) + 1);
        }
      } else if (!turmasPermitidas || turmasPermitidas.includes(t)) {
        turmas.set(t, (turmas.get(t) || 0) + 1);
      }
    });
    const sorted = Array.from(turmas.entries()).sort(([a], [b]) => {
      if (a === 'SEM TURMA') return 1;
      if (b === 'SEM TURMA') return -1;
      return a.localeCompare(b);
    });
    return [['TODOS', funcionariosAtivosFeriasGrupo.length] as [string, number], ...sorted];
  }, [funcionariosAtivosFeriasGrupo, grupoFilter]);

  const filteredFuncionarios = useMemo(() => {
    let result = funcionariosDoGrupo;
    if (turmaFilter !== 'TODOS') {
      if (turmaFilter === 'SEM TURMA') {
        // SEM TURMA: mostrar apenas ATIVO/FÉRIAS sem turma dos setores do quadro (SOPRO e DECORAÇÃO)
        result = result.filter(f => {
          const sitNome = f.situacao?.nome?.toUpperCase() || '';
          const grupo = (f.setor as any)?.grupo?.toUpperCase() || '';
          const isQuadroSoproDeco = grupo.startsWith('SOPRO') || grupo.startsWith('DECORAÇÃO') || grupo.startsWith('DECORACAO');
          return !f.turma && (sitNome === 'ATIVO' || sitNome === 'FÉRIAS') && isQuadroSoproDeco;
        });
      } else {
        result = result.filter(f => f.turma === turmaFilter);
      }
    }
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      result = result.filter(f =>
        f.nome_completo.toLowerCase().includes(s) ||
        f.matricula?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [funcionariosDoGrupo, debouncedSearch, turmaFilter]);

  // Agrupado por turma para a view do gestor
  const funcionariosPorTurma = useMemo(() => {
    const ativos = funcionarios.filter(f => {
      const sitNome = f.situacao?.nome?.toUpperCase() || '';
      return sitNome !== 'DEMISSÃO' && sitNome !== 'PED. DEMISSÃO';
    });
    const map = new Map<string, Funcionario[]>();
    ativos.forEach(f => {
      const t = f.turma || 'SEM TURMA';
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(f);
    });
    const sorted = Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'SEM TURMA') return 1;
      if (b === 'SEM TURMA') return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [funcionarios]);

  const resetForm = () => {
    setEmpresa('GLOBALPACK');
    setMatricula('');
    setNome('');
    setDataAdmissao('');
    setCargo('');
    setSetorId('');
    setTurma('');
    setSituacaoId('');
    setSexo('masculino');
    setDataDemissao('');
    setObservacoes('');
    setCoberturaFuncionarioId('');
    setTreinamentoSetorId('');
    setSumidoDesde('');
    setNaoEMeuFuncionario(false);
    setEditingFuncionario(null);
  };

  const openEdit = (func: Funcionario) => {
    setEditingFuncionario(func);
    setEmpresa(func.empresa as EmpresaTipo || 'GLOBALPACK');
    setMatricula(func.matricula || '');
    setNome(func.nome_completo);
    setDataAdmissao(func.data_admissao || '');
    setCargo(func.cargo || '');
    setSetorId(func.setor_id);
    setTurma(func.turma || '');
    setSituacaoId(func.situacao_id);
    setSexo(func.sexo);
    setDataDemissao(func.data_demissao || '');
    setObservacoes(func.observacoes || '');
    setCoberturaFuncionarioId(func.cobertura_funcionario_id || '');
    setTreinamentoSetorId(func.treinamento_setor_id || '');
    setSumidoDesde(func.sumido_desde || '');
    setNaoEMeuFuncionario(func.nao_e_meu_funcionario || false);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Gestor: apenas atualizar turma
    if (!isAdmin && editingFuncionario) {
      const turmaAnterior = editingFuncionario.turma;
      const novaTurma = turma || null;
      await updateFuncionario.mutateAsync({
        id: editingFuncionario.id,
        turma: novaTurma,
      });
      if (turmaAnterior !== novaTurma) {
        await registrarHistorico.mutateAsync({
          tabela: 'funcionarios',
          operacao: 'UPDATE',
          registro_id: editingFuncionario.id,
          dados_anteriores: { nome: editingFuncionario.nome_completo, turma: turmaAnterior || null } as Record<string, any>,
          dados_novos: { nome: editingFuncionario.nome_completo, turma: novaTurma } as Record<string, any>,
        });
      }
      setDialogOpen(false);
      resetForm();
      return;
    }

    if (!nome || !setorId || !situacaoId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const situacaoSelecionada = situacoesAtivas.find(s => s.id === situacaoId);
    const situacaoNome = situacaoSelecionada?.nome || '';

    // Validação: SUMIDO exige data obrigatória
    if (situacaoNome.toUpperCase().includes('SUMIDO') && !sumidoDesde) {
      toast.error('Para situação SUMIDO, informe a data obrigatoriamente');
      return;
    }

    const data = {
      empresa,
      matricula: matricula || null,
      nome_completo: nome,
      data_admissao: dataAdmissao || null,
      cargo: cargo || null,
      setor_id: setorId,
      turma: turma || null,
      situacao_id: situacaoId,
      sexo,
      data_demissao: dataDemissao || null,
      observacoes: observacoes || null,
      cobertura_funcionario_id: coberturaFuncionarioId && coberturaFuncionarioId !== 'nenhum' ? coberturaFuncionarioId : null,
      treinamento_setor_id: treinamentoSetorId && treinamentoSetorId !== 'nenhum' ? treinamentoSetorId : null,
      sumido_desde: sumidoDesde || null,
      nao_e_meu_funcionario: naoEMeuFuncionario,
    };

    let funcionarioId: string;
    const dadosAnteriores = editingFuncionario
      ? formatarDadosFuncionario(editingFuncionario as unknown as Record<string, unknown>, setoresAtivos, situacoesAtivas)
      : null;

    if (editingFuncionario) {
      await updateFuncionario.mutateAsync({ id: editingFuncionario.id, ...data });
      funcionarioId = editingFuncionario.id;
      const dadosNovos = formatarDadosFuncionario(data as unknown as Record<string, unknown>, setoresAtivos, situacoesAtivas);
      await registrarHistorico.mutateAsync({
        tabela: 'funcionarios',
        operacao: 'UPDATE',
        registro_id: funcionarioId,
        dados_anteriores: dadosAnteriores,
        dados_novos: dadosNovos,
      });
    } else {
      const result = await createFuncionario.mutateAsync(data);
      funcionarioId = result?.id || '';
      if (funcionarioId) {
        const dadosNovos = formatarDadosFuncionario(data as unknown as Record<string, unknown>, setoresAtivos, situacoesAtivas);
        await registrarHistorico.mutateAsync({
          tabela: 'funcionarios',
          operacao: 'INSERT',
          registro_id: funcionarioId,
          dados_anteriores: null,
          dados_novos: dadosNovos,
        });
      }
    }

    const { criar, tipo } = devecriarDivergencia(situacaoNome);
    if (criar && funcionarioId) {
      let obs = '';
      if (situacaoNome.toUpperCase().includes('SUMIDO') && sumidoDesde) {
        obs = `Funcionário sumido desde ${format(parseISO(sumidoDesde), 'dd/MM/yyyy')}`;
      } else if (situacaoNome.toUpperCase().includes('TREINAMENTO') && treinamentoSetorId) {
        const setorTreinamento = setoresAtivos.find(s => s.id === treinamentoSetorId);
        obs = `Em treinamento no setor: ${setorTreinamento?.nome || 'Não informado'}`;
      } else if (situacaoNome.toUpperCase().includes('COB') && coberturaFuncionarioId) {
        const funcCoberto = funcionarios.find(f => f.id === coberturaFuncionarioId);
        obs = `Cobrindo férias de: ${funcCoberto?.nome_completo || 'Não informado'}`;
      }
      await criarDivergencia.mutateAsync({ funcionario_id: funcionarioId, tipo_divergencia: tipo, observacoes: obs });
      toast.info('Divergência criada para análise do RH');
    }

    setDialogOpen(false);
    resetForm();

    // Verificar se mudou para situação de demissão e oferecer criar registro
    if (editingFuncionario && funcionarioId) {
      const situacaoAnteriorNome = editingFuncionario.situacao?.nome?.toUpperCase() || '';
      const novaSituacaoNome = situacaoNome.toUpperCase();
      const situacoesDesligamento = ['DEMISSÃO', 'PED. DEMISSÃO'];
      const eraDesligamento = situacoesDesligamento.some(s => situacaoAnteriorNome.includes(s));
      const agoraDesligamento = situacoesDesligamento.some(s => novaSituacaoNome.includes(s));
      
      if (!eraDesligamento && agoraDesligamento) {
        const setorFunc = setoresAtivos.find(s => s.id === setorId);
        setDemissaoPromptData({
          funcionarioId,
          funcionarioNome: nome,
          setorNome: setorFunc?.nome || '',
          isPedido: novaSituacaoNome.includes('PED'),
        });
        setDemissaoPromptOpen(true);
      }
    }
  };

  const exportarTudo = async () => {
    if (!funcionarios.length) { toast.error('Nenhum funcionário para exportar'); return; }
    const XLSX = await import('xlsx-js-style');
    const dados = funcionarios.map(f => ({
      'Nome': f.nome_completo,
      'Sexo': f.sexo === 'masculino' ? 'M' : 'F',
      'Setor': f.setor?.nome || '',
      'Situação': f.situacao?.nome || '',
      'Empresa': f.empresa || '',
      'Matrícula': f.matricula || '',
      'Data Admissão': f.data_admissao ? format(parseISO(f.data_admissao), 'dd/MM/yyyy') : '',
      'Cargo': f.cargo || '',
      'Turma': f.turma || '',
      'Data Demissão': f.data_demissao ? format(parseISO(f.data_demissao), 'dd/MM/yyyy') : '',
      'Observações': f.observacoes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionários');
    XLSX.writeFile(wb, `Funcionarios_Todos_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Arquivo exportado com sucesso!');
  };

  const removerAcentos = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const handleRemoverAcentos = async () => {
    const comAcento = funcionarios.filter(f => f.nome_completo !== removerAcentos(f.nome_completo));
    if (comAcento.length === 0) {
      toast.info('Nenhum nome com acento encontrado!');
      return;
    }
    const confirmar = window.confirm(`Serão atualizados ${comAcento.length} nome(s). Deseja continuar?`);
    if (!confirmar) return;

    let count = 0;
    for (const f of comAcento) {
      try {
        await updateFuncionario.mutateAsync({
          id: f.id,
          nome_completo: removerAcentos(f.nome_completo),
        });
        count++;
      } catch {
        // continua
      }
    }
    toast.success(`${count} nome(s) atualizado(s) com sucesso!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Vista do Gestor (logado, não admin) ──────────────────────────────────────
  if (isGestor) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="page-title">FUNCIONÁRIOS</h1>
            <p className="page-description">CLIQUE EM UM FUNCIONÁRIO PARA EDITAR A TURMA</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportarFuncionariosDialog funcionarios={funcionarios} setores={setores} situacoes={todasSituacoes} />
          </div>
        </div>

        <Tabs defaultValue="turmas">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="turmas">POR TURMA</TabsTrigger>
            <TabsTrigger value="historico" className="gap-1">
              <History className="h-3 w-3" />
              HISTÓRICO
            </TabsTrigger>
          </TabsList>

          {/* Aba: Por Turma */}
          <TabsContent value="turmas" className="mt-4 space-y-4">
            {/* Busca */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou matrícula..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {search ? (
              // Com busca: mostra lista plana
              <div className="rounded-lg border bg-card overflow-x-auto">
                <table className="data-table text-xs w-full">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th className="w-[100px]">Turma</th>
                      <th className="w-[130px]">Setor</th>
                      <th className="w-[120px]">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFuncionarios.map(func => (
                      <tr
                        key={func.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openEdit(func)}
                      >
                        <td className="font-medium">{func.nome_completo}</td>
                        <td>{func.turma || <span className="text-muted-foreground">-</span>}</td>
                        <td className="text-xs text-muted-foreground">{func.setor?.nome}</td>
                        <td>
                          <Badge className="text-white border-0 text-[10px]" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                            {func.situacao?.nome}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // Sem busca: separado por turma
              <div className="space-y-4">
                {funcionariosPorTurma.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum funcionário encontrado</p>
                  </div>
                ) : (
                  funcionariosPorTurma.map(([turmaLabel, funcs]) => (
                    <div key={turmaLabel} className="rounded-lg border bg-card overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 flex items-center justify-between border-b">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{turmaLabel}</span>
                          <Badge variant="secondary" className="text-xs">{funcs.length} funcionário(s)</Badge>
                        </div>
                      </div>
                      <table className="data-table text-xs w-full">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th className="w-[100px]">Matrícula</th>
                            <th className="w-[130px]">Setor</th>
                            <th className="w-[120px]">Situação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {funcs.map(func => {
                            const sitNome = func.situacao?.nome?.toUpperCase() || '';
                            const isAtivoOuFerias = sitNome === 'ATIVO' || sitNome === 'FÉRIAS';
                            return (
                              <tr
                                key={func.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => openEdit(func)}
                              >
                                <td className="font-medium">{func.nome_completo}</td>
                                <td className="text-muted-foreground">{func.matricula || '-'}</td>
                                <td className="text-xs text-muted-foreground">{func.setor?.nome}</td>
                                <td>
                                  <Badge
                                    className="text-white border-0 text-[10px]"
                                    style={{ backgroundColor: isAtivoOuFerias ? 'hsl(var(--primary))' : 'hsl(var(--warning))' }}
                                  >
                                    {func.situacao?.nome}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Total: {funcionariosAtivosParaContagem.length} funcionário(s) ativos
            </div>
          </TabsContent>

          {/* Aba: Histórico */}
          <TabsContent value="historico" className="mt-4">
            <HistoricoTab />
          </TabsContent>
        </Tabs>

        {/* Dialog edição turma (gestor) */}
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Editar Turma — {editingFuncionario?.nome_completo}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
                <p><strong>Matrícula:</strong> {editingFuncionario?.matricula || 'TEMP'}</p>
                <p><strong>Setor:</strong> {editingFuncionario?.setor?.nome}</p>
                <p><strong>Situação:</strong> {editingFuncionario?.situacao?.nome}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="turma">Turma</Label>
                <Input id="turma" value={turma} onChange={e => setTurma(e.target.value.toUpperCase())} placeholder="Ex: 1A, 2B, T1, T2" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button type="submit" disabled={updateFuncionario.isPending}>Salvar Turma</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Vista do Admin / RH ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="page-title">FUNCIONÁRIOS</h1>
            <p className="page-description">CLIQUE EM UM FUNCIONÁRIO PARA EDITAR</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={openNew} className="gap-2" disabled={!canEditFuncionarios || isVisualizacao}>
              <Plus className="h-4 w-4" />
              NOVO FUNCIONÁRIO
            </Button>
            {canEditFuncionarios && !isVisualizacao && <TrocaUnificadaDialog funcionarios={funcionarios} />}
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setImportarTurmasOpen(true)}>
                <Upload className="h-4 w-4 mr-1" />
                TURMAS
              </Button>
            )}
            {canEditFuncionarios && !isVisualizacao && <ZerarBaseDialog />}
            <ExportarFuncionariosDialog funcionarios={funcionarios} setores={setores} situacoes={todasSituacoes} />
            {canEditFuncionarios && !isVisualizacao && <ImportarFuncionarios setores={setores} situacoes={todasSituacoes} />}
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={handleRemoverAcentos} className="gap-1">
                <Type className="h-4 w-4" />
                TIRAR ACENTOS
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="lista">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="lista">LISTA</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1">
            <History className="h-3 w-3" />
            HISTÓRICO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4 space-y-4">
          {/* Busca */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou matrícula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-8"
            />
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Filtro por grupo (SOPRO / DECORAÇÃO) + Turma */}
          {isAdmin && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
              {/* Linha 1: Grupos */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-14 shrink-0">GRUPO</span>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { key: 'TODOS', label: 'TODOS', count: funcionarios.filter(f => { const s = f.situacao?.nome?.toUpperCase() || ''; return s === 'ATIVO' || s === 'FÉRIAS'; }).length },
                    { key: 'SOPRO', label: 'SOPRO', count: funcionarios.filter(f => { const s = f.situacao?.nome?.toUpperCase() || ''; const g = ((f.setor as any)?.grupo || '').toUpperCase(); return (s === 'ATIVO' || s === 'FÉRIAS') && g.startsWith('SOPRO'); }).length },
                    { key: 'DECORACAO', label: 'DECORAÇÃO', count: funcionarios.filter(f => { const s = f.situacao?.nome?.toUpperCase() || ''; const g = ((f.setor as any)?.grupo || '').toUpperCase(); return (s === 'ATIVO' || s === 'FÉRIAS') && (g.startsWith('DECORAÇÃO') || g.startsWith('DECORACAO')); }).length },
                  ] as { key: 'TODOS' | 'SOPRO' | 'DECORACAO'; label: string; count: number }[]).map(g => {
                    const active = grupoFilter === g.key;
                    return (
                      <button
                        key={g.key}
                        onClick={() => { setGrupoFilter(g.key); setTurmaFilter('TODOS'); }}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold transition-colors border ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {g.label}
                        <span className={`text-[10px] font-normal tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {g.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Separador + Linha 2: Turmas */}
              {turmaOptions.length > 2 && (
                <>
                  <div className="border-t border-border/50" />
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-14 shrink-0 pt-0.5">TURMA</span>
                    <div className="flex flex-wrap gap-1.5">
                      {turmaOptions.map(([label, count]) => {
                        const active = turmaFilter === label;
                        return (
                          <button
                            key={label}
                            onClick={() => setTurmaFilter(label)}
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold transition-colors border ${
                              active
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                            }`}
                          >
                            {label}
                            <span className={`text-[10px] font-normal tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Filtro por turma (não-admin) */}
          {!isAdmin && turmaOptions.length > 2 && (
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-14 shrink-0 pt-0.5">TURMA</span>
                <div className="flex flex-wrap gap-1.5">
                  {turmaOptions.map(([label, count]) => {
                    const active = turmaFilter === label;
                    return (
                      <button
                        key={label}
                        onClick={() => setTurmaFilter(label)}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold transition-colors border ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {label}
                        <span className={`text-[10px] font-normal tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tabela */}
          <div className="rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th className="w-[80px]">Empresa</th>
                    <th className="w-[80px]">Matrícula</th>
                    <th className="max-w-[140px]">Nome</th>
                    <th className="w-[120px]">Setor</th>
                    <th className="w-[80px]">Turma</th>
                    <th className="w-[120px]">Situação</th>
                    <th className="w-[100px]">Admissão</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFuncionarios.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum funcionário encontrado</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFuncionarios.map(func => {
                      const situacaoNome = func.situacao?.nome?.toUpperCase() || '';
                      const isAtivoOuFerias = situacaoNome === 'ATIVO' || situacaoNome === 'FÉRIAS';
                      const temTransferencia = func.transferencia_programada;
                      return (
                        <tr
                          key={func.id}
                          className={canEditFuncionarios ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/50'}
                          onClick={() => canEditFuncionarios && openEdit(func)}
                        >
                          <td>{func.empresa}</td>
                          <td>{func.matricula || '-'}</td>
                          <td className="font-medium max-w-[140px] overflow-hidden">
                            <div className="flex items-center gap-1 truncate">
                              <span className="truncate">{func.nome_completo}</span>
                              {temTransferencia && (
                                <Badge variant="outline" className="bg-accent text-primary border-primary/30 text-[10px] px-1.5 py-0">
                                  <ArrowRightLeft className="h-3 w-3 mr-0.5" />
                                  TRANSF.
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap">{func.setor?.nome}</td>
                          <td>{func.turma || '-'}</td>
                          <td>
                            <Badge
                              className="text-white border-0"
                              style={{ backgroundColor: isAtivoOuFerias ? 'hsl(var(--primary))' : 'hsl(var(--warning))' }}
                            >
                              {func.situacao?.nome}
                            </Badge>
                          </td>
                          <td>
                            {func.data_admissao ? format(parseISO(func.data_admissao), 'dd/MM/yyyy') : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Total: {filteredFuncionarios.length} funcionário(s)
          </div>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <HistoricoTab />
        </TabsContent>
      </Tabs>

      {/* Dialog Admin/RH */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[650px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* Empresa e Matrícula */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={empresa} onValueChange={v => setEmpresa(v as EmpresaTipo)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBALPACK">GLOBALPACK</SelectItem>
                    <SelectItem value="G+P">G+P</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Número ou TEMP" />
              </div>
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do funcionário" required />
            </div>

            {/* Admissão e Cargo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Admissão</Label>
                <Input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Cargo do funcionário" />
              </div>
            </div>

            {/* Setor e Turma — agora sempre visíveis para admin */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={setorId} onValueChange={setSetorId} required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {setoresAtivos.map(setor => (
                      <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Turma</Label>
                <Input value={turma} onChange={e => setTurma(e.target.value.toUpperCase())} placeholder="Ex: 1A, 2B, T1, T2" />
              </div>
            </div>

            {/* Situação e Sexo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Situação</Label>
                <Select value={situacaoId} onValueChange={setSituacaoId} required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {situacoesAtivas.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={sexo} onValueChange={v => setSexo(v as SexoTipo)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campos condicionais situação */}
            <CamposSituacaoEspecial
              situacaoNome={situacoesAtivas.find(s => s.id === situacaoId)?.nome || ''}
              coberturaFuncionarioId={coberturaFuncionarioId}
              setCoberturaFuncionarioId={setCoberturaFuncionarioId}
              funcionariosParaCobertura={funcionarios.filter(f =>
                f.id !== editingFuncionario?.id &&
                f.situacao?.nome?.toUpperCase() === 'FÉRIAS'
              )}
              treinamentoSetorId={treinamentoSetorId}
              setTreinamentoSetorId={setTreinamentoSetorId}
              setoresDisponiveis={setoresAtivos}
              sumidoDesde={sumidoDesde}
              setSumidoDesde={setSumidoDesde}
            />

            {/* Transferência */}
            {editingFuncionario?.transferencia_programada && (
              <div className="rounded-lg border border-purple-300 bg-purple-50 p-3">
                <div className="flex items-center gap-2 text-purple-700">
                  <ArrowRightLeft className="h-4 w-4" />
                  <span className="font-medium">Transferência Programada</span>
                </div>
                <div className="mt-1 text-sm text-purple-600">
                  <p><strong>Data:</strong> {editingFuncionario.transferencia_data ? format(parseISO(editingFuncionario.transferencia_data), 'dd/MM/yyyy') : '-'}</p>
                  <p><strong>Setor destino:</strong> {setoresAtivos.find(s => s.id === editingFuncionario.transferencia_setor_id)?.nome || '-'}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Data de Demissão</Label>
              <Input type="date" value={dataDemissao} onChange={e => setDataDemissao(e.target.value)} />
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações (opcional)" rows={2} />
            </div>

            <div className="flex justify-between pt-4 flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                {editingFuncionario && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir <strong>{editingFuncionario?.nome_completo}</strong>?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            if (editingFuncionario) {
                              const dadosAnteriores = formatarDadosFuncionario(
                                editingFuncionario as unknown as Record<string, unknown>,
                                setoresAtivos,
                                situacoesAtivas
                              );
                              await deleteFuncionario.mutateAsync(editingFuncionario.id);
                              await registrarHistorico.mutateAsync({
                                tabela: 'funcionarios',
                                operacao: 'DELETE',
                                registro_id: editingFuncionario.id,
                                dados_anteriores: dadosAnteriores,
                                dados_novos: null,
                              });
                              setDialogOpen(false);
                              resetForm();
                            }
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {editingFuncionario && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => toast.info('Use o botão "Troca de Setor" no cabeçalho da página')}>
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Transferência
                  </Button>
                )}

                {editingFuncionario && (() => {
                  const sitNome = editingFuncionario.situacao?.nome?.toUpperCase() || '';
                  const isPrevisao = sitNome.includes('PREVISÃO') || sitNome.includes('PREVISAO');
                  if (isPrevisao) return null;
                  const sitPrevisao = situacoesAtivas.find(s => {
                    const n = s.nome.toUpperCase();
                    return n.includes('PREVISÃO') || n.includes('PREVISAO');
                  });
                  if (!sitPrevisao) return null;
                  return (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="text-amber-600 border-amber-300 hover:bg-amber-50">
                          <Undo2 className="h-4 w-4 mr-1" />
                          Retornar à Previsão
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Retornar à Previsão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja retornar <strong>{editingFuncionario.nome_completo}</strong> para a situação <strong>PREVISÃO</strong>?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                                await updateFuncionario.mutateAsync({ id: editingFuncionario.id, situacao_id: sitPrevisao.id });
                                await registrarHistorico.mutateAsync({
                                  tabela: 'funcionarios',
                                  operacao: 'UPDATE',
                                  registro_id: editingFuncionario.id,
                                  dados_anteriores: { nome: editingFuncionario.nome_completo, situacao: editingFuncionario.situacao?.nome } as Record<string, any>,
                                  dados_novos: { nome: editingFuncionario.nome_completo, situacao: 'PREVISÃO' } as Record<string, any>,
                                });
                                toast.success(`${editingFuncionario.nome_completo} retornado à PREVISÃO`);
                                setDialogOpen(false);
                                resetForm();
                              } catch (err: any) {
                                toast.error(`Erro: ${err.message}`);
                              }
                            }}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                          >
                            Confirmar Retorno
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  );
                })()}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateFuncionario.isPending || createFuncionario.isPending}>
                  {editingFuncionario ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ImportarTurmasDialog open={importarTurmasOpen} onOpenChange={setImportarTurmasOpen} onSuccess={() => setImportarTurmasOpen(false)} />

      {/* Dialog de prompt para criar registro de demissão */}
      <AlertDialog open={demissaoPromptOpen} onOpenChange={setDemissaoPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar no Controle de Demissões?</AlertDialogTitle>
            <AlertDialogDescription>
              A situação de <strong>{demissaoPromptData?.funcionarioNome}</strong> foi alterada para{' '}
              <strong>{demissaoPromptData?.isPedido ? 'PED. DEMISSÃO' : 'DEMISSÃO'}</strong>.
              <br /><br />
              Deseja também criar um registro no <strong>Controle de Demissões</strong> com notificação para os gestores?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, apenas alterar situação</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!demissaoPromptData) return;
                try {
                  const hoje = new Date().toISOString().split('T')[0];
                  const situacaoPedDemissao = todasSituacoes.find(s => s.nome.toUpperCase() === 'PED. DEMISSÃO');
                  
                  await createDemissao.mutateAsync({
                    funcionario_id: demissaoPromptData.funcionarioId,
                    tipo_desligamento: demissaoPromptData.isPedido ? 'Pedido de Demissão' : undefined,
                    data_prevista: hoje,
                    setor_nome: demissaoPromptData.setorNome,
                    criado_por_nome: 'Sistema (via cadastro)',
                    funcionario_nome: demissaoPromptData.funcionarioNome || undefined,
                    skipSituacaoUpdate: true,
                    situacaoPedidoDemissaoId: situacaoPedDemissao?.id,
                  });
                  toast.success('Registro de demissão criado e gestores notificados!');
                } catch {
                  toast.error('Erro ao criar registro de demissão');
                }
                setDemissaoPromptData(null);
              }}
            >
              Sim, registrar e notificar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
