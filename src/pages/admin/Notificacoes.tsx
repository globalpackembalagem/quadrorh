import { useState, useMemo } from 'react';
import { useEventosSistema, useEnviarNotificacaoEventos, useDeleteEvento, useCreateEvento, useUpdateEvento, EventoSistema } from '@/hooks/useEventosSistema';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Monitor, Send, Filter, CheckSquare, Square, RefreshCw, UserMinus, UserPlus, ArrowRightLeft, Trash2, Plus, Pencil, XCircle, Eye, History, Clock, FlaskConical, Loader2, AlertTriangle, RotateCcw, Users, ClipboardList } from 'lucide-react';
import { EventoFormDialog, EventoFormSaveData } from '@/components/notificacoes/EventoFormDialog';
import { ConsultaExperienciaDialog } from '@/components/notificacoes/ConsultaExperienciaDialog';
import { ConsultaCoberturaDialog } from '@/components/notificacoes/ConsultaCoberturaDialog';
import { SimulacaoNotificacaoModal } from '@/components/notificacoes/SimulacaoNotificacaoModal';
import { GaleriaModelosModal } from '@/components/notificacoes/GaleriaModelosModal';
import { HorariosNotificacaoConfig } from '@/components/previsao/HorariosNotificacaoConfig';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
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



const TIPO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  admissao: UserPlus,
  ativacao: UserPlus,
  demissao: UserMinus,
  pedido_demissao: UserMinus,
  transferencia: ArrowRightLeft,
  troca_turno: ArrowRightLeft,
  previsao_admissao: UserPlus,
  divergencia_nova: AlertTriangle,
  divergencia_retorno: Clock,
  divergencia_feedback: CheckSquare,
  experiencia_consulta: ClipboardList,
  cobertura_treinamento: Users,
  turma_pendente: AlertTriangle,
};

const TIPO_LABELS: Record<string, string> = {
  admissao: 'ADMISSÃO',
  ativacao: 'ADMISSÃO',
  demissao: 'DEMISSÃO',
  pedido_demissao: 'PED. DEMISSÃO',
  transferencia: 'TRANSFERÊNCIA',
  troca_turno: 'TRANSFERÊNCIA',
  previsao_admissao: 'PREVISÃO DE ADMISSÃO',
  divergencia_nova: 'DIVERGÊNCIA NOVA',
  divergencia_retorno: 'DIVERGÊNCIA AGUARDANDO',
  divergencia_feedback: 'DIVERGÊNCIA RESOLVIDA',
  experiencia_consulta: 'CONSULTA EXPERIÊNCIA',
  cobertura_treinamento: 'COB. FÉRIAS / TREINAMENTO',
  turma_pendente: 'TURMA PENDENTE',
};

interface NotificacaoVista {
  id: string;
  evento_id: string;
  user_role_id: string;
  nome_gestor: string;
  visto_em: string;
}

function useHistoricoNotificacoes() {
  return useQuery({
    queryKey: ['historico-notificacoes-enviadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eventos_sistema')
        .select('*')
        .eq('notificado', true)
        .order('notificado_em', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as EventoSistema[];
    },
  });
}

function useNotificacoesVistas(eventoIds: string[]) {
  const stableKey = eventoIds.length > 0 
    ? `${eventoIds.length}-${eventoIds[0]}-${eventoIds[eventoIds.length - 1]}`
    : 'empty';
    
  return useQuery({
    queryKey: ['notificacoes-vistas', stableKey],
    queryFn: async () => {
      if (eventoIds.length === 0) return [] as NotificacaoVista[];
      const CHUNK_SIZE = 50;
      const results: NotificacaoVista[] = [];
      for (let i = 0; i < eventoIds.length; i += CHUNK_SIZE) {
        const chunk = eventoIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
          .from('notificacoes_vistas')
          .select('*')
          .in('evento_id', chunk);
        if (error) throw error;
        if (data) results.push(...(data as NotificacaoVista[]));
      }
      return results;
    },
    enabled: eventoIds.length > 0,
    staleTime: 10000,
    refetchInterval: 15000, // Auto-refresh every 15s
  });
}

