import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Funcionario } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Download, Users, Search, ArrowLeft, Building2, UserMinus, UserCheck, X, TrendingUp, TrendingDown, FileText, Wind, Palette, Minus, UserRound, UserRoundCheck, BarChart3, CalendarIcon, Bell, ArrowDownAZ, ArrowDownWideNarrow, XCircle, CheckCircle2, CalendarDays, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// xlsx-js-style loaded dynamically
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useFuncionariosNoQuadro } from '@/hooks/useFuncionarios';
import { useQuadroPlanejado } from '@/hooks/useQuadroPlanejado';
import { useQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { useFuncionariosPrevisao } from '@/hooks/usePrevisoes';

function calcularTotalPlanejadoSopro(dados: any): number {
  const reservaRefeicaoIndustria = Math.round(dados.aux_maquina_industria / 6);
  const reservaRefeicaoGP = Math.round(dados.aux_maquina_gp / 6);
  return (
    dados.aux_maquina_industria + dados.reserva_ferias_industria + reservaRefeicaoIndustria +
    dados.reserva_faltas_industria + dados.amarra_pallets + dados.revisao_frasco +
    dados.mod_sindicalista + dados.controle_praga + dados.aux_maquina_gp +
    dados.reserva_faltas_gp + reservaRefeicaoGP + dados.reserva_ferias_gp + dados.aumento_quadro
  );
}

function calcularTotalPlanejadoDecoracao(dados: any): number {
  const reservaRefeicaoAuto = Math.ceil(dados.aux_maquina / 3);
  return (
    dados.aux_maquina + reservaRefeicaoAuto + dados.reserva_faltas +
    dados.reserva_ferias + dados.apoio_topografia + dados.reserva_afastadas + dados.reserva_covid
  );
}

interface ListaFuncionariosExperienciaGeralProps {
  funcionarios: Funcionario[];
  disabled?: boolean;
  fullPage?: boolean;
}

interface FuncionarioExperiencia extends Funcionario {
  diasDesdeAdmissao: number;
  dataVencimento: Date;
  contratoTipo: '30' | '60' | '90';
  diasParaVencimento: number;
  isTemporario: boolean;
}

type DecisaoTipo = 'demitido' | 'efetivado';

export function ListaFuncionariosExperienciaGeral({ funcionarios, disabled = false, fullPage = false }: ListaFuncionariosExperienciaGeralProps) {
  const [dialogAberto, setDialogAberto] = useState(fullPage);
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [filtrosTipo, setFiltrosTipo] = useState<string[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'experiencia' | 'cientes'>('experiencia');
  const [filtrosSetor, setFiltrosSetor] = useState<string[]>([]);
  const [filtrosResponsavel, setFiltrosResponsavel] = useState<string[]>([]);
  const [filtrosMes, setFiltrosMes] = useState<string[]>([]);
  const [ordenacao, setOrdenacao] = useState<'data' | 'nome'>('data');
  const [decisoes, setDecisoes] = useState<Record<string, DecisaoTipo>>({});
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [dataDemissao, setDataDemissao] = useState<Record<string, Date | undefined>>({});
  const [dataEfetivacao, setDataEfetivacao] = useState<Record<string, Date | undefined>>({});
  const [cientes, setCientes] = useState<Record<string, boolean>>({});
  const [responsaveis, setResponsaveis] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  // Carregar decisões salvas do banco
  const { data: decisoesSalvas = [] } = useQuery({
    queryKey: ['experiencia-decisoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experiencia_decisoes')
        .select('funcionario_id, decisao, data_programada, data_prevista, funcionario_ciente, responsavel');
      if (error) throw error;
      return data || [];
    },
  });

  // Carregar decisões e datas do banco no state inicial
  useEffect(() => {
    if (decisoesSalvas.length > 0) {
      const mapa: Record<string, DecisaoTipo> = {};
      const mapaDataDemissao: Record<string, Date | undefined> = {};
      const mapaDataEfetivacao: Record<string, Date | undefined> = {};
      decisoesSalvas.forEach(d => {
        mapa[d.funcionario_id] = d.decisao as DecisaoTipo;
        if (d.decisao === 'demitido' && d.data_programada) {
          mapaDataDemissao[d.funcionario_id] = parseISO(d.data_programada);
        }
        if (d.decisao === 'demitido' && d.data_prevista) {
          mapaDataDemissao[d.funcionario_id] = mapaDataDemissao[d.funcionario_id] || parseISO(d.data_prevista);
        }
        if (d.decisao === 'efetivado' && d.data_programada) {
          mapaDataEfetivacao[d.funcionario_id] = parseISO(d.data_programada);
        }
        if (d.decisao === 'efetivado' && d.data_prevista) {
          mapaDataEfetivacao[d.funcionario_id] = mapaDataEfetivacao[d.funcionario_id] || parseISO(d.data_prevista);
        }
      });
      const mapaCientes: Record<string, boolean> = {};
      const mapaResponsaveis: Record<string, string> = {};
      decisoesSalvas.forEach(d => {
        if (d.funcionario_ciente) mapaCientes[d.funcionario_id] = true;
        if ((d as any).responsavel) mapaResponsaveis[d.funcionario_id] = (d as any).responsavel;
      });
      setDecisoes(prev => {
        if (Object.keys(prev).length === 0) return mapa;
        return prev;
      });
      setDataDemissao(prev => {
        if (Object.keys(prev).length === 0) return mapaDataDemissao;
        return prev;
      });
      setDataEfetivacao(prev => {
        if (Object.keys(prev).length === 0) return mapaDataEfetivacao;
        return prev;
      });
      setCientes(prev => {
        if (Object.keys(prev).length === 0) return mapaCientes;
        return prev;
      });
      setResponsaveis(prev => {
        if (Object.keys(prev).length === 0) return mapaResponsaveis;
        return prev;
      });
    }
  }, [decisoesSalvas]);

  // Dashboard principal - dados para simulação
  const { data: funcionariosQuadro = [] } = useFuncionariosNoQuadro();
  const { data: quadroPlanejado = [] } = useQuadroPlanejado('SOPRO');
  const { data: quadroDecoracao = [] } = useQuadroDecoracao();
  const { data: funcionariosPrevisao = [] } = useFuncionariosPrevisao();

  const toggleCiente = useCallback(async (id: string) => {
    const novoValor = !cientes[id];
    setCientes(prev => ({ ...prev, [id]: novoValor }));
    await supabase.from('experiencia_decisoes' as any).upsert(
      { funcionario_id: id, funcionario_ciente: novoValor, updated_at: new Date().toISOString(), decisao: decisoes[id] || 'pendente' },
      { onConflict: 'funcionario_id' }
    );
    queryClient.invalidateQueries({ queryKey: ['experiencia-decisoes'] });
    toast.success(novoValor ? 'FUNCIONÁRIO MARCADO COMO CIENTE' : 'CIÊNCIA REMOVIDA');
  }, [cientes, decisoes, queryClient]);

  const setResponsavelFunc = useCallback(async (id: string, nome: string) => {
    const novoValor = responsaveis[id] === nome ? '' : nome;
    setResponsaveis(prev => ({ ...prev, [id]: novoValor }));
    await supabase.from('experiencia_decisoes' as any).upsert(
      { funcionario_id: id, responsavel: novoValor || null, updated_at: new Date().toISOString(), decisao: decisoes[id] || 'pendente' },
      { onConflict: 'funcionario_id' }
    );
    queryClient.invalidateQueries({ queryKey: ['experiencia-decisoes'] });
    toast.success(novoValor ? `RESPONSÁVEL: ${novoValor}` : 'RESPONSÁVEL REMOVIDO');
  }, [responsaveis, decisoes, queryClient]);

  const marcarDecisao = useCallback(async (id: string, tipo: DecisaoTipo, dataProg?: Date, dataPrev?: Date) => {
    setDecisoes(prev => ({ ...prev, [id]: tipo }));
    setMenuAberto(null);
    toast.success(tipo === 'demitido' ? 'Marcado para DESLIGAMENTO' : 'Marcado para EFETIVAÇÃO');
    // Salvar no banco com datas
    await supabase.from('experiencia_decisoes' as any).upsert(
      { 
        funcionario_id: id, 
        decisao: tipo, 
        updated_at: new Date().toISOString(),
        data_programada: dataProg ? format(dataProg, 'yyyy-MM-dd') : null,
        data_prevista: dataPrev ? format(dataPrev, 'yyyy-MM-dd') : null,
      },
      { onConflict: 'funcionario_id' }
    );
    queryClient.invalidateQueries({ queryKey: ['experiencia-decisoes'] });
  }, [queryClient]);

  const removerDecisao = useCallback(async (id: string) => {
    setDecisoes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setMenuAberto(null);
    // Remover do banco
    await supabase.from('experiencia_decisoes' as any).delete().eq('funcionario_id', id);
    queryClient.invalidateQueries({ queryKey: ['experiencia-decisoes'] });
  }, [queryClient]);

  // Lista unificada — ordenada por data de admissão mais antiga
  const funcionariosExperiencia = useMemo(() => {
    const hoje = new Date();
    const lista: FuncionarioExperiencia[] = [];

    funcionarios.forEach(f => {
      const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
      const isAtivo = situacaoNome === 'ATIVO' || situacaoNome.includes('SUMIDO');
      if (!isAtivo || !f.data_admissao) return;

      const matricula = f.matricula?.toUpperCase() || '';
      const isTemporario = matricula.startsWith('TEMP');
      const dataAdmissao = parseISO(f.data_admissao);
      const diasDesdeAdmissao = differenceInDays(hoje, dataAdmissao);

      if (isTemporario) {
        const dataVencimento90 = addDays(dataAdmissao, 90);
        const diasParaVencimento = differenceInDays(dataVencimento90, hoje);
        if (diasParaVencimento >= -3) {
          lista.push({
            ...f, diasDesdeAdmissao, dataVencimento: dataVencimento90,
            contratoTipo: '90', diasParaVencimento, isTemporario: true,
          });
        }
      } else {
        const dataVencimento30 = addDays(dataAdmissao, 30);
        const dataVencimento60 = addDays(dataAdmissao, 60);
        const diasPara30 = differenceInDays(dataVencimento30, hoje);
        const diasPara60 = differenceInDays(dataVencimento60, hoje);

        if (diasPara30 >= -3) {
          lista.push({
            ...f, diasDesdeAdmissao, dataVencimento: dataVencimento30,
            contratoTipo: '30', diasParaVencimento: diasPara30, isTemporario: false,
          });
        } else if (diasPara60 >= -3) {
          lista.push({
            ...f, diasDesdeAdmissao, dataVencimento: dataVencimento60,
            contratoTipo: '60', diasParaVencimento: diasPara60, isTemporario: false,
          });
        }
      }
    });

    // Ordenar por data de admissão mais antiga primeiro
    return lista.sort((a, b) => {
      const dataA = parseISO(a.data_admissao!);
      const dataB = parseISO(b.data_admissao!);
      return dataA.getTime() - dataB.getTime();
    });
  }, [funcionarios]);

  const totalTemporarios = useMemo(() => funcionariosExperiencia.filter(f => f.isTemporario).length, [funcionariosExperiencia]);
  const totalEfetivos = useMemo(() => funcionariosExperiencia.filter(f => !f.isTemporario).length, [funcionariosExperiencia]);

  // Chave de agrupamento: usa grupo do setor + turma do funcionário para Decoração
  const getChaveGrupo = useCallback((f: Funcionario) => {
    const grupo = f.setor?.grupo?.toUpperCase() || '';
    if (grupo === 'SOPRO A') return 'SOPRO A';
    if (grupo === 'SOPRO B') return 'SOPRO B';
    if (grupo === 'SOPRO C') return 'SOPRO C';
    if (grupo.startsWith('DECORAÇÃO')) {
      const turmaFunc = (f.turma || '').toUpperCase().trim();
      if (turmaFunc === 'T1' || turmaFunc === 'T2') return `${grupo} ${turmaFunc}`;
      return grupo;
    }
    return null;
  }, []);

  // Total de ativos por turma (todos, não só experiência)
  const ativosPorTurma = useMemo(() => {
    const mapa: Record<string, number> = {};
    funcionarios.forEach(f => {
      const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
      if (situacaoNome !== 'ATIVO') return;
      const chave = getChaveGrupo(f);
      if (!chave) return;
      mapa[chave] = (mapa[chave] || 0) + 1;
    });
    return mapa;
  }, [funcionarios, getChaveGrupo]);

  // Dashboard agrupado por turma: SOPRO A/B/C e DECORAÇÃO turmas (usa campo grupo do setor)
  const resumoPorSetor = useMemo(() => {
    const mapa: Record<string, { setor: string; total: number; temporarios: number; efetivos: number; demitidos: number; efetivados: number; homens: number; mulheres: number; totalAtivos: number }> = {};
    funcionariosExperiencia.forEach(f => {
      const chave = getChaveGrupo(f);
      if (!chave) return;
      if (!mapa[chave]) mapa[chave] = { setor: chave, total: 0, temporarios: 0, efetivos: 0, demitidos: 0, efetivados: 0, homens: 0, mulheres: 0, totalAtivos: ativosPorTurma[chave] || 0 };
      mapa[chave].total++;
      if (f.isTemporario) mapa[chave].temporarios++;
      else mapa[chave].efetivos++;
      if (f.sexo === 'masculino') mapa[chave].homens++;
      else mapa[chave].mulheres++;
      const decisao = decisoes[f.id];
      if (decisao === 'demitido') mapa[chave].demitidos++;
      if (decisao === 'efetivado') mapa[chave].efetivados++;
    });
    const ordem: Record<string, number> = { 'SOPRO A': 1, 'SOPRO B': 2, 'SOPRO C': 3 };
    const sorted = Object.values(mapa).sort((a, b) => {
      const oa = ordem[a.setor] || 100;
      const ob = ordem[b.setor] || 100;
      if (oa !== ob) return oa - ob;
      return a.setor.localeCompare(b.setor);
    });
    return sorted;
  }, [funcionariosExperiencia, decisoes, ativosPorTurma, getChaveGrupo]);

  // Contadores de decisões
  const totalDemitidos = useMemo(() => Object.values(decisoes).filter(d => d === 'demitido').length, [decisoes]);
  const totalEfetivados = useMemo(() => Object.values(decisoes).filter(d => d === 'efetivado').length, [decisoes]);
  const totalHomens = useMemo(() => funcionariosExperiencia.filter(f => f.sexo === 'masculino').length, [funcionariosExperiencia]);
  const totalMulheres = useMemo(() => funcionariosExperiencia.filter(f => f.sexo === 'feminino').length, [funcionariosExperiencia]);

  // ── Simulação do Dashboard Principal ──
  // IDs dos funcionários marcados para desligamento
  const idsDemitidos = useMemo(() => new Set(
    Object.entries(decisoes).filter(([, d]) => d === 'demitido').map(([id]) => id)
  ), [decisoes]);

  const funcionariosSopro = useMemo(() =>
    funcionariosQuadro.filter(f => f.setor?.nome?.toUpperCase().includes('SOPRO')),
    [funcionariosQuadro]
  );

  const funcionariosDecoracao = useMemo(() =>
    funcionariosQuadro.filter(f => {
      const n = f.setor?.nome?.toUpperCase() || '';
      return n.includes('DECORAÇÃO') || n.includes('DECORACAO');
    }),
    [funcionariosQuadro]
  );

  // IDs dos funcionários efetivados (temp→efetivo na simulação)
  const idsEfetivados = useMemo(() => new Set(
    Object.entries(decisoes).filter(([, d]) => d === 'efetivado').map(([id]) => id)
  ), [decisoes]);

  // Mapear quais experiência são temporários para saber o impacto
  const expTemporariosIds = useMemo(() => new Set(
    funcionariosExperiencia.filter(f => f.isTemporario).map(f => f.id)
  ), [funcionariosExperiencia]);

  const simSoproCards = useMemo(() => {
    return ['A', 'B', 'C'].map(turma => {
      const grupoEsperado = `SOPRO ${turma}`;
      const funcs = funcionariosSopro.filter(f => f.setor?.grupo?.toUpperCase() === grupoEsperado);
      const funcsSimulados = funcs.filter(f => !idsDemitidos.has(f.id));
      const planejado = quadroPlanejado.find(q => q.turma === turma);
      const necessario = planejado ? calcularTotalPlanejadoSopro(planejado) : 0;
      const previsao = funcionariosPrevisao.filter(fp => fp.setor?.grupo?.toUpperCase() === grupoEsperado).length;
      // Contar efetivos/temps simulados
      const isTemp = (f: Funcionario) => f.matricula?.toUpperCase().startsWith('TEMP');
      const efetivosReal = funcs.filter(f => !isTemp(f)).length;
      const tempsReal = funcs.filter(f => isTemp(f)).length;
      // Simulação: temp efetivado vira efetivo; demitido sai
      const tempsEfetivados = funcsSimulados.filter(f => isTemp(f) && idsEfetivados.has(f.id)).length;
      const tempsDemitidos = funcs.filter(f => isTemp(f) && idsDemitidos.has(f.id)).length;
      const efetivosDemitidos = funcs.filter(f => !isTemp(f) && idsDemitidos.has(f.id)).length;
      return {
        label: `SOPRO ${turma}`,
        totalReal: funcs.length,
        totalSimulado: funcsSimulados.length,
        necessario,
        homens: funcsSimulados.filter(f => f.sexo === 'masculino').length,
        mulheres: funcsSimulados.filter(f => f.sexo === 'feminino').length,
        previsao,
        removidos: funcs.length - funcsSimulados.length,
        efetivosReal, tempsReal,
        efetivosSimulado: efetivosReal - efetivosDemitidos + tempsEfetivados,
        tempsSimulado: tempsReal - tempsDemitidos - tempsEfetivados,
      };
    });
  }, [funcionariosSopro, quadroPlanejado, funcionariosPrevisao, idsDemitidos, idsEfetivados]);

  const simDecoCards = useMemo(() => {
    const turmas = ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'];
    const labels: Record<string, string> = {
      'DIA-T1': 'DECO DIA T1', 'DIA-T2': 'DECO DIA T2', 'NOITE-T1': 'DECO NOITE T1', 'NOITE-T2': 'DECO NOITE T2'
    };
    return turmas.map(turmaKey => {
      const funcs = funcionariosDecoracao.filter(f => {
        const turma = f.turma?.toUpperCase();
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isDia = setorNome.includes('DIA');
        const isNoite = setorNome.includes('NOITE');
        if (turma === 'T1' || turma === '1') return (isDia && turmaKey === 'DIA-T1') || (isNoite && turmaKey === 'NOITE-T1');
        if (turma === 'T2' || turma === '2') return (isDia && turmaKey === 'DIA-T2') || (isNoite && turmaKey === 'NOITE-T2');
        return false;
      });
      const funcsSimulados = funcs.filter(f => !idsDemitidos.has(f.id));
      const planejado = quadroDecoracao.find(q => q.turma === turmaKey);
      const necessario = planejado ? calcularTotalPlanejadoDecoracao(planejado) : 0;
      const previsao = funcionariosPrevisao.filter(fp => {
        const g = fp.setor?.grupo?.toUpperCase() || '';
        const n = fp.setor?.nome?.toUpperCase() || '';
        const t = (fp.turma || '').toUpperCase().trim();
        const isDia = g.includes('DIA') || n.includes('DIA');
        const isNoite = g.includes('NOITE') || n.includes('NOITE');
        if (turmaKey === 'DIA-T1') return isDia && (t === 'T1' || t === '1');
        if (turmaKey === 'DIA-T2') return isDia && (t === 'T2' || t === '2');
        if (turmaKey === 'NOITE-T1') return isNoite && (t === 'T1' || t === '1');
        if (turmaKey === 'NOITE-T2') return isNoite && (t === 'T2' || t === '2');
        return false;
      }).length;
      const isTemp = (f: Funcionario) => f.matricula?.toUpperCase().startsWith('TEMP');
      const efetivosReal = funcs.filter(f => !isTemp(f)).length;
      const tempsReal = funcs.filter(f => isTemp(f)).length;
      const tempsEfetivados = funcsSimulados.filter(f => isTemp(f) && idsEfetivados.has(f.id)).length;
      const tempsDemitidos = funcs.filter(f => isTemp(f) && idsDemitidos.has(f.id)).length;
      const efetivosDemitidos = funcs.filter(f => !isTemp(f) && idsDemitidos.has(f.id)).length;
      return {
        label: labels[turmaKey],
        totalReal: funcs.length,
        totalSimulado: funcsSimulados.length,
        necessario,
        homens: funcsSimulados.filter(f => f.sexo === 'masculino').length,
        mulheres: funcsSimulados.filter(f => f.sexo === 'feminino').length,
        previsao,
        removidos: funcs.length - funcsSimulados.length,
        efetivosReal, tempsReal,
        efetivosSimulado: efetivosReal - efetivosDemitidos + tempsEfetivados,
        tempsSimulado: tempsReal - tempsDemitidos - tempsEfetivados,
      };
    });
  }, [funcionariosDecoracao, quadroDecoracao, funcionariosPrevisao, idsDemitidos, idsEfetivados]);


  // Setores únicos para filtro
  const setoresUnicos = useMemo(() => {
    const setMap = new Map<string, string>();
    funcionariosExperiencia.forEach(f => {
      const grupo = f.setor?.grupo?.toUpperCase() || f.setor?.nome?.toUpperCase() || '';
      if (grupo && !setMap.has(grupo)) setMap.set(grupo, grupo);
    });
    return Array.from(setMap.values()).sort();
  }, [funcionariosExperiencia]);

  const funcionariosFiltrados = useMemo(() => {
    let lista = funcionariosExperiencia;

    if (filtrosTipo.length > 0) {
      lista = lista.filter(f => {
        return filtrosTipo.some(ft => {
          if (ft === 'TEMPORARIO') return f.isTemporario;
          if (ft === 'EFETIVO') return !f.isTemporario;
          if (ft === 'SEM_DECISAO') return !decisoes[f.id];
          if (ft === 'DEMITIR') return decisoes[f.id] === 'demitido';
          if (ft === 'EFETIVAR') return decisoes[f.id] === 'efetivado';
          if (ft === 'CIENTE') return !!cientes[f.id];
          if (ft === 'NAO_CIENTE') return !cientes[f.id];
          return false;
        });
      });
    }

    if (filtrosSetor.length > 0) {
      lista = lista.filter(f => {
        const grupo = f.setor?.grupo?.toUpperCase() || f.setor?.nome?.toUpperCase() || '';
        return filtrosSetor.includes(grupo);
      });
    }

    if (filtrosResponsavel.length > 0) {
      lista = lista.filter(f => {
        const resp = responsaveis[f.id] || '';
        if (filtrosResponsavel.includes('SEM_RESPONSAVEL')) {
          if (!resp) return true;
        }
        return filtrosResponsavel.includes(resp.toUpperCase());
      });
    }

    if (filtrosMes.length > 0) {
      lista = lista.filter(f => {
        if (!f.data_admissao) return false;
        const mesAno = format(parseISO(f.data_admissao), 'MM/yyyy');
        return filtrosMes.includes(mesAno);
      });
    }

    if (busca.trim()) {
      const termoBusca = busca.toLowerCase();
      lista = lista.filter(f =>
        f.nome_completo.toLowerCase().includes(termoBusca) ||
        f.matricula?.toLowerCase().includes(termoBusca) ||
        f.setor?.nome?.toLowerCase().includes(termoBusca) ||
        f.turma?.toLowerCase().includes(termoBusca)
      );
    }

    // Ordenação
    if (ordenacao === 'nome') {
      lista = [...lista].sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
    }
    // 'data' já é o default (ordenado por data de admissão)

    return lista;
  }, [funcionariosExperiencia, busca, filtrosTipo, filtrosSetor, filtrosResponsavel, filtrosMes, ordenacao, decisoes, responsaveis, cientes]);

  const exportarExcel = async () => {
    const XLSX = await import('xlsx-js-style');
    const dados = funcionariosFiltrados.map(f => ({
      'Tipo': f.isTemporario ? 'Temporário' : 'Efetivo',
      'Setor': f.setor?.nome || '',
      'Turma': f.turma || '',
      'Nome': f.nome_completo,
      'Empresa': f.empresa || '',
      'Matrícula': f.matricula || '',
      'Data Admissão': f.data_admissao ? format(parseISO(f.data_admissao), 'dd/MM/yyyy') : '',
      'Dias na Empresa': f.diasDesdeAdmissao,
      'Contrato': `${f.contratoTipo} dias`,
      'Data Vencimento': format(f.dataVencimento, 'dd/MM/yyyy'),
      'Dias Restantes': f.diasParaVencimento,
      'Decisão': decisoes[f.id] === 'demitido' ? 'SERÁ DEMITIDO' : decisoes[f.id] === 'efetivado' ? 'SERÁ EFETIVADO' : '',
      'Func. Ciente': cientes[f.id] ? 'SIM' : 'NÃO',
      'Responsável': responsaveis[f.id] || '',
    }));

    if (dados.length === 0) {
      toast.error('Nenhum funcionário para exportar');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Experiência Geral');
    XLSX.writeFile(wb, `Funcionarios_Experiencia_Todos_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Arquivo exportado com sucesso!');
  };
  const renderCard = useCallback((s: typeof resumoPorSetor[number]) => {
    const homensPercent = s.total > 0 ? Math.round((s.homens / s.total) * 100) : 0;
    const mulheresPercent = s.total > 0 ? Math.round((s.mulheres / s.total) * 100) : 0;
    return (
      <div key={s.setor} className="border rounded-2xl p-5 bg-card shadow-md hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black tracking-wider text-foreground">{s.setor}</h3>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-4xl font-black">{s.total}</span>
          <span className="text-lg text-muted-foreground font-semibold">/ {s.totalAtivos}</span>
        </div>
        <div className="flex items-center justify-between mt-2 rounded-lg bg-muted/50 px-3 py-1.5">
          <span className="text-xs font-bold text-blue-600">Efetivos: {s.efetivos}</span>
          <span className="text-xs font-bold text-orange-500">Temporários: {s.temporarios}</span>
        </div>
        <div className="flex items-center justify-between mt-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-bold text-foreground">HOMENS</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-blue-600">{s.homens}</span>
            <span className="text-[10px] text-muted-foreground font-semibold">({homensPercent}%)</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 px-3 py-2">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs font-bold text-foreground">MULHERES</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-purple-600">{s.mulheres}</span>
            <span className="text-[10px] text-muted-foreground font-semibold">({mulheresPercent}%)</span>
          </div>
        </div>
        {(s.demitidos > 0 || s.efetivados > 0) && (
          <div className="flex gap-2 mt-2">
            {s.demitidos > 0 && (
              <div className="flex-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-center">
                <div className="text-lg font-black text-destructive">{s.demitidos}</div>
                <div className="text-[9px] font-bold text-destructive">DESLIGAR</div>
              </div>
            )}
            {s.efetivados > 0 && (
              <div className="flex-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-center">
                <div className="text-lg font-black text-emerald-600">{s.efetivados}</div>
                <div className="text-[9px] font-bold text-emerald-600">EFETIVAR</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [resumoPorSetor]);

  return (
    <>
      {!fullPage && (
        <Button
          size="lg"
          className="gap-2 font-semibold bg-violet-700 text-white hover:bg-violet-800 shadow-md whitespace-normal text-center leading-tight"
          onClick={() => setDialogAberto(true)}
          disabled={disabled}
          title={disabled ? 'Faça login para acessar' : ''}
        >
          <Building2 className="h-5 w-5 shrink-0" />
          <span className="flex flex-col items-start">
            <span>Experiência</span>
            <span>Geral</span>
          </span>
          <Badge variant="secondary" className="ml-1 bg-violet-500/30 text-white">
            {funcionariosExperiencia.length}
          </Badge>
        </Button>
      )}

      {dialogAberto && (
        <div className={cn(fullPage ? '' : 'fixed inset-0 z-50', 'bg-background flex flex-col uppercase', fullPage ? 'min-h-[calc(100vh-4rem)]' : '')}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => fullPage ? navigate(-1) : setDialogAberto(false)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="h-5 w-5" />
                Experiência / Temporários
                <Badge variant="secondary">{funcionariosExperiencia.length}</Badge>
                <Button variant="outline" size="icon" className="h-8 w-8 ml-2" onClick={() => navigate('/admin/notificacoes')} title="Central de Notificações">
                  <Bell className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportarExcel} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>

          {/* Dashboard resumo - estilo cards grandes */}
          <div className="px-4 pt-4 pb-2 shrink-0 space-y-4">
            {/* Decisões + Botão Efetivar Demissão */}
            {(totalDemitidos > 0 || totalEfetivados > 0) && (
              <div className="flex flex-wrap items-center gap-3">
                {totalDemitidos > 0 && (
                  <div className="border-2 border-destructive/30 rounded-xl px-5 py-3 bg-destructive/5 shadow-sm">
                    <div className="text-xs font-bold text-destructive tracking-wider">🔴 SERÃO DESLIGADOS</div>
                    <div className="text-3xl font-black text-destructive mt-1">{totalDemitidos}</div>
                  </div>
                )}
                {totalEfetivados > 0 && (
                  <div className="border-2 border-emerald-500/30 rounded-xl px-5 py-3 bg-emerald-50 dark:bg-emerald-950/20 shadow-sm">
                    <div className="text-xs font-bold text-emerald-600 tracking-wider">🟢 SERÃO EFETIVADOS</div>
                    <div className="text-3xl font-black text-emerald-600 mt-1">{totalEfetivados}</div>
                  </div>
                )}
                {totalDemitidos > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2 font-bold shadow-md"
                    onClick={() => navigate('/demissoes')}
                  >
                    <FileText className="h-4 w-4" />
                    Efetivar Demissão ({totalDemitidos})
                  </Button>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════ */}
            {/* DASHBOARD POR SETOR — SOPRO vs DECORAÇÃO */}
            {/* ═══════════════════════════════════════════ */}
            {(() => {
              const soproData = resumoPorSetor.filter(s => s.setor.startsWith('SOPRO'));
              const decoData = resumoPorSetor.filter(s => s.setor.startsWith('DECORAÇÃO') || s.setor.startsWith('DECORACAO'));
              const soproTotal = soproData.reduce((a, s) => a + s.total, 0);
              const soproEfetivados = soproData.reduce((a, s) => a + s.efetivados, 0);
              const soproDemitidos = soproData.reduce((a, s) => a + s.demitidos, 0);
              const soproSemDecisao = soproTotal - soproEfetivados - soproDemitidos;
              const decoTotal = decoData.reduce((a, s) => a + s.total, 0);
              const decoEfetivados = decoData.reduce((a, s) => a + s.efetivados, 0);
              const decoDemitidos = decoData.reduce((a, s) => a + s.demitidos, 0);
              const decoSemDecisao = decoTotal - decoEfetivados - decoDemitidos;
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SOPRO */}
                  <div className="rounded-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-600/10 p-5 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow">
                        <Wind className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black tracking-widest text-blue-700 dark:text-blue-400">SOPRO</h3>
                        <p className="text-xs text-muted-foreground font-medium">Em experiência / temporários</p>
                      </div>
                      <span className="ml-auto text-3xl font-black text-blue-600">{soproTotal}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                        <UserCheck className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                        <div className="text-2xl font-black text-emerald-600">{soproEfetivados}</div>
                        <div className="text-[9px] font-bold text-emerald-600 tracking-wider">EFETIVAR</div>
                      </div>
                      <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
                        <UserMinus className="h-4 w-4 text-destructive mx-auto mb-1" />
                        <div className="text-2xl font-black text-destructive">{soproDemitidos}</div>
                        <div className="text-[9px] font-bold text-destructive tracking-wider">DESLIGAR</div>
                      </div>
                      <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                        <Minus className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                        <div className="text-2xl font-black text-muted-foreground">{soproSemDecisao}</div>
                        <div className="text-[9px] font-bold text-muted-foreground tracking-wider">PENDENTE</div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {soproData.map(s => (
                        <div key={s.setor} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-1.5 text-xs font-bold">
                          <span className="text-foreground">{s.setor}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{s.total} em exp.</span>
                            {s.efetivados > 0 && <span className="text-emerald-600">✅ {s.efetivados}</span>}
                            {s.demitidos > 0 && <span className="text-destructive">🔴 {s.demitidos}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* DECORAÇÃO */}
                  <div className="rounded-2xl border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-600/10 p-5 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="h-9 w-9 rounded-xl bg-purple-600 flex items-center justify-center shadow">
                        <Palette className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black tracking-widest text-purple-700 dark:text-purple-400">DECORAÇÃO</h3>
                        <p className="text-xs text-muted-foreground font-medium">Em experiência / temporários</p>
                      </div>
                      <span className="ml-auto text-3xl font-black text-purple-600">{decoTotal}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                        <UserCheck className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                        <div className="text-2xl font-black text-emerald-600">{decoEfetivados}</div>
                        <div className="text-[9px] font-bold text-emerald-600 tracking-wider">EFETIVAR</div>
                      </div>
                      <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-center">
                        <UserMinus className="h-4 w-4 text-destructive mx-auto mb-1" />
                        <div className="text-2xl font-black text-destructive">{decoDemitidos}</div>
                        <div className="text-[9px] font-bold text-destructive tracking-wider">DESLIGAR</div>
                      </div>
                      <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
                        <Minus className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                        <div className="text-2xl font-black text-muted-foreground">{decoSemDecisao}</div>
                        <div className="text-[9px] font-bold text-muted-foreground tracking-wider">PENDENTE</div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {decoData.map(s => (
                        <div key={s.setor} className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-1.5 text-xs font-bold">
                          <span className="text-foreground">{s.setor}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{s.total} em exp.</span>
                            {s.efetivados > 0 && <span className="text-emerald-600">✅ {s.efetivados}</span>}
                            {s.demitidos > 0 && <span className="text-destructive">🔴 {s.demitidos}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ═══════════════════════════════════════════ */}
            {/* RESUMO GERAL — TEMPORÁRIOS NA FÁBRICA */}
            {/* ═══════════════════════════════════════════ */}
            {(() => {
              const tempsSopro = simSoproCards.reduce((s, c) => s + c.tempsSimulado, 0);
              const tempsDeco = simDecoCards.reduce((s, c) => s + c.tempsSimulado, 0);
              const tempsGeral = tempsSopro + tempsDeco;
              return (
                <div className="rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-transparent p-4 flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center">
                      <UserRound className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black tracking-widest text-orange-600 dark:text-orange-400">TEMPORÁRIOS NA FÁBRICA</div>
                      <div className="text-2xl font-black text-orange-600">{tempsGeral}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs font-bold">
                    <div className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5">
                      <Wind className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-blue-700 dark:text-blue-400">Sopro: {tempsSopro}</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5">
                      <Palette className="h-3.5 w-3.5 text-purple-600" />
                      <span className="text-purple-700 dark:text-purple-400">Decoração: {tempsDeco}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ═══════════════════════════════════════════ */}
            {/* SOPRO — QUADRO + EXPERIÊNCIA UNIFICADOS */}
            {/* ═══════════════════════════════════════════ */}
            <section className="rounded-2xl bg-gradient-to-br from-blue-950/10 to-blue-900/5 dark:from-blue-950/30 dark:to-blue-900/20 p-5 border border-blue-500/20">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Wind className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-base font-black tracking-wider text-foreground">SOPRO</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {simSoproCards.map(card => {
                  const expData = resumoPorSetor.find(s => s.setor === card.label);
                  const diferenca = card.totalSimulado - card.necessario;
                  const totalG = card.homens + card.mulheres || 1;
                  return (
                    <div key={card.label} className="space-y-2">
                      <div className="rounded-xl border bg-card p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black tracking-wider">{card.label}</span>
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-3 w-3 text-primary" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black">{card.totalSimulado}</span>
                          <span className="text-sm text-muted-foreground font-semibold">/ {card.necessario}</span>
                          {card.removidos > 0 && <span className="text-[10px] text-muted-foreground line-through ml-1">{card.totalReal}</span>}
                        </div>
                        <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1",
                          diferenca > 0 && "bg-emerald-500/15 text-emerald-600",
                          diferenca < 0 && "bg-red-500/15 text-red-600",
                          diferenca === 0 && "bg-muted text-muted-foreground"
                        )}>
                          {diferenca > 0 ? <><TrendingUp className="h-3 w-3" />+{diferenca} SOBRA</> :
                           diferenca < 0 ? <><TrendingDown className="h-3 w-3" />{diferenca} FALTA</> :
                           <><Minus className="h-3 w-3" />OK</>}
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 mt-2 rounded-lg border bg-muted/30 text-[10px] font-bold">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3 text-primary" />PREVISÃO</span>
                          <span className="text-primary font-black">+{card.previsao}</span>
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 mt-1 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 text-[10px] font-bold">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3 text-blue-600" />HOMENS</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-blue-600">{card.homens}</span>
                            <span className="text-[9px] text-muted-foreground">({Math.round((card.homens/totalG)*100)}%)</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 mt-1 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20 text-[10px] font-bold">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3 text-purple-600" />MULHERES</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-purple-600">{card.mulheres}</span>
                            <span className="text-[9px] text-muted-foreground">({Math.round((card.mulheres/totalG)*100)}%)</span>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-1.5 text-[10px] px-1">
                          <span className="font-bold text-cyan-600">✅ EFETIVOS: {card.efetivosSimulado} {card.efetivosSimulado !== card.efetivosReal && <span className="text-muted-foreground line-through text-[8px]">{card.efetivosReal}</span>}</span>
                          <span className="font-bold text-orange-500">📋 TEMP: {card.tempsSimulado} {card.tempsSimulado !== card.tempsReal && <span className="text-muted-foreground line-through text-[8px]">{card.tempsReal}</span>}</span>
                        </div>
                      </div>
                      {(() => {
                        const exp = expData || { total: 0, efetivos: 0, temporarios: 0, demitidos: 0, efetivados: 0 };
                        return (
                          <div className="rounded-xl border bg-card p-3 shadow-sm text-center">
                            <div className="text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">⏳ EM EXPERIÊNCIA</div>
                            <div className="flex items-baseline justify-center gap-1 mb-1">
                              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{exp.total}</span>
                              <span className="text-[10px] text-muted-foreground font-semibold">FUNCIONÁRIOS</span>
                            </div>
                            <div className="flex justify-center gap-3 text-[10px] font-bold">
                              <span className="text-cyan-600">EFETIVOS: {exp.efetivos}</span>
                              <span className="text-orange-500">TEMPORÁRIOS: {exp.temporarios}</span>
                            </div>
                            {(exp.demitidos > 0 || exp.efetivados > 0) && (
                              <div className="flex justify-center gap-2 mt-1">
                                {exp.demitidos > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-600">🔴 {exp.demitidos} DESLIGAR</span>}
                                {exp.efetivados > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600">🟢 {exp.efetivados} EFETIVAR</span>}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ═══════════════════════════════════════════ */}
            {/* DECORAÇÃO — QUADRO + EXPERIÊNCIA */}
            {/* ═══════════════════════════════════════════ */}
            <section className="rounded-2xl bg-gradient-to-br from-purple-950/10 to-purple-900/5 dark:from-purple-950/30 dark:to-purple-900/20 p-5 border border-purple-500/20">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center">
                  <Palette className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-base font-black tracking-wider text-foreground">DECORAÇÃO</h2>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {simDecoCards.map(card => {
                  const expKey = card.label.replace('DECO ', 'DECORAÇÃO ');
                  const expData = resumoPorSetor.find(s => s.setor === expKey);
                  const diferenca = card.totalSimulado - card.necessario;
                  const totalG = card.homens + card.mulheres || 1;
                  return (
                    <div key={card.label} className="space-y-2">
                      <div className="rounded-xl border bg-card p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black tracking-wider">{card.label}</span>
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-3 w-3 text-primary" />
                          </div>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black">{card.totalSimulado}</span>
                          <span className="text-sm text-muted-foreground font-semibold">/ {card.necessario}</span>
                          {card.removidos > 0 && <span className="text-[10px] text-muted-foreground line-through ml-1">{card.totalReal}</span>}
                        </div>
                        <div className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1",
                          diferenca > 0 && "bg-emerald-500/15 text-emerald-600",
                          diferenca < 0 && "bg-red-500/15 text-red-600",
                          diferenca === 0 && "bg-muted text-muted-foreground"
                        )}>
                          {diferenca > 0 ? <><TrendingUp className="h-3 w-3" />+{diferenca} SOBRA</> :
                           diferenca < 0 ? <><TrendingDown className="h-3 w-3" />{diferenca} FALTA</> :
                           <><Minus className="h-3 w-3" />OK</>}
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 mt-2 rounded-lg border bg-muted/30 text-[10px] font-bold">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3 text-primary" />PREVISÃO</span>
                          <span className="text-primary font-black">+{card.previsao}</span>
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 mt-1 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 text-[10px] font-bold">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3 text-blue-600" />HOMENS</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-blue-600">{card.homens}</span>
                            <span className="text-[9px] text-muted-foreground">({Math.round((card.homens/totalG)*100)}%)</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-2 py-1 mt-1 rounded-lg border bg-purple-50/50 dark:bg-purple-950/20 text-[10px] font-bold">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3 text-purple-600" />MULHERES</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-purple-600">{card.mulheres}</span>
                            <span className="text-[9px] text-muted-foreground">({Math.round((card.mulheres/totalG)*100)}%)</span>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-1.5 text-[10px] px-1">
                          <span className="font-bold text-cyan-600">✅ EFETIVOS: {card.efetivosSimulado} {card.efetivosSimulado !== card.efetivosReal && <span className="text-muted-foreground line-through text-[8px]">{card.efetivosReal}</span>}</span>
                          <span className="font-bold text-orange-500">📋 TEMP: {card.tempsSimulado} {card.tempsSimulado !== card.tempsReal && <span className="text-muted-foreground line-through text-[8px]">{card.tempsReal}</span>}</span>
                        </div>
                      </div>
                      {(() => {
                        const exp = expData || { total: 0, efetivos: 0, temporarios: 0, demitidos: 0, efetivados: 0 };
                        return (
                          <div className="rounded-xl border bg-card p-3 shadow-sm text-center">
                            <div className="text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">⏳ EM EXPERIÊNCIA</div>
                            <div className="flex items-baseline justify-center gap-1 mb-1">
                              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{exp.total}</span>
                              <span className="text-[10px] text-muted-foreground font-semibold">FUNCIONÁRIOS</span>
                            </div>
                            <div className="flex justify-center gap-3 text-[10px] font-bold">
                              <span className="text-cyan-600">EFETIVOS: {exp.efetivos}</span>
                              <span className="text-orange-500">TEMPORÁRIOS: {exp.temporarios}</span>
                            </div>
                            {(exp.demitidos > 0 || exp.efetivados > 0) && (
                              <div className="flex justify-center gap-2 mt-1">
                                {exp.demitidos > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-600">🔴 {exp.demitidos} DESLIGAR</span>}
                                {exp.efetivados > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600">🟢 {exp.efetivados} EFETIVAR</span>}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* ═══ ABAS ═══ */}
          <div className="flex items-center gap-1 px-4 pt-3 pb-1 shrink-0 border-b">
            <button
              onClick={() => setAbaAtiva('experiencia')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-xs font-black tracking-wider rounded-t-lg border-b-2 transition-colors',
                abaAtiva === 'experiencia'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Users className="h-4 w-4" />
              EM EXPERIÊNCIA
              <Badge variant="secondary" className="text-[10px]">{funcionariosExperiencia.length}</Badge>
            </button>
            <button
              onClick={() => setAbaAtiva('cientes')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-xs font-black tracking-wider rounded-t-lg border-b-2 transition-colors',
                abaAtiva === 'cientes'
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-500/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <UserRoundCheck className="h-4 w-4" />
              CIENTES — EFETIVAÇÃO
              <Badge variant="secondary" className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                {funcionariosExperiencia.filter(f => cientes[f.id] && decisoes[f.id] === 'efetivado').length}
              </Badge>
            </button>
          </div>

          {abaAtiva === 'experiencia' && (
          <>
          {/* Filtro de tipo */}
          <div className="flex flex-wrap items-center gap-2 px-4 pt-2 pb-1 shrink-0">
            {([
              { label: 'Temporários', value: 'TEMPORARIO', count: totalTemporarios, color: 'bg-orange-500 border-orange-500' },
              { label: 'Efetivos', value: 'EFETIVO', count: totalEfetivos, color: 'bg-blue-600 border-blue-600' },
              { label: 'Sem Decisão', value: 'SEM_DECISAO', count: funcionariosExperiencia.filter(f => !decisoes[f.id]).length, color: 'bg-amber-600 border-amber-600' },
              { label: '🔴 Demitir', value: 'DEMITIR', count: totalDemitidos, color: 'bg-red-600 border-red-600' },
              { label: '🟢 Efetivar', value: 'EFETIVAR', count: totalEfetivados, color: 'bg-emerald-600 border-emerald-600' },
              { label: '✅ Ciente', value: 'CIENTE', count: funcionariosExperiencia.filter(f => cientes[f.id]).length, color: 'bg-teal-600 border-teal-600' },
              { label: '⬜ Não Ciente', value: 'NAO_CIENTE', count: funcionariosExperiencia.filter(f => !cientes[f.id]).length, color: 'bg-slate-500 border-slate-500' },
            ]).map(op => {
              const isSelected = filtrosTipo.includes(op.value);
              return (
                <button
                  key={op.value}
                  onClick={() => setFiltrosTipo(prev =>
                    prev.includes(op.value) ? prev.filter(v => v !== op.value) : [...prev, op.value]
                  )}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors',
                    isSelected
                      ? `${op.color} text-white`
                      : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {op.label}
                  <span className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    isSelected ? 'bg-white/25' : 'bg-muted-foreground/20'
                  )}>
                    {op.count}
                  </span>
                </button>
              );
            })}
            {filtrosTipo.length > 0 && (
              <button onClick={() => setFiltrosTipo([])} className="text-[10px] text-muted-foreground hover:text-foreground underline">
                Limpar
              </button>
            )}
          </div>

          {/* Busca + Ordenação + Filtro por setor */}
          <div className="flex items-center gap-2 px-4 pt-2 pb-2 shrink-0 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, matrícula..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Botões de ordenação */}
            <div className="flex items-center gap-1 border rounded-lg p-0.5">
              <button
                onClick={() => setOrdenacao('data')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors',
                  ordenacao === 'data'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                )}
                title="Ordenar por data de admissão"
              >
                <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                DATA
              </button>
              <button
                onClick={() => setOrdenacao('nome')}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors',
                  ordenacao === 'nome'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                )}
                title="Ordenar por nome alfabético"
              >
                <ArrowDownAZ className="h-3.5 w-3.5" />
                A-Z
              </button>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {setoresUnicos.map(setor => {
                const isSelected = filtrosSetor.includes(setor);
                return (
                  <button
                    key={setor}
                    onClick={() => setFiltrosSetor(prev =>
                      prev.includes(setor) ? prev.filter(s => s !== setor) : [...prev, setor]
                    )}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <Building2 className="h-3 w-3 inline mr-1" />
                    {setor}
                  </button>
                );
              })}
              {filtrosSetor.length > 0 && (
                <button onClick={() => setFiltrosSetor([])} className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1">
                  Limpar
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {([
                { label: 'LUCIANO', value: 'LUCIANO' },
                { label: 'SONIA', value: 'SONIA' },
                { label: 'Sem responsável', value: 'SEM_RESPONSAVEL' },
              ]).map(op => {
                const isSelected = filtrosResponsavel.includes(op.value);
                return (
                  <button
                    key={op.value}
                    onClick={() => setFiltrosResponsavel(prev =>
                      prev.includes(op.value) ? prev.filter(v => v !== op.value) : [...prev, op.value]
                    )}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    )}
                  >
                    <User className="h-3 w-3 inline mr-1" />
                    {op.label}
                  </button>
                );
              })}
              {filtrosResponsavel.length > 0 && (
                <button onClick={() => setFiltrosResponsavel([])} className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1">
                  Limpar
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 overflow-x-auto">
              {(() => {
                // Gerar opções dinâmicas de mês/ano a partir dos funcionários em experiência
                const mesesDisponiveis = new Set<string>();
                funcionariosExperiencia.forEach(f => {
                  if (f.data_admissao) {
                    mesesDisponiveis.add(format(parseISO(f.data_admissao), 'MM/yyyy'));
                  }
                });
                const mesesOrdenados = Array.from(mesesDisponiveis).sort((a, b) => {
                  const [mA, yA] = a.split('/');
                  const [mB, yB] = b.split('/');
                  return yA === yB ? mA.localeCompare(mB) : yA.localeCompare(yB);
                });
                const nomeMes: Record<string, string> = {
                  '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR',
                  '05': 'MAI', '06': 'JUN', '07': 'JUL', '08': 'AGO',
                  '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ',
                };
                return mesesOrdenados.map(mesAno => {
                  const label = mesAno;
                  const isSelected = filtrosMes.includes(mesAno);
                  return (
                    <button
                      key={mesAno}
                      onClick={() => setFiltrosMes(prev =>
                        prev.includes(mesAno) ? prev.filter(v => v !== mesAno) : [...prev, mesAno]
                      )}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      )}
                    >
                      <CalendarDays className="h-3 w-3 inline mr-1" />
                      {label}
                    </button>
                  );
                });
              })()}
              {filtrosMes.length > 0 && (
                <button onClick={() => setFiltrosMes([])} className="text-[10px] text-muted-foreground hover:text-foreground underline ml-1">
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto px-4">
            {funcionariosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum funcionário em período de experiência.</p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {funcionariosFiltrados.map(func => {
                  const isTemp = func.isTemporario;
                  const decisao = decisoes[func.id];
                  const isMenuOpen = menuAberto === func.id;

                  return (
                    <div
                      key={func.id}
                      onClick={() => getChaveGrupo(func) ? setMenuAberto(isMenuOpen ? null : func.id) : undefined}
                      className={cn(
                        'rounded-lg border-l-4 px-4 py-3 relative transition-all',
                        getChaveGrupo(func) ? 'cursor-pointer' : 'cursor-default',
                        isMenuOpen && 'ring-2 ring-primary/50 shadow-lg',
                        decisao === 'demitido'
                          ? 'border-l-destructive bg-destructive/5'
                          : decisao === 'efetivado'
                            ? 'border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20'
                            : isTemp
                              ? 'border-l-orange-500 bg-orange-50/60 dark:bg-orange-950/20'
                              : func.contratoTipo === '30'
                                ? 'border-l-blue-500 bg-blue-50/60 dark:bg-blue-950/20'
                                : 'border-l-purple-500 bg-purple-50/60 dark:bg-purple-950/20'
                      )}
                    >
                      {/* ROW 1: Nome + Ações + Badge tipo + Dias */}
                      <div className="flex items-center gap-2">
                        {/* Nome */}
                        <div className="min-w-0 w-[260px] shrink-0">
                          <span
                            className={cn(
                              'font-semibold text-xs truncate block',
                              decisao === 'demitido' && 'text-destructive line-through',
                              decisao === 'efetivado' && 'text-emerald-700 dark:text-emerald-400',
                            )}
                            title={func.nome_completo}
                          >
                            {func.matricula && <span className="text-muted-foreground font-mono mr-1">{func.matricula}</span>}
                            {func.nome_completo}
                          </span>
                        </div>

                        {/* Ações inline */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Badge SUMIDO */}
                          {func.situacao?.nome?.toUpperCase().includes('SUMIDO') && (
                            <Badge className="text-[10px] font-black px-2 py-0.5 bg-amber-600 text-white animate-pulse">
                              ⚠️ SUMIDO {func.sumido_desde ? `desde ${format(parseISO(func.sumido_desde), 'dd/MM')}` : ''}
                            </Badge>
                          )}

                          {/* Badge de decisão */}
                          {decisao && (
                            <Badge
                              className={cn(
                                'text-[10px] font-black px-2 py-0.5',
                                decisao === 'demitido'
                                  ? 'bg-destructive text-destructive-foreground'
                                  : 'bg-emerald-600 text-white'
                              )}
                            >
                              {decisao === 'demitido' ? '🔴 DESLIGAR' : '🟢 EFETIVAR'}
                            </Badge>
                          )}

                          {/* FUNCIONÁRIO CIENTE */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleCiente(func.id); }}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black transition-all border',
                              cientes[func.id]
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                            )}
                          >
                            {cientes[func.id] ? '✅' : '⬜'} FUNC. CIENTE
                          </button>

                          {/* Responsável */}
                          <div className="inline-flex items-center gap-0 border rounded-full overflow-hidden">
                            {['LUCIANO', 'SONIA'].map(nome => (
                              <button
                                key={nome}
                                onClick={(e) => { e.stopPropagation(); setResponsavelFunc(func.id, nome); }}
                                className={cn(
                                  'px-2.5 py-0.5 text-[10px] font-black transition-all',
                                  responsaveis[func.id] === nome
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-accent'
                                )}
                              >
                                {nome}
                              </button>
                            ))}
                          </div>

                          {/* Badge tipo contrato */}
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-bold shrink-0 px-2',
                              isTemp
                                ? 'border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/40'
                                : func.contratoTipo === '30'
                                  ? 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/40'
                                  : 'border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-950/40'
                            )}
                          >
                            {isTemp ? 'TEMPORÁRIO 90d' : `EXP. EFETIVO ${func.contratoTipo}d`}
                          </Badge>
                        </div>

                        {/* Dias - alinhado à direita */}
                        <div className="ml-auto shrink-0 flex items-center gap-1.5">
                          {isTemp ? (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-lg bg-orange-500 text-white px-2.5 py-1 text-xs font-black">
                                {func.diasDesdeAdmissao}<span className="text-[9px] font-bold opacity-80">d</span>
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-lg bg-orange-700 text-white px-2.5 py-1 text-xs font-black">
                                {Math.max(0, 90 - func.diasDesdeAdmissao)}<span className="text-[9px] font-bold opacity-80">restam</span>
                              </span>
                            </>
                          ) : (
                            <span className={cn(
                              'inline-flex items-center gap-1 rounded-lg text-white px-2.5 py-1 text-xs font-black',
                              func.diasParaVencimento <= 7 ? 'bg-red-500' : 'bg-blue-600'
                            )}>
                              {func.diasParaVencimento < 0
                                ? <>{Math.abs(func.diasParaVencimento)}<span className="text-[9px] font-bold opacity-80">d vencido</span></>
                                : <>{func.diasParaVencimento}<span className="text-[9px] font-bold opacity-80">d restam</span></>
                              }
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu de ações expandível */}
                      {isMenuOpen && getChaveGrupo(func) && (
                        <div
                          className="mt-2 bg-popover border rounded-lg shadow-lg p-2 flex flex-col gap-1 min-w-[280px] animate-in fade-in slide-in-from-top-2 uppercase"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Opções do menu - mantém existente */}
                          <button
                            onClick={() => {
                              marcarDecisao(func.id, 'demitido');
                              toast.success('DEMISSÃO REGISTRADA');
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                            DESLIGAR FUNCIONÁRIO
                          </button>

                          <Separator className="my-1" />

                          {/* Efetivação com data */}
                          <div className="px-3 py-1">
                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-1.5">
                              <CheckCircle2 className="h-4 w-4" />
                              EFETIVAR — SELECIONE A DATA
                            </span>
                            <div className="flex items-center gap-2">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-xs h-8 w-full justify-start gap-1.5">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {dataEfetivacao[func.id]
                                      ? format(dataEfetivacao[func.id]!, 'dd/MM/yyyy')
                                      : 'Selecionar data'
                                    }
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 z-50" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={dataEfetivacao[func.id] || undefined}
                                    onSelect={(date) => {
                                      if (date) setDataEfetivacao(prev => ({ ...prev, [func.id]: date }));
                                    }}
                                    locale={ptBR}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <Button
                              size="sm"
                              className="w-full mt-1 text-xs font-bold h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                              disabled={!dataEfetivacao[func.id]}
                              onClick={() => {
                                marcarDecisao(func.id, 'efetivado', dataEfetivacao[func.id], undefined);
                                toast.success(`EFETIVAÇÃO PROGRAMADA PARA ${format(dataEfetivacao[func.id]!, 'dd/MM/yyyy')}`);
                              }}
                            >
                              CONFIRMAR EFETIVAÇÃO
                            </Button>
                          </div>

                          {decisao && (
                            <button
                              onClick={() => removerDecisao(func.id)}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-md hover:bg-muted text-muted-foreground transition-colors border-t mt-1 pt-2"
                            >
                              <X className="h-4 w-4" />
                              REMOVER DECISÃO
                            </button>
                          )}
                        </div>
                      )}

                      {/* ROW 2: Info secundária */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1.5">
                        <span className="font-semibold text-foreground/80">{func.setor?.nome}{func.turma ? ` — ${func.setor?.grupo?.toUpperCase()?.includes('SOPRO') ? func.turma.toUpperCase() : `T${func.turma.replace(/^T/i, '')}`}` : ''}</span>
                        <span>• {func.empresa || 'GLOBALPACK'}</span>
                        <span>• ADM: {format(parseISO(func.data_admissao!), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <span>• VENCE: {format(func.dataVencimento, 'dd/MM/yyyy')}</span>
                        {decisao === 'demitido' && dataDemissao[func.id] && (
                          <span className="font-bold text-destructive">• 📅 PROGRAMADA: {format(dataDemissao[func.id]!, 'dd/MM/yyyy')}</span>
                        )}
                        {decisao === 'efetivado' && dataEfetivacao[func.id] && (
                          <span className="font-bold text-emerald-600">• 📅 PROGRAMADA: {format(dataEfetivacao[func.id]!, 'dd/MM/yyyy')}</span>
                        )}
                        {responsaveis[func.id] && (
                          <span className="font-bold text-primary">• 👤 {responsaveis[func.id]}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </>
          )}

          {/* ═══ ABA CIENTES — EFETIVAÇÃO ═══ */}
          {abaAtiva === 'cientes' && (
            <div className="flex-1 overflow-auto px-4 py-3">
              {(() => {
                const cientesEfetivados = funcionariosExperiencia.filter(f => cientes[f.id] && decisoes[f.id] === 'efetivado');
                if (cientesEfetivados.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <UserRoundCheck className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm font-bold">NENHUM FUNCIONÁRIO CIENTE PARA EFETIVAÇÃO</p>
                      <p className="text-xs mt-1">Marque funcionários como "FUNC. CIENTE" e decisão "EFETIVAR" na aba Experiência</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-muted-foreground mb-3">
                      {cientesEfetivados.length} FUNCIONÁRIO(S) CIENTE(S) QUE SERÃO EFETIVADOS
                    </div>
                    {cientesEfetivados.map(func => {
                      const isTemp = func.isTemporario;
                      return (
                        <div
                          key={func.id}
                          className="rounded-lg border-l-4 border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-400">
                                {func.matricula && <span className="text-muted-foreground font-mono mr-1">{func.matricula}</span>}
                                {func.nome_completo}
                              </span>
                              <Badge className="text-[10px] font-black px-2 py-0.5 bg-emerald-600 text-white">
                                🟢 EFETIVAR
                              </Badge>
                              <Badge className="text-[10px] font-black px-2 py-0.5 bg-emerald-600 text-white">
                                ✅ CIENTE
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] font-bold shrink-0 px-2',
                                  isTemp
                                    ? 'border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-950/40'
                                    : 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/40'
                                )}
                              >
                                {isTemp ? 'TEMPORÁRIO' : 'EFETIVO'}
                              </Badge>
                            </div>
                            {dataEfetivacao[func.id] && (
                              <div className="shrink-0 rounded-xl bg-emerald-600 text-white px-4 py-2 text-center">
                                <div className="text-lg font-black leading-none">{format(dataEfetivacao[func.id]!, 'dd/MM')}</div>
                                <div className="text-[9px] font-bold opacity-80">DATA EFETIVAÇÃO</div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1.5">
                            <span className="font-semibold text-foreground/80">{func.setor?.nome}{func.turma ? ` — ${func.turma}` : ''}</span>
                            <span>• {func.empresa || 'GLOBALPACK'}</span>
                            <span>• Adm: {format(parseISO(func.data_admissao!), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            <span>• {func.diasDesdeAdmissao} dias na empresa</span>
                            {dataEfetivacao[func.id] && (
                              <span className="font-bold text-emerald-600">• 📅 Programada: {format(dataEfetivacao[func.id]!, 'dd/MM/yyyy')}</span>
                            )}
                            {responsaveis[func.id] && (
                              <span className="font-bold text-primary">• 👤 {responsaveis[func.id]}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </>
  );
}
