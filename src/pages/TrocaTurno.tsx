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
    const isSimulando = idsSimulando.has(t.id);
    const isProgramado = !!t.data_programada && !t.efetivada;

    return (
      <Card key={t.id} className={`overflow-hidden border-l-4 border-l-primary/60 ${isSimulando || isProgramado ? 'bg-primary/15' : ''}`}>
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-3 bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              <ArrowRightLeft className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{t.funcionario?.nome_completo || 'Funcionário'}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <span>{t.setor_origem?.nome}{t.turma_origem ? ` (${t.turma_origem})` : ''}</span>
                  <span className="text-primary font-bold">→</span>
                  <span className="inline-flex items-center gap-1 bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-md border border-primary/30">
                    {t.setor_destino?.nome}
                    {t.turma_destino && (
                      <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-bold ml-1">
                        {t.turma_destino}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px]">
                {tipo.icon} <span className="ml-1">{tipo.label}</span>
              </Badge>
              <Badge variant={st.variant} className="text-[10px] whitespace-nowrap">{st.label}</Badge>
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                por {t.criado_por} • {format(new Date(t.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="px-4 py-2 space-y-1.5">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>📅 Criado: {format(new Date(t.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
              {t.data_programada && (
                <span className={`font-medium ${!t.efetivada ? 'text-primary' : ''}`}>
                  🗓️ Programada: {format(parseISO(t.data_programada), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              )}
              {t.data_efetivada && (
                <span className="font-medium text-primary">
                  ✅ Efetivada: {format(parseISO(t.data_efetivada), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              )}
            </div>

            {t.observacoes && (
              <p className="text-[11px] text-muted-foreground italic truncate" title={t.observacoes}>💬 {t.observacoes}</p>
            )}

            {t.status === 'cancelado' && (
              <p className="text-[11px] text-destructive font-medium">
                ❌ CANCELADA {t.recusado_por ? `POR ${t.recusado_por}` : ''}
              </p>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-2 flex-wrap">
              {canEfetivar ? (
                <>
                  <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleEfetivar(t)} disabled={efetivarTroca.isPending}>
                    <CheckCircle className="h-3 w-3" /> TRANSFERÊNCIA
                  </Button>
                  <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={() => handleAbrirEditar(t)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleEnviarNotificacao(t)}>
                    <Bell className="h-3 w-3" /> Notificar
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleCancelar(t)} disabled={cancelarTroca.isPending}>
                    <Ban className="h-3 w-3" /> Cancelar
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => { setTrocaExcluir(t); setExcluirDialogOpen(true); }}>
                    <Trash2 className="h-3 w-3" /> Excluir
                  </Button>
                </>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  <Eye className="h-3 w-3 mr-1" /> Visualização
                </Badge>
              )}
            </div>
          )}

          {/* Notification button for history cards too */}
          {!showActions && canEfetivar && (
            <div className="px-4 py-1.5 border-t bg-muted/20 flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => handleEnviarNotificacao(t)}>
                <Bell className="h-2.5 w-2.5" /> Notificar
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
          {/* Filtros */}
          {trocasPendentes.length > 0 && (
            <div className="mb-4 space-y-2">
              {/* ATUAL / DESTINO toggle */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtrar por:</span>
                <button
                  onClick={() => { setFiltroModo('atual'); setFiltroGrupo(''); setFiltroTurno(''); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filtroModo === 'atual' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                >
                  📍 ATUAL (Origem)
                </button>
                <button
                  onClick={() => { setFiltroModo('destino'); setFiltroGrupo(''); setFiltroTurno(''); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filtroModo === 'destino' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                >
                  🎯 DESTINO
                </button>
              </div>

              {/* Grupo */}
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => { setFiltroGrupo(''); setFiltroTurno(''); }}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!filtroGrupo && !filtroTurno ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
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
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filtroGrupo === g ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                    >
                      {g} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Sub-filtros: Turno (DIA/NOITE) e Sub-grupo (A/B/C) - só aparece quando SOPRO está selecionado */}
              {filtroGrupo === 'SOPRO' && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Turno:</span>
                  <button
                    onClick={() => setFiltroTurno('')}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!filtroTurno ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                  >
                    Todos
                  </button>
                  {['DIA', 'NOITE', 'A', 'B', 'C'].map(turno => (
                    <button
                      key={turno}
                      onClick={() => setFiltroTurno(filtroTurno === turno ? '' : turno)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filtroTurno === turno ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                    >
                      {turno}
                    </button>
                  ))}
                </div>
              )}

              {filtroGrupo === 'DECORAÇÃO' && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Turno:</span>
                  <button
                    onClick={() => setFiltroTurno('')}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${!filtroTurno ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                  >
                    Todos
                  </button>
                  {['DIA', 'NOITE'].map(turno => (
                    <button
                      key={turno}
                      onClick={() => setFiltroTurno(filtroTurno === turno ? '' : turno)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filtroTurno === turno ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-muted'}`}
                    >
                      {turno}
                    </button>
                  ))}
                </div>
              )}

              {/* Resumo filtros ativos */}
              {(filtroGrupo || filtroTurno) && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-xs text-primary font-medium">
                    {filtroModo === 'atual' ? '📍' : '🎯'} {filtroModo === 'atual' ? 'ATUAL' : 'DESTINO'} • {filtroGrupo}{filtroTurno ? ` • ${filtroTurno}` : ''} — {trocasPendentesFiltradas.length} resultado(s)
                  </span>
                  <button onClick={() => { setFiltroGrupo(''); setFiltroTurno(''); }} className="ml-auto text-xs text-primary underline hover:text-primary/80">
                    <X className="h-3 w-3 inline mr-1" />Limpar
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
