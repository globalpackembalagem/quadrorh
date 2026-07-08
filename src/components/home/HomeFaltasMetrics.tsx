import { useMemo } from 'react';
import { eachDayOfInterval, parseISO, format } from 'date-fns';
import { usePeriodosFaltas, useRegistrosFaltas, useFuncionariosFaltas } from '@/hooks/useFaltas';
import { useQuadroPlanejado } from '@/hooks/useQuadroPlanejado';
import { useQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { DashboardFaltasDiario } from '@/components/faltas/DashboardFaltasDiario';
import { useFuncionariosNoQuadro } from '@/hooks/useFuncionarios';
import { normalizarTextoSistema } from '@/lib/normalizacao';

function isSetorDoQuadro(setor: { nome?: string; conta_no_quadro?: boolean } | null): boolean {
  if (!setor) return false;
  return setor.conta_no_quadro === true;
}

function getGrupoConsolidado(setorNome: string, setorGrupo: string | null, turma?: string | null): string {
  const nomeUpper = setorNome.toUpperCase();
  const grupoUpper = (setorGrupo || '').toUpperCase();

  if (grupoUpper) {
    if (grupoUpper.includes('SOPRO A')) return 'SOPRO A';
    if (grupoUpper.includes('SOPRO B')) return 'SOPRO B';
    if (grupoUpper.includes('SOPRO C')) return 'SOPRO C';
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
}

export function HomeFaltasMetrics() {
  const { data: periodos = [], isLoading: loadingPeriodos } = usePeriodosFaltas();
  const { data: quadroPlanejadoSopro = [] } = useQuadroPlanejado('SOPRO');
  const { data: quadroDecoracaoData = [] } = useQuadroDecoracao();
  

  // Auto-select active period (oldest open)
  const periodoAtivo = useMemo(() => {
    const abertos = periodos.filter(p => p.status === 'aberto');
    return abertos.length > 0 ? abertos[abertos.length - 1] : periodos[0] || null;
  }, [periodos]);

  const periodoId = periodoAtivo?.id || '';
  const { data: funcionarios = [] } = useFuncionariosFaltas(periodoId, periodoAtivo);
  const { data: funcionariosQuadro = [] } = useFuncionariosNoQuadro();
  const { data: registros = [] } = useRegistrosFaltas(periodoId);

  const funcionariosFiltrados = useMemo(() => {
    const periodoInicio = periodoAtivo ? parseISO(periodoAtivo.data_inicio) : null;
    const periodoFim = periodoAtivo ? parseISO(periodoAtivo.data_fim) : null;

    return funcionarios
      .filter(func => isSetorDoQuadro(func.setor))
      .map(func => {
        const situacaoNome = normalizarTextoSistema(func.situacao?.nome) || '';
        const isDesligado = situacaoNome.includes('DEMISS') ||
                            situacaoNome.includes('PED. DEMISSAO') ||
                            situacaoNome.includes('PEDIDO DEMISSAO') ||
                            situacaoNome.includes('TERMINO');
        
        // CORREÇÃO: Demitidos dentro do período devem contar no quadro (conta_no_quadro = true)
        // porque a regra diz que eles permanecem até o fim do período
        let contaNoQuadro = func.situacao?.conta_no_quadro ?? true;
        if (isDesligado && func.data_demissao && periodoInicio && periodoFim) {
          const demissao = parseISO(func.data_demissao);
          // Se demissão é dentro do período, forçar conta_no_quadro = true
          if (demissao >= periodoInicio && demissao <= periodoFim) {
            contaNoQuadro = true;
          }
        }

        return {
          ...func,
          situacao_conta_no_quadro: contaNoQuadro,
        };
      });
  }, [funcionarios, periodoAtivo]);

  const funcionariosAgrupados = useMemo(() => {
    const grupos: Record<string, typeof funcionariosFiltrados> = {};
    funcionariosFiltrados.forEach(func => {
      const setorNome = func.setor?.nome || 'SEM SETOR';
      const setorGrupo = func.setor?.grupo || null;
      const grupoConsolidado = getGrupoConsolidado(setorNome, setorGrupo, func.turma);
      if (!grupos[grupoConsolidado]) grupos[grupoConsolidado] = [];
      grupos[grupoConsolidado].push(func);
    });

    const ordemGrupos = ['SOPRO A', 'SOPRO B', 'SOPRO C', 'DECORAÇÃO DIA - T1', 'DECORAÇÃO DIA - T2', 'DECORAÇÃO NOITE - T1', 'DECORAÇÃO NOITE - T2'];
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

  const diasPeriodo = useMemo(() => {
    if (!periodoAtivo) return [];
    return eachDayOfInterval({
      start: parseISO(periodoAtivo.data_inicio),
      end: parseISO(periodoAtivo.data_fim),
    });
  }, [periodoAtivo]);

  const reservaFaltasPorSetor = useMemo(() => {
    const map: Record<string, number> = {};
    quadroPlanejadoSopro.forEach(qp => {
      map[`SOPRO ${qp.turma}`] = (qp.reserva_faltas_industria || 0) + (qp.reserva_faltas_gp || 0);
    });
    quadroDecoracaoData.forEach(qd => {
      const turmaMap: Record<string, string> = {
        'DIA-T1': 'DECORAÇÃO DIA - T1', 'DIA-T2': 'DECORAÇÃO DIA - T2',
        'NOITE-T1': 'DECORAÇÃO NOITE - T1', 'NOITE-T2': 'DECORAÇÃO NOITE - T2',
      };
      const key = turmaMap[qd.turma];
      if (key) map[key] = qd.reserva_faltas || 0;
    });
    return map;
  }, [quadroPlanejadoSopro, quadroDecoracaoData]);

  // Calcular o total NECESSÁRIO (planejado) por setor - usado para SALDO dinâmico por dia
  const necessarioPorSetor = useMemo(() => {
    const map: Record<string, number> = {};
    const calcPlanSopro = (d: any) => {
      const rrI = Math.round(d.aux_maquina_industria / 6);
      const rrGP = Math.round(d.aux_maquina_gp / 6);
      return d.aux_maquina_industria + d.reserva_ferias_industria + rrI +
        d.reserva_faltas_industria + d.amarra_pallets + d.revisao_frasco +
        d.mod_sindicalista + d.controle_praga + d.aux_maquina_gp +
        d.reserva_faltas_gp + rrGP + d.reserva_ferias_gp + d.aumento_quadro;
    };
    const calcPlanDeco = (d: any) => {
      const rr = d.reserva_refeicao || 0;
      return d.aux_maquina + rr + d.reserva_faltas +
        d.reserva_ferias + d.apoio_topografia + d.reserva_afastadas + d.reserva_covid;
    };

    ['A', 'B', 'C'].forEach(turma => {
      const planejado = quadroPlanejadoSopro.find(q => q.turma === turma);
      if (planejado) map[`SOPRO ${turma}`] = calcPlanSopro(planejado);
    });

    const decoLabels: Record<string, string> = {
      'DIA-T1': 'DECORAÇÃO DIA - T1', 'DIA-T2': 'DECORAÇÃO DIA - T2',
      'NOITE-T1': 'DECORAÇÃO NOITE - T1', 'NOITE-T2': 'DECORAÇÃO NOITE - T2',
    };
    Object.keys(decoLabels).forEach(turmaKey => {
      const planejado = quadroDecoracaoData.find(q => q.turma === turmaKey);
      if (planejado) map[decoLabels[turmaKey]] = calcPlanDeco(planejado);
    });

    return map;
  }, [quadroPlanejadoSopro, quadroDecoracaoData]);

  const sobraPorSetor = useMemo(() => {
    const map: Record<string, number> = {};

    ['A', 'B', 'C'].forEach(turma => {
      const setor = `SOPRO ${turma}`;
      const total = funcionariosQuadro.filter(f => f.setor?.grupo?.toUpperCase() === setor).length;
      map[setor] = total - (necessarioPorSetor[setor] ?? 0);
    });

    const decoLabels: Record<string, string> = {
      'DIA-T1': 'DECORAÃ‡ÃƒO DIA - T1',
      'DIA-T2': 'DECORAÃ‡ÃƒO DIA - T2',
      'NOITE-T1': 'DECORAÃ‡ÃƒO NOITE - T1',
      'NOITE-T2': 'DECORAÃ‡ÃƒO NOITE - T2',
    };
    const funcsDeco = funcionariosQuadro.filter(f => {
      const n = f.setor?.nome?.toUpperCase() || '';
      return n.includes('DECORAÃ‡ÃƒO') || n.includes('DECORACAO');
    });

    Object.entries(decoLabels).forEach(([turmaKey, setor]) => {
      const total = funcsDeco.filter(f => {
        const t = f.turma?.toUpperCase();
        const sn = f.setor?.nome?.toUpperCase() || '';
        const isDia = sn.includes('DIA');
        const isNoite = sn.includes('NOITE');
        if (t === 'T1' || t === '1') return (isDia && turmaKey === 'DIA-T1') || (isNoite && turmaKey === 'NOITE-T1');
        if (t === 'T2' || t === '2') return (isDia && turmaKey === 'DIA-T2') || (isNoite && turmaKey === 'NOITE-T2');
        return false;
      }).length;
      map[setor] = total - (necessarioPorSetor[setor] ?? 0);
    });

    return map;
  }, [funcionariosQuadro, necessarioPorSetor]);

  if (loadingPeriodos || !periodoAtivo || funcionariosAgrupados.length === 0) {
    return null;
  }

    return (
    <DashboardFaltasDiario
      funcionariosAgrupados={funcionariosAgrupados}
      registros={registros}
      diasPeriodo={diasPeriodo}
      periodo={periodoAtivo}
      reservaFaltasPorSetor={reservaFaltasPorSetor}
      sobraPorSetor={sobraPorSetor}
      necessarioPorSetor={necessarioPorSetor}
    />
  );
}