// Quem recebeu cada notificação (para saber quem falta ver)
interface NotificacaoDestinatario {
  evento_id: string;
  user_role_id: string;
  gestor_nome: string;
}

function useNotificacoesDestinatarios(eventoIds: string[]) {
  const stableKey = eventoIds.length > 0 
    ? `dest-${eventoIds.length}-${eventoIds[0]}-${eventoIds[eventoIds.length - 1]}`
    : 'dest-empty';
    
  return useQuery({
    queryKey: ['notificacoes-destinatarios', stableKey],
    queryFn: async () => {
      if (eventoIds.length === 0) return [] as NotificacaoDestinatario[];
      const CHUNK_SIZE = 50;
      const results: NotificacaoDestinatario[] = [];
      for (let i = 0; i < eventoIds.length; i += CHUNK_SIZE) {
        const chunk = eventoIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
          .from('notificacoes')
          .select('referencia_id, user_role_id, user_role:user_roles!user_role_id(nome)')
          .in('referencia_id', chunk);
        if (error) throw error;
        if (data) {
          results.push(...data.map((d: any) => ({
            evento_id: d.referencia_id,
            user_role_id: d.user_role_id,
            gestor_nome: d.user_role?.nome || 'DESCONHECIDO',
          })));
        }
      }
      // Deduplicate by evento_id + user_role_id
      const seen = new Set<string>();
      return results.filter(r => {
        const key = `${r.evento_id}-${r.user_role_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    enabled: eventoIds.length > 0,
    staleTime: 30000,
  });
}

function useUsuariosAtivos() {
  return useQuery({
    queryKey: ['usuarios-ativos-reenvio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, nome, setor_id, perfil, recebe_notificacoes, setor:setores!setor_id(nome)')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        nome: string;
        setor_id: string | null;
        perfil: string;
        recebe_notificacoes: boolean;
        setor: { nome: string } | null;
      }>;
    },
  });
}

export default function Notificacoes() {
  const { data: eventos, isLoading } = useEventosSistema();
  const { data: historicoEventos, isLoading: isLoadingHistorico } = useHistoricoNotificacoes();
  const enviarMutation = useEnviarNotificacaoEventos();
  const deleteEvento = useDeleteEvento();
  const createEvento = useCreateEvento();
  const updateEvento = useUpdateEvento();
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const { data: usuarios } = useUsuariosAtivos();

  const historicoIds = useMemo(() => (historicoEventos || []).map(e => e.id), [historicoEventos]);
  const { data: vistas, refetch: refetchVistas } = useNotificacoesVistas(historicoIds);
  const { data: destinatarios } = useNotificacoesDestinatarios(historicoIds);

  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [tipoNotificacao, setTipoNotificacao] = useState<'modal' | 'sino'>('modal');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('pendentes');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventoSistema | null>(null);
  const [simulacaoOpen, setSimulacaoOpen] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('eventos');
  const [isCriandoTeste, setIsCriandoTeste] = useState(false);
  const [isInserindoTurmaPendente, setIsInserindoTurmaPendente] = useState(false);
  const [eventosSimulacao, setEventosSimulacao] = useState<EventoSistema[]>([]);
  const [reenviarEvento, setReenviarEvento] = useState<EventoSistema | null>(null);
  const [gestoresSelecionados, setGestoresSelecionados] = useState<Set<string>>(new Set());
  const [isReenviando, setIsReenviando] = useState(false);
  const [expandedVistas, setExpandedVistas] = useState<Set<string>>(new Set());
  const [filtroHistorico, setFiltroHistorico] = useState<'todos' | 'nao_vistas'>('nao_vistas');
  const [consultaExperienciaOpen, setConsultaExperienciaOpen] = useState(false);
  const [isInserindoCobTrein, setIsInserindoCobTrein] = useState(false);
  const [galeriaOpen, setGaleriaOpen] = useState(false);

  const inserirTodosCobTrein = async () => {
    setIsInserindoCobTrein(true);
    try {
      // Buscar todos funcionários com situação COB ou TREINAMENTO
      const { data: funcs, error: fErr } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, empresa, matricula, turma, setor_id, situacao_id, observacoes, setor:setores!setor_id(nome), situacao:situacoes!situacao_id(nome)');
      if (fErr) throw fErr;

      const filtrados = (funcs || []).filter((f: any) => {
        const sitNome = f.situacao?.nome?.toUpperCase() || '';
        return sitNome.includes('COB') || sitNome.includes('COBERTURA') || sitNome.includes('TREINAMENTO');
      });

      if (filtrados.length === 0) {
        toast.info('Nenhum funcionário em COB. FÉRIAS ou TREINAMENTO no momento.');
        return;
      }

      const eventosParaInserir = filtrados.map((func: any) => ({
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

      toast.success(`${eventosParaInserir.length} funcionário(s) em COB/TREIN. adicionados à Central!`);
      queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
    } catch (err) {
      toast.error('Erro ao inserir funcionários COB/TREIN.');
      console.error(err);
    } finally {
      setIsInserindoCobTrein(false);
    }
  };

  const inserirTodosTurmaPendente = async () => {
    setIsInserindoTurmaPendente(true);
    try {
      // Buscar situações ATIVO e FÉRIAS
      const { data: situacoes } = await supabase
        .from('situacoes')
        .select('id, nome')
        .eq('ativa', true);
      const situacoesAtivoFerias = (situacoes || [])
        .filter(s => { const n = s.nome.toUpperCase(); return n === 'ATIVO' || n === 'FÉRIAS'; })
        .map(s => s.id);

      if (!situacoesAtivoFerias.length) {
        toast.info('Nenhuma situação ATIVO/FÉRIAS encontrada.');
        return;
      }

      // Buscar setores SOPRO e DECORAÇÃO (pelo grupo)
      const { data: setores } = await supabase
        .from('setores')
        .select('id, nome, grupo')
        .eq('ativo', true);
      const setoresSoproDeco = (setores || []).filter(s => {
        const g = (s.grupo || '').toUpperCase();
        return g.startsWith('SOPRO') || g.startsWith('DECORAÇÃO') || g.startsWith('DECORACAO');
      });

      if (!setoresSoproDeco.length) {
        toast.info('Nenhum setor SOPRO/DECORAÇÃO encontrado.');
        return;
      }

      const setoresIds = setoresSoproDeco.map(s => s.id);

      // Buscar funcionários sem turma nesses setores
      const { data: funcs } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, turma, setor_id, setor:setores!setor_id(nome, grupo)')
        .in('setor_id', setoresIds)
        .in('situacao_id', situacoesAtivoFerias)
        .is('turma', null);

      const { data: funcsVazio } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, turma, setor_id, setor:setores!setor_id(nome, grupo)')
        .in('setor_id', setoresIds)
        .in('situacao_id', situacoesAtivoFerias)
        .eq('turma', '');

      const todos = [...(funcs || []), ...(funcsVazio || [])];

      if (todos.length === 0) {
        toast.info('Nenhum funcionário sem turma nos setores SOPRO/DECORAÇÃO.');
        return;
      }

      const eventosParaInserir = todos.map((func: any) => ({
        tipo: 'turma_pendente',
        descricao: `TURMA PENDENTE — ${func.nome_completo}`,
        funcionario_id: func.id,
        funcionario_nome: func.nome_completo,
        setor_id: func.setor_id,
        setor_nome: (func.setor as any)?.nome || null,
        turma: null,
        criado_por: userRole?.nome || 'ADMIN',
        dados_extra: {
          setor_grupo: ((func.setor as any)?.grupo || '').toUpperCase(),
        },
        notificado: false,
      }));

      const { error } = await supabase.from('eventos_sistema').insert(eventosParaInserir);
      if (error) throw error;

      toast.success(`${eventosParaInserir.length} funcionário(s) sem turma adicionados à Central!`);
      queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
    } catch (err) {
      toast.error('Erro ao inserir funcionários sem turma.');
      console.error(err);
    } finally {
      setIsInserindoTurmaPendente(false);
    }
  };

  // Mapa de vistas por evento_id
  const vistasPorEvento = useMemo(() => {
    const map: Record<string, NotificacaoVista[]> = {};
    (vistas || []).forEach(v => {
      if (!map[v.evento_id]) map[v.evento_id] = [];
      map[v.evento_id].push(v);
    });
    return map;
  }, [vistas]);

  // Mapa de destinatários por evento_id
  const destinatariosPorEvento = useMemo(() => {
    const map: Record<string, NotificacaoDestinatario[]> = {};
    (destinatarios || []).forEach(d => {
      if (!map[d.evento_id]) map[d.evento_id] = [];
      map[d.evento_id].push(d);
    });
    return map;
  }, [destinatarios]);

  const eventosFiltrados = useMemo(() => {
    if (!eventos) return [];
    return eventos.filter(ev => {
      if (filtroTipo !== 'todos' && ev.tipo !== filtroTipo) return false;
      if (filtroStatus === 'pendentes' && ev.notificado) return false;
      if (filtroStatus === 'notificados' && !ev.notificado) return false;
      return true;
    });
  }, [eventos, filtroTipo, filtroStatus]);

  const pendentesCount = eventos?.filter(e => !e.notificado).length || 0;

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodos = () => {
    const pendentes = eventosFiltrados.filter(e => !e.notificado);
    if (selecionados.size === pendentes.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(pendentes.map(e => e.id)));
    }
  };

  const enviarNotificacoes = async () => {
    if (selecionados.size === 0) return;
    await enviarMutation.mutateAsync({
      eventoIds: Array.from(selecionados),
      tipoNotificacao,
    });
    setSelecionados(new Set());
    queryClient.invalidateQueries({ queryKey: ['historico-notificacoes-enviadas'] });
  };

  const handleReenviar = async () => {
    if (!reenviarEvento || gestoresSelecionados.size === 0) return;
    setIsReenviando(true);
    try {
      const notificacoes = Array.from(gestoresSelecionados).map(userRoleId => ({
        user_role_id: userRoleId,
        tipo: reenviarEvento.notificado_tipo || 'evento_sistema_modal',
        titulo: reenviarEvento.descricao,
        mensagem: (reenviarEvento.dados_extra as any)?.mensagem_personalizada || reenviarEvento.descricao,
        referencia_id: reenviarEvento.id,
      }));
      await supabase.from('notificacoes').insert(notificacoes);
      toast.success(`REENVIADO PARA ${gestoresSelecionados.size} GESTOR(ES)!`);
      setReenviarEvento(null);
      setGestoresSelecionados(new Set());
    } catch {
      toast.error('ERRO AO REENVIAR');
    } finally {
      setIsReenviando(false);
    }
  };

  const criarEventosDeTeste = async () => {
    setIsCriandoTeste(true);
    try {
      const eventosTeste = [
        { tipo: 'admissao',        funcionario_nome: 'MARIA DA SILVA (TESTE)',    setor_nome: 'SOPRO A',       turma: '1A', dados_extra: null },
        { tipo: 'ativacao',        funcionario_nome: 'ROBERTO ALVES (TESTE)',     setor_nome: 'MOD SOPRO',     turma: 'XX', dados_extra: null },
        { tipo: 'pedido_demissao', funcionario_nome: 'ANA SANTOS (TESTE)',        setor_nome: 'MOD SOPRO',     turma: '2B', dados_extra: null },
        { tipo: 'demissao',        funcionario_nome: 'JOÃO PEREIRA (TESTE)',      setor_nome: 'DECORAÇÃO T1',  turma: 'T1', dados_extra: null },
        { tipo: 'transferencia',   funcionario_nome: 'CARLOS LIMA (TESTE)',       setor_nome: 'SOPRO B',       turma: '1B', dados_extra: { setor_destino: 'DECORAÇÃO T1', turma_destino: 'T1' } },
        { tipo: 'troca_turno',     funcionario_nome: 'FERNANDA COSTA (TESTE)',    setor_nome: 'DECORAÇÃO T2',  turma: 'T2', dados_extra: { setor_destino: 'SOPRO A',      turma_destino: '2A' } },
      ];

      const { data, error } = await supabase
        .from('eventos_sistema')
        .insert(eventosTeste.map(e => ({
          tipo: e.tipo,
          descricao: `TESTE — ${e.tipo}`,
          funcionario_nome: e.funcionario_nome,
          setor_nome: e.setor_nome,
          turma: e.turma,
          dados_extra: e.dados_extra,
          criado_por: userRole?.nome || 'ADMIN',
          notificado: false,
        })))
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setEventosSimulacao(data as EventoSistema[]);
        setSimulacaoOpen(true);
        queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
      }
    } catch (err) {
      console.error('Erro ao criar eventos de teste:', err);
    } finally {
      setIsCriandoTeste(false);
    }
  };

  const handleSaveEvento = async (data: EventoFormSaveData) => {
    if (editingEvento) {
      await updateEvento.mutateAsync({ id: editingEvento.id, ...data });
    } else {
      await createEvento.mutateAsync({
        ...data,
        criado_por: userRole?.nome || null,
        dados_extra: {
          ...(data.mensagem_personalizada ? { mensagem_personalizada: data.mensagem_personalizada } : {}),
          ...(data.destinatarios ? { destinatarios: data.destinatarios } : {}),
        },
      });
    }
    setFormDialogOpen(false);
    setEditingEvento(null);
  };

  const tiposUnicos = useMemo(() => {
    if (!eventos) return [];
    return [...new Set(eventos.map(e => e.tipo))];
  }, [eventos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CENTRAL DE NOTIFICAÇÕES</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie eventos e envie notificações para os gestores
          </p>
        </div>
        <div className="flex items-center gap-2">
          
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50"
            onClick={inserirTodosTurmaPendente}
            disabled={isInserindoTurmaPendente}
          >
            {isInserindoTurmaPendente ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            TURMA PEND.
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
            onClick={inserirTodosCobTrein}
            disabled={isInserindoCobTrein}
          >
            {isInserindoCobTrein ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
            COB/TREIN.
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setGaleriaOpen(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            GALERIA DE MODELOS
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => { setEditingEvento(null); setFormDialogOpen(true); }}
          >
            <Plus className="h-3.5 w-3.5" />
            NOVO EVENTO
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive hover:text-destructive"
                disabled={!eventos || eventos.length === 0}
              >
                <XCircle className="h-3.5 w-3.5" />
                LIMPAR TUDO
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar todos os eventos</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover TODOS os eventos da central de notificações? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await supabase.from('eventos_sistema').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    queryClient.invalidateQueries({ queryKey: ['eventos-sistema'] });
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Limpar Tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {pendentesCount > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {pendentesCount} pendente(s)
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList>
          <TabsTrigger value="eventos" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            EVENTOS
            {pendentesCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{pendentesCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5">
            <History className="h-3.5 w-3.5" />
            HISTÓRICO
          </TabsTrigger>
          <TabsTrigger value="agendamentos" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            AGENDAMENTOS
          </TabsTrigger>
        </TabsList>

        {/* Aba Eventos */}
        <TabsContent value="eventos" className="space-y-4 mt-4">
          {/* Barra de ações */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Filtros */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">TODOS OS TIPOS</SelectItem>
                      {tiposUnicos.map(tipo => (
                        <SelectItem key={tipo} value={tipo}>
                          {TIPO_LABELS[tipo] || tipo.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendentes">PENDENTES</SelectItem>
                      <SelectItem value="notificados">NOTIFICADOS</SelectItem>
                      <SelectItem value="todos">TODOS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1" />

                {/* Tipo de notificação */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">ENVIAR COMO:</span>
                  <Button
                    variant={tipoNotificacao === 'modal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoNotificacao('modal')}
                    className="gap-1.5"
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    MODAL
                  </Button>
                  <Button
                    variant={tipoNotificacao === 'sino' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoNotificacao('sino')}
                    className="gap-1.5"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    SINO
                  </Button>
                </div>

                {/* Ações */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selecionarTodos}
                  className="gap-1.5"
                >
                  {selecionados.size > 0 ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  {selecionados.size > 0 ? 'DESMARCAR' : 'SELECIONAR'} TODOS
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSimulacaoOpen(true)}
                  disabled={selecionados.size === 0}
                  className="gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  SIMULAR ({selecionados.size})
                </Button>

                <Button
                  size="sm"
                  onClick={enviarNotificacoes}
                  disabled={selecionados.size === 0 || enviarMutation.isPending}
                  className="gap-1.5 font-bold"
                >
                  <Send className="h-3.5 w-3.5" />
                  ENVIAR ({selecionados.size})
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de eventos */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Carregando eventos...</div>
              ) : eventosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum evento {filtroStatus === 'pendentes' ? 'pendente' : ''} encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]" />
                      <TableHead className="w-[140px]">TIPO</TableHead>
                      <TableHead>NOME</TableHead>
                      <TableHead className="w-[160px]">SETOR</TableHead>
                      <TableHead className="w-[80px]">TURMA</TableHead>
                      <TableHead className="w-[120px]">STATUS</TableHead>
                      <TableHead className="w-[140px]">DATA</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventosFiltrados.map((evento) => {
                      const Icon = TIPO_ICONS[evento.tipo] || Bell;
                      const isSelected = selecionados.has(evento.id);
                      return (
                        <TableRow
                          key={evento.id}
                          className={cn(
                            'cursor-pointer transition-colors',
                            isSelected && 'bg-primary/5',
                            evento.notificado && 'opacity-60'
                          )}
                          onClick={() => !evento.notificado && toggleSelecionado(evento.id)}
                        >
                          <TableCell>
                            {!evento.notificado && (
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelecionado(evento.id)}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-bold">
                                {TIPO_LABELS[evento.tipo] || evento.tipo.toUpperCase()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{evento.funcionario_nome?.toUpperCase() || evento.descricao}</span>
                          </TableCell>
                          <TableCell className="text-sm">{evento.setor_nome?.toUpperCase() || '—'}</TableCell>
                          <TableCell className="text-sm text-center">{evento.turma || '—'}</TableCell>
                          <TableCell>
                            {evento.notificado ? (
                              <Badge variant="secondary" className="text-xs gap-1">
                                {evento.notificado_tipo === 'modal' ? <Monitor className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                                ENVIADO
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs border-dashed">
                                PENDENTE
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(evento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); setEditingEvento(evento); setFormDialogOpen(true); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive h-8 w-8"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover evento</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover este evento da central?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteEvento.mutate(evento.id)}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Histórico */}
        <TabsContent value="historico" className="space-y-4 mt-4">
          {/* Filtro de vistas */}
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              variant={filtroHistorico === 'nao_vistas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroHistorico('nao_vistas')}
              className="gap-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              SEM CIÊNCIA
            </Button>
            <Button
              variant={filtroHistorico === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltroHistorico('todos')}
              className="gap-1.5"
            >
              <History className="h-3.5 w-3.5" />
              TODOS
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                refetchVistas();
                queryClient.invalidateQueries({ queryKey: ['historico-notificacoes-enviadas'] });
                queryClient.invalidateQueries({ queryKey: ['notificacoes-destinatarios'] });
                toast.success('Atualizado!');
              }}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              ATUALIZAR
            </Button>
            {filtroHistorico === 'nao_vistas' && (() => {
              const semCienciaTotal = (historicoEventos || []).filter(ev => {
                const eventDests = destinatariosPorEvento[ev.id] || [];
                const eventVistasSet = new Set((vistasPorEvento[ev.id] || []).map(v => v.user_role_id));
                const faltam = eventDests.filter(d => !eventVistasSet.has(d.user_role_id));
                return faltam.length > 0 || (eventDests.length === 0 && (vistasPorEvento[ev.id] || []).length === 0);
              });
              return semCienciaTotal.length > 0 ? (
                <Badge variant="destructive" className="text-sm px-3 py-1">
                  {semCienciaTotal.length} com pendência
                </Badge>
              ) : null;
            })()}
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoadingHistorico ? (
                <div className="p-8 text-center text-muted-foreground">Carregando histórico...</div>
              ) : !historicoEventos || historicoEventos.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma notificação enviada ainda.
                </div>
              ) : (() => {
                const eventosFiltradosHistorico = filtroHistorico === 'nao_vistas'
                  ? historicoEventos.filter(ev => {
                      const eventDests = destinatariosPorEvento[ev.id] || [];
                      const eventVistasSet = new Set((vistasPorEvento[ev.id] || []).map(v => v.user_role_id));
                      const faltam = eventDests.filter(d => !eventVistasSet.has(d.user_role_id));
                      return faltam.length > 0 || (eventDests.length === 0 && (vistasPorEvento[ev.id] || []).length === 0);
                    })
                  : historicoEventos;
                return eventosFiltradosHistorico.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    ✅ Todas as notificações foram vistas por todos os gestores!
                  </div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">TIPO</TableHead>
                      <TableHead>NOME</TableHead>
                      <TableHead className="w-[120px]">SETOR</TableHead>
                      <TableHead className="w-[60px]">TURMA</TableHead>
                      <TableHead className="w-[100px]">ENVIADO EM</TableHead>
                      <TableHead className="w-[220px]">QUEM VIU ✅</TableHead>
                      <TableHead className="w-[180px]">QUEM NÃO VIU ❌</TableHead>
                      <TableHead className="w-[80px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventosFiltradosHistorico.map((evento) => {
                      const Icon = TIPO_ICONS[evento.tipo] || Bell;
                      const eventVistas = vistasPorEvento[evento.id] || [];
                      const eventDests = destinatariosPorEvento[evento.id] || [];
                      const vistasUserIds = new Set(eventVistas.map(v => v.user_role_id));
                      const faltamVer = eventDests.filter(d => !vistasUserIds.has(d.user_role_id));
                      const isExpanded = expandedVistas.has(evento.id);
                      
                      return (
                        <TableRow key={evento.id} className={cn(faltamVer.length > 0 && 'bg-destructive/5')}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="text-xs font-bold">
                                {TIPO_LABELS[evento.tipo] || evento.tipo.toUpperCase()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{evento.funcionario_nome?.toUpperCase() || evento.descricao}</span>
                          </TableCell>
                          <TableCell className="text-xs">{evento.setor_nome?.toUpperCase() || '—'}</TableCell>
                          <TableCell className="text-xs text-center">{evento.turma || '—'}</TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {evento.notificado_em
                              ? format(new Date(evento.notificado_em), "dd/MM HH:mm", { locale: ptBR })
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {eventVistas.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">Ninguém ainda</span>
                            ) : (
                              <div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs h-7 px-2 text-success"
                                  onClick={() => setExpandedVistas(prev => {
                                    const next = new Set(prev);
                                    next.has(evento.id) ? next.delete(evento.id) : next.add(evento.id);
                                    return next;
                                  })}
                                >
                                  <Eye className="h-3 w-3" />
                                  {eventVistas.length} gestor(es)
                                </Button>
                                {isExpanded && (
                                  <div className="mt-1 space-y-0.5">
                                    {eventVistas.map(v => (
                                      <div key={v.id} className="text-[10px] text-muted-foreground">
                                        ✅ <span className="font-bold">{v.nome_gestor.toUpperCase()}</span> — {format(new Date(v.visto_em), "dd/MM HH:mm", { locale: ptBR })}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {faltamVer.length === 0 && eventDests.length > 0 ? (
                              <Badge variant="outline" className="text-[10px] border-success text-success">
                                TODOS VIRAM
                              </Badge>
                            ) : faltamVer.length > 0 ? (
                              <div className="space-y-0.5">
                                {faltamVer.map(d => (
                                  <div key={d.user_role_id} className="text-[10px] text-destructive font-medium">
                                    ❌ {d.gestor_nome.toUpperCase()}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs h-7"
                              onClick={() => {
                                setReenviarEvento(evento);
                                setGestoresSelecionados(new Set());
                              }}
                            >
                              <RotateCcw className="h-3 w-3" />
                              REENVIAR
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Aba Agendamentos */}
        <TabsContent value="agendamentos" className="space-y-4 mt-4">
          <HorariosNotificacaoConfig />
        </TabsContent>
      </Tabs>

      {/* Dialog de Reenviar */}
      <Dialog open={!!reenviarEvento} onOpenChange={(open) => { if (!open) { setReenviarEvento(null); setGestoresSelecionados(new Set()); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              REENVIAR NOTIFICAÇÃO
            </DialogTitle>
          </DialogHeader>
          {reenviarEvento && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p className="font-bold">{TIPO_LABELS[reenviarEvento.tipo] || reenviarEvento.tipo.toUpperCase()}</p>
                <p className="text-muted-foreground">{reenviarEvento.funcionario_nome?.toUpperCase() || reenviarEvento.descricao}</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">SELECIONE OS DESTINATÁRIOS:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      if (!usuarios) return;
                      if (gestoresSelecionados.size === usuarios.length) {
                        setGestoresSelecionados(new Set());
                      } else {
                        setGestoresSelecionados(new Set(usuarios.map(u => u.id)));
                      }
                    }}
                  >
                    {gestoresSelecionados.size === (usuarios || []).length ? 'DESMARCAR TODOS' : 'SELECIONAR TODOS'}
                  </Button>
                </div>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {(usuarios || []).map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded">
                      <Checkbox
                        checked={gestoresSelecionados.has(u.id)}
                        onCheckedChange={(checked) => {
                          setGestoresSelecionados(prev => {
                            const next = new Set(prev);
                            checked ? next.add(u.id) : next.delete(u.id);
                            return next;
                          });
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium block">{u.nome.toUpperCase()}</span>
                        <span className="text-[10px] text-muted-foreground">{u.setor?.nome?.toUpperCase() || 'SEM SETOR'}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReenviarEvento(null); setGestoresSelecionados(new Set()); }}>
              CANCELAR
            </Button>
            <Button
              onClick={handleReenviar}
              disabled={gestoresSelecionados.size === 0 || isReenviando}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              REENVIAR ({gestoresSelecionados.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventoFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => { setFormDialogOpen(open); if (!open) setEditingEvento(null); }}
        evento={editingEvento}
        onSave={handleSaveEvento}
        isSaving={createEvento.isPending || updateEvento.isPending}
      />

      <SimulacaoNotificacaoModal
        open={simulacaoOpen}
        onOpenChange={(open) => { setSimulacaoOpen(open); if (!open) setEventosSimulacao([]); }}
        eventos={eventosSimulacao.length > 0 ? eventosSimulacao : eventosFiltrados.filter(e => selecionados.has(e.id))}
        tipoNotificacao={tipoNotificacao}
      />

      <ConsultaExperienciaDialog
        open={consultaExperienciaOpen}
        onOpenChange={setConsultaExperienciaOpen}
      />


      <GaleriaModelosModal
        open={galeriaOpen}
        onOpenChange={setGaleriaOpen}
      />
    </div>
  );
}
