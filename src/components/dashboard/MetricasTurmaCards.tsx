import { useMemo } from 'react';
import { Users, TrendingUp, TrendingDown, Minus, UserPlus, UserX, GraduationCap, UserRound, UserRoundCheck, AlertTriangle } from 'lucide-react';


import { Funcionario, QuadroPlanejado, QuadroDecoracao } from '@/types/database';
import { TreinamentoPrevisao, enrichStatus, filterByGrupo } from '@/hooks/useTreinamentosPrevisao';

import { useUsuario } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { getTrabalhaOuFolga } from '@/lib/escalaPanama';
import { useAutoEfetivarTrocasProgramadas, useTrocasTurno } from '@/hooks/useTrocasTurno';
import { useSistemaConfig } from '@/hooks/useSistemaConfig';
import { toast } from 'sonner';
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type StatusPorTurma = Record<string, { total: number; nomes: string[] }>;
type RecentesPorTurma = Record<string, { count: number; nomes: string[]; situacao: string }>;
type PrevisaoCardItem = Partial<Funcionario> & {
  id: string;
  nome_completo: string;
  data_programada?: string | null;
  origem?: string | null;
  isTransferencia?: boolean;
};

interface MetricasTurmaCardsProps {
  grupo: 'SOPRO' | 'DECORAÇÃO';
  funcionarios: Funcionario[];
  quadroPlanejadoSopro?: QuadroPlanejado[];
  quadroPlanejadoDecoracao?: QuadroDecoracao[];
  funcionariosPrevisao?: Funcionario[];
  sumidosPorTurma?: StatusPorTurma;
  cobFeriasPorTurma?: StatusPorTurma;
  treinamentoPorTurma?: StatusPorTurma;
  mostrarSumidos?: boolean;
  recentesPorTurma?: RecentesPorTurma;
  treinamentosPrevisao?: TreinamentoPrevisao[];
}

// Turmas para cada grupo
const TURMAS_SOPRO = ['A', 'B', 'C'];
const TURMAS_DECORACAO = ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'];

const TURMAS_LABELS: Record<string, string> = {
  'A': 'SOPRO A',
  'B': 'SOPRO B',
  'C': 'SOPRO C',
  'DIA-T1': 'DECORAÇÃO DIA - T1',
  'DIA-T2': 'DECORAÇÃO DIA - T2',
  'NOITE-T1': 'DECORAÇÃO NOITE - T1',
  'NOITE-T2': 'DECORAÇÃO NOITE - T2',
};

const normalizarTurma = (turma?: string | null) =>
  (turma || '').toUpperCase().trim().replace(/^TURMA\s*/, '');

const isAdmissaoEmTreinamento = (f: Funcionario) => {
  const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
  const isAtivoOuTreinamento = situacaoNome === 'ATIVO' || situacaoNome.includes('TREINAMENTO');
  if (!isAtivoOuTreinamento || !f.data_admissao) return false;

  const hoje = startOfDay(new Date());
  const admissao = startOfDay(parseISO(f.data_admissao));
  if (Number.isNaN(admissao.getTime())) return false;

  const diasDesdeAdmissao = differenceInCalendarDays(hoje, admissao);
  return diasDesdeAdmissao >= 0 && diasDesdeAdmissao <= 1;
};

const getTurmaCardFuncionario = (f: Funcionario, grupo: 'SOPRO' | 'DECORAÃ‡ÃƒO') => {
  if (grupo === 'SOPRO') {
    const grupoSetor = f.setor?.grupo?.toUpperCase() || '';
    const match = grupoSetor.match(/SOPRO\s+([ABC])/);
    return match?.[1] || null;
  }

  const turmaFunc = normalizarTurma(f.turma);
  const setorNome = f.setor?.nome?.toUpperCase() || '';
  const isDia = setorNome.includes('DIA');
  const isNoite = setorNome.includes('NOITE');

  if (turmaFunc === 'T1' || turmaFunc === '1') return isDia ? 'DIA-T1' : isNoite ? 'NOITE-T1' : null;
  if (turmaFunc === 'T2' || turmaFunc === '2') return isDia ? 'DIA-T2' : isNoite ? 'NOITE-T2' : null;
  return null;
};

