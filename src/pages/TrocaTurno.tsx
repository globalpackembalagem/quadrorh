import { useState, useMemo, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { RefreshCw, Plus, Search, X, CheckCircle, ArrowRightLeft, Clock, Ban, History, Pencil, Eye, ArrowDownAZ, CalendarArrowDown, Trash2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';
import { useFuncionarios } from '@/hooks/useFuncionarios';
import { useSetores } from '@/hooks/useSetores';
import {
  useTrocasTurno,
  useCriarTrocaTurno,
  useCancelarTrocaTurno,
  useEfetivarTrocaTurno,
  useEditarTrocaTurno,
  useExcluirTrocaTurno,
  TrocaTurno as TrocaTurnoType,
} from '@/hooks/useTrocasTurno';
import { supabase } from '@/integrations/supabase/client';
import { inserirEventoSemDuplicata } from '@/hooks/useEventosSistema';
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
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pendente_rh: { label: 'Aguardando RH', variant: 'secondary' },
  aprovado: { label: 'Efetivado', variant: 'default' },
  cancelado: { label: 'Cancelado', variant: 'outline' },
};

const tipoLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  troca_turno: { label: 'Troca de Turno', icon: <RefreshCw className="h-3 w-3" /> },
  transferencia: { label: 'Transferência', icon: <ArrowRightLeft className="h-3 w-3" /> },
};

