import { useMemo } from 'react';
import { Users, TrendingUp, TrendingDown, Minus, UserPlus, UserX, Umbrella, GraduationCap, UserRound, UserRoundCheck, AlertTriangle } from 'lucide-react';
import { HistoricoMovimentacaoDialog } from '@/components/dashboard/HistoricoMovimentacaoDialog';
import { Funcionario, QuadroPlanejado, QuadroDecoracao } from '@/types/database';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type StatusPorTurma = Record<string, { total: number; nomes: string[] }>;
type RecentesPorTurma = Record<string, { count: number; nomes: string[]; situacao: string }>;

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
}

// Turmas para cada grupo
const TURMAS_SOPRO = ['A', 'B', 'C'];
const TURMAS_DECORACAO = ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'];

const TURMAS_LABELS: Record<string, string> = {
  'A': 'SOPRO A',
  'B': 'SOPRO B',
  'C': 'SOPRO C',
  'DIA-T1': 'DIA - T1',
  'DIA-T2': 'DIA - T2',
  'NOITE-T1': 'NOITE - T1',
  'NOITE-T2': 'NOITE - T2',
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

// Calcular total planejado para DECORAÇÃO (reserva_refeicao = ceil(aux_maquina / 3))
function calcularTotalPlanejadoDecoracao(dados: QuadroDecoracao): number {
  const reservaRefeicaoAuto = Math.ceil(dados.aux_maquina / 3);
  return (
    dados.aux_maquina +
    reservaRefeicaoAuto +
    dados.reserva_faltas +
    dados.reserva_ferias +
    dados.apoio_topografia +
    dados.reserva_afastadas +
    dados.reserva_covid
  );
}

export function MetricasTurmaCards({ grupo, funcionarios, quadroPlanejadoSopro = [], quadroPlanejadoDecoracao = [], funcionariosPrevisao = [], sumidosPorTurma = {}, cobFeriasPorTurma = {}, treinamentoPorTurma = {}, mostrarSumidos = false, recentesPorTurma = {} }: MetricasTurmaCardsProps) {
  const turmas = grupo === 'SOPRO' ? TURMAS_SOPRO : TURMAS_DECORACAO;

  // Calcular métricas por turma usando a mesma lógica do Quadro Real
  const metricasPorTurma = useMemo(() => {
    const result: Record<string, { 
      total: number; 
      homens: number; 
      mulheres: number;
      quadroNecessario: number;
      diferenca: number;
      previsoes: number;
      previsoesLista: Funcionario[];
    }> = {};
    
    turmas.forEach(turma => {
      result[turma] = { total: 0, homens: 0, mulheres: 0, quadroNecessario: 0, diferenca: 0, previsoes: 0, previsoesLista: [] };
    });
    
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
        result[turma].previsoes = lista.length;
        result[turma].previsoesLista = lista;
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
    }
    
    return result;
  }, [funcionarios, turmas, grupo, quadroPlanejadoSopro, quadroPlanejadoDecoracao, funcionariosPrevisao]);

  return (
    <div className={`grid gap-4 ${grupo === 'SOPRO' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
      {turmas.map(turma => {
        const metricas = metricasPorTurma[turma];
        const sumidosQtd = (mostrarSumidos && sumidosPorTurma[turma]) ? sumidosPorTurma[turma].total : 0;
        const cobFeriasQtd = (mostrarSumidos && cobFeriasPorTurma[turma]) ? cobFeriasPorTurma[turma].total : 0;
        const treinamentoQtd = (mostrarSumidos && treinamentoPorTurma[turma]) ? treinamentoPorTurma[turma].total : 0;
        const totalAjustado = mostrarSumidos ? metricas.total - sumidosQtd - cobFeriasQtd - treinamentoQtd : metricas.total;
        const percentHomens = metricas.total > 0 ? Math.round((metricas.homens / metricas.total) * 100) : 0;
        const percentMulheres = metricas.total > 0 ? Math.round((metricas.mulheres / metricas.total) * 100) : 0;
        const diferenca = totalAjustado - metricas.quadroNecessario;
        
        return (
          <div 
            key={turma} 
            className="rounded-xl border-2 border-border/50 bg-gradient-to-br from-card to-muted/20 p-5 shadow-md hover:shadow-lg transition-all duration-200"
          >
             <div className="flex items-center justify-between mb-3">
              <div className="text-base font-bold text-foreground">
                {TURMAS_LABELS[turma]}
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
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <HistoricoMovimentacaoDialog grupo={TURMAS_LABELS[turma]} quadroAtual={totalAjustado} necessario={metricas.quadroNecessario} />
              </div>
            </div>
            
            {/* Quadro Real e Necessário */}
            <div className="flex items-baseline gap-2 mb-2">
              <div className="text-4xl font-bold text-foreground tabular-nums">
                {totalAjustado}
              </div>
              <div className="text-sm text-muted-foreground">
                / {metricas.quadroNecessario}
              </div>
            </div>
            
            {/* Indicador de Sobra/Desfalque */}
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-semibold",
              diferenca > 0 && "bg-success/10 text-success",
              diferenca < 0 && "bg-destructive/10 text-destructive",
              diferenca === 0 && "bg-muted text-muted-foreground"
            )}>
              {diferenca > 0 ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span>+{diferenca} sobra</span>
                </>
              ) : diferenca < 0 ? (
                <>
                  <TrendingDown className="h-4 w-4" />
                  <span>{diferenca} desfalque</span>
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4" />
                  <span>Quadro ok</span>
                </>
              )}
            </div>

            {/* Previsão de Admissão - sempre visível */}
            {metricas.previsoes > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-between gap-1.5 px-3 py-2 mt-2 mb-3 rounded-lg border border-primary/30 bg-primary/5 text-sm font-semibold text-primary hover:bg-primary/15 transition-colors cursor-pointer w-full">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 shrink-0" />
                      <span>Previsão</span>
                    </div>
                    <span className="text-lg font-bold">+{metricas.previsoes}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm mb-2">Previsão de Admissão - {TURMAS_LABELS[turma]}</h4>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {metricas.previsoesLista.map(f => (
                        <div key={f.id} className="text-xs p-2 rounded-md bg-muted/50 border">
                          <div className="font-semibold">{f.nome_completo}</div>
                          <div className="text-muted-foreground mt-0.5">
                            {f.setor?.nome}{f.turma ? ` • Turma: ${f.turma}` : ''}{f.empresa ? ` • ${f.empresa}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex items-center justify-between gap-1.5 px-3 py-2 mt-2 mb-3 rounded-lg border border-muted bg-muted/30 text-sm font-semibold text-muted-foreground w-full">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 shrink-0" />
                  <span>Previsão</span>
                </div>
                <span className="text-lg font-bold">0</span>
              </div>
            )}

            {/* Indicador de Sumidos - apenas para LUCIANO */}
            {mostrarSumidos && sumidosPorTurma[turma] && sumidosPorTurma[turma].total > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-between gap-1.5 px-3 py-2 mt-1 mb-2 rounded-lg border border-destructive/30 bg-destructive/5 text-sm font-semibold text-destructive hover:bg-destructive/15 transition-colors cursor-pointer w-full">
                    <div className="flex items-center gap-2">
                      <UserX className="h-4 w-4 shrink-0" />
                      <span>Sumidos</span>
                    </div>
                    <span className="text-lg font-bold">{sumidosPorTurma[turma].total}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-sm mb-2 text-destructive">Sumidos - {TURMAS_LABELS[turma]}</h4>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {sumidosPorTurma[turma].nomes.map((nome, i) => (
                        <div key={i} className="text-xs p-2 rounded-md bg-destructive/5 border border-destructive/20">
                          <div className="font-semibold">{nome}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Indicador de Cob. Férias - apenas para LUCIANO */}
            {mostrarSumidos && cobFeriasPorTurma[turma] && cobFeriasPorTurma[turma].total > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-between gap-1.5 px-3 py-2 mt-1 mb-2 rounded-lg border border-info/30 bg-info/5 text-sm font-semibold text-info hover:bg-info/15 transition-colors cursor-pointer w-full">
                    <div className="flex items-center gap-2">
                      <Umbrella className="h-4 w-4 shrink-0" />
                      <span>Cob. Férias</span>
                    </div>
                    <span className="text-lg font-bold">{cobFeriasPorTurma[turma].total}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-1">
                     <h4 className="font-semibold text-sm mb-2 text-info">Cob. Férias - {TURMAS_LABELS[turma]}</h4>
                     <div className="max-h-48 overflow-y-auto space-y-1.5">
                       {cobFeriasPorTurma[turma].nomes.map((nome, i) => (
                         <div key={i} className="text-xs p-2 rounded-md bg-info/5 border border-info/20">
                           <div className="font-semibold">{nome}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Indicador de Treinamento - apenas para LUCIANO */}
            {mostrarSumidos && treinamentoPorTurma[turma] && treinamentoPorTurma[turma].total > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center justify-between gap-1.5 px-3 py-2 mt-1 mb-2 rounded-lg border border-warning/30 bg-warning/5 text-sm font-semibold text-warning hover:bg-warning/15 transition-colors cursor-pointer w-full">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 shrink-0" />
                      <span>Treinamento</span>
                    </div>
                    <span className="text-lg font-bold">{treinamentoPorTurma[turma].total}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-1">
                     <h4 className="font-semibold text-sm mb-2 text-warning">Treinamento - {TURMAS_LABELS[turma]}</h4>
                     <div className="max-h-48 overflow-y-auto space-y-1.5">
                       {treinamentoPorTurma[turma].nomes.map((nome, i) => (
                         <div key={i} className="text-xs p-2 rounded-md bg-warning/5 border border-warning/20">
                           <div className="font-semibold">{nome}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-chart-1/10">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-chart-1" />
                  <span className="text-sm font-medium text-foreground">Homens</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-chart-1">{metricas.homens}</span>
                  <span className="text-xs text-muted-foreground">({percentHomens}%)</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded-lg bg-chart-5/10">
                <div className="flex items-center gap-2">
                  <UserRoundCheck className="h-4 w-4 text-chart-5" />
                  <span className="text-sm font-medium text-foreground">Mulheres</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-chart-5">{metricas.mulheres}</span>
                  <span className="text-xs text-muted-foreground">({percentMulheres}%)</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
