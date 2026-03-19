import { useMemo, useState, forwardRef } from 'react';
import { format, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Funcionario } from '@/types/database';
import { Demissao, PeriodoDemissao } from '@/types/demissao';
import { useUpdatePeriodoDemissao } from '@/hooks/useDemissoes';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SubstituicaoReposicaoTableProps {
  grupo: 'SOPRO' | 'DECORAÇÃO';
  funcionarios: Funcionario[];
  demissoesPendentes: Demissao[];
  periodos: PeriodoDemissao[];
  desfalquePorTurma: Record<string, number>;
}

// Turmas para cada grupo
const TURMAS_SOPRO = ['A', 'B', 'C'];
const TURMAS_DECORACAO = ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'];

const TURMAS_LABELS_DECORACAO: Record<string, string> = {
  'DIA-T1': 'DIA - TURMA 1',
  'DIA-T2': 'DIA - TURMA 2',
  'NOITE-T1': 'NOITE - TURMA 1',
  'NOITE-T2': 'NOITE - TURMA 2',
};

// Mapear situações para categorias
function categorizarSituacao(situacaoNome: string): 'sumido' | 'ferias' | 'treinamento' | 'cob_ferias' | null {
  const nome = situacaoNome.toLowerCase();
  
  if (nome.includes('sumido') || nome.includes('abandono')) return 'sumido';
  if (nome.includes('férias') || nome.includes('ferias')) {
    if (nome.includes('cob') || nome.includes('cobertura')) return 'cob_ferias';
    return 'ferias';
  }
  if (nome.includes('treinamento')) return 'treinamento';
  
  return null;
}

// Verificar se demissão cai no período
function demissaoNoPeriodo(dataPrevista: string, dataInicio: string, dataFim: string): boolean {
  // datas vem como YYYY-MM-DD; parseISO evita problema de fuso do new Date().
  const data = parseISO(dataPrevista);
  const inicio = parseISO(dataInicio);
  const fim = parseISO(dataFim);
  return data >= inicio && data <= fim;
}

// Mapear turma do funcionário usando o GRUPO do setor para consolidar MOD + G+P
function getTurmaFuncionario(funcionario: Funcionario, grupo: 'SOPRO' | 'DECORAÇÃO'): string | null {
  const turma = funcionario.turma?.toUpperCase();
  const setorNome = funcionario.setor?.nome?.toUpperCase() || '';
  const setorGrupo = funcionario.setor?.grupo?.toUpperCase() || '';
  
  if (grupo === 'SOPRO') {
    // Usar o grupo do setor para consolidar MOD + G+P da mesma turma
    // Ex: "SOPRO A" agrupa "MOD - SOPRO A" e "PRODUÇÃO SOPRO G+P A"
    if (setorGrupo === 'SOPRO A') return 'A';
    if (setorGrupo === 'SOPRO B') return 'B';
    if (setorGrupo === 'SOPRO C') return 'C';
    
    // Fallback: verificar pelo nome do setor
    if (setorNome.includes('SOPRO A') || setorNome.includes('G+P A')) return 'A';
    if (setorNome.includes('SOPRO B') || setorNome.includes('G+P B')) return 'B';
    if (setorNome.includes('SOPRO C') || setorNome.includes('G+P C')) return 'C';
  } else {
    const isDia = setorNome.includes('DIA');
    const isNoite = setorNome.includes('NOITE');
    
    if (turma === 'T1' || turma === '1') {
      return isDia ? 'DIA-T1' : isNoite ? 'NOITE-T1' : null;
    }
    if (turma === 'T2' || turma === '2') {
      return isDia ? 'DIA-T2' : isNoite ? 'NOITE-T2' : null;
    }
  }
  
  return null;
}

