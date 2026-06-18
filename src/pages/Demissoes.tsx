import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, addMonths, parseISO, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Check, Settings2, Trash2, Pencil, Download, FileText, Bell, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogTrigger,
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDemissoes, useRealizarDemissao, useDeleteDemissao, useToggleLancadoApdata, useImportDemissoesDoCadastro } from '@/hooks/useDemissoes';
import { useSetorFilter } from '@/hooks/useSetorFilter';
import { useSituacoesAtivas } from '@/hooks/useSituacoes';
import { useAuth } from '@/hooks/useAuth';
import { NovaDemissaoForm } from '@/components/demissoes/NovaDemissaoForm';
import { EditarDemissaoForm } from '@/components/demissoes/EditarDemissaoForm';
import { PeriodosConfig } from '@/components/demissoes/PeriodosConfig';

import { criarEventoSistema } from '@/hooks/useEventosSistema';

import { Demissao } from '@/types/demissao';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { loadXLSX } from '@/lib/xlsx';
// xlsx-js-style loaded dynamically

// Gera opções de período para os últimos/próximos meses
const isPedidoDemissao = (tipo?: string | null) => tipo === 'Pedido de Demissão';

const getTipoEventoSaida = (tipo?: string | null) => isPedidoDemissao(tipo) ? 'pedido_demissao' : 'demissao';

const getTipoLabelSaida = (tipo?: string | null) => (tipo || 'Demissão').toUpperCase();

const normalizarTexto = (valor: string) =>
  valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

