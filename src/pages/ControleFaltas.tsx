import { useState, useMemo, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';
import { isFolgaEscalaDecoracao } from '@/lib/escalaPanama';
import { isFolgaEscalaSopro } from '@/lib/escalaSopro';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, eachDayOfInterval, isWeekend, isBefore, isAfter, differenceInDays, startOfDay } from 'date-fns';
import { useFuncionariosNoQuadro } from '@/hooks/useFuncionarios';
import { ptBR } from 'date-fns/locale';
import { Plus, Lock, Unlock, Calendar, AlertTriangle, Filter, BarChart3, Users, Wind, Palette, Layers, Search, Info, Eye, KeyRound } from 'lucide-react';
import { useLiberacoesFaltas } from '@/hooks/useLiberacoesFaltas';
import { LiberarDatasDialog } from '@/components/faltas/LiberarDatasDialog';
import {
  usePeriodosFaltas,
  useRegistrosFaltas,
  useCreateRegistroFalta,
  useUpdateRegistroFalta,
  useDeleteRegistroFalta,
  useCreatePeriodoProximoMes,
  useUpdatePeriodoStatus,
  useFuncionariosFaltas,
} from '@/hooks/useFaltas';
import { useRegistrarHistoricoFalta } from '@/hooks/useHistoricoFaltas';
import { useCreateDivergenciaPonto } from '@/hooks/useDivergenciasPonto';
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';
import { useSetores } from '@/hooks/useSetores';
import { useQuadroPlanejado } from '@/hooks/useQuadroPlanejado';
import { useQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// MultiSelect removed - using toggle buttons instead
import { PontoTipo, Funcionario } from '@/types/database';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { DashboardFaltasDiario } from '@/components/faltas/DashboardFaltasDiario';
import { ZerarFaltasDialog } from '@/components/faltas/ZerarFaltasDialog';
// Tabs removed - metrics shown inline
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Verifica se o setor conta no quadro usando a flag do banco de dados
function isSetorDoQuadro(setor: { nome?: string; conta_no_quadro?: boolean } | null): boolean {
  if (!setor) return false;
  return setor.conta_no_quadro === true;
}

// Número máximo de dias para edição direta (4 dias incluindo hoje)
const DIAS_EDICAO_DIRETA = 4;

export default function ControleFaltas() {
  const navigate = useNavigate();
  const { usuarioAtual } = useUsuario();
  const { data: periodos = [], isLoading: loadingPeriodos } = usePeriodosFaltas();
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>('');
  
  // Estados para controlar blocos de dias visíveis
  const [blocosVisiveis, setBlocosVisiveis] = useState<Set<number>>(new Set([1])); // Bloco 1 (atual) visível por padrão
  
  // Selecionar automaticamente o período aberto mais ANTIGO
  const periodoAtivoId = useMemo(() => {
    const periodosAbertos = periodos.filter(p => p.status === 'aberto');
    // periodos vem ordenado por data_inicio desc, então o mais antigo é o último
    const periodoMaisAntigo = periodosAbertos.length > 0 ? periodosAbertos[periodosAbertos.length - 1] : null;
    return periodoMaisAntigo?.id || periodos[0]?.id || '';
  }, [periodos]);

  // Se não há período selecionado, usar o ativo
  const periodoEfetivo = periodoSelecionado || periodoAtivoId;
  
  const periodo = periodos.find(p => p.id === periodoEfetivo);
  
  const { data: funcionarios = [], isLoading: loadingFuncionarios } = useFuncionariosFaltas(periodoEfetivo, periodo);
  const { data: registros = [], isLoading: loadingRegistros } = useRegistrosFaltas(periodoEfetivo);
  const { data: setores = [] } = useSetores();
  const { canEditFaltas, isAdmin, userRole, isRHMode } = useAuth();
  const isRealParceria = isRHMode && userRole?.nome?.toUpperCase() === 'REAL PARCERIA';
  const { data: liberacoes = [] } = useLiberacoesFaltas();
  const [liberarDatasOpen, setLiberarDatasOpen] = useState(false);
  
  // Quadro planejado/decoração para cálculo de saldo
  const { data: quadroPlanejadoSopro = [] } = useQuadroPlanejado('SOPRO');
  const { data: quadroDecoracaoData = [] } = useQuadroDecoracao();
  
  const createRegistro = useCreateRegistroFalta();
  const updateRegistro = useUpdateRegistroFalta();
  const deleteRegistro = useDeleteRegistroFalta();
  const createPeriodo = useCreatePeriodoProximoMes();
  const updateStatus = useUpdatePeriodoStatus();
  const registrarHistorico = useRegistrarHistoricoFalta();
  const criarDivergencia = useCreateDivergenciaPonto();

  // Modal para registro normal
  const [modalOpen, setModalOpen] = useState(false);
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<Funcionario | null>(null);
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null);
  const [tipoSelecionado, setTipoSelecionado] = useState<PontoTipo | 'SUMIDO'>('P');
  const [sumidoDesde, setSumidoDesde] = useState<string>('');
  
  // Modal para divergência (quando passa dos 3 dias)
  const [modalDivergenciaOpen, setModalDivergenciaOpen] = useState(false);
  const [motivoDivergencia, setMotivoDivergencia] = useState('');

  // Filtros
  const [filtroNome, setFiltroNome] = useState('');
  const debouncedFiltroNome = useDebounce(filtroNome, 300);
  
  // Estado para filtro de grupo (usado em Dashboard e Lançamentos)
  const [grupoFiltro, setGrupoFiltro] = useFilterPersistence<'TOTAL' | 'SOPRO' | 'DECORAÇÃO'>('faltas_grupo', 'TOTAL');
  
  // Estados para filtros multi-select de turma/turno
  const [turmasSopro, setTurmasSopro] = useState<Set<string>>(new Set());
  const [subTurmasSopro, setSubTurmasSopro] = useState<Set<string>>(new Set());
  const [turnosDecoracao, setTurnosDecoracao] = useState<Set<string>>(new Set());
  const [turmasDecoracao, setTurmasDecoracao] = useState<Set<string>>(new Set());

  // Toggle helpers for multi-select
  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  // Detectar grupo do gestor automaticamente
  const grupoDoGestor = useMemo(() => {
    if (isAdmin) return null; // Admin vê tudo
    const setoresUsuario = userRole?.setores_ids || [];
    if (setoresUsuario.length === 0) return null;
    
    const nomesSetores = setoresUsuario.map(id => {
      const setor = setores.find(s => s.id === id);
      return setor?.nome?.toUpperCase() || '';
    });
    
    const temSopro = nomesSetores.some(n => n.includes('SOPRO'));
    const temDecoracao = nomesSetores.some(n => n.includes('DECORAÇÃO') || n.includes('DECORACAO'));
    
    if (temSopro && !temDecoracao) return 'SOPRO' as const;
    if (temDecoracao && !temSopro) return 'DECORAÇÃO' as const;
    return null;
  }, [isAdmin, userRole, setores]);

  // Filtra funcionários por setor do usuário (gestores só veem seus setores)
  // E também filtra apenas setores do quadro
  // Gestores veem todos do seu GRUPO (SOPRO vê A+B+C, DECORAÇÃO vê DIA+NOITE)
  const funcionariosFiltrados = useMemo(() => {
    let filtered = funcionarios;
    
    // Primeiro filtra por setores do quadro (usa a flag conta_no_quadro)
    filtered = filtered.filter(func => isSetorDoQuadro(func.setor));
    
  // REAL PARCERIA: exibe APENAS funcionários com matrícula = 'TEMP' (temporários)
    const nomeUsuario = (userRole?.nome || '').toUpperCase().trim();
    const ehRealParceria = isRHMode && nomeUsuario === 'REAL PARCERIA';
    if (ehRealParceria) {
      filtered = filtered.filter(func => {
        const matricula = (func.matricula || '').toUpperCase().trim();
        return matricula === 'TEMP' || matricula.includes('TEMP');
      });
    } else if (!isAdmin) {
      // Se não é admin e tem setores específicos atribuídos, filtrar apenas pelos setores do gestor
      const setoresUsuario = userRole?.setores_ids || [];
      
      if (setoresUsuario.length > 0) {
        // Filtrar apenas pelos setores atribuídos ao gestor
        filtered = filtered.filter(func => {
          return setoresUsuario.includes(func.setor_id);
        });
      }
    }
    
    // Aplica filtro de grupo (SOPRO/DECORAÇÃO)
    const grupoEfetivo = grupoDoGestor || grupoFiltro;
    if (grupoEfetivo !== 'TOTAL') {
      filtered = filtered.filter(func => {
        const setorNome = func.setor?.nome?.toUpperCase() || '';
        if (grupoEfetivo === 'SOPRO') {
          return setorNome.includes('SOPRO');
        }
        if (grupoEfetivo === 'DECORAÇÃO') {
          return setorNome.includes('DECORAÇÃO') || setorNome.includes('DECORACAO');
        }
        return true;
      });
    }
    
    // Aplica filtro de turma SOPRO (A/B/C) - multi-select
    if (turmasSopro.size > 0) {
      filtered = filtered.filter(func => {
        const setorNome = func.setor?.nome?.toUpperCase() || '';
        if (!setorNome.includes('SOPRO')) return true;
        return Array.from(turmasSopro).some(t => setorNome.includes(` ${t}`) || setorNome.endsWith(t));
      });
    }

    // Aplica filtro de sub-turma SOPRO (1A/2A/1B/2B) - multi-select
    if (subTurmasSopro.size > 0) {
      filtered = filtered.filter(func => {
        const setorNome = func.setor?.nome?.toUpperCase() || '';
        if (!setorNome.includes('SOPRO')) return true;
        const turma = (func.turma || '').toUpperCase().trim();
        return Array.from(subTurmasSopro).some(st => turma === st);
      });
    }
    
    // Aplica filtro de nome
    if (debouncedFiltroNome.trim()) {
      const termo = debouncedFiltroNome.toUpperCase().trim();
      filtered = filtered.filter(func => 
        func.nome_completo.toUpperCase().includes(termo) ||
        func.matricula?.toUpperCase().includes(termo)
      );
    }
    
    // Aplica filtro de turno (DIA/NOITE) para DECORAÇÃO - multi-select
    if (turnosDecoracao.size > 0) {
      filtered = filtered.filter(func => {
        const setorNome = func.setor?.nome?.toUpperCase() || '';
        if (!setorNome.includes('DECORAÇÃO') && !setorNome.includes('DECORACAO')) return true;
        return Array.from(turnosDecoracao).some(t => setorNome.includes(t));
      });
    }
    
    // Aplica filtro de turma (T1/T2) para DECORAÇÃO - multi-select
    if (turmasDecoracao.size > 0) {
      filtered = filtered.filter(func => {
        const setorNome = func.setor?.nome?.toUpperCase() || '';
        if (!setorNome.includes('DECORAÇÃO') && !setorNome.includes('DECORACAO')) return true;
        const turma = (func.turma || '').toUpperCase().trim();
        return Array.from(turmasDecoracao).some(t => turma === t || turma === t.replace('T', ''));
      });
    }
    
    return filtered;
  }, [funcionarios, isAdmin, isRealParceria, userRole, grupoFiltro, grupoDoGestor, turmasSopro, subTurmasSopro, debouncedFiltroNome, turnosDecoracao, turmasDecoracao, setores]);

  const diasPeriodo = useMemo(() => {
    if (!periodo) return [];
    return eachDayOfInterval({
      start: parseISO(periodo.data_inicio),
      end: parseISO(periodo.data_fim),
    });
  }, [periodo]);

  // Dividir dias em blocos: Bloco 0 = dias antigos (ex: 14-31 jan), Bloco 1 = dias recentes (ex: 01-13 fev)
  const blocosDias = useMemo(() => {
    if (diasPeriodo.length === 0) return [];
    
    const hoje = startOfDay(new Date());
    const blocos: { id: number; label: string; dias: Date[]; isRecente: boolean }[] = [];
    
    // Encontrar o "ponto de corte" - início do mês atual ou dia 1 do período mais recente
    // Vamos dividir por quinzenas para períodos longos
    const totalDias = diasPeriodo.length;
    
    if (totalDias <= 15) {
      // Período curto, não divide
      blocos.push({
        id: 0,
        label: `${format(diasPeriodo[0], 'dd/MM')} - ${format(diasPeriodo[totalDias - 1], 'dd/MM')}`,
        dias: diasPeriodo,
        isRecente: true
      });
    } else {
      // Divide em dois blocos
      // Encontra o ponto de corte (último dia do primeiro mês ou metade do período)
      const primeiroMes = diasPeriodo[0].getMonth();
      let pontoCorte = diasPeriodo.findIndex(d => d.getMonth() !== primeiroMes);
      
      // Se não mudou de mês, corta na metade
      if (pontoCorte === -1) {
        pontoCorte = Math.ceil(totalDias / 2);
      }
      
      const diasAntigos = diasPeriodo.slice(0, pontoCorte);
      const diasRecentes = diasPeriodo.slice(pontoCorte);
      
      if (diasAntigos.length > 0) {
        blocos.push({
          id: 0,
          label: `${format(diasAntigos[0], 'dd/MM')} - ${format(diasAntigos[diasAntigos.length - 1], 'dd/MM')}`,
          dias: diasAntigos,
          isRecente: false
        });
      }
      
      if (diasRecentes.length > 0) {
        blocos.push({
          id: 1,
          label: `${format(diasRecentes[0], 'dd/MM')} - ${format(diasRecentes[diasRecentes.length - 1], 'dd/MM')}`,
          dias: diasRecentes,
          isRecente: true
        });
      }
    }
    
    return blocos;
  }, [diasPeriodo]);

  // Dias visíveis baseados nos blocos selecionados
  const diasVisiveis = useMemo(() => {
    if (blocosDias.length === 0) return diasPeriodo;
    
    return blocosDias
      .filter(b => blocosVisiveis.has(b.id))
      .flatMap(b => b.dias);
  }, [blocosDias, blocosVisiveis, diasPeriodo]);

  // Função para toggle de bloco
  const toggleBloco = (blocoId: number) => {
    setBlocosVisiveis(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blocoId)) {
        // Não permite ocultar todos os blocos
        if (newSet.size > 1) {
          newSet.delete(blocoId);
        }
      } else {
        newSet.add(blocoId);
      }
      return newSet;
    });
  };

  // Reset dos blocos visíveis quando muda o período
  useEffect(() => {
    // Por padrão, mostrar o bloco mais antigo (bloco 0)
    if (blocosDias.length > 0) {
      setBlocosVisiveis(new Set([blocosDias[0].id]));
    }
  }, [periodoEfetivo]);

  const registrosPorFuncData = useMemo(() => {
    const map = new Map<string, { id: string; tipo: PontoTipo; observacao: string | null }>();
    registros.forEach(r => {
      map.set(`${r.funcionario_id}-${r.data}`, { id: r.id, tipo: r.tipo, observacao: r.observacao });
    });
    return map;
  }, [registros]);

  // Função auxiliar para obter grupo consolidado de um setor
  const getGrupoConsolidado = (setorNome: string, setorGrupo: string | null, turma?: string | null): string => {
    const nomeUpper = setorNome.toUpperCase();
    const grupoUpper = (setorGrupo || '').toUpperCase();
    
    // Se tem grupo definido, usar o grupo
    if (grupoUpper) {
      if (grupoUpper.includes('SOPRO A')) return 'SOPRO A';
      if (grupoUpper.includes('SOPRO B')) return 'SOPRO B';
      if (grupoUpper.includes('SOPRO C')) return 'SOPRO C';
      // DECORAÇÃO - agora subdivide por turma
      if (grupoUpper.includes('DECORAÇÃO DIA') || grupoUpper.includes('DECORACAO DIA')) {
        const t = (turma || '').toUpperCase().trim();
        if (t === 'T1' || t === '1') return 'DECORAÇÃO DIA - T1';
        if (t === 'T2' || t === '2') return 'DECORAÇÃO DIA - T2';
        return 'DECORAÇÃO DIA';
      }
      if (grupoUpper.includes('DECORAÇÃO NOITE') || grupoUpper.includes('DECORACAO NOITE')) {
        const t = (turma || '').toUpperCase().trim();
        if (t === 'T1' || t === '1') return 'DECORAÇÃO NOITE - T1';
        if (t === 'T2' || t === '2') return 'DECORAÇÃO NOITE - T2';
        return 'DECORAÇÃO NOITE';
      }
    }
    
    // Fallback pelo nome do setor
    if (nomeUpper.includes('SOPRO') && nomeUpper.includes(' A')) return 'SOPRO A';
    if (nomeUpper.includes('SOPRO') && nomeUpper.includes(' B')) return 'SOPRO B';
    if (nomeUpper.includes('SOPRO') && nomeUpper.includes(' C')) return 'SOPRO C';
    if (nomeUpper.includes('DECORAÇÃO') && nomeUpper.includes('DIA')) {
      const t = (turma || '').toUpperCase().trim();
      if (t === 'T1' || t === '1') return 'DECORAÇÃO DIA - T1';
      if (t === 'T2' || t === '2') return 'DECORAÇÃO DIA - T2';
      return 'DECORAÇÃO DIA';
    }
    if (nomeUpper.includes('DECORAÇÃO') && nomeUpper.includes('NOITE')) {
      const t = (turma || '').toUpperCase().trim();
      if (t === 'T1' || t === '1') return 'DECORAÇÃO NOITE - T1';
      if (t === 'T2' || t === '2') return 'DECORAÇÃO NOITE - T2';
      return 'DECORAÇÃO NOITE';
    }
    
    return nomeUpper;
  };

  // Agrupar funcionários por setor consolidado (SOPRO A = MOD + G+P A)
  const funcionariosAgrupados = useMemo(() => {
    const grupos: Record<string, typeof funcionariosFiltrados> = {};
    
    funcionariosFiltrados.forEach(func => {
      const setorNome = func.setor?.nome || 'SEM SETOR';
      const setorGrupo = func.setor?.grupo || null;
      const grupoConsolidado = getGrupoConsolidado(setorNome, setorGrupo, func.turma);
      
      if (!grupos[grupoConsolidado]) {
        grupos[grupoConsolidado] = [];
      }
      grupos[grupoConsolidado].push(func);
    });
    
    // Ordenar grupos: SOPRO primeiro (A, B, C), depois DECORAÇÃO (DIA, NOITE)
    const ordemGrupos = ['SOPRO A', 'SOPRO B', 'SOPRO C', 'DECORAÇÃO DIA - T1', 'DECORAÇÃO DIA - T2', 'DECORAÇÃO NOITE - T1', 'DECORAÇÃO NOITE - T2', 'DECORAÇÃO DIA', 'DECORAÇÃO NOITE'];
    const setoresOrdenados = Object.keys(grupos).sort((a, b) => {
      const idxA = ordemGrupos.indexOf(a);
      const idxB = ordemGrupos.indexOf(b);
      if (idxA >= 0 && idxB >= 0) return idxA - idxB;
      if (idxA >= 0) return -1;
      if (idxB >= 0) return 1;
      return a.localeCompare(b);
    });
    
    return setoresOrdenados.map(setor => ({
      setor,
      funcionarios: grupos[setor].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo)),
    }));
  }, [funcionariosFiltrados]);

  // Filtrar funcionários agrupados por grupo selecionado (para visualização)
  const funcionariosAgrupadosFiltrados = useMemo(() => {
    let resultado = funcionariosAgrupados;
    
    // Filtro principal por setor (SOPRO/DECORAÇÃO)
    if (grupoFiltro !== 'TOTAL') {
      resultado = resultado.filter(({ setor }) => {
        const setorUpper = setor.toUpperCase();
        if (grupoFiltro === 'SOPRO') {
          return setorUpper.includes('SOPRO');
        }
        if (grupoFiltro === 'DECORAÇÃO') {
          return setorUpper.includes('DECORAÇÃO') || setorUpper.includes('DECORACAO');
        }
        return true;
      });
    }
    
    // Filtros de turma para SOPRO (A/B/C) - multi-select
    if (grupoFiltro === 'SOPRO' && turmasSopro.size > 0) {
      resultado = resultado.filter(({ setor }) => {
        const setorUpper = setor.toUpperCase();
        return Array.from(turmasSopro).some(t => setorUpper.includes(` ${t}`) || setorUpper.endsWith(t));
      });
    }
    
    // Filtros de turno para DECORAÇÃO (DIA/NOITE) - multi-select
    if (grupoFiltro === 'DECORAÇÃO' && turnosDecoracao.size > 0) {
      resultado = resultado.filter(({ setor }) => {
        const setorUpper = setor.toUpperCase();
        return Array.from(turnosDecoracao).some(t => setorUpper.includes(t));
      });
    }
    
    // Filtros de turma para DECORAÇÃO (T1/T2) - multi-select
    if (grupoFiltro === 'DECORAÇÃO' && turmasDecoracao.size > 0) {
      resultado = resultado.filter(({ setor }) => {
        const setorUpper = setor.toUpperCase();
        return Array.from(turmasDecoracao).some(t => setorUpper.includes(t));
      });
    }
    
    return resultado;
  }, [funcionariosAgrupados, grupoFiltro, turmasSopro, turnosDecoracao, turmasDecoracao]);

  // Mapeamento setor agrupado → reserva de faltas do quadro planejado
  const reservaFaltasPorSetor = useMemo(() => {
    const map: Record<string, number> = {};
    // SOPRO: turma A/B/C
    quadroPlanejadoSopro.forEach(qp => {
      const key = `SOPRO ${qp.turma}`;
      map[key] = (qp.reserva_faltas_industria || 0) + (qp.reserva_faltas_gp || 0);
    });
    // DECORAÇÃO: turma DIA-T1, DIA-T2, NOITE-T1, NOITE-T2
    quadroDecoracaoData.forEach(qd => {
      const turmaMap: Record<string, string> = {
        'DIA-T1': 'DECORAÇÃO DIA - T1',
        'DIA-T2': 'DECORAÇÃO DIA - T2',
        'NOITE-T1': 'DECORAÇÃO NOITE - T1',
        'NOITE-T2': 'DECORAÇÃO NOITE - T2',
      };
      const key = turmaMap[qd.turma];
      if (key) map[key] = qd.reserva_faltas || 0;
    });
    return map;
  }, [quadroPlanejadoSopro, quadroDecoracaoData]);

  // Calcular sobra do quadro por setor
  const { data: funcionariosQuadro = [] } = useFuncionariosNoQuadro();
  
  const sobraPorSetor = useMemo(() => {
    const map: Record<string, number> = {};
    
    // Helper para calcular planejado SOPRO
    const calcPlanSopro = (dados: any): number => {
      const rrI = Math.round(dados.aux_maquina_industria / 6);
      const rrGP = Math.round(dados.aux_maquina_gp / 6);
      return dados.aux_maquina_industria + dados.reserva_ferias_industria + rrI +
        dados.reserva_faltas_industria + dados.amarra_pallets + dados.revisao_frasco +
        dados.mod_sindicalista + dados.controle_praga + dados.aux_maquina_gp +
        dados.reserva_faltas_gp + rrGP + dados.reserva_ferias_gp + dados.aumento_quadro;
    };
    const calcPlanDeco = (dados: any): number => {
      const rr = Math.ceil(dados.aux_maquina / 3);
      return dados.aux_maquina + rr + dados.reserva_faltas +
        dados.reserva_ferias + dados.apoio_topografia + dados.reserva_afastadas + dados.reserva_covid;
    };
    
    // SOPRO
    ['A', 'B', 'C'].forEach(turma => {
      const grupoEsperado = `SOPRO ${turma}`;
      const total = funcionariosQuadro.filter(f => f.setor?.grupo?.toUpperCase() === grupoEsperado).length;
      const planejado = quadroPlanejadoSopro.find(q => q.turma === turma);
      const necessario = planejado ? calcPlanSopro(planejado) : 0;
      map[grupoEsperado] = total - necessario;
    });
    
    // DECORAÇÃO
    const decoTurmas = ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'];
    const decoLabels: Record<string, string> = {
      'DIA-T1': 'DECORAÇÃO DIA - T1', 'DIA-T2': 'DECORAÇÃO DIA - T2',
      'NOITE-T1': 'DECORAÇÃO NOITE - T1', 'NOITE-T2': 'DECORAÇÃO NOITE - T2',
    };
    const funcsDeco = funcionariosQuadro.filter(f => {
      const n = f.setor?.nome?.toUpperCase() || '';
      return n.includes('DECORAÇÃO') || n.includes('DECORACAO');
    });
    decoTurmas.forEach(turmaKey => {
      const funcs = funcsDeco.filter(f => {
        const t = f.turma?.toUpperCase();
        const sn = f.setor?.nome?.toUpperCase() || '';
        const isDia = sn.includes('DIA');
        const isNoite = sn.includes('NOITE');
        if (t === 'T1' || t === '1') return (isDia && turmaKey === 'DIA-T1') || (isNoite && turmaKey === 'NOITE-T1');
        if (t === 'T2' || t === '2') return (isDia && turmaKey === 'DIA-T2') || (isNoite && turmaKey === 'NOITE-T2');
        return false;
      });
      const planejado = quadroDecoracaoData.find(q => q.turma === turmaKey);
      const necessario = planejado ? calcPlanDeco(planejado) : 0;
      map[decoLabels[turmaKey]] = funcs.length - necessario;
    });
    
    return map;
  }, [funcionariosQuadro, quadroPlanejadoSopro, quadroDecoracaoData]);

  const totaisPorDia = useMemo(() => {
    const funcionariosIds = new Set(funcionariosFiltrados.map(f => f.id));
    const result: Record<string, { faltas: number; atestados: number; dayoff: number }> = {};
    
    diasPeriodo.forEach(dia => {
      const dataStr = format(dia, 'yyyy-MM-dd');
      result[dataStr] = { faltas: 0, atestados: 0, dayoff: 0 };
    });
    
    registros.forEach(r => {
      if (funcionariosIds.has(r.funcionario_id)) {
        if (result[r.data]) {
          if (r.tipo === 'F' || r.tipo === 'SS') result[r.data].faltas++;
          if (r.tipo === 'A' || r.tipo === 'FE') result[r.data].atestados++;
          if (r.tipo === 'DA' || r.tipo === 'DF') result[r.data].dayoff++;
        }
      }
    });
    
    return result;
  }, [registros, funcionariosFiltrados, diasPeriodo]);

  // Calcular totais por setor por dia - com detalhamento por tipo e nomes
  const totaisPorSetorDia = useMemo(() => {
    // Criar mapa de funcionário ID → nome
    const funcNomeMap = new Map<string, string>();
    funcionariosAgrupados.forEach(({ funcionarios }) => {
      funcionarios.forEach(f => funcNomeMap.set(f.id, f.nome_completo));
    });

    const result: Record<string, Record<string, { 
      faltas: number; atestados: number; dayoff: number;
      porTipo: Record<string, { count: number; nomes: string[] }>;
    }>> = {};
    
    funcionariosAgrupados.forEach(({ setor, funcionarios }) => {
      result[setor] = {};
      const funcIds = new Set(funcionarios.map(f => f.id));
      
      diasPeriodo.forEach(dia => {
        const dataStr = format(dia, 'yyyy-MM-dd');
        result[setor][dataStr] = { faltas: 0, atestados: 0, dayoff: 0, porTipo: {} };
      });
      
      registros.forEach(r => {
        if (funcIds.has(r.funcionario_id) && result[setor][r.data]) {
          const tipoLabel = (r.tipo === 'F' && r.observacao === 'SUMIDO') ? 'SM' : r.tipo;
          if (r.tipo === 'F' || r.tipo === 'SS') result[setor][r.data].faltas++;
          if (r.tipo === 'A' || r.tipo === 'FE') result[setor][r.data].atestados++;
          if (r.tipo === 'DA' || r.tipo === 'DF') result[setor][r.data].dayoff++;
          
          if (!result[setor][r.data].porTipo[tipoLabel]) {
            result[setor][r.data].porTipo[tipoLabel] = { count: 0, nomes: [] };
          }
          result[setor][r.data].porTipo[tipoLabel].count++;
          result[setor][r.data].porTipo[tipoLabel].nomes.push(funcNomeMap.get(r.funcionario_id) || 'Desconhecido');
        }
      });
    });
    
    return result;
  }, [registros, funcionariosAgrupados, diasPeriodo]);

  // Verifica se funcionário estava ativo na data
  const funcionarioAtivoNaData = (func: Funcionario, data: Date): boolean => {
    // Se tem data de admissão, só aparece se foi admitido antes ou na data
    if (func.data_admissao) {
      const admissao = parseISO(func.data_admissao);
      if (isAfter(admissao, data)) return false;
    }
    
    // Se tem data de demissão, bloqueia a partir da data de demissão (inclusive)
    if (func.data_demissao) {
      const demissao = parseISO(func.data_demissao);
      if (isBefore(demissao, data) || format(demissao, 'yyyy-MM-dd') === format(data, 'yyyy-MM-dd')) return false;
    }
    
    return true;
  };

  // Verifica se pode editar falta de um funcionário específico
  const podeEditarFaltaFunc = (func: Funcionario): boolean => {
    return canEditFaltas(func.setor_id);
  };

  // Verifica se a data está dentro do prazo de edição (4 dias) ou foi liberada pelo admin
  const dentroDosPrazos = (data: Date, setorId?: string): boolean => {
    const hoje = startOfDay(new Date());
    const dataRef = startOfDay(data);
    const diasDiferenca = differenceInDays(hoje, dataRef);
    
    // Dentro do prazo normal
    if (diasDiferenca >= 0 && diasDiferenca < DIAS_EDICAO_DIRETA) return true;
    
    // Verificar se há liberação ativa para esta data e setor
    if (setorId) {
      const dataStr = format(data, 'yyyy-MM-dd');
      const agora = new Date().toISOString();
      const temLiberacao = liberacoes.some(lib =>
        lib.setor_id === setorId &&
        lib.data_liberada === dataStr &&
        lib.expira_em > agora
      );
      if (temLiberacao) return true;
    }
    
    return false;
  };

  // Helper: verifica se funcionário está desligado
  const isFuncionarioDesligado = (func: Funcionario): boolean => {
    const situacaoNome = (func.situacao?.nome || '').toUpperCase();
    return situacaoNome.includes('DEMISSÃO') || situacaoNome.includes('DEMISS') || situacaoNome.includes('PED. DEMISSÃO');
  };

  // Helper: retorna data efetiva de demissão (usa data atual se não tem data_demissao)
  const getDataDemissaoEfetiva = (func: Funcionario): string | null => {
    if (func.data_demissao) return func.data_demissao;
    if (isFuncionarioDesligado(func)) return format(new Date(), 'yyyy-MM-dd');
    return null;
  };

  const abrirModal = (func: Funcionario, data: Date) => {
    if (!podeEditarFaltaFunc(func)) return;
    
    const dataStr = format(data, 'yyyy-MM-dd');
    
    // Bloquear lançamento a partir da data de demissão (inclusive)
    const dataDemissao = getDataDemissaoEfetiva(func);
    if (dataDemissao && dataStr >= dataDemissao) {
      toast.error('Funcionário desligado. Não é possível lançar faltas a partir da data de demissão.');
      return;
    }
    
    const key = `${func.id}-${dataStr}`;
    const registro = registrosPorFuncData.get(key);
    
    setFuncionarioSelecionado(func);
    setDataSelecionada(data);
    
    const tipoInicial: PontoTipo | 'SUMIDO' = 
      (registro?.tipo === 'F' && registro?.observacao === 'SUMIDO') ? 'SUMIDO' 
      : (registro?.tipo || 'P');
    setTipoSelecionado(tipoInicial);
    setSumidoDesde('');
    setMotivoDivergencia('');
    
    // Verifica se está dentro do prazo ou se é admin
    if (isAdmin || dentroDosPrazos(data, func.setor_id)) {
      setModalOpen(true);
    } else {
      // Abre modal de divergência
      setModalDivergenciaOpen(true);
    }
  };

  const salvarRegistro = async () => {
    if (!funcionarioSelecionado || !dataSelecionada || !periodo) return;

    const dataStr = format(dataSelecionada, 'yyyy-MM-dd');
    const key = `${funcionarioSelecionado.id}-${dataStr}`;
    const registroExistente = registrosPorFuncData.get(key);
    const tipoAnterior = registroExistente?.tipo || 'P';
    const usuarioNome = usuarioAtual?.nome || 'SISTEMA';

    // SUMIDO salva como Falta com observação 'SUMIDO'
    const isSumidoSelecionado = tipoSelecionado === 'SUMIDO';
    const tipoEfetivo: PontoTipo = isSumidoSelecionado ? 'F' : tipoSelecionado as PontoTipo;
    const observacaoEfetiva = isSumidoSelecionado ? 'SUMIDO' : undefined;

    // Validar data de sumido antes de salvar
    if (isSumidoSelecionado && !sumidoDesde) {
      toast.error('Informe desde quando o funcionário está sumido!');
      return;
    }

    try {
      if (tipoSelecionado === 'P') {
        // Se marcou Presente, remove qualquer registro (P é o padrão)
        if (registroExistente) {
          await deleteRegistro.mutateAsync(registroExistente.id);
          
          await registrarHistorico.mutateAsync({
            registro_ponto_id: registroExistente.id,
            funcionario_id: funcionarioSelecionado.id,
            periodo_id: periodoEfetivo,
            data: dataStr,
            tipo_anterior: tipoAnterior,
            tipo_novo: 'P',
            operacao: 'DELETE',
            usuario_nome: usuarioNome,
          });
        }
      } else {
        if (registroExistente) {
          // Atualiza registro existente
          await updateRegistro.mutateAsync({ id: registroExistente.id, tipo: tipoEfetivo, observacao: observacaoEfetiva });
          
          await registrarHistorico.mutateAsync({
            registro_ponto_id: registroExistente.id,
            funcionario_id: funcionarioSelecionado.id,
            periodo_id: periodoEfetivo,
            data: dataStr,
            tipo_anterior: tipoAnterior,
            tipo_novo: isSumidoSelecionado ? 'SUMIDO' : tipoEfetivo,
            operacao: 'UPDATE',
            usuario_nome: usuarioNome,
          });
        } else {
          // Cria novo registro
          const novoRegistro = await createRegistro.mutateAsync({
            funcionario_id: funcionarioSelecionado.id,
            data: dataStr,
            periodo_id: periodoEfetivo,
            tipo: tipoEfetivo,
            observacao: observacaoEfetiva,
          });
          
          await registrarHistorico.mutateAsync({
            registro_ponto_id: novoRegistro?.id || 'new',
            funcionario_id: funcionarioSelecionado.id,
            periodo_id: periodoEfetivo,
            data: dataStr,
            tipo_anterior: null,
            tipo_novo: isSumidoSelecionado ? 'SUMIDO' : tipoEfetivo,
            operacao: 'INSERT',
            usuario_nome: usuarioNome,
          });
        }
      }

      // Verificar alerta de faltas consecutivas SUMIDO (7 Sopro, 5 Decoração)
      if (isSumidoSelecionado) {
        // Salvar sumido_desde no cadastro do funcionário
        await supabase
          .from('funcionarios')
          .update({ sumido_desde: sumidoDesde })
          .eq('id', funcionarioSelecionado.id);
        
        await verificarENotificarSumido(funcionarioSelecionado.id, funcionarioSelecionado.nome_completo, dataStr, funcionarioSelecionado);
      }

      toast.success('REGISTRO SALVO COM SUCESSO!');
      setModalOpen(false);
    } catch (error) {
      toast.error('ERRO AO SALVAR REGISTRO');
    }
  };

  // Verifica se funcionário tem 5+ faltas consecutivas (sem contar folgas/dias que não trabalha) e notifica admins
  const verificarENotificarSumido = async (funcId: string, funcNome: string, dataAtual: string, func: Funcionario) => {
    try {
      // Determinar threshold baseado no setor: 7 para Sopro, 5 para Decoração
      const setorNome = (func.setor?.nome || '').toUpperCase();
      const isSopro = setorNome.includes('SOPRO');
      const isDecoracao = setorNome.includes('DECORAÇÃO') || setorNome.includes('DECORACAO');
      const threshold = isSopro ? 7 : isDecoracao ? 5 : 5; // default 5

      // Buscar TODOS os registros do funcionário no período para contar apenas dias trabalhados
      const { data: todosRegistros } = await supabase
        .from('registros_ponto')
        .select('data, tipo, observacao')
        .eq('funcionario_id', funcId)
        .order('data', { ascending: false });

      if (!todosRegistros || todosRegistros.length === 0) return;

      // Separar registros SUMIDO e todos os registros por data
      const registrosPorData = new Map<string, { tipo: string; observacao: string | null }>();
      todosRegistros.forEach(r => registrosPorData.set(r.data, { tipo: r.tipo, observacao: r.observacao }));

      // Contar faltas consecutivas (SUMIDO) ignorando dias sem registro (folga/não trabalha)
      let faltasConsecutivas = 0;
      let dataCheck = new Date(dataAtual);
      
      for (let i = 0; i < 60; i++) { // Verificar até 60 dias para trás
        const dataStr = format(dataCheck, 'yyyy-MM-dd');
        const registro = registrosPorData.get(dataStr);
        
        if (registro) {
          // Tem registro neste dia
          if (registro.observacao === 'SUMIDO' || (registro.tipo === 'F' && registro.observacao === 'SUMIDO')) {
            faltasConsecutivas++;
          } else {
            // Dia trabalhado com outro tipo (P, A, FE, DA, DF, F normal) — quebra a sequência
            break;
          }
        }
        // Se não tem registro = dia de folga/não trabalha — ignora e continua contando
        
        dataCheck.setDate(dataCheck.getDate() - 1);
      }

      // Se atingiu threshold — sincronizar cadastro + divergência + notificação
      if (faltasConsecutivas >= threshold) {
        // 1. Atualizar situação do funcionário para SUMIDO no cadastro
        const SUMIDO_SITUACAO_ID = 'e7fcde8e-b701-43c5-a738-efae70ba53fd';
        
        // Verificar se já está como SUMIDO no cadastro
        const { data: funcAtual } = await supabase
          .from('funcionarios')
          .select('situacao_id, sumido_desde')
          .eq('id', funcId)
          .single();

        if (funcAtual && funcAtual.situacao_id !== SUMIDO_SITUACAO_ID) {
          // Calcular a data mais antiga de SUMIDO consecutivo
          let dataMaisAntiga = dataAtual;
          let checkDate = new Date(dataAtual);
          for (let j = 0; j < 60; j++) {
            const ds = format(checkDate, 'yyyy-MM-dd');
            const reg = registrosPorData.get(ds);
            if (reg && reg.observacao === 'SUMIDO') {
              dataMaisAntiga = ds;
            } else if (reg) {
              break;
            }
            checkDate.setDate(checkDate.getDate() - 1);
          }

          await supabase
            .from('funcionarios')
            .update({ 
              situacao_id: SUMIDO_SITUACAO_ID,
              sumido_desde: dataMaisAntiga,
            })
            .eq('id', funcId);
        }

        // 2. Criar divergência automática (se não existir pendente)
        const { data: divExistente } = await supabase
          .from('divergencias_quadro')
          .select('id')
          .eq('funcionario_id', funcId)
          .eq('tipo_divergencia', 'SUMIDO')
          .eq('resolvido', false)
          .maybeSingle();

        if (!divExistente) {
          await supabase
            .from('divergencias_quadro')
            .insert({
              funcionario_id: funcId,
              tipo_divergencia: 'SUMIDO',
              criado_por: `SISTEMA (${threshold} FALTAS)`,
              observacoes: `SUMIDO DETECTADO AUTOMATICAMENTE — ${faltasConsecutivas} faltas consecutivas (dias de folga não contam). Threshold: ${threshold} dias (${isSopro ? 'Sopro' : 'Decoração'}).`,
              resolvido: false,
            });
        }

        // 3. Criar evento na Central de Notificações (não enviar direto)
        const ontem = new Date();
        ontem.setDate(ontem.getDate() - 1);
        const { data: eventoRecente } = await supabase
          .from('eventos_sistema')
          .select('id')
          .eq('tipo', 'divergencia_nova')
          .eq('funcionario_nome', funcNome.toUpperCase())
          .gte('created_at', ontem.toISOString())
          .limit(1);

        if (!eventoRecente || eventoRecente.length === 0) {
          await supabase.from('eventos_sistema').insert({
            tipo: 'divergencia_nova',
            descricao: `🚨 FUNCIONÁRIO SUMIDO — AUTOMÁTICO`,
            funcionario_nome: funcNome.toUpperCase(),
            setor_nome: null,
            turma: null,
            criado_por: `SISTEMA (${threshold} FALTAS)`,
            dados_extra: {
              mensagem_personalizada: `${funcNome.toUpperCase()} atingiu ${faltasConsecutivas} faltas consecutivas como SUMIDO. Situação atualizada automaticamente.`,
            },
            notificado: false,
          });
        }

        toast.warning(`⚠️ ${funcNome} — ${faltasConsecutivas} faltas SUMIDO! Cadastro atualizado + Divergência criada.`);
      }
    } catch (e) {
      // Silencioso — não bloqueia o salvamento
    }
  };

  const criarDivergenciaPonto = async () => {
    if (!funcionarioSelecionado || !dataSelecionada || !periodo) return;

    const dataStr = format(dataSelecionada, 'yyyy-MM-dd');
    const key = `${funcionarioSelecionado.id}-${dataStr}`;
    const registroExistente = registrosPorFuncData.get(key);
    const tipoAtual = registroExistente?.tipo || 'P';
    const usuarioNome = usuarioAtual?.nome || 'SISTEMA';

    try {
      await criarDivergencia.mutateAsync({
        funcionario_id: funcionarioSelecionado.id,
        periodo_id: periodoEfetivo,
        data: dataStr,
        tipo_atual: tipoAtual,
        tipo_solicitado: tipoSelecionado,
        motivo: motivoDivergencia || undefined,
        criado_por: usuarioNome,
      });

      setModalDivergenciaOpen(false);
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const getTipoCelula = (funcId: string, dataStr: string): PontoTipo | 'SUMIDO' => {
    const key = `${funcId}-${dataStr}`;
    const registro = registrosPorFuncData.get(key);
    if (registro?.tipo === 'F' && registro?.observacao === 'SUMIDO') return 'SUMIDO';
    return registro?.tipo || 'P';
  };

  const isLoading = loadingPeriodos || loadingFuncionarios || loadingRegistros;
  const periodoFechado = periodo?.status === 'fechado';

  // Formatar período para exibição
  const formatarPeriodo = (dataInicio: string, dataFim: string) => {
    const inicio = parseISO(dataInicio);
    const fim = parseISO(dataFim);
    return `${format(inicio, 'dd/MM', { locale: ptBR })} - ${format(fim, 'dd/MM', { locale: ptBR })}`;
  };

  // Calcular resumo por setor para o dashboard
  const resumoPorSetor = useMemo(() => {
    return funcionariosAgrupados.map(({ setor, funcionarios }) => {
      const funcIds = new Set(funcionarios.map(f => f.id));
      let totalFaltas = 0;
      let totalAtestados = 0;
      
      registros.forEach(r => {
        if (funcIds.has(r.funcionario_id)) {
          if (r.tipo === 'F' || r.tipo === 'SS') totalFaltas++;
          if (r.tipo === 'A' || r.tipo === 'FE') totalAtestados++;
        }
      });
      
      // Calcular presentes do dia atual
      const hoje = format(new Date(), 'yyyy-MM-dd');
      let presentesHoje = funcionarios.length;
      registros.forEach(r => {
        if (funcIds.has(r.funcionario_id) && r.data === hoje && (r.tipo === 'F' || r.tipo === 'A' || r.tipo === 'FE' || r.tipo === 'DA' || r.tipo === 'DF')) {
          presentesHoje--;
        }
      });
      
      return {
        setor,
        total: funcionarios.length,
        presentes: presentesHoje,
        faltas: totalFaltas,
        atestados: totalAtestados,
      };
    });
  }, [funcionariosAgrupados, registros]);

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="page-title">CONTROLE DE FALTAS</h1>
          {periodo && (
            <div className="flex items-center gap-2 bg-accent border border-accent-foreground/20 rounded-lg px-4 py-2">
              <Calendar className="h-4 w-4 text-accent-foreground" />
              <span className="font-bold text-accent-foreground text-sm">
                {formatarPeriodo(periodo.data_inicio, periodo.data_fim).toUpperCase()}
              </span>
            </div>
          )}
          <div className="w-52">
            <Select value={periodoEfetivo} onValueChange={setPeriodoSelecionado}>
              <SelectTrigger className="h-9 text-sm font-medium">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>ALTERAR PERÍODO</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {periodos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatarPeriodo(p.data_inicio, p.data_fim).toUpperCase()}
                    {p.status === 'fechado' && ' (FECHADO)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <ZerarFaltasDialog periodos={periodos} setores={setores} />
              <Button 
                variant="outline"
                size="sm"
                onClick={() => createPeriodo.mutateAsync()} 
                disabled={createPeriodo.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                CRIAR PRÓXIMO MÊS
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Ações de período (admin) */}
      <div className="flex flex-wrap items-center gap-3">
          {periodo && isAdmin && (
            <>
              <Button
                variant={periodo.status === 'aberto' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => updateStatus.mutateAsync({
                  id: periodo.id,
                  status: periodo.status === 'aberto' ? 'fechado' : 'aberto'
                })}
                disabled={updateStatus.isPending}
              >
                {periodo.status === 'aberto' ? (
                  <><Lock className="mr-1 h-3 w-3" /> FECHAR PERÍODO</>
                ) : (
                  <><Unlock className="mr-1 h-3 w-3" /> REABRIR PERÍODO</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLiberarDatasOpen(true)}
              >
                <KeyRound className="mr-1 h-3 w-3" />
                LIBERAR DATAS
                {liberacoes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{liberacoes.length}</Badge>
                )}
              </Button>
            </>
          )}
      </div>
      {/* Métricas resumo */}
      {periodo && funcionariosAgrupadosFiltrados.length > 0 && (
        <DashboardFaltasDiario
          funcionariosAgrupados={funcionariosAgrupadosFiltrados}
          registros={registros}
          diasPeriodo={diasPeriodo}
          periodo={periodo}
          reservaFaltasPorSetor={reservaFaltasPorSetor}
          sobraPorSetor={sobraPorSetor}
        />
      )}


      {/* Lançamentos - Controle de Faltas - logados (RH sem canEditFaltas visualiza sem editar) */}
      {isRHMode && (
        <div className="space-y-4">
          {/* Badge REAL PARCERIA - modo somente visualização */}
          {isRealParceria && (
            <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-lg px-4 py-2 text-sm font-medium text-warning-foreground">
              <Eye className="h-4 w-4 text-warning shrink-0" />
              <span>Visualização somente — exibindo apenas funcionários <strong>TEMP</strong></span>
            </div>
          )}
          {/* Filtros - Sticky no topo */}
          <div className="sticky top-0 z-40 bg-background pb-3 -mx-3 px-3 pt-1 border-b">
            <div className="flex flex-wrap items-center gap-3">
              {/* Filtro de Grupo - admin ou REAL PARCERIA */}
              {(isAdmin || isRealParceria) && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex gap-1">
                    <Button
                      variant={grupoFiltro === 'TOTAL' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setGrupoFiltro('TOTAL');
                        setTurmasSopro(new Set());
                        setSubTurmasSopro(new Set());
                        setTurnosDecoracao(new Set());
                        setTurmasDecoracao(new Set());
                      }}
                      className="h-9 px-4 text-xs gap-1.5"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      TODOS
                    </Button>
                    <Button
                      variant={grupoFiltro === 'SOPRO' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setGrupoFiltro('SOPRO');
                        setTurnosDecoracao(new Set());
                        setTurmasDecoracao(new Set());
                      }}
                      className="h-9 px-4 text-xs gap-1.5"
                    >
                      <Wind className="h-3.5 w-3.5" />
                      SOPRO
                    </Button>
                    <Button
                      variant={grupoFiltro === 'DECORAÇÃO' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setGrupoFiltro('DECORAÇÃO');
                        setTurmasSopro(new Set());
                        setSubTurmasSopro(new Set());
                      }}
                      className="h-9 px-4 text-xs gap-1.5"
                    >
                      <Palette className="h-3.5 w-3.5" />
                      DECORAÇÃO
                    </Button>
                  </div>
                </div>
              )}

              {/* Se é gestor, mostrar badge do grupo */}
              {!isAdmin && grupoDoGestor && (
                <Badge variant="outline" className="h-9 px-4 text-xs gap-1.5">
                  {grupoDoGestor === 'SOPRO' ? <Wind className="h-3.5 w-3.5" /> : <Palette className="h-3.5 w-3.5" />}
                  {grupoDoGestor}
                </Badge>
              )}

              {/* Sub-filtros SOPRO: A/B/C + 1A/2A/1B/2B */}
              {((isAdmin && grupoFiltro === 'SOPRO') || (!isAdmin && grupoDoGestor === 'SOPRO') || (isRealParceria && grupoFiltro === 'SOPRO')) && (
                <>
                  <div className="flex items-center gap-1.5 border-l pl-3">
                    {(['A', 'B', 'C'] as const).map((turma) => (
                      <Button
                        key={turma}
                        variant={turmasSopro.has(turma) ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => toggleSet(setTurmasSopro, turma)}
                        className={cn(
                          "h-8 px-3 text-xs font-bold",
                          turmasSopro.has(turma) && "bg-primary/15 text-primary border border-primary/30"
                        )}
                      >
                        {turma}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 border-l pl-3">
                    {(['1A', '2A', '1B', '2B'] as const).map((st) => (
                      <Button
                        key={st}
                        variant={subTurmasSopro.has(st) ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => toggleSet(setSubTurmasSopro, st)}
                        className={cn(
                          "h-8 px-3 text-xs font-bold",
                          subTurmasSopro.has(st) && "bg-primary/15 text-primary border border-primary/30"
                        )}
                      >
                        {st}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {/* Sub-filtros DECORAÇÃO: DIA, NOITE | T1, T2 */}
              {((isAdmin && grupoFiltro === 'DECORAÇÃO') || (!isAdmin && grupoDoGestor === 'DECORAÇÃO') || (isRealParceria && grupoFiltro === 'DECORAÇÃO')) && (
                <>
                  <div className="flex items-center gap-1.5 border-l pl-3">
                    {(['DIA', 'NOITE'] as const).map((turno) => (
                      <Button
                        key={turno}
                        variant={turnosDecoracao.has(turno) ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => toggleSet(setTurnosDecoracao, turno)}
                        className={cn(
                          "h-8 px-3 text-xs font-bold",
                          turnosDecoracao.has(turno) && "bg-primary/15 text-primary border border-primary/30"
                        )}
                      >
                        {turno}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 border-l pl-3">
                    {(['T1', 'T2'] as const).map((turma) => (
                      <Button
                        key={turma}
                        variant={turmasDecoracao.has(turma) ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => toggleSet(setTurmasDecoracao, turma)}
                        className={cn(
                          "h-8 px-3 text-xs font-bold",
                          turmasDecoracao.has(turma) && "bg-primary/15 text-primary border border-primary/30"
                        )}
                      >
                        {turma}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {/* Botões de sub-período (blocos de datas) */}
              {blocosDias.length > 1 && (
                <div className="flex items-center gap-1.5 border-l pl-3">
                  {blocosDias.map((bloco) => (
                    <Button
                      key={bloco.id}
                      variant={blocosVisiveis.has(bloco.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleBloco(bloco.id)}
                      className={cn(
                        "h-8 px-3 text-xs font-bold gap-1.5",
                        blocosVisiveis.has(bloco.id) && "bg-primary text-primary-foreground"
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      {bloco.label}
                    </Button>
                  ))}
                  <Button
                    variant={blocosVisiveis.size === blocosDias.length ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      if (blocosVisiveis.size === blocosDias.length) {
                        setBlocosVisiveis(new Set([blocosDias[0].id]));
                      } else {
                        setBlocosVisiveis(new Set(blocosDias.map(b => b.id)));
                      }
                    }}
                    className={cn(
                      "h-8 px-3 text-xs font-bold",
                      blocosVisiveis.size === blocosDias.length && "bg-primary/15 text-primary border border-primary/30"
                    )}
                  >
                    TODOS
                  </Button>
                </div>
              )}

              {/* Separador visual */}
              <div className="flex-1" />

              {/* Contador */}
              <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                {funcionariosFiltrados.length} funcionários
              </span>

              {/* Legenda em popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                    <Info className="h-3.5 w-3.5" />
                    LEGENDAS
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Legendas</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-success/20 flex items-center justify-center text-success font-bold text-xs">P</div>
                        <span className="text-sm">PRESENTE</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-destructive flex items-center justify-center text-destructive-foreground font-bold text-xs">F</div>
                        <span className="text-sm">FALTA</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-warning flex items-center justify-center text-warning-foreground font-bold text-xs">A</div>
                        <span className="text-sm">ATESTADO</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-[9px]">FE</div>
                        <span className="text-sm">FÉRIAS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-orange-500 flex items-center justify-center text-white font-bold text-[10px]">SS</div>
                        <span className="text-sm">SUSPENSÃO</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-destructive/70 flex items-center justify-center text-destructive-foreground font-bold text-xs">SM</div>
                        <span className="text-sm">SUMIDO (registra como Falta)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-[9px]">DA</div>
                        <span className="text-sm">DAY OFF</span>
                      </div>
                      <div className="text-xs text-warning font-medium mt-1">⚠️ Admins são alertados após 7 dias (Sopro) ou 5 dias (Decoração) consecutivos SUMIDO.</div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-muted/30 border border-muted-foreground/20" />
                        <span className="text-sm">FOLGA (escala Decoração / Sopro) — célula em branco</span>
                      </div>
                    </div>
                    <div className="border-t pt-2 text-xs text-muted-foreground">
                      * Edição direta até {DIAS_EDICAO_DIRETA} dias. Após, cria divergência para RH.
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

      {/* Tabela de Faltas */}
      {!periodoEfetivo ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">NENHUM PERÍODO DISPONÍVEL</p>
          <p>Crie um período para começar a registrar faltas</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : funcionariosFiltrados.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">NENHUM FUNCIONÁRIO</p>
          <p>Não há funcionários ativos ou de férias neste período{!isAdmin && ' para os setores que você tem acesso'}</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-auto max-h-[65vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20">
                <tr className="border-b bg-muted">
                  <th className="sticky left-0 z-30 bg-muted text-left font-semibold py-2 px-3 min-w-[220px] sm:min-w-[280px]">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar nome ou matrícula..."
                        value={filtroNome}
                        onChange={(e) => setFiltroNome(e.target.value)}
                        className="h-8 pl-7 pr-7 text-xs bg-background"
                      />
                      {filtroNome && (
                        <button
                          onClick={() => setFiltroNome('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </th>
                  {diasVisiveis.map((dia) => (
                    <th
                      key={dia.toISOString()}
                      className={cn(
                        'text-center font-medium py-2 px-1 min-w-[36px] sm:min-w-[40px] bg-muted',
                        isWeekend(dia) && 'bg-muted/80'
                      )}
                    >
                      <div className="text-[9px] sm:text-[10px] text-muted-foreground uppercase">
                        {format(dia, 'EEE', { locale: ptBR }).slice(0, 3)}
                      </div>
                      <div className="text-[10px] sm:text-xs">
                        {format(dia, 'dd/MM')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {funcionariosAgrupados.map(({ setor, funcionarios: funcsSetor }) => (
                  <>
                    {/* Cabeçalho do Setor */}
                    <tr key={`header-${setor}`} className="bg-primary/10 border-y border-primary/30">
                      <td 
                        className="sticky left-0 z-10 bg-primary/10 font-bold py-1.5 px-3 text-primary text-xs"
                        colSpan={1}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          <span className="whitespace-nowrap">{setor}</span>
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {funcsSetor.length}
                          </Badge>
                        </div>
                      </td>
                      {diasVisiveis.map((dia) => {
                        const dataStr = format(dia, 'yyyy-MM-dd');
                        const totaisSetor = totaisPorSetorDia[setor]?.[dataStr] || { faltas: 0, atestados: 0, porTipo: {} };
                        const weekend = isWeekend(dia);
                        const tipos = totaisSetor.porTipo || {};
                        const temAlgo = Object.keys(tipos).length > 0;
                        
                        const tipoOrdem: { key: string; label: string; cor: string }[] = [
                          { key: 'F', label: 'F', cor: 'text-destructive' },
                          { key: 'SM', label: 'SM', cor: 'text-destructive/70' },
                          { key: 'A', label: 'A', cor: 'text-warning' },
                          { key: 'SS', label: 'SS', cor: 'text-orange-500' },
                          { key: 'FE', label: 'FE', cor: 'text-primary' },
                          { key: 'DA', label: 'DA', cor: 'text-blue-500' },
                          { key: 'DF', label: 'DF', cor: 'text-blue-500' },
                        ];
                        
                        return (
                          <td
                            key={dataStr}
                            className={cn(
                              'text-center py-1 px-1',
                              weekend && 'bg-primary/5'
                            )}
                          >
                            {temAlgo && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="text-[10px] leading-tight cursor-pointer hover:underline">
                                    {tipoOrdem.map(({ key, label, cor }) => {
                                      const info = tipos[key];
                                      if (!info || info.count === 0) return null;
                                      return (
                                        <span key={key} className={cn(cor, 'font-bold mr-0.5')}>
                                          {info.count}{label}
                                        </span>
                                      );
                                    })}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3" align="center" side="bottom">
                                  <div className="space-y-2">
                                    <h4 className="font-bold text-xs text-foreground">{setor} — {format(dia, 'dd/MM (EEE)', { locale: ptBR })}</h4>
                                    {tipoOrdem.map(({ key, label, cor }) => {
                                      const info = tipos[key];
                                      if (!info || info.count === 0) return null;
                                      return (
                                        <div key={key} className="space-y-0.5">
                                          <div className={cn("text-xs font-bold", cor)}>
                                            {label === 'F' ? 'FALTA' : label === 'SM' ? 'SUMIDO' : label === 'A' ? 'ATESTADO' : label === 'SS' ? 'SUSPENSÃO' : label === 'FE' ? 'FÉRIAS' : label === 'DA' ? 'DAY OFF' : label} ({info.count})
                                          </div>
                                          <ul className="text-[11px] text-muted-foreground pl-2">
                                            {info.nomes.sort().map((nome, i) => (
                                              <li key={i} className="truncate">• {nome.toUpperCase()}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    
                    {/* Funcionários do Setor */}
                    {funcsSetor.map((func) => {
                      const podeEditar = podeEditarFaltaFunc(func as Funcionario);
                      const isSumido = (func as Funcionario).situacao?.nome?.toUpperCase().includes('SUMIDO');
                      return (
                        <tr key={func.id} className={cn(
                          "border-b hover:bg-muted/30",
                          isSumido && "bg-warning/5",
                        )}>
          <td className={cn(
            "sticky left-0 z-10 font-medium py-1.5 px-2 pl-4 border-r text-xs whitespace-nowrap",
            (() => {
              const turma = (func.turma || '').toUpperCase().trim();
              if (turma === '1A') return 'bg-blue-50 dark:bg-blue-950/30';
              if (turma === '2A') return 'bg-cyan-50 dark:bg-cyan-950/30';
              if (turma === '1B') return 'bg-emerald-50 dark:bg-emerald-950/30';
              if (turma === '2B') return 'bg-teal-50 dark:bg-teal-950/30';
              if (turma === 'T1' || turma === '1') return 'bg-violet-50 dark:bg-violet-950/30';
              if (turma === 'T2' || turma === '2') return 'bg-fuchsia-50 dark:bg-fuchsia-950/30';
              return 'bg-card';
            })()
          )}>
                            <div className="flex items-center gap-1">
                              {isRealParceria ? (
                                <div className="flex flex-col leading-tight">
                                  {func.matricula && (
                                    <span className="text-[10px] font-bold text-primary">{func.matricula}</span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">{func.nome_completo.toUpperCase()}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col leading-tight">
                                  {func.matricula && (
                                    <span className="text-[10px] text-muted-foreground font-normal">{func.matricula}</span>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <span>{func.nome_completo.toUpperCase()}</span>
                                    {func.turma && (
                                      <span className={cn(
                                        "text-[9px] font-bold px-1 py-0 rounded leading-tight",
                                        (() => {
                                          const t = (func.turma || '').toUpperCase().trim();
                                          if (t === '1A') return 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200';
                                          if (t === '2A') return 'bg-cyan-200 text-cyan-800 dark:bg-cyan-800 dark:text-cyan-200';
                                          if (t === '1B') return 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200';
                                          if (t === '2B') return 'bg-teal-200 text-teal-800 dark:bg-teal-800 dark:text-teal-200';
                                          if (t === 'T1' || t === '1') return 'bg-violet-200 text-violet-800 dark:bg-violet-800 dark:text-violet-200';
                                          if (t === 'T2' || t === '2') return 'bg-fuchsia-200 text-fuchsia-800 dark:bg-fuchsia-800 dark:text-fuchsia-200';
                                          return 'bg-muted text-muted-foreground';
                                        })()
                                      )}>
                                        {func.turma.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {isSumido && (
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-[9px] px-0.5 py-0 shrink-0">
                                  S
                                </Badge>
                              )}
                            </div>
                          </td>
                          {diasVisiveis.map((dia) => {
                            const dataStr = format(dia, 'yyyy-MM-dd');
                            const tipo = getTipoCelula(func.id, dataStr);
                            const weekend = isWeekend(dia);
                            const ativo = funcionarioAtivoNaData(func as Funcionario, dia);
                            const bloqueado = !podeEditar;
                            const foraDoPrazo = !isAdmin && !dentroDosPrazos(dia, func.setor_id);
                            
                            // Verificar escala Panama para funcionários de Decoração
                            const isFolgaDecoracao = isFolgaEscalaDecoracao(
                              (func as Funcionario).setor?.nome,
                              (func as Funcionario).turma,
                              dia
                            );
                            // Verificar escala SOPRO para funcionários de Sopro
                            const isFolgaSopro = isFolgaEscalaSopro(
                              (func as Funcionario).setor?.nome,
                              (func as Funcionario).turma,
                              dia
                            );
                            const isFolga = isFolgaDecoracao === true || isFolgaSopro === true;
                            // Bloquear lançamento em dia de folga (mas só se não há registro já salvo)
                            const bloqueadoPorFolga = isFolga && tipo === 'P';

                            if (!ativo) {
                              return (
                                <td
                                  key={dataStr}
                                  className={cn(
                                    'text-center py-2 px-1',
                                    weekend && 'bg-muted/50',
                                    'bg-muted/30'
                                  )}
                                >
                                  <div className="h-6 w-6 mx-auto rounded flex items-center justify-center text-muted-foreground text-xs">
                                    -
                                  </div>
                                </td>
                              );
                            }

                            // Célula de folga da escala (sem registro salvo) — deixar em branco
                            if (bloqueadoPorFolga) {
                              return (
                                <td
                                  key={dataStr}
                                  className={cn(
                                    'text-center py-2 px-1',
                                    weekend && 'bg-muted/50'
                                  )}
                                  title={`Folga — escala ${(func as Funcionario).turma?.toUpperCase() || '?'}`}
                                >
                                  <span className="text-base select-none cursor-default" title={`Folga — escala ${(func as Funcionario).turma?.toUpperCase() || '?'}`}>🛏️</span>
                                </td>
                              );
                            }

                            return (
                              <td
                                key={dataStr}
                                className={cn(
                                  'text-center py-2 px-1',
                                  weekend && 'bg-muted/50'
                                )}
                              >
                                <button
                                  onClick={() => !bloqueado && abrirModal(func as Funcionario, dia)}
                                  disabled={bloqueado}
                                    className={cn(
                                    'h-5 w-5 sm:h-6 sm:w-6 mx-auto rounded flex items-center justify-center font-bold text-[10px] sm:text-xs transition-colors',
                                    tipo === 'P' && 'bg-success/20 text-success hover:bg-success/30',
                                    tipo === 'F' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                                    tipo === 'A' && 'bg-warning text-warning-foreground hover:bg-warning/90',
                                    tipo === 'FE' && 'bg-primary text-primary-foreground hover:bg-primary/90',
                                    (tipo === 'DA' || tipo === 'DF') && 'bg-blue-500 text-white hover:bg-blue-600',
                                    tipo === 'FE' && 'bg-purple-500 text-white hover:bg-purple-600',
                                    tipo === 'SS' && 'bg-orange-500 text-white hover:bg-orange-600',
                                    tipo === 'SUMIDO' && 'bg-destructive/70 text-destructive-foreground hover:bg-destructive/60',
                                    bloqueado && 'cursor-not-allowed opacity-60',
                                    foraDoPrazo && !bloqueado && 'ring-1 ring-warning/50'
                                  )}
                                  title={tipo === 'SUMIDO' ? 'SUMIDO' : foraDoPrazo ? 'Fora do prazo - abrirá divergência' : undefined}
                                >
                                  {tipo === 'SUMIDO' ? 'S' : tipo === 'DF' ? 'DA' : tipo}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </>
                ))}
                
                {/* Linha de totais gerais */}
                <tr className="border-t-2 border-primary bg-muted/50">
                  <td className="sticky left-0 z-10 bg-muted/50 font-bold py-2 px-4 border-r">
                    <div>TOTAL GERAL</div>
                    <div className="text-xs text-muted-foreground font-normal">F+SS / A+FE / DA</div>
                  </td>
                  {diasVisiveis.map((dia) => {
                    const dataStr = format(dia, 'yyyy-MM-dd');
                    const totais = totaisPorDia[dataStr] || { faltas: 0, atestados: 0, dayoff: 0 };
                    const weekend = isWeekend(dia);
                    
                    return (
                      <td
                        key={dataStr}
                        className={cn(
                          'text-center py-2 px-1',
                          weekend && 'bg-muted/50'
                        )}
                      >
                        <div className={cn(
                          "font-bold text-sm",
                          totais.faltas > 0 && "text-destructive"
                        )}>
                          {totais.faltas}
                        </div>
                        <div className={cn(
                          "text-xs",
                          totais.atestados > 0 && "text-warning"
                        )}>
                          {totais.atestados}
                        </div>
                        {totais.dayoff > 0 && (
                          <div className="text-xs text-blue-500 font-medium">
                            {totais.dayoff}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Registro Normal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>REGISTRAR PRESENÇA/FALTA</DialogTitle>
            <DialogDescription>Selecione o tipo de registro para o funcionário.</DialogDescription>
          </DialogHeader>
          {funcionarioSelecionado && dataSelecionada && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{funcionarioSelecionado.nome_completo.toUpperCase()}</div>
                <div className="text-sm text-muted-foreground">
                  {format(dataSelecionada, "EEEE, dd 'de' MMMM", { locale: ptBR }).toUpperCase()}
                </div>
              </div>

              <RadioGroup value={tipoSelecionado} onValueChange={(v) => setTipoSelecionado(v as PontoTipo | 'SUMIDO')}>
                {/* Presença sempre disponível no modal - bloqueio de demissão é feito antes de abrir */}
                <div className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="P" id="presente" />
                  <Label htmlFor="presente" className="flex-1 cursor-pointer font-medium">PRESENTE</Label>
                  <div className="h-7 w-7 rounded bg-success/20 flex items-center justify-center text-success font-bold text-xs">P</div>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="F" id="falta" />
                  <Label htmlFor="falta" className="flex-1 cursor-pointer font-medium">FALTOU</Label>
                  <div className="h-7 w-7 rounded bg-destructive flex items-center justify-center text-destructive-foreground font-bold text-xs">F</div>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="A" id="atestado" />
                  <Label htmlFor="atestado" className="flex-1 cursor-pointer font-medium">ATESTADO</Label>
                  <div className="h-7 w-7 rounded bg-warning flex items-center justify-center text-warning-foreground font-bold text-xs">A</div>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="FE" id="ferias" />
                  <Label htmlFor="ferias" className="flex-1 cursor-pointer font-medium">1 DIA FÉRIAS</Label>
                  <div className="h-7 w-7 rounded bg-purple-500 flex items-center justify-center text-white font-bold text-[10px]">FE</div>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="DA" id="dayoff" />
                  <Label htmlFor="dayoff" className="flex-1 cursor-pointer font-medium">DAY OFF</Label>
                  <div className="h-7 w-7 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">DA</div>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="SS" id="suspensao" />
                  <Label htmlFor="suspensao" className="flex-1 cursor-pointer font-medium">SUSPENSÃO</Label>
                  <div className="h-7 w-7 rounded bg-orange-500 flex items-center justify-center text-white font-bold text-[10px]">SS</div>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 cursor-pointer">
                  <RadioGroupItem value="SUMIDO" id="sumido" />
                  <Label htmlFor="sumido" className="flex-1 cursor-pointer font-medium text-destructive">SUMIDO</Label>
                  <div className="h-7 w-7 rounded bg-destructive/70 flex items-center justify-center text-destructive-foreground font-bold text-xs">S</div>
                </div>

                {tipoSelecionado === 'SUMIDO' && (
                  <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 space-y-2">
                    <Label className="text-sm font-medium text-destructive">DESDE QUANDO ESTÁ SUMIDO? *</Label>
                    <Input
                      type="date"
                      value={sumidoDesde}
                      onChange={(e) => setSumidoDesde(e.target.value)}
                      className="w-full"
                      max={format(new Date(), 'yyyy-MM-dd')}
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe a data a partir da qual o funcionário está sumido. 
                      Sopro: 7 dias trabalhados. Decoração: 5 dias trabalhados.
                    </p>
                  </div>
                )}
              </RadioGroup>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  CANCELAR
                </Button>
                <Button
                  onClick={salvarRegistro}
                  disabled={createRegistro.isPending || updateRegistro.isPending || deleteRegistro.isPending}
                >
                  SALVAR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Divergência (quando fora do prazo) */}
      <Dialog open={modalDivergenciaOpen} onOpenChange={setModalDivergenciaOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-warning">SOLICITAR ALTERAÇÃO DE PONTO</DialogTitle>
            <DialogDescription>
              A data selecionada está fora do prazo de edição ({DIAS_EDICAO_DIRETA} dias). 
              Será criada uma divergência para o RH aprovar.
            </DialogDescription>
          </DialogHeader>
          {funcionarioSelecionado && dataSelecionada && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">{funcionarioSelecionado.nome_completo.toUpperCase()}</div>
                <div className="text-sm text-muted-foreground">
                  {format(dataSelecionada, "EEEE, dd 'de' MMMM", { locale: ptBR }).toUpperCase()}
                </div>
              </div>

              <RadioGroup value={tipoSelecionado} onValueChange={(v) => setTipoSelecionado(v as PontoTipo | 'SUMIDO')}>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="P" id="presente2" />
                  <Label htmlFor="presente2" className="flex-1 cursor-pointer">
                    <span className="font-medium">PRESENTE</span>
                  </Label>
                  <div className="h-8 w-8 rounded bg-success/20 flex items-center justify-center text-success font-bold text-sm">P</div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="F" id="falta2" />
                  <Label htmlFor="falta2" className="flex-1 cursor-pointer">
                    <span className="font-medium">FALTOU</span>
                  </Label>
                  <div className="h-8 w-8 rounded bg-destructive flex items-center justify-center text-destructive-foreground font-bold text-sm">F</div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="A" id="atestado2" />
                  <Label htmlFor="atestado2" className="flex-1 cursor-pointer">
                    <span className="font-medium">ATESTADO</span>
                  </Label>
                  <div className="h-8 w-8 rounded bg-warning flex items-center justify-center text-warning-foreground font-bold text-sm">A</div>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="FE" id="ferias2" />
                  <Label htmlFor="ferias2" className="flex-1 cursor-pointer font-medium">1 DIA FÉRIAS</Label>
                  <div className="h-7 w-7 rounded bg-purple-500 flex items-center justify-center text-white font-bold text-[10px]">FE</div>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="DA" id="dayoff2" />
                  <Label htmlFor="dayoff2" className="flex-1 cursor-pointer font-medium">DAY OFF</Label>
                  <div className="h-7 w-7 rounded bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">DA</div>
                </div>
                <div className="flex items-center space-x-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="SS" id="suspensao2" />
                  <Label htmlFor="suspensao2" className="flex-1 cursor-pointer font-medium">SUSPENSÃO</Label>
                  <div className="h-7 w-7 rounded bg-orange-500 flex items-center justify-center text-white font-bold text-[10px]">SS</div>
                </div>
              </RadioGroup>

              <div className="space-y-2">
                <Label htmlFor="motivo">MOTIVO DA ALTERAÇÃO (OPCIONAL)</Label>
                <Textarea
                  id="motivo"
                  value={motivoDivergencia}
                  onChange={(e) => setMotivoDivergencia(e.target.value)}
                  placeholder="Descreva o motivo da solicitação..."
                  className="min-h-[80px]"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setModalDivergenciaOpen(false)}>
                  CANCELAR
                </Button>
                <Button
                  onClick={criarDivergenciaPonto}
                  disabled={criarDivergencia.isPending}
                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  CRIAR DIVERGÊNCIA
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
      )}

      {/* Dialog de Liberação de Datas (Admin) */}
      {isAdmin && (
        <LiberarDatasDialog
          open={liberarDatasOpen}
          onOpenChange={setLiberarDatasOpen}
          setores={setores}
          periodo={periodo}
        />
      )}
    </div>
  );
}