export function SubstituicaoReposicaoTable({
  grupo,
  funcionarios,
  demissoesPendentes,
  periodos,
  desfalquePorTurma,
}: SubstituicaoReposicaoTableProps) {
  const turmas = grupo === 'SOPRO' ? TURMAS_SOPRO : TURMAS_DECORACAO;
  const headerPrefix = grupo === 'SOPRO' ? 'SOPRO' : '';
  const updatePeriodo = useUpdatePeriodoDemissao();

  // Estado para controlar qual período está sendo editado
  const [editingPeriodo, setEditingPeriodo] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'inicio' | 'fim' | null>(null);

  // Calcular dados por categoria e turma com nomes
  const dados = useMemo(() => {
    const sumidos: Record<string, number> = {};
    const sumidosNomes: Record<string, string[]> = {};
    const ferias: Record<string, number> = {};
    const feriasNomes: Record<string, string[]> = {};
    const cob_ferias: Record<string, number> = {};
    const cob_feriasNomes: Record<string, string[]> = {};
    const treinamento: Record<string, number> = {};
    const treinamentoNomes: Record<string, string[]> = {};

    // Inicializar todas as turmas com 0
    turmas.forEach(turma => {
      sumidos[turma] = 0;
      sumidosNomes[turma] = [];
      ferias[turma] = 0;
      feriasNomes[turma] = [];
      cob_ferias[turma] = 0;
      cob_feriasNomes[turma] = [];
      treinamento[turma] = 0;
      treinamentoNomes[turma] = [];
    });

    // Contar funcionários por situação e turma
    funcionarios.forEach(func => {
      const turmaFunc = getTurmaFuncionario(func, grupo);
      if (!turmaFunc || !turmas.includes(turmaFunc)) return;
      
      const categoria = categorizarSituacao(func.situacao?.nome || '');
      const nome = func.nome_completo?.toUpperCase() || 'SEM NOME';
      
      if (categoria === 'sumido') {
        sumidos[turmaFunc]++;
        sumidosNomes[turmaFunc].push(nome);
      } else if (categoria === 'ferias') {
        ferias[turmaFunc]++;
        feriasNomes[turmaFunc].push(nome);
      } else if (categoria === 'cob_ferias') {
        cob_ferias[turmaFunc]++;
        cob_feriasNomes[turmaFunc].push(nome);
      } else if (categoria === 'treinamento') {
        treinamento[turmaFunc]++;
        treinamentoNomes[turmaFunc].push(nome);
      }
    });

    // Calcular contrato de experiência por período (apenas efetivos)
    const terminosPorPeriodo: Record<string, Record<string, number>> = {};
    const terminosNomesPorPeriodo: Record<string, Record<string, string[]>> = {};
    
    periodos.forEach(periodo => {
      terminosPorPeriodo[periodo.id] = {};
      terminosNomesPorPeriodo[periodo.id] = {};
      turmas.forEach(turma => {
        terminosPorPeriodo[periodo.id][turma] = 0;
        terminosNomesPorPeriodo[periodo.id][turma] = [];
      });
    });

    // Contar temporários total (sem separar por período)
    const temporariosTotal: Record<string, number> = {};
    const temporariosNomes: Record<string, string[]> = {};
    turmas.forEach(turma => { 
      temporariosTotal[turma] = 0; 
      temporariosNomes[turma] = [];
    });

    // Contar demissões do tipo "Término de Contrato" ou "Ant. Término"
    // Efetivos vão por período, temporários vão em linha única
    demissoesPendentes
      .filter(d => d.tipo_desligamento === 'Término de Contrato' || d.tipo_desligamento === 'Ant. Término')
      .forEach(demissao => {
        const matricula = demissao.funcionario?.matricula || '';
        const isTemporario = matricula.toUpperCase().startsWith('TEMP');
        const nome = demissao.funcionario?.nome_completo?.toUpperCase() || 'SEM NOME';
        const setorNome = demissao.funcionario?.setor?.nome?.toUpperCase() || '';
        const setorGrupo = (demissao.funcionario?.setor as any)?.grupo?.toUpperCase() || '';
        const turmaFunc = demissao.funcionario?.turma?.toUpperCase();
        
        let turma: string | null = null;
        
        if (grupo === 'SOPRO') {
          // Usar o grupo do setor para consolidar MOD + G+P da mesma turma
          if (setorGrupo === 'SOPRO A') turma = 'A';
          else if (setorGrupo === 'SOPRO B') turma = 'B';
          else if (setorGrupo === 'SOPRO C') turma = 'C';
          // Fallback pelo nome do setor
          else if (setorNome.includes('SOPRO A') || setorNome.includes('G+P A')) turma = 'A';
          else if (setorNome.includes('SOPRO B') || setorNome.includes('G+P B')) turma = 'B';
          else if (setorNome.includes('SOPRO C') || setorNome.includes('G+P C')) turma = 'C';
        } else {
          const isDia = setorNome.includes('DIA');
          const isNoite = setorNome.includes('NOITE');
          
          if (turmaFunc === 'T1' || turmaFunc === '1') {
            turma = isDia ? 'DIA-T1' : isNoite ? 'NOITE-T1' : null;
          } else if (turmaFunc === 'T2' || turmaFunc === '2') {
            turma = isDia ? 'DIA-T2' : isNoite ? 'NOITE-T2' : null;
          }
        }
        
        if (!turma || !turmas.includes(turma)) return;

        if (isTemporario) {
          // Temporários: contagem única (sem período)
          temporariosTotal[turma] = (temporariosTotal[turma] || 0) + 1;
          temporariosNomes[turma].push(nome);
        } else {
          // Efetivos: por período
          periodos.forEach(periodo => {
            if (demissaoNoPeriodo(demissao.data_prevista, periodo.data_inicio, periodo.data_fim)) {
              terminosPorPeriodo[periodo.id][turma] = 
                (terminosPorPeriodo[periodo.id][turma] || 0) + 1;
              terminosNomesPorPeriodo[periodo.id][turma].push(nome);
            }
          });
        }
      });

    // Calcular Dispensas Normais
    const dispensasNormais: Record<string, number> = {};
    const dispensasNomais: Record<string, string[]> = {};
    turmas.forEach(turma => { 
      dispensasNormais[turma] = 0; 
      dispensasNomais[turma] = [];
    });
    
    demissoesPendentes
      .filter(d => d.tipo_desligamento === 'Dispensa S/ Justa Causa')
      .forEach(demissao => {
        const setorNome = demissao.funcionario?.setor?.nome?.toUpperCase() || '';
        const setorGrupo = (demissao.funcionario?.setor as any)?.grupo?.toUpperCase() || '';
        const turmaFunc = demissao.funcionario?.turma?.toUpperCase();
        const nome = demissao.funcionario?.nome_completo?.toUpperCase() || 'SEM NOME';
        
        let turma: string | null = null;
        
        if (grupo === 'SOPRO') {
          // Usar o grupo do setor para consolidar MOD + G+P da mesma turma
          if (setorGrupo === 'SOPRO A') turma = 'A';
          else if (setorGrupo === 'SOPRO B') turma = 'B';
          else if (setorGrupo === 'SOPRO C') turma = 'C';
          // Fallback pelo nome do setor
          else if (setorNome.includes('SOPRO A') || setorNome.includes('G+P A')) turma = 'A';
          else if (setorNome.includes('SOPRO B') || setorNome.includes('G+P B')) turma = 'B';
          else if (setorNome.includes('SOPRO C') || setorNome.includes('G+P C')) turma = 'C';
        } else {
          const isDia = setorNome.includes('DIA');
          const isNoite = setorNome.includes('NOITE');
          
          if (turmaFunc === 'T1' || turmaFunc === '1') {
            turma = isDia ? 'DIA-T1' : isNoite ? 'NOITE-T1' : null;
          } else if (turmaFunc === 'T2' || turmaFunc === '2') {
            turma = isDia ? 'DIA-T2' : isNoite ? 'NOITE-T2' : null;
          }
        }
        
        if (turma && turmas.includes(turma)) {
          dispensasNormais[turma] = (dispensasNormais[turma] || 0) + 1;
          dispensasNomais[turma].push(nome);
        }
      });

    // Contar previsões de admissão (situação "PREVISÃO")
    const previsaoAdmissao: Record<string, number> = {};
    const previsaoNomes: Record<string, string[]> = {};
    turmas.forEach(turma => { 
      previsaoAdmissao[turma] = 0; 
      previsaoNomes[turma] = [];
    });
    
    funcionarios.forEach(func => {
      const situacaoNome = func.situacao?.nome?.toUpperCase() || '';
      if (situacaoNome.includes('PREVISÃO') || situacaoNome.includes('PREVISAO')) {
        const turmaFunc = getTurmaFuncionario(func, grupo);
        const nome = func.nome_completo?.toUpperCase() || 'SEM NOME';
        if (turmaFunc && turmas.includes(turmaFunc)) {
          previsaoAdmissao[turmaFunc]++;
          previsaoNomes[turmaFunc].push(nome);
        }
      }
    });

    return { 
      sumidos, sumidosNomes,
      ferias, feriasNomes,
      cob_ferias, cob_feriasNomes, 
      treinamento, treinamentoNomes,
      terminosPorPeriodo, terminosNomesPorPeriodo,
      temporariosTotal, temporariosNomes,
      dispensasNormais, dispensasNomais,
      previsaoAdmissao, previsaoNomes
    };
  }, [funcionarios, demissoesPendentes, periodos, turmas, grupo]);

  // Total de Substituição (soma das linhas: sumidos, contrato exp, temporários, dispensas, cob férias, treinamento)
  // Sempre positivo (quantidade de pessoas que vão sair e que o RH já precisa trabalhar)
  const totalSubstituicao = useMemo(() => {
    const result: Record<string, number> = {};

    turmas.forEach(turma => {
      let totalTerminos = 0;
      periodos.forEach(periodo => {
        totalTerminos += Math.abs(dados.terminosPorPeriodo[periodo.id]?.[turma] || 0);
      });

      const sumidos = Math.abs(dados.sumidos[turma] || 0);
      const temporarios = Math.abs(dados.temporariosTotal[turma] || 0);
      const dispensas = Math.abs(dados.dispensasNormais[turma] || 0);
      const cobFerias = Math.abs(dados.cob_ferias[turma] || 0);
      const treinamento = Math.abs(dados.treinamento[turma] || 0);

      result[turma] = sumidos + totalTerminos + temporarios + dispensas + cobFerias + treinamento;
    });

    return result;
  }, [turmas, dados, periodos]);

  // Calcular VAGAS PARA RH
  // Fórmula: VAGAS = QUADRO FINAL - TOTAL SUBSTITUIÇÃO
  // Exemplos:
  //  - SOPRO A: Quadro Final = +6 (sobra), Total Subst = 4 → VAGAS = 6 - 4 = +2 (sobra)
  //  - SOPRO B: Quadro Final = -14 (déficit), Total Subst = 4 → VAGAS = -14 - 4 = -18 (contratar)
  const vagasRH = useMemo(() => {
    const result: Record<string, number> = {};
    
    turmas.forEach(turma => {
      // Quadro Final: inverter o sinal do desfalque
      // desfalque negativo = sobra → quadroFinal positivo
      // desfalque positivo = falta → quadroFinal negativo
      const quadroFinal = -(desfalquePorTurma[turma] || 0);
      
      // Total de Substituição (sempre positivo - quantidade de pessoas)
      const totalSubst = totalSubstituicao[turma] || 0;
      
      // VAGAS = Quadro Final - Total Substituição
      result[turma] = quadroFinal - totalSubst;
    });
    
    return result;
  }, [turmas, desfalquePorTurma, totalSubstituicao]);

  const vagasRHDetalhe = useMemo(() => {
    const result: Record<string, { quadroFinal: number; totalSubst: number; vagas: number }> = {};
    turmas.forEach(turma => {
      const quadroFinal = -(desfalquePorTurma[turma] || 0);
      const totalSubst = totalSubstituicao[turma] || 0;
      const vagas = quadroFinal - totalSubst;
      result[turma] = { quadroFinal, totalSubst: -totalSubst, vagas };
    });
    return result;
  }, [turmas, desfalquePorTurma, totalSubstituicao]);

  // Componente helper para células com tooltip
  // Componente helper para tooltip em células
  const TooltipSpan = forwardRef<HTMLSpanElement, { displayValue: string | number }>(
    ({ displayValue, ...props }, ref) => (
      <span 
        ref={ref} 
        className="cursor-help underline decoration-dotted underline-offset-2" 
        {...props}
      >
        {displayValue}
      </span>
    )
  );
  TooltipSpan.displayName = 'TooltipSpan';

  const CellWithTooltip = ({ 
    valor, 
    nomes, 
    className = "",
    display = 'abs',
  }: { 
    valor: number; 
    nomes: string[]; 
    className?: string;
    display?: 'abs' | 'negative' | 'raw';
  }) => {
    // Por padrão, valores numéricos no dashboard não exibem sinal (+/-)
    // A cor da célula já indica se é sobra (azul) ou desfalque (vermelho).
    const displayValue = (() => {
      if (display === 'raw') return valor;
      if (display === 'negative') return valor === 0 ? 0 : `-${Math.abs(valor)}`;
      return Math.abs(valor);
    })();
    
    if (valor === 0 || nomes.length === 0) {
      return <span>{displayValue}</span>;
    }
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <TooltipSpan displayValue={String(displayValue)} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[300px]">
          <div className="text-xs space-y-0.5">
            {nomes.map((nome, idx) => (
              <div key={idx} className="truncate">{nome}</div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2 font-bold text-center uppercase tracking-wide bg-primary text-primary-foreground text-sm">
          PESSOAS PARA SUBSTITUIÇÃO / REPOSIÇÃO
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[200px]" />
              {turmas.map(turma => (
                <col key={turma} className="w-[100px]" />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-primary/10">
                <th className="text-left font-semibold py-2 px-3 border-b">
                  {grupo}
                </th>
                {turmas.map(turma => (
                  <th key={turma} className="text-center font-semibold py-2 px-3 border-b">
                    {grupo === 'SOPRO' ? `${headerPrefix} ${turma}` : TURMAS_LABELS_DECORACAO[turma]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Sumidos */}
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-1.5 px-3 border-b">Sumidos</td>
                {turmas.map(turma => (
                  <td key={turma} className="text-center py-1.5 px-3 border-b tabular-nums">
                    <CellWithTooltip 
                      valor={dados.sumidos[turma] || 0} 
                      nomes={dados.sumidosNomes[turma] || []} 
                    />
                  </td>
                ))}
              </tr>
            
            {/* Contrato de Experiência (Efetivos) por período */}
            {periodos.map(periodo => {
              const dataInicio = parse(periodo.data_inicio, 'yyyy-MM-dd', new Date());
              const dataFim = parse(periodo.data_fim, 'yyyy-MM-dd', new Date());
              
              const handleDateChange = (field: 'inicio' | 'fim', date: Date | undefined) => {
                if (!date) return;
                
                updatePeriodo.mutate({
                  id: periodo.id,
                  [field === 'inicio' ? 'data_inicio' : 'data_fim']: format(date, 'yyyy-MM-dd'),
                });
                setEditingPeriodo(null);
                setEditingField(null);
              };
              
              return (
                <tr key={periodo.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-1.5 px-3 border-b">
                    <div className="flex flex-col">
                      <span>Contrato de Experiência (Efetivos)</span>
                      <div className="flex items-center gap-1">
                        <Popover 
                          open={editingPeriodo === periodo.id && editingField === 'inicio'}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditingPeriodo(periodo.id);
                              setEditingField('inicio');
                            } else {
                              setEditingPeriodo(null);
                              setEditingField(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-primary hover:text-primary font-medium text-xs"
                            >
                              {format(dataInicio, 'dd/MM', { locale: ptBR })}
                              <CalendarIcon className="ml-1 h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dataInicio}
                              onSelect={(date) => handleDateChange('inicio', date)}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <span className="text-xs text-muted-foreground">a</span>
                        <Popover
                          open={editingPeriodo === periodo.id && editingField === 'fim'}
                          onOpenChange={(open) => {
                            if (open) {
                              setEditingPeriodo(periodo.id);
                              setEditingField('fim');
                            } else {
                              setEditingPeriodo(null);
                              setEditingField(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-primary hover:text-primary font-medium text-xs"
                            >
                              {format(dataFim, 'dd/MM', { locale: ptBR })}
                              <CalendarIcon className="ml-1 h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dataFim}
                              onSelect={(date) => handleDateChange('fim', date)}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </td>
                  {turmas.map(turma => {
                    const valor = dados.terminosPorPeriodo[periodo.id]?.[turma] || 0;
                    const nomes = dados.terminosNomesPorPeriodo[periodo.id]?.[turma] || [];
                    return (
                      <td 
                        key={turma} 
                        className="text-center py-1.5 px-3 border-b tabular-nums text-destructive font-medium"
                      >
                        <CellWithTooltip valor={valor} nomes={nomes} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* Temporários (linha única - todos os temporários com demissão pendente) */}
            <tr className="hover:bg-muted/30 transition-colors bg-orange-50/50">
              <td className="py-1.5 px-3 border-b font-medium">Temporários</td>
              {turmas.map(turma => {
                const valor = dados.temporariosTotal[turma] || 0;
                const nomes = dados.temporariosNomes[turma] || [];
                return (
                  <td 
                    key={turma} 
                    className="text-center py-1.5 px-3 border-b tabular-nums text-destructive font-medium"
                  >
                    <CellWithTooltip valor={valor} nomes={nomes} />
                  </td>
                );
              })}
            </tr>
            
            {/* Solicitação de Dispensas Normais */}
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="py-1.5 px-3 border-b">Solicitação de Dispensas Normais</td>
              {turmas.map(turma => {
                const valor = dados.dispensasNormais[turma] || 0;
                const nomes = dados.dispensasNomais[turma] || [];
                return (
                  <td 
                    key={turma} 
                    className="text-center py-1.5 px-3 border-b tabular-nums text-destructive font-medium"
                  >
                    <CellWithTooltip valor={valor} nomes={nomes} />
                  </td>
                );
              })}
            </tr>
            
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="py-1.5 px-3 border-b">
                {grupo === 'SOPRO' ? 'Cobertura de Férias MOI' : 'Cobertura de Férias'}
              </td>
              {turmas.map(turma => {
                const valor = dados.cob_ferias[turma] || 0;
                const nomes = dados.cob_feriasNomes[turma] || [];
                return (
                  <td 
                    key={turma} 
                    className="text-center py-1.5 px-3 border-b tabular-nums text-destructive font-medium"
                  >
                    <CellWithTooltip valor={valor} nomes={nomes} />
                  </td>
                );
              })}
            </tr>

            {/* Treinamento */}
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="py-1.5 px-3 border-b">Treinamento</td>
              {turmas.map(turma => {
                const valor = dados.treinamento[turma] || 0;
                const nomes = dados.treinamentoNomes[turma] || [];
                return (
                  <td 
                    key={turma} 
                    className="text-center py-1.5 px-3 border-b tabular-nums text-destructive font-medium"
                  >
                    <CellWithTooltip valor={valor} nomes={nomes} />
                  </td>
                );
              })}
            </tr>

            {/* TOTAL DE SUBSTITUIÇÃO */}
            <tr className="bg-muted/20 font-bold">
              <td className="py-2 px-3 border-b">TOTAL DE SUBSTITUIÇÃO</td>
              {turmas.map(turma => {
                const valor = totalSubstituicao[turma] || 0;
                return (
                  <td
                    key={turma}
                    className="text-center py-2 px-3 border-b tabular-nums text-destructive"
                  >
                    <CellWithTooltip valor={valor} nomes={[]} display="negative" />
                  </td>
                );
              })}
            </tr>
            </tbody>
            <tfoot>
              {/* VAGAS PARA RH TRABALHAR */}
              <tr className="bg-warning font-bold text-warning-foreground">
                <td className="py-2.5 px-3 border-t-2 text-xs leading-tight">
                  VAGAS PARA RH TRABALHAR (SE POSITIVO DISPENSAR OU REMANEJAR SE NEGATIVO CONTRATAR)
                </td>
                {turmas.map(turma => {
                  const valor = vagasRH[turma] || 0;
                  return (
                    <td 
                      key={turma} 
                      className={cn(
                        "text-center py-2.5 px-3 border-t-2 tabular-nums text-lg",
                        valor < 0 && "text-destructive",
                        valor > 0 && "text-chart-2"
                      )}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help underline decoration-dotted underline-offset-2">
                            {Math.abs(valor)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[320px]">
                          <div className="text-xs space-y-1">
                            <div className="font-semibold">CÁLCULO</div>
                            <div>QUADRO FINAL: {vagasRHDetalhe[turma]?.quadroFinal ?? 0}</div>
                            <div>TOTAL SUBSTITUIÇÃO: {vagasRHDetalhe[turma]?.totalSubst ?? 0}</div>
                            <div className="pt-1 border-t">
                              VAGAS = QUADRO FINAL + SUBSTITUIÇÃO = {vagasRHDetalhe[turma]?.vagas ?? 0}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
              
              {/* PREVISÃO DE ADMISSÃO */}
              <tr className="bg-primary font-bold text-primary-foreground">
                <td className="py-2.5 px-3 border-t text-sm">
                  PREVISÃO DE ADMISSÃO
                </td>
                {turmas.map(turma => {
                  const valor = dados.previsaoAdmissao[turma] || 0;
                  const nomes = dados.previsaoNomes[turma] || [];
                  return (
                    <td 
                      key={turma} 
                      className="text-center py-2.5 px-3 border-t tabular-nums text-lg"
                    >
                      <CellWithTooltip valor={valor} nomes={nomes} />
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
}
