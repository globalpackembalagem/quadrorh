import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Users, Wind, Palette, TrendingUp, TrendingDown, Minus, UserRound, UserRoundCheck, ArrowRight, AlertTriangle, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFuncionariosNoQuadro, useFuncionarios } from '@/hooks/useFuncionarios';
import { useQuadroPlanejado } from '@/hooks/useQuadroPlanejado';
import { useQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { useFuncionariosPrevisao } from '@/hooks/usePrevisoes';
import { usePeriodosFaltas, useRegistrosFaltas, useFuncionariosFaltas } from '@/hooks/useFaltas';
import { useAdmissaoRecente, agruparRecentesPorTurma } from '@/hooks/useAdmissaoRecente';
import { useTreinamentosPrevisao, filterByGrupo } from '@/hooks/useTreinamentosPrevisao';
import { useUsuario } from '@/contexts/UserContext';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DashboardFaltasDiario } from '@/components/faltas/DashboardFaltasDiario';
import { HistoricoMovimentacaoDialog, HistoricoMovimentacaoFullDialog } from '@/components/dashboard/HistoricoMovimentacaoDialog';
import { TreinamentosSetorDialog } from '@/components/dashboard/TreinamentosSetorDialog';
import { TreinamentoPrevisao } from '@/hooks/useTreinamentosPrevisao';
import { format, parseISO, eachDayOfInterval } from 'date-fns';

// Reuse calculation functions
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

// Verifica se o setor conta no quadro
function isSetorDoQuadro(setor: { nome?: string; conta_no_quadro?: boolean } | null): boolean {
  if (!setor) return false;
  return setor.conta_no_quadro === true;
}