function gerarOpcoesPeriodo() {
  const base = new Date(2026, 1, 1); // Fev 2026
  const options: { value: string; label: string }[] = [
    { value: 'todas', label: 'Todas' },
  ];
  
  // Gera 12 meses a partir de Fev 2026
  for (let i = 0; i < 12; i++) {
    const data = addMonths(base, i);
    const value = format(data, 'yyyy-MM');
    const label = format(data, "MMMM 'de' yyyy", { locale: ptBR });
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  
  return options;
}

export default function Demissoes() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [periodosOpen, setPeriodosOpen] = useState(false);
  const [editingDemissao, setEditingDemissao] = useState<Demissao | null>(null);
  const [periodoFiltro, setPeriodoFiltro] = useState('2026-02');
  const [confirmRealizarDemissao, setConfirmRealizarDemissao] = useState<Demissao | null>(null);
  const [confirmExcluirDemissao, setConfirmExcluirDemissao] = useState<Demissao | null>(null);
  const [acoesDemissao, setAcoesDemissao] = useState<{ demissao: Demissao; showRealizar: boolean; anchor: { x: number; y: number } } | null>(null);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('todos');
  const [filtroTurma, setFiltroTurma] = useState('todas');
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);
  
  const { data: todasDemissoes = [], isLoading } = useDemissoes();
  const { data: situacoes = [] } = useSituacoesAtivas();
  const { canEditDemissoes, isAdmin, userRole } = useAuth();
  const { filtrarPorSetorCustom } = useSetorFilter();
  const demissoes = useMemo(() => filtrarPorSetorCustom(todasDemissoes, d => d.funcionario?.setor?.id || null), [todasDemissoes, filtrarPorSetorCustom]);
  const realizarDemissao = useRealizarDemissao();
  const deleteDemissao = useDeleteDemissao();
  const toggleApdata = useToggleLancadoApdata();
  const importarDemissoes = useImportDemissoesDoCadastro();

  const opcoesPeriodo = useMemo(() => gerarOpcoesPeriodo(), []);

  const handleImportar = () => {
    if (periodoFiltro === 'todas') {
      toast.error('Selecione um mês específico para importar.');
      return;
    }
    const [ano, mes] = periodoFiltro.split('-').map(Number);
    importarDemissoes.mutate({ mes, ano }, {
      onSuccess: () => setConfirmImportOpen(false)
    });
  };

  // Encontrar a situação "Demissão"
  const situacaoDemissao = useMemo(() => {
    return situacoes.find(s => s.nome.toLowerCase().includes('demissão') || s.nome.toLowerCase().includes('demissao'));
  }, [situacoes]);

  const handleRealizar = async (demissao: Demissao) => {
    if (!situacaoDemissao) {
      toast.error('Situação "Demissão" não encontrada. Configure nas Situações.');
      return;
    }
    
    const { data: funcAtual } = await supabase
      .from('funcionarios')
      .select('situacao_id, situacao:situacoes!situacao_id(nome)')
      .eq('id', demissao.funcionario_id)
      .single();
    
    const situacaoNome = (funcAtual?.situacao as any)?.nome?.toUpperCase() || '';
    const jaEstaNaSituacao = situacaoNome === 'DEMISSÃO' || situacaoNome === 'PED. DEMISSÃO';
    
    if (jaEstaNaSituacao) {
      toast.info('Situação já correta — registrando apenas como realizada.');
    }
    
    await realizarDemissao.mutateAsync({
      demissaoId: demissao.id,
      funcionarioId: demissao.funcionario_id,
      situacaoDemitidoId: situacaoDemissao.id,
      skipSituacaoUpdate: jaEstaNaSituacao,
    });

    const nomeFunc = demissao.funcionario?.nome_completo || 'Colaborador';
    const tipoEvento = getTipoEventoSaida(demissao.tipo_desligamento);
    const tipoLabel = getTipoLabelSaida(demissao.tipo_desligamento);
    
    await criarEventoSistema({
      tipo: tipoEvento,
      descricao: `${tipoLabel} realizada — ${nomeFunc}`,
      funcionario_id: demissao.funcionario_id,
      funcionario_nome: nomeFunc,
      setor_id: demissao.funcionario?.setor?.id || null,
      setor_nome: demissao.funcionario?.setor?.nome || null,
      turma: demissao.funcionario?.turma || null,
      criado_por: userRole?.nome || 'Sistema',
      dados_extra: { tipo_desligamento: demissao.tipo_desligamento || 'Demissão' },
    });
  };

  const handleToggleApdata = (demissao: Demissao) => {
    toggleApdata.mutate({
      id: demissao.id,
      lancado_apdata: !demissao.lancado_apdata,
    });
  };

  const handleNotificar = async (demissao: Demissao) => {
    const nomeFunc = demissao.funcionario?.nome_completo || 'Colaborador';
    const tipoEvento = getTipoEventoSaida(demissao.tipo_desligamento);
    const tipoLabel = getTipoLabelSaida(demissao.tipo_desligamento);
    const isTemp = demissao.funcionario?.matricula?.toUpperCase().startsWith('TEMP');
    const dataDemissao = format(parseISO(demissao.data_prevista), 'dd/MM/yyyy');
    
    await criarEventoSistema({
      tipo: tipoEvento,
      descricao: `${tipoLabel} — ${nomeFunc}`,
      funcionario_id: demissao.funcionario_id,
      funcionario_nome: nomeFunc,
      setor_id: demissao.funcionario?.setor?.id || null,
      setor_nome: demissao.funcionario?.setor?.nome || null,
      turma: demissao.funcionario?.turma || null,
      criado_por: userRole?.nome || 'Sistema',
      dados_extra: { tipo_desligamento: demissao.tipo_desligamento || 'Demissão' },
    });

    try {
      // Enviar notificação apenas para o GESTOR do setor do funcionário
      const setorId = demissao.funcionario?.setor?.id;
      if (setorId) {
        // Buscar gestores vinculados ao setor
        const { data: gestoresDoSetor } = await supabase
          .from('user_roles')
          .select('id, nome, setor_id')
          .eq('ativo', true)
          .eq('perfil', 'gestor_setor');

        // Buscar setores adicionais dos gestores
        const { data: setoresAdicionais } = await supabase
          .from('user_roles_setores')
          .select('user_role_id, setor_id');

        const gestoresIds = new Set<string>();
        gestoresDoSetor?.forEach(g => {
          if (g.setor_id === setorId) gestoresIds.add(g.id);
          const extras = setoresAdicionais?.filter(s => s.user_role_id === g.id) || [];
          if (extras.some(s => s.setor_id === setorId)) gestoresIds.add(g.id);
        });

        const { data: funcionarioSexo } = await supabase
          .from('funcionarios')
          .select('sexo')
          .eq('id', demissao.funcionario_id)
          .maybeSingle();

	        if ((funcionarioSexo?.sexo || '').toLowerCase() === 'masculino') {
	          const { data: segurancaTrabalho } = await supabase
	            .from('user_roles')
	            .select('id, nome, email')
	            .eq('ativo', true)
	            .eq('recebe_notificacoes', true);

          segurancaTrabalho?.forEach(user => {
            const identificador = normalizarTexto(`${user.nome || ''} ${user.email || ''}`);
	            if (identificador.includes('SEGURANCA')) gestoresIds.add(user.id);
	          });
	        }

	        if (isTemp) {
	          const { data: realParceria } = await supabase
	            .from('user_roles')
	            .select('id')
	            .eq('ativo', true)
	            .eq('recebe_notificacoes', true)
	            .ilike('nome', 'REAL PARCERIA');

	          realParceria?.forEach(user => gestoresIds.add(user.id));
	        }

	        if (gestoresIds.size > 0) {
          const notificacoes = [...gestoresIds]
            .filter(id => id !== userRole?.id)
            .map(gestorId => ({
              user_role_id: gestorId,
              tipo: tipoEvento === 'pedido_demissao' ? 'pedido_demissao_lancado' : 'demissao_lancada' as string,
              titulo: `${isTemp ? '🏭 TEMPORÁRIO' : '📋 SAÍDA DO QUADRO'} — ${tipoLabel}`,
              mensagem: `${nomeFunc.toUpperCase()}\n📍 ${demissao.funcionario?.setor?.nome?.toUpperCase() || 'SEM SETOR'}${demissao.funcionario?.turma ? ` — ${demissao.funcionario.turma}` : ''}\n📅 Data: ${dataDemissao}`,
              referencia_id: demissao.id,
            }));

          if (notificacoes.length > 0) {
            await supabase.from('notificacoes').insert(notificacoes);
          }
        }
      }
    } catch (e) {
      console.error('Erro ao notificar gestor:', e);
    }
    
    toast.success('Enviado para a central e gestores do setor.');
  };

  // Filtro por período selecionado
  const filtrarPorPeriodo = (d: Demissao) => {
    if (periodoFiltro === 'todas') return true;
    
    const [ano, mes] = periodoFiltro.split('-').map(Number);
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = endOfMonth(inicioMes);
    
    const dataPrevista = parseISO(d.data_prevista);
    const dataHomologacao = d.data_homologacao ? parseISO(d.data_homologacao) : null;
    const dataExame = d.data_exame_demissional ? parseISO(d.data_exame_demissional) : null;
    
    return (
      (dataPrevista >= inicioMes && dataPrevista <= fimMes) ||
      (dataHomologacao && dataHomologacao >= inicioMes && dataHomologacao <= fimMes) ||
      (dataExame && dataExame >= inicioMes && dataExame <= fimMes)
    );
  };

  const isTemporario = (d: Demissao) => d.funcionario?.matricula?.toUpperCase().startsWith('TEMP');

  // Extrair setores únicos para o filtro
  const setoresUnicos = useMemo(() => {
    const setores = new Set<string>();
    demissoes.forEach(d => {
      if (d.funcionario?.setor?.nome) setores.add(d.funcionario.setor.nome);
    });
    return Array.from(setores).sort();
  }, [demissoes]);

  // Filtro combinado: nome + setor + turma
  const filtroExtra = (d: Demissao) => {
    if (filtroNome) {
      const nome = d.funcionario?.nome_completo?.toLowerCase() || '';
      if (!nome.includes(filtroNome.toLowerCase())) return false;
    }
    if (filtroSetor !== 'todos') {
      if (d.funcionario?.setor?.nome !== filtroSetor) return false;
    }
    if (filtroTurma !== 'todas') {
      if (d.funcionario?.turma?.toUpperCase() !== filtroTurma) return false;
    }
    return true;
  };

  // Ordenação por data ISO
  const sortAsc = (a: Demissao, b: Demissao) =>
    (a.data_prevista || '').localeCompare(b.data_prevista || '');

  // Demissões AGENDADAS (pendentes)
  const demissoesPendentes = demissoes
    .filter((d) => !d.realizado)
    .filter(filtrarPorPeriodo)
    .filter(filtroExtra)
    .sort(sortAsc);

  // Demissões REALIZADAS — sem filtro de período (abas por mês)
  const demissoesRealizadasTodas = demissoes
    .filter(d => d.realizado)
    .filter(filtroExtra)
    .sort(sortAsc);

  // Agrupar realizadas por mês
  const realizadasPorMes = useMemo(() => {
    const meses = new Map<string, Demissao[]>();
    demissoesRealizadasTodas.forEach(d => {
      const mesKey = format(parseISO(d.data_prevista), 'yyyy-MM');
      if (!meses.has(mesKey)) meses.set(mesKey, []);
      meses.get(mesKey)!.push(d);
    });
    // Ordenar itens dentro de cada mês: data_prevista desc, depois nome alfabético
    meses.forEach((lista, key) => {
      meses.set(key, lista.sort((a, b) => {
        const dataCmp = b.data_prevista.localeCompare(a.data_prevista);
        if (dataCmp !== 0) return dataCmp;
        return (a.funcionario?.nome_completo || '').localeCompare(b.funcionario?.nome_completo || '');
      }));
    });
    // Ordenar meses do mais recente ao mais antigo
    return Array.from(meses.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [demissoesRealizadasTodas]);

  const [abaRealizadas, setAbaRealizadas] = useState('');
  // Selecionar primeira aba disponível se a atual não existe
  const abaAtiva = useMemo(() => {
    if (realizadasPorMes.length === 0) return '';
    const existe = realizadasPorMes.some(([key]) => key === abaRealizadas);
    return existe ? abaRealizadas : realizadasPorMes[0][0];
  }, [realizadasPorMes, abaRealizadas]);

  // Para manter compatibilidade com o Excel export
  const demissoesRealizadas = demissoesRealizadasTodas;

  // Exportar para Excel
  const handleExportarExcel = async () => {
    const XLSX = await loadXLSX();
    const todasDemissoes = [
      ...demissoesPendentes.map(d => ({
        Matrícula: d.funcionario?.matricula || '',
        Nome: d.funcionario?.nome_completo || '',
        Turma: d.funcionario?.turma || '',
        Admissão: d.funcionario?.data_admissao ? format(parseISO(d.funcionario.data_admissao), 'dd/MM/yyyy') : '',
        Cargo: d.funcionario?.cargo || '',
        Setor: d.funcionario?.setor?.nome || '',
        Tipo: d.tipo_desligamento || '',
        'Data Demissão': format(parseISO(d.data_prevista), 'dd/MM/yyyy'),
        'Exame Demissional': d.data_exame_demissional ? format(parseISO(d.data_exame_demissional), 'dd/MM/yyyy') : '',
        'Hora Exame': d.hora_exame_demissional?.slice(0, 5) || '',
        'Homologação': d.data_homologacao ? format(parseISO(d.data_homologacao), 'dd/MM/yyyy') : '',
        'Hora Homologação': d.hora_homologacao?.slice(0, 5) || '',
        Status: 'Agendada',
        'APDATA': d.lancado_apdata ? 'SIM' : 'NÃO',
      })),
      ...demissoesRealizadas.map(d => ({
        Matrícula: d.funcionario?.matricula || '',
        Nome: d.funcionario?.nome_completo || '',
        Turma: d.funcionario?.turma || '',
        Admissão: d.funcionario?.data_admissao ? format(parseISO(d.funcionario.data_admissao), 'dd/MM/yyyy') : '',
        Cargo: d.funcionario?.cargo || '',
        Setor: d.funcionario?.setor?.nome || '',
        Tipo: d.tipo_desligamento || '',
        'Data Demissão': format(parseISO(d.data_prevista), 'dd/MM/yyyy'),
        'Exame Demissional': d.data_exame_demissional ? format(parseISO(d.data_exame_demissional), 'dd/MM/yyyy') : '',
        'Hora Exame': d.hora_exame_demissional?.slice(0, 5) || '',
        'Homologação': d.data_homologacao ? format(parseISO(d.data_homologacao), 'dd/MM/yyyy') : '',
        'Hora Homologação': d.hora_homologacao?.slice(0, 5) || '',
        Status: 'Realizada',
        'APDATA': d.lancado_apdata ? 'SIM' : 'NÃO',
      })),
    ];

    const worksheet = XLSX.utils.json_to_sheet(todasDemissoes);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Demissões');
    XLSX.writeFile(workbook, `demissoes_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel exportado com sucesso!');
  };

  // Componente de nome com badge de tipo
  const NomeDisplay = ({ demissao }: { demissao: Demissao }) => {
    const isTemp = isTemporario(demissao);
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium leading-tight uppercase text-primary">
            {demissao.funcionario?.nome_completo?.toUpperCase() || 'N/A'}
          </span>
          {isTemp && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">TEMP</Badge>
          )}
          {isTemp && demissao.funcionario?.turma && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600 dark:text-amber-400">
              {demissao.funcionario.turma.toUpperCase()}
            </Badge>
          )}
        </div>
        {demissao.tipo_desligamento && (
          <Badge variant="outline" className="text-xs font-normal uppercase block w-fit">
            {demissao.tipo_desligamento.toUpperCase()}
          </Badge>
        )}
      </div>
    );
  };

  const handleRowClick = (e: React.MouseEvent, demissao: Demissao, showRealizar: boolean) => {
    setAcoesDemissao({ demissao, showRealizar, anchor: { x: e.clientX, y: e.clientY } });
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
      {/* Header */}
      <div className="page-header flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">DEMISSÕES</h1>
          <p className="page-description">
            CONTROLE DE DESLIGAMENTOS E HOMOLOGAÇÕES
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Filtro por período */}
          <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {opcoesPeriodo.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/carta-desligamento">
              <FileText className="h-4 w-4" />
              CARTA DE DESLIGAMENTO
            </Link>
          </Button>

          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/homologacoes">
              <FileText className="h-4 w-4" />
              HOMOLOGAÇÕES
            </Link>
          </Button>
          
          <Button variant="secondary" size="sm" className="gap-2" onClick={handleExportarExcel}>
            <Download className="h-4 w-4" />
            EXPORTAR
          </Button>

          <Button 
            variant="secondary" 
            size="sm" 
            className="gap-2 text-blue-600 hover:text-blue-700 bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20" 
            onClick={() => setConfirmImportOpen(true)}
            disabled={importarDemissoes.isPending || !isAdmin}
          >
            <RefreshCw className={cn("h-4 w-4", importarDemissoes.isPending && "animate-spin")} />
            IMPORTAR DO MÊS
          </Button>
          
          <Dialog open={periodosOpen} onOpenChange={setPeriodosOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" className="gap-2" disabled={!isAdmin}>
                <Settings2 className="h-4 w-4" />
                PERÍODOS
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>CONFIGURAR PERÍODOS</DialogTitle>
              </DialogHeader>
              <PeriodosConfig />
            </DialogContent>
          </Dialog>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={!canEditDemissoes}>
                <Plus className="h-4 w-4" />
                NOVA DEMISSÃO
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>AGENDAR DEMISSÃO</DialogTitle>
              </DialogHeader>
              <NovaDemissaoForm onSuccess={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-[250px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
            className="pl-9 uppercase"
          />
        </div>
        <Select value={filtroSetor} onValueChange={setFiltroSetor}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Setor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">TODOS OS SETORES</SelectItem>
            {setoresUnicos.map(s => (
              <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroTurma} onValueChange={setFiltroTurma}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">TODAS</SelectItem>
            <SelectItem value="A">TURMA A</SelectItem>
            <SelectItem value="B">TURMA B</SelectItem>
            <SelectItem value="C">TURMA C</SelectItem>
            <SelectItem value="D">TURMA D</SelectItem>
          </SelectContent>
        </Select>
        {(filtroNome || filtroSetor !== 'todos' || filtroTurma !== 'todas') && (
          <Button variant="ghost" size="sm" onClick={() => { setFiltroNome(''); setFiltroSetor('todos'); setFiltroTurma('todas'); }}>
            Limpar filtros
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="bg-amber-500/10 border-b border-amber-500/20">
          <CardTitle className="text-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
            📋 DEMISSÕES AGENDADAS
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300">{demissoesPendentes.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {demissoesPendentes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 uppercase">
              Nenhuma demissão agendada
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="uppercase text-xs">
                    <TableHead className="w-[70px]">ID</TableHead>
                    <TableHead className="min-w-[200px]">FUNCIONÁRIO</TableHead>
                    <TableHead>SETOR</TableHead>
                    <TableHead className="w-[60px]">TURMA</TableHead>
                    <TableHead>ADMISSÃO</TableHead>
                    <TableHead>DT DEMISSÃO</TableHead>
                    <TableHead>EXAME</TableHead>
                    <TableHead>HOMOLOGAÇÃO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demissoesPendentes.map((demissao) => (
                    <TableRow key={demissao.id} className={cn("cursor-pointer", demissao.lancado_apdata && "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20")} onClick={(e) => handleRowClick(e, demissao, true)}>
                      <TableCell className="font-mono text-sm font-medium">
                        {demissao.funcionario?.matricula?.toUpperCase() || '-'}
                      </TableCell>
                      <TableCell>
                        <NomeDisplay demissao={demissao} />
                      </TableCell>
                      <TableCell className="text-sm uppercase">{demissao.funcionario?.setor?.nome?.toUpperCase() || '-'}</TableCell>
                      <TableCell className="text-center uppercase">{demissao.funcionario?.turma?.toUpperCase() || '-'}</TableCell>
                      <TableCell className="text-sm">
                        {demissao.funcionario?.data_admissao 
                          ? format(parseISO(demissao.funcionario.data_admissao), 'dd/MM/yyyy')
                          : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {format(parseISO(demissao.data_prevista), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        {demissao.data_exame_demissional ? (
                          <div className="text-sm">
                            <div>{format(parseISO(demissao.data_exame_demissional), 'dd/MM/yyyy')}</div>
                            {demissao.hora_exame_demissional && (
                              <div className="text-muted-foreground text-xs">
                                {demissao.hora_exame_demissional.slice(0, 5)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {demissao.data_homologacao ? (
                          <div className="text-sm">
                            <div>{format(parseISO(demissao.data_homologacao), 'dd/MM/yyyy')}</div>
                            {demissao.hora_homologacao && (
                              <div className="text-muted-foreground text-xs">
                                {demissao.hora_homologacao.slice(0, 5)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demissões Realizadas — Abas por mês */}
      <Card>
        <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20">
          <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            ✅ DEMISSÕES REALIZADAS
            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">{demissoesRealizadasTodas.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {realizadasPorMes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 uppercase">
              Nenhuma demissão realizada
            </p>
          ) : (
            <Tabs value={abaAtiva} onValueChange={setAbaRealizadas}>
              <TabsList className="flex-wrap h-auto gap-1 mb-4">
                {realizadasPorMes.map(([mesKey, lista]) => {
                  const [ano, mes] = mesKey.split('-').map(Number);
                  const label = format(new Date(ano, mes - 1, 1), "MMM/yy", { locale: ptBR }).toUpperCase();
                  return (
                    <TabsTrigger key={mesKey} value={mesKey} className="text-xs">
                      {label} ({lista.length})
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {realizadasPorMes.map(([mesKey, lista]) => (
                <TabsContent key={mesKey} value={mesKey}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="uppercase text-xs">
                          <TableHead className="w-[70px]">ID</TableHead>
                          <TableHead className="min-w-[200px]">FUNCIONÁRIO</TableHead>
                          <TableHead>SETOR</TableHead>
                          <TableHead className="w-[60px]">TURMA</TableHead>
                          <TableHead>ADMISSÃO</TableHead>
                          <TableHead>DT DEMISSÃO</TableHead>
                          <TableHead>EXAME</TableHead>
                          <TableHead>HOMOLOGAÇÃO</TableHead>
                          <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lista.map((demissao) => (
                          <TableRow 
                            key={demissao.id} 
                            className={cn(
                              "cursor-pointer",
                              demissao.lancado_apdata && "bg-emerald-500/10 hover:bg-emerald-500/15"
                            )} 
                            onClick={(e) => {
                              // Se clicou em botão de ação, não toggle apdata
                              if ((e.target as HTMLElement).closest('button')) return;
                              handleToggleApdata(demissao);
                            }}
                          >
                            <TableCell className="font-mono text-sm font-medium">
                              {demissao.funcionario?.matricula?.toUpperCase() || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <NomeDisplay demissao={demissao} />
                                {demissao.lancado_apdata && (
                                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0 shrink-0">
                                    {demissao.funcionario?.matricula?.toUpperCase().startsWith('TEMP') ? 'AGÊNCIA OK' : 'APDATA OK'}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm uppercase">{demissao.funcionario?.setor?.nome?.toUpperCase() || '-'}</TableCell>
                            <TableCell className="text-center uppercase">{demissao.funcionario?.turma?.toUpperCase() || '-'}</TableCell>
                            <TableCell className="text-sm">
                              {demissao.funcionario?.data_admissao 
                                ? format(parseISO(demissao.funcionario.data_admissao), 'dd/MM/yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell className="font-medium">
                              {format(parseISO(demissao.data_prevista), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell>
                              {demissao.data_exame_demissional ? (
                                <div className="text-sm">
                                  <div>{format(parseISO(demissao.data_exame_demissional), 'dd/MM/yyyy')}</div>
                                  {demissao.hora_exame_demissional && (
                                    <div className="text-muted-foreground text-xs">
                                      {demissao.hora_exame_demissional.slice(0, 5)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {demissao.data_homologacao ? (
                                <div className="text-sm">
                                  <div>{format(parseISO(demissao.data_homologacao), 'dd/MM/yyyy')}</div>
                                  {demissao.hora_homologacao && (
                                    <div className="text-muted-foreground text-xs">
                                      {demissao.hora_homologacao.slice(0, 5)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="p-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(e, demissao, false);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={!!editingDemissao} onOpenChange={(open) => !open && setEditingDemissao(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>EDITAR DEMISSÃO</DialogTitle>
          </DialogHeader>
          {editingDemissao && (
            <EditarDemissaoForm 
              demissao={editingDemissao} 
              onSuccess={() => setEditingDemissao(null)} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog - Confirmar Realizada */}
      <AlertDialog open={!!confirmRealizarDemissao} onOpenChange={(open) => !open && setConfirmRealizarDemissao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Demissão</AlertDialogTitle>
            <AlertDialogDescription>
              Ao confirmar, o funcionário <strong>{confirmRealizarDemissao?.funcionario?.nome_completo}</strong> será movido para a situação "Demissão".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmRealizarDemissao) {
                handleRealizar(confirmRealizarDemissao);
                setConfirmRealizarDemissao(null);
              }
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog - Confirmar Exclusão */}
      <AlertDialog open={!!confirmExcluirDemissao} onOpenChange={(open) => !open && setConfirmExcluirDemissao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Demissão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta demissão?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmExcluirDemissao) {
                  deleteDemissao.mutate(confirmExcluirDemissao.id);
                  setConfirmExcluirDemissao(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog - Confirmar Importação */}
      <AlertDialog open={confirmImportOpen} onOpenChange={setConfirmImportOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar demissões do cadastro?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso buscará todos os funcionários com data de demissão registrada para o mês de <strong>{opcoesPeriodo.find(o => o.value === periodoFiltro)?.label}</strong> e criará automaticamente os registros que faltarem nesta lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportar} className="bg-blue-600 hover:bg-blue-700">
              Importar Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Menu flutuante de ações ao clicar na linha */}
      {acoesDemissao && (
        <div 
          className="fixed inset-0 z-50" 
          onClick={() => setAcoesDemissao(null)}
        >
          <div 
            className="absolute w-auto p-2 bg-popover border border-border shadow-lg rounded-md"
            style={{ 
              left: acoesDemissao.anchor.x, 
              top: acoesDemissao.anchor.y,
              transform: 'translate(-50%, 8px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              {acoesDemissao.showRealizar && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-xs justify-start"
                  disabled={!canEditDemissoes}
                  onClick={() => { setConfirmRealizarDemissao(acoesDemissao.demissao); setAcoesDemissao(null); }}
                >
                  <Check className="h-3 w-3 mr-2" />
                  REALIZADA
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs justify-start"
                disabled={!canEditDemissoes}
                onClick={() => { setEditingDemissao(acoesDemissao.demissao); setAcoesDemissao(null); }}
              >
                <Pencil className="h-3 w-3 mr-2" />
                EDITAR
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs justify-start text-destructive"
                disabled={!canEditDemissoes}
                onClick={() => { setConfirmExcluirDemissao(acoesDemissao.demissao); setAcoesDemissao(null); }}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                EXCLUIR
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs justify-start"
                disabled={!canEditDemissoes}
                onClick={() => { handleNotificar(acoesDemissao.demissao); setAcoesDemissao(null); }}
              >
                <Bell className="h-3 w-3 mr-2" />
                NOTIFICAR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