export default function TrocaTurno() {
  const { isAdmin, userRole } = useAuth();
  const { usuarioAtual } = useUsuario();
  const { data: trocasRaw = [], isLoading } = useTrocasTurno();
  
  // Gestor: filtrar trocas apenas dos seus setores (origem OU destino)
  const trocas = useMemo(() => {
    if (isAdmin || !usuarioAtual.setoresIds || usuarioAtual.setoresIds.length === 0) return trocasRaw;
    return trocasRaw.filter(t => 
      usuarioAtual.setoresIds.includes(t.setor_origem_id) || 
      usuarioAtual.setoresIds.includes(t.setor_destino_id)
    );
  }, [trocasRaw, isAdmin, usuarioAtual.setoresIds]);
  const { data: funcionarios = [] } = useFuncionarios();
  const { data: setores = [] } = useSetores();
  const criarTroca = useCriarTrocaTurno();
  const cancelarTroca = useCancelarTrocaTurno();
  const efetivarTroca = useEfetivarTrocaTurno();
  const editarTroca = useEditarTrocaTurno();
  const excluirTroca = useExcluirTrocaTurno();

  const [novaDialogOpen, setNovaDialogOpen] = useState(false);
  const [editarDialogOpen, setEditarDialogOpen] = useState(false);
  const [trocaEditar, setTrocaEditar] = useState<TrocaTurnoType | null>(null);
  const [editSetorDestinoId, setEditSetorDestinoId] = useState('');
  const [editTurmaDestino, setEditTurmaDestino] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');
  const [editDataProgramada, setEditDataProgramada] = useState('');
  const [activeTab, setActiveTab] = useState('pendentes');
  const [ordenacaoHistorico, setOrdenacaoHistorico] = useState<'data' | 'alfabetica'>('data');
  const [excluirDialogOpen, setExcluirDialogOpen] = useState(false);
  const [trocaExcluir, setTrocaExcluir] = useState<TrocaTurnoType | null>(null);
  const [filtroGrupo, setFiltroGrupo] = useState<string>('');
  const [filtroTurno, setFiltroTurno] = useState<string>('');
  const [filtroModo, setFiltroModo] = useState<'atual' | 'destino'>('atual');
  

  const [idsSimulando] = useState<Set<string>>(new Set());

  // Form nova troca
  const [searchFunc, setSearchFunc] = useState('');
  const [selectedFuncId, setSelectedFuncId] = useState('');
  const [setorDestinoId, setSetorDestinoId] = useState('');
  const [turmaDestino, setTurmaDestino] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataProgramada, setDataProgramada] = useState('');

  const canManageTrocaTurno = isAdmin || usuarioAtual.pode_editar_troca_turno;
  const canCreate = canManageTrocaTurno;
  const canEfetivar = canManageTrocaTurno;

  // Todas pendentes (com ou sem data programada)
  const trocasPendentes = useMemo(() => {
    return trocas.filter(t =>
      !t.efetivada &&
      t.status === 'pendente_rh'
    );
  }, [trocas]);

  // Helper: get grupo from setor
  const getGrupoFromSetor = (setorId: string) => {
    const setor = setores.find(s => s.id === setorId);
    return setor?.grupo?.toUpperCase() || '';
  };

  const matchGrupoETurno = (setorId: string, turma: string | null) => {
    const grupo = getGrupoFromSetor(setorId);

    if (filtroGrupo === 'SOPRO') {
      // Para SOPRO, o grupo do setor já indica A/B/C (ex: 'SOPRO A', 'SOPRO B')
      if (!grupo.startsWith('SOPRO')) return false;
      if (filtroTurno === 'A') return grupo === 'SOPRO A';
      if (filtroTurno === 'B') return grupo === 'SOPRO B';
      if (filtroTurno === 'C') return grupo === 'SOPRO C';
      // Sem sub-filtro de turno: qualquer SOPRO
      return true;
    }

    if (filtroGrupo === 'DECORAÇÃO') {
      if (!grupo.includes('DECORAÇÃO') && !grupo.includes('DECORACAO')) return false;
      if (!filtroTurno || !turma) return !filtroTurno;
      const t = turma.toUpperCase();
      if (filtroTurno === 'DIA') return t === 'DIA' || t === 'A' || t === 'B' || t === 'C';
      if (filtroTurno === 'NOITE') return t === 'NOITE';
      if (filtroTurno === 'A') return t === 'A';
      if (filtroTurno === 'B') return t === 'B';
      if (filtroTurno === 'C') return t === 'C';
      return true;
    }

    return true; // sem filtro de grupo
  };

  // Pendentes filtradas - ATUAL filtra pela origem, DESTINO filtra pelo destino
  const trocasPendentesFiltradas = useMemo(() => {
    return trocasPendentes.filter(t => {
      const setorId = filtroModo === 'atual' ? t.setor_origem_id : t.setor_destino_id;
      const turma = filtroModo === 'atual' ? t.turma_origem : t.turma_destino;

      if (filtroGrupo) {
        if (!matchGrupoETurno(setorId, turma)) return false;
      }
      return true;
    });
  }, [trocasPendentes, filtroGrupo, filtroTurno, filtroModo, setores]);

  // Histórico (aprovadas/efetivadas, canceladas)
  const trocasHistorico = useMemo(() => {
    const hist = trocas.filter(t => t.efetivada || t.status === 'aprovado' || t.status === 'cancelado');
    if (ordenacaoHistorico === 'alfabetica') {
      return [...hist].sort((a, b) => (a.funcionario?.nome_completo || '').localeCompare(b.funcionario?.nome_completo || ''));
    }
    return [...hist].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [trocas, ordenacaoHistorico]);

  // (simulation cleanup removed - simulation is in dedicated page)

  // Funcionarios filtrados para seleção
  const funcsFiltrados = useMemo(() => {
    const ativos = funcionarios.filter(f => {
      const sit = f.situacao?.nome?.toUpperCase() || '';
      return sit === 'ATIVO' || sit === 'FÉRIAS';
    });
    if (!searchFunc) return ativos.slice(0, 50);
    const s = searchFunc.toLowerCase();
    return ativos.filter(f =>
      f.nome_completo.toLowerCase().includes(s) ||
      f.matricula?.toLowerCase().includes(s)
    ).slice(0, 50);
  }, [funcionarios, searchFunc]);

  const selectedFunc = funcionarios.find(f => f.id === selectedFuncId);
  const setoresAtivos = setores.filter(s => s.ativo);

  // Check if employee already has a pending troca
  const funcJaPendente = useMemo(() => {
    const ids = new Set(trocasPendentes.map(t => t.funcionario_id));
    return (funcId: string) => ids.has(funcId);
  }, [trocasPendentes]);

  const handleCriar = () => {
    if (!selectedFunc || !setorDestinoId) return;
    if (funcJaPendente(selectedFunc.id)) {
      toast({ title: 'Funcionário já possui movimentação pendente', description: 'Cancele ou efetive a movimentação existente antes de criar uma nova.', variant: 'destructive' });
      return;
    }
    // Determinar tipo automaticamente
    const tipo = setorDestinoId !== selectedFunc.setor_id ? 'transferencia' : 'troca_turno';
    criarTroca.mutate({
      funcionario_id: selectedFunc.id,
      setor_origem_id: selectedFunc.setor_id,
      turma_origem: selectedFunc.turma,
      setor_destino_id: setorDestinoId,
      turma_destino: turmaDestino || null,
      observacoes: observacoes || undefined,
      criado_por: userRole?.nome || 'RH',
      data_programada: dataProgramada || null,
      tipo,
    }, {
      onSuccess: () => {
        setNovaDialogOpen(false);
        resetForm();
      },
    });
  };

  const resetForm = () => {
    setSearchFunc('');
    setSelectedFuncId('');
    setSetorDestinoId('');
    setTurmaDestino('');
    setObservacoes('');
    setDataProgramada('');
  };

  const handleCancelar = (t: TrocaTurnoType) => {
    cancelarTroca.mutate({ id: t.id, cancelado_por: userRole?.nome || 'RH' });
  };

  const handleEfetivar = (t: TrocaTurnoType) => {
    efetivarTroca.mutate({
      id: t.id,
      funcionario_id: t.funcionario_id,
      setor_destino_id: t.setor_destino_id,
      turma_destino: t.turma_destino,
      usuario_nome: userRole?.nome || 'RH',
    });
  };

  const handleAbrirEditar = (t: TrocaTurnoType) => {
    setTrocaEditar(t);
    setEditSetorDestinoId(t.setor_destino_id);
    setEditTurmaDestino(t.turma_destino || '');
    setEditObservacoes(t.observacoes || '');
    setEditDataProgramada(t.data_programada || '');
    setEditarDialogOpen(true);
  };

  const handleEditar = () => {
    if (!trocaEditar || !editSetorDestinoId) return;
    editarTroca.mutate({
      id: trocaEditar.id,
      setor_destino_id: editSetorDestinoId,
      turma_destino: editTurmaDestino || null,
      observacoes: editObservacoes || null,
      data_programada: editDataProgramada || null,
    }, {
      onSuccess: () => {
        setEditarDialogOpen(false);
        setTrocaEditar(null);
      },
    });
  };

  const handleEnviarNotificacao = async (t: TrocaTurnoType) => {
    try {
      const setorOrigemNome = t.setor_origem?.nome || 'Desconhecido';
      const setorDestinoNome = t.setor_destino?.nome || 'Desconhecido';
      const funcNome = t.funcionario?.nome_completo || 'Funcionário';
      const turmaDestinoStr = t.turma_destino ? ` (${t.turma_destino})` : '';

      const isEfetivada = t.efetivada || t.status === 'aprovado';

      // Criar evento na Central de Notificações (eventos_sistema)
      await inserirEventoSemDuplicata({
        tipo: 'transferencia',
        descricao: isEfetivada ? 'TRANSFERÊNCIA REALIZADA' : 'TRANSFERÊNCIA PENDENTE',
        funcionario_id: t.funcionario_id,
        funcionario_nome: funcNome,
        setor_id: t.setor_origem_id,
        setor_nome: setorOrigemNome,
        turma: t.turma_origem || null,
        criado_por: userRole?.nome || 'RH',
        dados_extra: {
          setor_destino: setorDestinoNome,
          setor_destino_id: t.setor_destino_id,
          setor_origem_id: t.setor_origem_id,
          turma_destino: t.turma_destino || null,
        },
      });

      sonnerToast.success('Evento criado na Central de Notificações!');
    } catch (err) {
      console.error('Erro ao criar evento:', err);
      sonnerToast.error('Erro ao criar evento');
    }
  };

  const renderCard = (t: TrocaTurnoType, showActions: boolean) => {
    const st = statusLabels[t.status] || { label: t.status, variant: 'outline' as const };
    const tipo = tipoLabels[t.tipo] || tipoLabels['troca_turno'];
    const isProgramado = !!t.data_programada && !t.efetivada;

    return (
      <Card key={t.id} className={`overflow-hidden transition-all ${isProgramado ? 'ring-1 ring-primary/30' : ''}`}>
        <CardContent className="p-0">
          {/* ── Header: Nome + Badges ── */}
          <div className="px-5 pt-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base truncate">{t.funcionario?.nome_completo || 'Funcionário'}</h3>
                <span className="text-xs text-muted-foreground font-mono">{t.funcionario?.matricula || ''}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px] gap-1 font-medium">
                {tipo.icon} {tipo.label}
              </Badge>
              <Badge
                variant={st.variant}
                className={`text-[10px] font-semibold ${
                  t.status === 'pendente_rh' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 dark:border-amber-700' :
                  t.status === 'aprovado' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700' :
                  t.status === 'cancelado' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700' : ''
                }`}
              >
                {st.label}
              </Badge>
            </div>
          </div>

          {/* ── Body: Setor Atual → Destino ── */}
          <div className="px-5 pb-4">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                {/* Origem */}
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Origem</p>
                  <p className="text-sm font-medium truncate">{t.setor_origem?.nome || '-'}</p>
                  {t.turma_origem && (
                    <Badge variant="secondary" className="text-[10px] mt-1">{t.turma_origem}</Badge>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                  </div>
                </div>

                {/* Destino */}
                <div className="min-w-0 text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Destino</p>
                  <p className="text-sm font-medium text-primary truncate">{t.setor_destino?.nome || '-'}</p>
                  {t.turma_destino && (
                    <Badge className="text-[10px] mt-1 bg-primary text-primary-foreground">{t.turma_destino}</Badge>
                  )}
                </div>
              </div>
            </div>

            {t.observacoes && (
              <p className="text-xs text-muted-foreground mt-3 italic line-clamp-2" title={t.observacoes}>
                💬 {t.observacoes}
              </p>
            )}

            {t.status === 'cancelado' && (
              <p className="text-xs text-destructive font-medium mt-2">
                ❌ Cancelada{t.recusado_por ? ` por ${t.recusado_por}` : ''}
              </p>
            )}
          </div>

          {/* ── Footer: Metadados ── */}
          <div className="px-5 py-2.5 border-t bg-muted/15 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>Criado em {format(new Date(t.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
            <span>por <strong>{t.criado_por}</strong></span>
            {t.data_programada && (
              <span className={`font-medium ${!t.efetivada ? 'text-primary' : ''}`}>
                📅 Programada: {format(parseISO(t.data_programada), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            )}
            {t.data_efetivada && (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                ✅ Efetivada: {format(parseISO(t.data_efetivada), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            )}
          </div>

          {/* ── Actions ── */}
          {showActions && (
            <div className="px-5 py-3 border-t flex items-center gap-2 flex-wrap">
              {canEfetivar ? (
                <>
                  <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => handleEfetivar(t)} disabled={efetivarTroca.isPending}>
                    <CheckCircle className="h-3.5 w-3.5" /> Efetivar
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 text-xs gap-1.5" onClick={() => handleAbrirEditar(t)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => handleEnviarNotificacao(t)}>
                    <Bell className="h-3.5 w-3.5" /> Notificar
                  </Button>
                  <div className="flex-1" />
                  <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => handleCancelar(t)} disabled={cancelarTroca.isPending}>
                    <Ban className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => { setTrocaExcluir(t); setExcluirDialogOpen(true); }}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  <Eye className="h-3 w-3 mr-1" /> Visualização
                </Badge>
              )}
            </div>
          )}

          {!showActions && canEfetivar && (
            <div className="px-5 py-2 border-t flex items-center">
              <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => handleEnviarNotificacao(t)}>
                <Bell className="h-3 w-3" /> Notificar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">MOVIMENTAÇÕES</h1>
          <p className="page-description">
            TRANSFERÊNCIAS E TROCAS DE TURNO DOS FUNCIONÁRIOS
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button size="sm" onClick={() => setNovaDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              NOVA MOVIMENTAÇÃO
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pendentes" className="gap-1.5">
            <Clock className="h-4 w-4" />
            PENDENTES ({trocasPendentes.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="historico" className="gap-1.5">
              <History className="h-4 w-4" />
              HISTÓRICO ({trocasHistorico.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pendentes" className="mt-4">
          {/* Filtros reorganizados */}
          {trocasPendentes.length > 0 && (
            <div className="mb-5 rounded-xl border bg-card p-4 space-y-4">
              {/* Linha 1: Tipo de filtro (Origem / Destino) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Filtrar por</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setFiltroModo('atual'); setFiltroGrupo(''); setFiltroTurno(''); }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filtroModo === 'atual' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-border'}`}
                  >
                    📍 Atual (Origem)
                  </button>
                  <button
                    onClick={() => { setFiltroModo('destino'); setFiltroGrupo(''); setFiltroTurno(''); }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filtroModo === 'destino' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-border'}`}
                  >
                    🎯 Destino
                  </button>
                </div>
              </div>

              {/* Separador */}
              <div className="border-t" />

              {/* Linha 2: Setor */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Setor</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setFiltroGrupo(''); setFiltroTurno(''); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!filtroGrupo ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                  >
                    Todos ({trocasPendentes.length})
                  </button>
                  {['SOPRO', 'DECORAÇÃO'].map(g => {
                    const count = trocasPendentes.filter(t => {
                      const setorId = filtroModo === 'atual' ? t.setor_origem_id : t.setor_destino_id;
                      const grupo = getGrupoFromSetor(setorId);
                      if (g === 'SOPRO') return grupo.startsWith('SOPRO');
                      if (g === 'DECORAÇÃO') return grupo.includes('DECORAÇÃO') || grupo.includes('DECORACAO');
                      return false;
                    }).length;
                    return (
                      <button
                        key={g}
                        onClick={() => { setFiltroGrupo(filtroGrupo === g ? '' : g); setFiltroTurno(''); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filtroGrupo === g ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                      >
                        {g} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Linha 3: Sub-filtro turno (condicional) */}
              {filtroGrupo === 'SOPRO' && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Turno</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFiltroTurno('')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!filtroTurno ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      Todos
                    </button>
                    {['A', 'B', 'C'].map(turno => (
                      <button
                        key={turno}
                        onClick={() => setFiltroTurno(filtroTurno === turno ? '' : turno)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filtroTurno === turno ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                      >
                        {turno}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filtroGrupo === 'DECORAÇÃO' && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Turno</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setFiltroTurno('')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!filtroTurno ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                    >
                      Todos
                    </button>
                    {['DIA', 'NOITE'].map(turno => (
                      <button
                        key={turno}
                        onClick={() => setFiltroTurno(filtroTurno === turno ? '' : turno)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filtroTurno === turno ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                      >
                        {turno}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo filtros ativos */}
              {(filtroGrupo || filtroTurno) && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{trocasPendentesFiltradas.length}</strong> resultado(s) — {filtroModo === 'atual' ? 'Origem' : 'Destino'} › {filtroGrupo}{filtroTurno ? ` › ${filtroTurno}` : ''}
                  </span>
                  <button onClick={() => { setFiltroGrupo(''); setFiltroTurno(''); }} className="text-xs text-destructive hover:underline flex items-center gap-1">
                    <X className="h-3 w-3" /> Limpar
                  </button>
                </div>
              )}
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : trocasPendentesFiltradas.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                {trocasPendentes.length === 0 ? 'NENHUMA MOVIMENTAÇÃO PENDENTE.' : 'NENHUMA MOVIMENTAÇÃO PARA O FILTRO SELECIONADO.'}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {trocasPendentesFiltradas.map(t => renderCard(t, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Button
              size="sm"
              variant={ordenacaoHistorico === 'data' ? 'default' : 'outline'}
              className="h-7 text-xs gap-1"
              onClick={() => setOrdenacaoHistorico('data')}
            >
              <CalendarArrowDown className="h-3 w-3" /> Data
            </Button>
            <Button
              size="sm"
              variant={ordenacaoHistorico === 'alfabetica' ? 'default' : 'outline'}
              className="h-7 text-xs gap-1"
              onClick={() => setOrdenacaoHistorico('alfabetica')}
            >
              <ArrowDownAZ className="h-3 w-3" /> A-Z
            </Button>
          </div>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : trocasHistorico.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                NENHUM REGISTRO NO HISTÓRICO.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {trocasHistorico.map(t => renderCard(t, false))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog Nova Movimentação */}
      <Dialog open={novaDialogOpen} onOpenChange={(o) => { setNovaDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Nova Movimentação
            </DialogTitle>
            <DialogDescription>
              Selecione o funcionário, tipo, setor e turma de destino
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label>FUNCIONÁRIO</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou matrícula..."
                  value={searchFunc}
                  onChange={(e) => setSearchFunc(e.target.value)}
                  className="pl-9"
                />
              </div>
              {selectedFunc ? (
                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{selectedFunc.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedFunc.setor?.nome} {selectedFunc.turma && `• ${selectedFunc.turma}`} • {selectedFunc.matricula || 'Sem matrícula'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFuncId('')} className="h-6 w-6 p-0">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {funcsFiltrados.length === 0 ? (
                    <p className="text-center py-4 text-xs text-muted-foreground">Nenhum funcionário encontrado</p>
                  ) : (
                    funcsFiltrados.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFuncId(f.id)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 text-xs border-b last:border-b-0"
                      >
                        <span className="font-medium">{f.nome_completo}</span>
                        <span className="text-muted-foreground ml-2">{f.setor?.nome} {f.turma && `• ${f.turma}`}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Setor Destino</Label>
              <Select value={setorDestinoId} onValueChange={setSetorDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor de destino" />
                </SelectTrigger>
                <SelectContent>
                  {setoresAtivos
                    .filter(s => s.id !== selectedFunc?.setor_id)
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Turma Destino (opcional)</Label>
              <Select value={turmaDestino} onValueChange={setTurmaDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="T1">T1</SelectItem>
                  <SelectItem value="T2">T2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Motivo da troca..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Programada (opcional)</Label>
              <Input
                type="date"
                value={dataProgramada}
                onChange={(e) => setDataProgramada(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Na data programada, a movimentação será efetivada automaticamente.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setNovaDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleCriar} disabled={!selectedFuncId || !setorDestinoId || criarTroca.isPending}>
              {criarTroca.isPending ? 'Salvando...' : 'Criar Movimentação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={editarDialogOpen} onOpenChange={(o) => { setEditarDialogOpen(o); if (!o) setTrocaEditar(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Movimentação
            </DialogTitle>
            <DialogDescription>
              {trocaEditar?.funcionario?.nome_completo} — {trocaEditar?.setor_origem?.nome}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Setor Destino</Label>
              <Select value={editSetorDestinoId} onValueChange={setEditSetorDestinoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {setoresAtivos
                    .filter(s => s.id !== trocaEditar?.setor_origem_id)
                    .map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Turma Destino (opcional)</Label>
              <Select value={editTurmaDestino} onValueChange={setEditTurmaDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="T1">T1</SelectItem>
                  <SelectItem value="T2">T2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                placeholder="Motivo da troca..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Programada (opcional)</Label>
              <Input
                type="date"
                value={editDataProgramada}
                onChange={(e) => setEditDataProgramada(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Na data programada, a movimentação será efetivada automaticamente.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditar} disabled={!editSetorDestinoId || editarTroca.isPending}>
              {editarTroca.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={excluirDialogOpen} onOpenChange={setExcluirDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Movimentação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a movimentação de <strong>{trocaExcluir?.funcionario?.nome_completo}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (trocaExcluir) {
                  excluirTroca.mutate(trocaExcluir.id, {
                    onSuccess: () => {
                      setExcluirDialogOpen(false);
                      setTrocaExcluir(null);
                    },
                  });
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