// ── Sector Card (estilo referência) ──
function SetorCard({ label, total, necessario, homens, mulheres, previsao, recentes, treinamentos = [] }: {
  label: string;
  total: number;
  necessario: number;
  homens: number;
  mulheres: number;
  previsao: number;
  recentes?: { count: number; nomes: string[]; situacao: string } | null;
  treinamentos?: TreinamentoPrevisao[];
}) {
  const diferenca = total - necessario;
  const totalGender = homens + mulheres || 1;
  const pctHomens = Math.round((homens / totalGender) * 100);
  const pctMulheres = Math.round((mulheres / totalGender) * 100);

  return (
    <div className="rounded-xl border-2 border-border/50 bg-gradient-to-br from-card to-muted/20 p-5 shadow-md hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-base font-bold text-foreground">{label}</div>
        <div className="flex items-center gap-2">
          {recentes && recentes.count > 0 && (
            <button
              onClick={() => {
                const plural = recentes.count > 1 ? 'pessoas' : 'pessoa';
                toast.info(
                  `🆕 ${recentes.count} ${plural} em ${recentes.situacao} dos ${total}`,
                  {
                    description: recentes.nomes.join(', '),
                    duration: 8000,
                  }
                );
              }}
              className="flex items-center justify-center h-7 w-7 rounded-full bg-warning/20 text-warning hover:bg-warning/40 transition-colors cursor-pointer"
              title={`${recentes.count} admissão(ões) recente(s) — clique para ver`}
            >
              <AlertTriangle className="h-4 w-4" />
            </button>
          )}
          <HistoricoMovimentacaoDialog grupo={label} quadroAtual={total} necessario={necessario} />
          <TreinamentosSetorDialog grupoLabel={label} treinamentos={treinamentos} />
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Big number */}
      <div className="flex items-baseline gap-2 mb-2">
        <div className="text-4xl font-bold text-foreground tabular-nums">{total}</div>
        <div className="text-sm text-muted-foreground">/ {necessario}</div>
      </div>

      {/* Status badge */}
      <div className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-semibold",
        diferenca > 0 && "bg-green-500/10 text-green-600",
        diferenca < 0 && "bg-destructive/10 text-destructive",
        diferenca === 0 && "bg-muted text-muted-foreground"
      )}>
        {diferenca > 0 ? <><TrendingUp className="h-4 w-4" />+{diferenca} SOBRA</> :
         diferenca < 0 ? <><TrendingDown className="h-4 w-4" />{diferenca} FALTA</> :
         <><Minus className="h-4 w-4" />OK</>}
      </div>

      {/* Previsão */}
      {previsao > 0 ? (
        <div className="flex items-center justify-between gap-1.5 px-3 py-2 mt-2 mb-3 rounded-lg border border-primary/30 bg-primary/5 text-sm font-semibold text-primary w-full">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span>Previsão</span>
          </div>
          <span className="text-lg font-bold">+{previsao}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-1.5 px-3 py-2 mt-2 mb-3 rounded-lg border border-muted bg-muted/30 text-sm font-semibold text-muted-foreground w-full">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span>PREVISÃO</span>
          </div>
          <span className="text-lg font-bold">0</span>
        </div>
      )}

      {/* Homens / Mulheres */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 rounded-lg bg-chart-1/10">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-chart-1" />
            <span className="text-sm font-medium text-foreground">HOMENS</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-chart-1">{homens}</span>
            <span className="text-xs text-muted-foreground">({pctHomens}%)</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-chart-5/10">
          <div className="flex items-center gap-2">
            <UserRoundCheck className="h-4 w-4 text-chart-5" />
            <span className="text-sm font-medium text-foreground">MULHERES</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-chart-5">{mulheres}</span>
            <span className="text-xs text-muted-foreground">({pctMulheres}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { isRHMode } = useUsuario();

  // Data
  const { data: funcionariosQuadro = [], isLoading: l1 } = useFuncionariosNoQuadro();
  const { data: todosFuncionarios = [], isLoading: l2 } = useFuncionarios();
  const { data: quadroPlanejado = [], isLoading: l3 } = useQuadroPlanejado('SOPRO');
  const { data: quadroDecoracao = [], isLoading: l4 } = useQuadroDecoracao();
  const { data: funcionariosPrevisao = [] } = useFuncionariosPrevisao();
  const { data: periodos = [] } = usePeriodosFaltas();
  const { data: recentesSopro = [] } = useAdmissaoRecente('SOPRO');
  const { data: recentesDeco = [] } = useAdmissaoRecente('DECORAÇÃO');
  const { data: treinamentos = [] } = useTreinamentosPrevisao();
  const recentesSoproMap = useMemo(() => agruparRecentesPorTurma(recentesSopro, 'SOPRO'), [recentesSopro]);
  const recentesDecoMap = useMemo(() => agruparRecentesPorTurma(recentesDeco, 'DECORAÇÃO'), [recentesDeco]);

  const isLoading = l1 || l2 || l3 || l4;

  // Período ativo: prioriza o que contém a data de hoje
  const periodosAbertos = useMemo(() => {
    return periodos.filter(p => p.status === 'aberto');
  }, [periodos]);

  const periodoDefault = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    // Primeiro tenta achar o que contém hoje
    const contem = periodosAbertos.find(p => p.data_inicio <= hoje && p.data_fim >= hoje);
    if (contem) return contem;
    // Se não, pega o mais recente aberto
    return periodosAbertos.length > 0 ? periodosAbertos[0] : periodos[0];
  }, [periodosAbertos, periodos]);

  const [periodoSelecionadoId, setPeriodoSelecionadoId] = useState<string | null>(null);

  const periodoAtivo = useMemo(() => {
    if (periodoSelecionadoId) {
      return periodos.find(p => p.id === periodoSelecionadoId) || periodoDefault;
    }
    return periodoDefault;
  }, [periodoSelecionadoId, periodos, periodoDefault]);

  const periodoId = periodoAtivo?.id || '';

  const { data: funcionariosFaltas = [] } = useFuncionariosFaltas(periodoId, periodoAtivo);
  const { data: registrosFaltas = [] } = useRegistrosFaltas(periodoId);

  // ── Sopro metrics ──
  const funcionariosSopro = useMemo(() =>
    funcionariosQuadro.filter(f => f.setor?.nome?.toUpperCase().includes('SOPRO')),
    [funcionariosQuadro]
  );

  const soproCards = useMemo(() => {
    return ['A', 'B', 'C'].map(turma => {
      const grupoEsperado = `SOPRO ${turma}`;
      const funcs = funcionariosSopro.filter(f => f.setor?.grupo?.toUpperCase() === grupoEsperado);
      const planejado = quadroPlanejado.find(q => q.turma === turma);
      const necessario = planejado ? calcularTotalPlanejadoSopro(planejado) : 0;
      const previsao = funcionariosPrevisao.filter(fp => fp.setor?.grupo?.toUpperCase() === grupoEsperado).length;
      const isTemp = (f: any) => f.matricula?.toUpperCase().startsWith('TEMP');
      return {
        label: `SOPRO ${turma}`,
        total: funcs.length,
        necessario,
        homens: funcs.filter(f => f.sexo === 'masculino').length,
        mulheres: funcs.filter(f => f.sexo === 'feminino').length,
        previsao,
        efetivos: funcs.filter(f => !isTemp(f)).length,
        temporarios: funcs.filter(f => isTemp(f)).length,
        recentes: recentesSoproMap[turma] || null,
        treinamentos: filterByGrupo(treinamentos, `SOPRO ${turma}`),
      };
    });
  }, [funcionariosSopro, quadroPlanejado, funcionariosPrevisao, recentesSoproMap, treinamentos]);

  // ── Decoração metrics ──
  const funcionariosDecoracao = useMemo(() =>
    funcionariosQuadro.filter(f => {
      const n = f.setor?.nome?.toUpperCase() || '';
      return n.includes('DECORAÇÃO') || n.includes('DECORACAO');
    }),
    [funcionariosQuadro]
  );

  const decoCards = useMemo(() => {
    const turmas = ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'];
      const labels: Record<string, string> = {
        'DIA-T1': 'DIA T1', 'DIA-T2': 'DIA T2', 'NOITE-T1': 'NOITE T1', 'NOITE-T2': 'NOITE T2'
      };
      const treinamentoLabels: Record<string, string> = {
        'DIA-T1': 'DIA - T1', 'DIA-T2': 'DIA - T2', 'NOITE-T1': 'NOITE - T1', 'NOITE-T2': 'NOITE - T2'
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
      const planejado = quadroDecoracao.find(q => q.turma === turmaKey);
      const necessario = planejado ? calcularTotalPlanejadoDecoracao(planejado) : 0;
      // Previsão: match by grupo containing DECORAÇÃO + DIA/NOITE and turma
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
      const isTemp = (f: any) => f.matricula?.toUpperCase().startsWith('TEMP');
      return {
        label: labels[turmaKey],
        total: funcs.length,
        necessario,
        homens: funcs.filter(f => f.sexo === 'masculino').length,
        mulheres: funcs.filter(f => f.sexo === 'feminino').length,
        previsao,
        efetivos: funcs.filter(f => !isTemp(f)).length,
        temporarios: funcs.filter(f => isTemp(f)).length,
        recentes: recentesDecoMap[turmaKey] || null,
      };
    });
  }, [funcionariosDecoracao, quadroDecoracao, funcionariosPrevisao, recentesDecoMap]);

  // ── Painel Geral totals ──
  const totalFuncionarios = funcionariosQuadro.length;
  const totalExperiencia = useMemo(() =>
    funcionariosPrevisao.length,
    [funcionariosPrevisao]
  );
  const totalEscala = useMemo(() => {
    const totalSopro = soproCards.reduce((s, c) => s + c.necessario, 0);
    const totalDeco = decoCards.reduce((s, c) => s + c.necessario, 0);
    return totalSopro + totalDeco;
  }, [soproCards, decoCards]);

  // ── Faltas data for dashboard ──
  const diasPeriodo = useMemo(() => {
    if (!periodoAtivo) return [];
    return eachDayOfInterval({
      start: parseISO(periodoAtivo.data_inicio),
      end: parseISO(periodoAtivo.data_fim),
    });
  }, [periodoAtivo]);

  // Helper to get consolidated group
  const getGrupoConsolidado = (setorNome: string, setorGrupo: string | null, turma?: string | null): string => {
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
  };

  const funcionariosFaltasFiltrados = useMemo(() => {
    return funcionariosFaltas.filter(f => isSetorDoQuadro(f.setor));
  }, [funcionariosFaltas]);

  const funcionariosAgrupados = useMemo(() => {
    const grupos: Record<string, typeof funcionariosFaltasFiltrados> = {};
    funcionariosFaltasFiltrados.forEach(func => {
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
      funcionarios: grupos[setor].sort((a: any, b: any) => a.nome_completo.localeCompare(b.nome_completo)),
    }));
  }, [funcionariosFaltasFiltrados]);

  // Mapeamento setor agrupado → reserva de faltas
  const reservaFaltasPorSetor = useMemo(() => {
    const map: Record<string, number> = {};
    quadroPlanejado.forEach(qp => {
      map[`SOPRO ${qp.turma}`] = (qp.reserva_faltas_industria || 0) + (qp.reserva_faltas_gp || 0);
    });
    quadroDecoracao.forEach(qd => {
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
  }, [quadroPlanejado, quadroDecoracao]);

  // Mapeamento setor agrupado → sobra do quadro (real - necessário)
  const sobraPorSetor = useMemo(() => {
    const map: Record<string, number> = {};
    soproCards.forEach(card => {
      map[card.label] = card.total - card.necessario;
    });
    const decoTurmaKeys = ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'];
    const decoLabels: Record<string, string> = {
      'DIA-T1': 'DECORAÇÃO DIA - T1',
      'DIA-T2': 'DECORAÇÃO DIA - T2',
      'NOITE-T1': 'DECORAÇÃO NOITE - T1',
      'NOITE-T2': 'DECORAÇÃO NOITE - T2',
    };
    decoCards.forEach((card, idx) => {
      const key = decoLabels[decoTurmaKeys[idx]];
      if (key) map[key] = card.total - card.necessario;
    });
    return map;
  }, [soproCards, decoCards]);

  // Total faltas no período
  const totalFaltasPeriodo = useMemo(() => {
    return registrosFaltas.filter(r => r.tipo === 'F').length;
  }, [registrosFaltas]);

  const totalAtestadosPeriodo = useMemo(() => {
    return registrosFaltas.filter(r => r.tipo === 'A').length;
  }, [registrosFaltas]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════ */}
      {/* BOTÃO QUADRO COMPLETO - TOPO */}
      {/* ═══════════════════════════════════════════ */}
      {isRHMode && (
        <div className="flex justify-end gap-3">
          <Button
            size="lg"
            className="gap-3 text-base font-bold px-10 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            onClick={() => navigate('/dashboard')}
          >
            Acessar Quadro Completo
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* ═══════════════════════════════════════════ */}
      {/* 1. BLOCO SOPRO */}
      {/* ═══════════════════════════════════════════ */}
      <section className="rounded-2xl bg-muted/30 p-6 border border-border/40">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Wind className="h-4.5 w-4.5 text-white" />
          </div>
          <h2 className="text-lg font-extrabold tracking-wide text-foreground">SETOR SOPRO</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {soproCards.map(card => (
            <SetorCard key={card.label} {...card} />
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════ */}
      {/* 3. BLOCO DECORAÇÃO */}
      {/* ═══════════════════════════════════════════ */}
      <section className="rounded-2xl bg-muted/30 p-6 border border-border/40">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-9 w-9 rounded-lg bg-chart-2 flex items-center justify-center">
            <Palette className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-extrabold tracking-wide text-foreground">SETOR DECORAÇÃO</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {decoCards.map(card => (
            <SetorCard key={card.label} {...card} />
          ))}
        </div>
      </section>


      {/* ═══════════════════════════════════════════ */}
      {/* 4. BLOCO MÉTRICAS DE FALTAS */}
      {/* ═══════════════════════════════════════════ */}
      <section className="rounded-2xl bg-muted/30 p-6 border border-border/40">
        <div className="flex items-center gap-2.5 mb-5 flex-wrap">
          <div className="h-9 w-9 rounded-lg bg-destructive flex items-center justify-center">
            <AlertTriangle className="h-4.5 w-4.5 text-destructive-foreground" />
          </div>
          <h2 className="text-lg font-extrabold tracking-wide text-foreground">MÉTRICAS DE FALTAS</h2>
          
          {/* Seletor de período */}
          {periodosAbertos.length > 1 && (
            <select
              value={periodoAtivo?.id || ''}
              onChange={e => setPeriodoSelecionadoId(e.target.value)}
              className="ml-auto px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {periodosAbertos.map(p => {
                const label = `${format(parseISO(p.data_inicio), 'dd/MM')} – ${format(parseISO(p.data_fim), 'dd/MM/yyyy')}`;
                return (
                  <option key={p.id} value={p.id}>{label}</option>
                );
              })}
            </select>
          )}
          
          {periodoAtivo && periodosAbertos.length <= 1 && (
            <span className="text-xs text-muted-foreground ml-2">
              {format(parseISO(periodoAtivo.data_inicio), 'dd/MM')} – {format(parseISO(periodoAtivo.data_fim), 'dd/MM')}
            </span>
          )}
        </div>

        {/* Detalhamento por setor/dia */}
        {periodoAtivo && funcionariosAgrupados.length > 0 && (
          <DashboardFaltasDiario
            funcionariosAgrupados={funcionariosAgrupados}
            registros={registrosFaltas}
            diasPeriodo={diasPeriodo}
            periodo={periodoAtivo}
            reservaFaltasPorSetor={reservaFaltasPorSetor}
            sobraPorSetor={sobraPorSetor}
          />
        )}
      </section>
    </div>
  );
}