const normalizarTexto = (texto?: string | null) =>
  (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const motivoIndisponivelPorSituacao = (situacao?: string | null) => {
  const nome = normalizarTexto(situacao);
  if (!nome) return null;
  if (nome.includes('AUXILIO') || nome.includes('DOENCA') || nome.includes('INSS')) return 'AUXILIO DOENCA / INSS';
  if (nome.includes('COBERTURA') && nome.includes('FERIAS')) return 'COBERTURA FERIAS';
  if (nome.includes('TREINAMENTO')) return 'TREINAMENTO';
  if (nome.includes('AFAST')) return 'AFASTADO';
  if (nome.includes('SUMIDO')) return 'SUMIDO';
  return null;
};
// Calcular total planejado para SOPRO
function calcularTotalPlanejadoSopro(dados: QuadroPlanejado): number {
  const reservaRefeicaoIndustria = Math.round(dados.aux_maquina_industria / 6);
  const reservaRefeicaoGP = Math.round(dados.aux_maquina_gp / 6);
  
  return (
    dados.aux_maquina_industria +
    dados.reserva_ferias_industria +
    reservaRefeicaoIndustria +
    dados.reserva_faltas_industria +
    dados.amarra_pallets +
    dados.revisao_frasco +
    dados.mod_sindicalista +
    dados.controle_praga +
    dados.aux_maquina_gp +
    dados.reserva_faltas_gp +
    reservaRefeicaoGP +
    dados.reserva_ferias_gp +
    dados.aumento_quadro
  );
}

// Calcular total planejado para DECORACAO
function calcularTotalPlanejadoDecoracao(dados: QuadroDecoracao): number {
  return (
    dados.aux_maquina +
    dados.reserva_refeicao +
    dados.reserva_faltas +
    dados.reserva_ferias +
    dados.apoio_topografia +
    dados.reserva_afastadas +
    dados.reserva_covid
  );
}

export function MetricasTurmaCards({ grupo, funcionarios, quadroPlanejadoSopro = [], quadroPlanejadoDecoracao = [], funcionariosPrevisao = [], sumidosPorTurma = {}, cobFeriasPorTurma = {}, treinamentoPorTurma = {}, mostrarSumidos = false, recentesPorTurma = {}, treinamentosPrevisao = [] }: MetricasTurmaCardsProps) {
  const turmas = grupo === 'SOPRO' ? TURMAS_SOPRO : TURMAS_DECORACAO;
  const { usuarioAtual } = useUsuario();
  const { indisponiveisSituacaoIds } = useSistemaConfig();
  const { data: trocasTurno = [] } = useTrocasTurno();
  useAutoEfetivarTrocasProgramadas(trocasTurno);
  const escalaHojeDecoracao = useMemo(() => ({
    T1: getTrabalhaOuFolga(new Date(), 'T1'),
    T2: getTrabalhaOuFolga(new Date(), 'T2'),
  }), []);


  // Calcular métricas por turma usando a mesma lógica do Quadro Real
  const metricasPorTurma = useMemo(() => {
    const result: Record<string, { 
      total: number; 
      homens: number; 
      mulheres: number;
      quadroNecessario: number;
      diferenca: number;
      previsoes: number;
      previsoesLista: PrevisaoCardItem[];
    }> = {};
    
    turmas.forEach(turma => {
      result[turma] = { total: 0, homens: 0, mulheres: 0, quadroNecessario: 0, diferenca: 0, previsoes: 0, previsoesLista: [] };
    });
    
    const trocasProgramadas = trocasTurno.filter(t =>
      t.data_programada &&
      !t.efetivada &&
      t.status === 'pendente_rh'
    );

    if (grupo === 'SOPRO') {
      // SOPRO: usar o grupo do setor para agrupar (SOPRO A, SOPRO B, SOPRO C)
      turmas.forEach(turma => {
        const grupoEsperado = `SOPRO ${turma}`;
        const funcTurma = funcionarios.filter(f => {
          const grupoSetor = f.setor?.grupo?.toUpperCase() || '';
          return grupoSetor === grupoEsperado;
        });
        
        result[turma].total = funcTurma.length;
        result[turma].homens = funcTurma.filter(f => f.sexo === 'masculino').length;
        result[turma].mulheres = funcTurma.filter(f => f.sexo === 'feminino').length;
        
        // Buscar quadro necessário
        const planejado = quadroPlanejadoSopro.find(q => q.turma === turma);
        if (planejado) {
          result[turma].quadroNecessario = calcularTotalPlanejadoSopro(planejado);
        }
        result[turma].diferenca = result[turma].total - result[turma].quadroNecessario;
      });
    } else {
      // DECORAÇÃO: usar nome do setor (DIA/NOITE) + turma (T1/T2)
      funcionarios.forEach(f => {
        const turmaFunc = f.turma?.toUpperCase();
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isDia = setorNome.includes('DIA');
        const isNoite = setorNome.includes('NOITE');
        
        let turmaKey: string | null = null;
        
        if (turmaFunc === 'T1' || turmaFunc === '1') {
          turmaKey = isDia ? 'DIA-T1' : isNoite ? 'NOITE-T1' : null;
        } else if (turmaFunc === 'T2' || turmaFunc === '2') {
          turmaKey = isDia ? 'DIA-T2' : isNoite ? 'NOITE-T2' : null;
        }
        
        if (turmaKey && result[turmaKey]) {
          result[turmaKey].total++;
          if (f.sexo === 'masculino') {
            result[turmaKey].homens++;
          } else {
            result[turmaKey].mulheres++;
          }
        }
      });
      
      // Calcular quadro necessário para decoração
      turmas.forEach(turma => {
        const planejado = quadroPlanejadoDecoracao.find(q => q.turma === turma);
        if (planejado) {
          result[turma].quadroNecessario = calcularTotalPlanejadoDecoracao(planejado);
        }
        result[turma].diferenca = result[turma].total - result[turma].quadroNecessario;
      });
    }

    // Contar previsões por turma
    if (grupo === 'SOPRO') {
      turmas.forEach(turma => {
        const grupoEsperado = `SOPRO ${turma}`;
        const lista = funcionariosPrevisao.filter(f => {
          const grupoSetor = f.setor?.grupo?.toUpperCase() || '';
          return grupoSetor === grupoEsperado;
        });
        const trocasDaTurma = trocasProgramadas
          .filter(t => {
            const destino = t.setor_destino?.nome?.toUpperCase() || '';
            return destino.includes('SOPRO') && destino.includes(` ${turma}`);
          })
          .map(t => ({
            id: `troca-${t.id}`,
            nome_completo: t.funcionario?.nome_completo || 'TRANSFERENCIA PROGRAMADA',
            matricula: t.funcionario?.matricula || null,
            turma: t.turma_destino || t.funcionario?.turma || null,
            empresa: 'TRANSFERENCIA PROGRAMADA',
            setor: { nome: t.setor_destino?.nome || 'SETOR DESTINO' },
            data_programada: t.data_programada,
            origem: t.setor_origem?.nome || null,
            isTransferencia: true,
          } as PrevisaoCardItem));
        result[turma].previsoes = lista.length + trocasDaTurma.length;
        result[turma].previsoesLista = [...lista, ...trocasDaTurma];
      });
    } else {
      funcionariosPrevisao.forEach(f => {
        const turmaFunc = f.turma?.toUpperCase();
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isDia = setorNome.includes('DIA');
        const isNoite = setorNome.includes('NOITE');
        
        let turmaKey: string | null = null;
        if (turmaFunc === 'T1' || turmaFunc === '1') {
          turmaKey = isDia ? 'DIA-T1' : isNoite ? 'NOITE-T1' : null;
        } else if (turmaFunc === 'T2' || turmaFunc === '2') {
          turmaKey = isDia ? 'DIA-T2' : isNoite ? 'NOITE-T2' : null;
        }
        
        if (turmaKey && result[turmaKey]) {
          result[turmaKey].previsoes++;
          result[turmaKey].previsoesLista.push(f);
        }
      });

      trocasProgramadas.forEach(t => {
        const turmaFunc = t.turma_destino?.toUpperCase();
        const setorNome = t.setor_destino?.nome?.toUpperCase() || '';
        const isDia = setorNome.includes('DIA');
        const isNoite = setorNome.includes('NOITE');

        let turmaKey: string | null = null;
        if (turmaFunc === 'T1' || turmaFunc === '1') {
          turmaKey = isDia ? 'DIA-T1' : isNoite ? 'NOITE-T1' : null;
        } else if (turmaFunc === 'T2' || turmaFunc === '2') {
          turmaKey = isDia ? 'DIA-T2' : isNoite ? 'NOITE-T2' : null;
        }

        if (turmaKey && result[turmaKey]) {
          result[turmaKey].previsoes++;
          result[turmaKey].previsoesLista.push({
            id: `troca-${t.id}`,
            nome_completo: t.funcionario?.nome_completo || 'TRANSFERENCIA PROGRAMADA',
            matricula: t.funcionario?.matricula || null,
            turma: t.turma_destino || t.funcionario?.turma || null,
            empresa: 'TRANSFERENCIA PROGRAMADA',
            setor: { nome: t.setor_destino?.nome || 'SETOR DESTINO' },
            data_programada: t.data_programada,
            origem: t.setor_origem?.nome || null,
            isTransferencia: true,
          } as PrevisaoCardItem);
        }
      });
    }
    
    return result;
  }, [funcionarios, turmas, grupo, quadroPlanejadoSopro, quadroPlanejadoDecoracao, funcionariosPrevisao, usuarioAtual, trocasTurno]);

  return (
    <div className={`grid gap-4 ${grupo === 'SOPRO' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
      {turmas.map(turma => {
        const metricas = metricasPorTurma[turma];
        const grupoLabel = grupo === 'SOPRO' ? `SOPRO ${turma}` : turma;
        const turmaDecoracao = turma.includes('T1') ? 'T1' : turma.includes('T2') ? 'T2' : null;
        const trabalhaHoje = grupo !== 'SOPRO' && turmaDecoracao ? escalaHojeDecoracao[turmaDecoracao] : null;
        const treinamentosDaTurma = filterByGrupo(treinamentosPrevisao, TURMAS_LABELS[turma]);
        const treinamentosAtivos = treinamentosDaTurma
          .map(enrichStatus)
          .filter(t => t.statusReal === 'EM TREINAMENTO');
        const idsComTreinamento = new Set(treinamentosAtivos.map(t => t.funcionario_id));
        const admitidosRecentesDaTurma = funcionarios.filter(f =>
          isAdmissaoEmTreinamento(f) &&
          getTurmaCardFuncionario(f, grupo) === turma &&
          !idsComTreinamento.has(f.id)
        );
        const transferenciasRecentesDaTurma = trocasTurno.filter(t => {
          if (!t.efetivada || !t.data_efetivada || idsComTreinamento.has(t.funcionario_id)) return false;
          const efetivada = startOfDay(parseISO(t.data_efetivada));
          if (Number.isNaN(efetivada.getTime())) return false;
          const diasDesdeEfetivacao = differenceInCalendarDays(startOfDay(new Date()), efetivada);
          if (diasDesdeEfetivacao < 0 || diasDesdeEfetivacao > 1) return false;

          return getTurmaCardFuncionario({
            turma: t.turma_destino || t.funcionario?.turma || null,
            setor: { nome: t.setor_destino?.nome || '' },
          } as Funcionario, grupo) === turma;
        });
        const treinamentoCardItems = [
          ...treinamentosAtivos.map(t => ({
            id: t.funcionario_id,
            matricula: t.matricula,
            nome: t.nome_completo,
            inicio: t.treinamento_inicio,
            termino: t.treinamento_expiracao,
          })),
          ...admitidosRecentesDaTurma.map(f => ({
            id: f.id,
            matricula: f.matricula,
            nome: f.nome_completo,
            inicio: f.data_admissao || new Date().toISOString(),
            termino: addDays(parseISO(f.data_admissao || new Date().toISOString()), 1).toISOString(),
          })),
          ...transferenciasRecentesDaTurma.map(t => ({
            id: `troca-${t.id}`,
            matricula: t.funcionario?.matricula || null,
            nome: `${t.funcionario?.nome_completo || 'TRANSFERENCIA'} - TRANSFERENCIA`,
            inicio: t.data_efetivada || new Date().toISOString(),
            termino: addDays(parseISO(t.data_efetivada || new Date().toISOString()), 1).toISOString(),
          })),
        ];
        
        const sumidosInfo = sumidosPorTurma[turma] || { total: 0, nomes: [] };
        const cobFeriasInfo = cobFeriasPorTurma[turma] || { total: 0, nomes: [] };
        const treinamentoInfo = treinamentoPorTurma[turma] || { total: 0, nomes: [] };
        const indisponiveisMap = new Map<string, { nome: string; motivo: string }>();
        const adicionarIndisponivel = (nome: string, motivo: string) => {
          const chave = normalizarTexto(nome);
          if (!chave || indisponiveisMap.has(chave)) return;
          indisponiveisMap.set(chave, { nome, motivo });
        };

        const usaConfiguracaoSistema = indisponiveisSituacaoIds.length > 0;
        if (!usaConfiguracaoSistema) {
          sumidosInfo.nomes.forEach(nome => adicionarIndisponivel(nome, 'SUMIDO'));
          cobFeriasInfo.nomes.forEach(nome => adicionarIndisponivel(nome, 'COBERTURA FERIAS'));
          treinamentoInfo.nomes.forEach(nome => adicionarIndisponivel(nome, 'TREINAMENTO'));
        }
        funcionarios
          .filter(f => getTurmaCardFuncionario(f, grupo) === turma)
          .forEach(f => {
            const motivo = usaConfiguracaoSistema
              ? (indisponiveisSituacaoIds.includes(f.situacao_id) ? f.situacao?.nome || 'INDISPONIVEL' : null)
              : motivoIndisponivelPorSituacao(f.situacao?.nome);
            if (motivo) adicionarIndisponivel(f.nome_completo, motivo);
          });

        const indisponiveisLista = Array.from(indisponiveisMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
        const indisponiveisTotal = indisponiveisLista.length;
        const totalAjustado = metricas.total;
        const percentHomens = metricas.total > 0 ? Math.round((metricas.homens / metricas.total) * 100) : 0;
        const percentMulheres = metricas.total > 0 ? Math.round((metricas.mulheres / metricas.total) * 100) : 0;
        const totalDisponivel = totalAjustado - indisponiveisTotal;
        const diferenca = totalDisponivel - metricas.quadroNecessario;
        const desfalqueOperacional = Math.abs(Math.min(diferenca, 0));
        
        return (
          <div 
            key={turma} 
            className="rounded-[20px] border border-[#E7EDF7] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,.08)] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_16px_38px_rgba(0,87,217,.14)] sm:p-6"
          >
             <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0 truncate text-sm font-bold text-[#1F2937] sm:text-base">
                {TURMAS_LABELS[turma]}
                {trabalhaHoje !== null && (
                  <div className={cn(
                    "mt-1 w-fit rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wide",
                    trabalhaHoje ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  )}>
                    {trabalhaHoje ? 'TRABALHANDO HOJE' : 'FOLGA HOJE'}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Badge de admissão recente */}
                {recentesPorTurma[turma] && recentesPorTurma[turma].count > 0 && (
                  <button
                    onClick={() => {
                      const info = recentesPorTurma[turma];
                      const plural = info.count > 1 ? 'pessoas' : 'pessoa';
                      toast.info(
                        `🆕 ${info.count} ${plural} em ${info.situacao} dos ${totalAjustado}`,
                        {
                          description: info.nomes.join(', '),
                          duration: 8000,
                        }
                      );
                    }}
                    className="flex items-center justify-center h-7 w-7 rounded-full bg-warning/20 text-warning hover:bg-warning/40 transition-colors cursor-pointer"
                    title={`${recentesPorTurma[turma].count} admissão(ões) recente(s) — clique para ver`}
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </button>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF3FF]">
                  <Users className="h-5 w-5 text-[#0057D9]" />
                </div>
              </div>
            </div>
            
            {/* Quadro Real e Necessário */}
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-[42px] font-bold leading-none text-[#0057D9] tabular-nums">
                {totalDisponivel}
              </div>
              <div className="text-sm font-medium text-[#6B7280]">
                / {metricas.quadroNecessario}
              </div>
            </div>

            
            {/* Indicador de Sobra/Desfalque */}
            <Popover>
              <PopoverTrigger asChild>
                <button className={cn(
                  "flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-colors sm:text-sm",
                  diferenca > 0 && "bg-[#0057D9] text-white hover:bg-[#0048B5]",
                  diferenca < 0 && "bg-[#FDECEC] text-[#E53935] hover:bg-[#F9DCDC]",
                  diferenca === 0 && "bg-[#EAF8EF] text-[#1FA750] hover:bg-[#DDF4E6]"
                )}>
                  {diferenca > 0 ? (
                    <>
                      <TrendingUp className="h-4 w-4" />
                      <span>+{diferenca} SOBRA</span>
                    </>
                  ) : diferenca < 0 ? (
                    <>
                      <TrendingDown className="h-4 w-4" />
                      <span>{diferenca} DESFALQUE</span>
                    </>
                  ) : (
                    <>
                      <Minus className="h-4 w-4" />
                      <span>QUADRO OK</span>
                    </>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3" align="start">
                <div className="space-y-1.5 text-sm">
                  <h4 className="mb-2 font-semibold">Cálculo do quadro - {TURMAS_LABELS[turma]}</h4>
                  <div className="flex justify-between"><span>Quadro necessário</span><strong>{metricas.quadroNecessario}</strong></div>
                  <div className="flex justify-between"><span>Quadro cadastrado</span><strong>{totalAjustado}</strong></div>
                  <div className="flex justify-between text-[#E53935]"><span>Indisponiveis</span><strong>{indisponiveisTotal > 0 ? `-${indisponiveisTotal}` : 0}</strong></div>
                  <div className="flex justify-between"><span>Disponíveis</span><strong>{totalDisponivel}</strong></div>
                  <div className="mt-2 rounded-md bg-muted p-2 font-semibold">
                    {diferenca < 0
                      ? `Desfalque: ${metricas.quadroNecessario} - ${totalDisponivel} = ${desfalqueOperacional}`
                      : diferenca > 0
                        ? `Sobra: ${totalDisponivel} - ${metricas.quadroNecessario} = ${diferenca}`
                        : 'Quadro completo'}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {indisponiveisTotal > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="mt-2 flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-xl border border-[#E53935]/30 bg-[#FDECEC] px-2 py-2 text-[11px] font-semibold text-[#E53935] transition-colors hover:bg-[#F9DCDC] sm:px-3 sm:text-sm">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 shrink-0" />
                      <span>INDISPONIVEIS</span>
                    </div>
                    <span className="text-base font-bold sm:text-lg">{indisponiveisTotal}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm mb-2 text-[#E53935]">INDISPONIVEIS - {TURMAS_LABELS[turma]}</h4>
                    <div className="max-h-56 overflow-y-auto space-y-1.5">
                      {indisponiveisLista.map((item, i) => (
                        <div key={`${item.nome}-${item.motivo}-${i}`} className="text-xs p-2 rounded-md bg-[#FDECEC] border border-[#E53935]/20">
                          <div className="font-semibold">{item.nome}</div>
                          <div className="mt-0.5 text-[#E53935]">{item.motivo}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="mt-2 flex w-full items-center justify-between gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F4F8FF] px-2 py-2 text-[11px] font-semibold text-[#6B7280] sm:px-3 sm:text-sm">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 shrink-0" />
                  <span>INDISPONIVEIS</span>
                </div>
                <span className="text-base font-bold sm:text-lg">0</span>
              </div>
            )}

            {/* Previsão de Admissão - sempre visível */}
            {treinamentoCardItems.length > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="mt-2 flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-xl border border-[#FFC107]/40 bg-[#FFF8E1] px-2 py-2 text-[11px] font-semibold text-[#FFC107] transition-colors hover:bg-[#FFF3C4] sm:px-3 sm:text-sm">
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      <GraduationCap className="h-4 w-4 shrink-0" />
                      <span className="truncate whitespace-nowrap">EM TREINAMENTO (2 DIAS)</span>
                    </div>
                    <span className="shrink-0 text-base sm:text-lg font-bold">{treinamentoCardItems.length}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm mb-2 text-warning">EM TREINAMENTO - {TURMAS_LABELS[turma]}</h4>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {treinamentoCardItems.map(t => (
                        <div key={t.id} className="text-xs p-2 rounded-md bg-warning/5 border border-warning/20">
                          <div className="font-semibold">{t.matricula ? `${t.matricula} - ` : ''}{t.nome}</div>
                          <div className="text-muted-foreground mt-0.5">
                            Estará em treinamento: {format(new Date(t.inicio), 'dd/MM/yyyy')} e {format(addDays(new Date(t.inicio), 1), 'dd/MM/yyyy')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="mt-2 flex w-full items-center justify-between gap-1.5 rounded-xl border border-[#FFC107]/40 bg-[#FFF8E1] px-2 py-2 text-[11px] font-semibold text-[#FFC107] sm:px-3 sm:text-sm">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <GraduationCap className="h-4 w-4 shrink-0" />
                  <span className="truncate whitespace-nowrap">EM TREINAMENTO (2 DIAS)</span>
                </div>
                <span className="shrink-0 text-base sm:text-lg font-bold">0</span>
              </div>
            )}

            {metricas.previsoes > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="mb-3 mt-2 flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-xl border border-[#1976D2]/30 bg-[#EAF3FF] px-2 py-2 text-[11px] font-semibold text-[#1976D2] transition-colors hover:bg-[#DCEBFF] sm:px-3 sm:text-sm">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 shrink-0" />
                      <span>PREVISÃO</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold">+{metricas.previsoes}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm mb-2">PREVISÃO DE ADMISSÃO - {TURMAS_LABELS[turma]}</h4>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {metricas.previsoesLista.map(f => (
                        <div key={f.id} className="text-xs p-2 rounded-md bg-muted/50 border">
                          <div className="font-semibold">{f.nome_completo}</div>
                          <div className="text-muted-foreground mt-0.5">
                            {f.isTransferencia ? (
                              <>
                                <div>TRANSFERÊNCIA</div>
                                {f.origem && <div>De: {f.origem}</div>}
                                {f.data_programada && <div>No dia: {format(parseISO(f.data_programada), 'dd/MM/yyyy')}</div>}
                              </>
                            ) : (
                              <>{f.setor?.nome}{f.turma ? ` • Turma: ${f.turma}` : ''}{f.empresa ? ` • ${f.empresa}` : ''}</>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="mb-3 mt-2 flex w-full items-center justify-between gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#F4F8FF] px-2 py-2 text-[11px] font-semibold text-[#6B7280] sm:px-3 sm:text-sm">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 shrink-0" />
                  <span>PREVISÃO</span>
                </div>
                <span className="text-base sm:text-lg font-bold">0</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-[#F4F8FF] p-2.5">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-[#0057D9]" />
                  <span className="text-sm font-medium text-[#1F2937]">HOMENS</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[#0057D9]">{metricas.homens}</span>
                  <span className="text-xs text-[#6B7280]">({percentHomens}%)</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between rounded-xl bg-[#FAF5FF] p-2.5">
                <div className="flex items-center gap-2">
                  <UserRoundCheck className="h-4 w-4 text-[#7E57C2]" />
                  <span className="text-sm font-medium text-[#1F2937]">MULHERES</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-[#7E57C2]">{metricas.mulheres}</span>
                  <span className="text-xs text-[#6B7280]">({percentMulheres}%)</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
