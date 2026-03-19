import React, { useMemo, useState } from 'react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { getTrabalhaOuFolga } from '@/lib/escalaPanama';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface FuncionarioBase {
  id: string;
  nome_completo?: string;
  matricula?: string | null;
  data_admissao: string | null;
  data_demissao: string | null;
}

interface RegistroBase {
  funcionario_id: string;
  data: string;
  tipo: string;
}

interface PeriodoBase {
  id: string;
  data_inicio: string;
  data_fim: string;
}

interface DashboardFaltasDiarioProps {
  funcionariosAgrupados: { setor: string; funcionarios: FuncionarioBase[] }[];
  registros: RegistroBase[];
  diasPeriodo: Date[];
  periodo?: PeriodoBase;
  reservaFaltasPorSetor?: Record<string, number>;
  sobraPorSetor?: Record<string, number>;
}

export function DashboardFaltasDiario({
  funcionariosAgrupados,
  registros,
  diasPeriodo,
  periodo,
  reservaFaltasPorSetor = {},
  sobraPorSetor = {},
}: DashboardFaltasDiarioProps) {
  // Blocos de dias
  const blocosDias = useMemo(() => {
    if (diasPeriodo.length === 0) return [];
    const blocos: { id: number; label: string; dias: Date[] }[] = [];
    const totalDias = diasPeriodo.length;

    if (totalDias <= 15) {
      blocos.push({
        id: 0,
        label: `${format(diasPeriodo[0], 'dd/MM')} - ${format(diasPeriodo[totalDias - 1], 'dd/MM')}`,
        dias: diasPeriodo,
      });
    } else {
      const primeiroMes = diasPeriodo[0].getMonth();
      let pontoCorte = diasPeriodo.findIndex(d => d.getMonth() !== primeiroMes);
      if (pontoCorte === -1) pontoCorte = Math.ceil(totalDias / 2);

      const diasBloco0 = diasPeriodo.slice(0, pontoCorte);
      const diasBloco1 = diasPeriodo.slice(pontoCorte);

      if (diasBloco0.length > 0) {
        blocos.push({
          id: 0,
          label: `${format(diasBloco0[0], 'dd/MM')} - ${format(diasBloco0[diasBloco0.length - 1], 'dd/MM')}`,
          dias: diasBloco0,
        });
      }
      if (diasBloco1.length > 0) {
        blocos.push({
          id: 1,
          label: `${format(diasBloco1[0], 'dd/MM')} - ${format(diasBloco1[diasBloco1.length - 1], 'dd/MM')}`,
          dias: diasBloco1,
        });
      }
    }
    return blocos;
  }, [diasPeriodo]);

  // Default: block that contains today's date
  // Filtro por grupo de setores
  const gruposDisponiveis = useMemo(() => {
    const grupos = new Set<string>();
    funcionariosAgrupados.forEach(({ setor }) => {
      const upper = setor.toUpperCase();
      if (upper.includes('SOPRO')) grupos.add('SOPRO');
      else if (upper.includes('DECORAÇ') || upper.includes('DECORAC')) grupos.add('DECORAÇÃO');
      else grupos.add('OUTROS');
    });
    return Array.from(grupos);
  }, [funcionariosAgrupados]);

  const [gruposVisiveis, setGruposVisiveis] = useState<Set<string>>(() => new Set(gruposDisponiveis));

  const toggleGrupo = (grupo: string) => {
    setGruposVisiveis(prev => {
      const next = new Set(prev);
      if (next.has(grupo)) {
        if (next.size > 1) next.delete(grupo);
      } else {
        next.add(grupo);
      }
      return next;
    });
  };

  const funcionariosAgrupsFiltrados = useMemo(() => {
    return funcionariosAgrupados.filter(({ setor }) => {
      const upper = setor.toUpperCase();
      if (upper.includes('SOPRO')) return gruposVisiveis.has('SOPRO');
      if (upper.includes('DECORAÇ') || upper.includes('DECORAC')) return gruposVisiveis.has('DECORAÇÃO');
      return gruposVisiveis.has('OUTROS');
    });
  }, [funcionariosAgrupados, gruposVisiveis]);

  const [blocosVisiveis, setBlocosVisiveis] = useState<Set<number>>(() => {
    if (blocosDias.length > 0) {
      const hoje = new Date();
      const hojeStr = format(hoje, 'yyyy-MM-dd');
      const blocoHoje = blocosDias.find(b => b.dias.some(d => format(d, 'yyyy-MM-dd') === hojeStr));
      if (blocoHoje) return new Set([blocoHoje.id]);
      return new Set([blocosDias[blocosDias.length - 1].id]);
    }
    return new Set([0]);
  });

  const toggleBloco = (id: number) => {
    setBlocosVisiveis(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const diasVisiveis = useMemo(() => {
    if (blocosDias.length === 0) return diasPeriodo;
    return blocosDias.filter(b => blocosVisiveis.has(b.id)).flatMap(b => b.dias);
  }, [blocosDias, blocosVisiveis, diasPeriodo]);

  const funcionarioAtivoNaData = (func: FuncionarioBase, data: Date): boolean => {
    if (func.data_admissao && isAfter(parseISO(func.data_admissao), data)) return false;
    if (func.data_demissao && isBefore(parseISO(func.data_demissao), data)) return false;
    return true;
  };

  const registrosPorFuncData = useMemo(() => {
    const map = new Map<string, string>();
    registros.forEach(r => map.set(`${r.funcionario_id}-${r.data}`, r.tipo));
    return map;
  }, [registros]);

  // Detectar turma da Decoração pelo nome do setor agrupado
  const getTurmaDecoracao = (setorNome: string): 'T1' | 'T2' | null => {
    const upper = setorNome.toUpperCase();
    if (!upper.includes('DECORAÇ') && !upper.includes('DECORAC')) return null;
    if (upper.includes('T1')) return 'T1';
    if (upper.includes('T2')) return 'T2';
    return null;
  };

  // Verificar se setor está de folga em determinado dia
  const isFolgaSetorDia = (setorNome: string, data: Date): boolean => {
    const turma = getTurmaDecoracao(setorNome);
    if (!turma) return false;
    return !getTrabalhaOuFolga(data, turma);
  };

  // Métricas por setor por dia
  const metricasPorSetorDia = useMemo(() => {
    const result: Record<string, Record<string, { total: number; faltas: number; atestados: number; dayoff: number; folga: boolean }>> = {};
    funcionariosAgrupados.forEach(({ setor, funcionarios }) => {
      result[setor] = {};
      diasPeriodo.forEach(dia => {
        const dataStr = format(dia, 'yyyy-MM-dd');
        const ativos = funcionarios.filter(f => funcionarioAtivoNaData(f, dia));
        const folga = isFolgaSetorDia(setor, dia);
        let faltas = 0, atestados = 0, dayoff = 0;
        ativos.forEach(func => {
          const tipo = registrosPorFuncData.get(`${func.id}-${dataStr}`);
          if (tipo === 'F' || tipo === 'SS') faltas++;
          else if (tipo === 'A' || tipo === 'FE') atestados++;
          else if (tipo === 'DA' || tipo === 'DF') dayoff++;
        });
        result[setor][dataStr] = { total: ativos.length, faltas, atestados, dayoff, folga };
      });
    });
    return result;
  }, [funcionariosAgrupados, diasPeriodo, registrosPorFuncData]);

  // Nomes dos funcionários com falta/atestado por setor/dia
  const nomesPorSetorDia = useMemo(() => {
    const result: Record<string, Record<string, { faltas: string[]; suspensao: string[]; atestados: string[]; ferias: string[]; dayoff: string[] }>> = {};
    funcionariosAgrupados.forEach(({ setor, funcionarios }) => {
      result[setor] = {};
      diasPeriodo.forEach(dia => {
        const dataStr = format(dia, 'yyyy-MM-dd');
        const faltas: string[] = [];
        const suspensao: string[] = [];
        const atestados: string[] = [];
        const ferias: string[] = [];
        const dayoff: string[] = [];
        const ativos = funcionarios.filter(f => funcionarioAtivoNaData(f, dia));
        ativos.forEach(func => {
          const tipo = registrosPorFuncData.get(`${func.id}-${dataStr}`);
          const idPrefix = func.matricula ? `(${func.matricula}) ` : '';
          const nome = `${idPrefix}${func.nome_completo || 'Sem nome'}`;
          if (tipo === 'F') faltas.push(nome);
          else if (tipo === 'SS') suspensao.push(nome);
          else if (tipo === 'A') atestados.push(nome);
          else if (tipo === 'FE') ferias.push(nome);
          else if (tipo === 'DA' || tipo === 'DF') dayoff.push(nome);
        });
        const hasAny = faltas.length > 0 || suspensao.length > 0 || atestados.length > 0 || ferias.length > 0 || dayoff.length > 0;
        if (hasAny) {
          result[setor][dataStr] = { faltas: faltas.sort(), suspensao: suspensao.sort(), atestados: atestados.sort(), ferias: ferias.sort(), dayoff: dayoff.sort() };
        }
      });
    });
    return result;
  }, [funcionariosAgrupados, diasPeriodo, registrosPorFuncData]);

  // Totais por dia
  const totaisPorDia = useMemo(() => {
    const result: Record<string, { total: number; faltas: number; atestados: number; dayoff: number }> = {};
    diasPeriodo.forEach(dia => {
      const dataStr = format(dia, 'yyyy-MM-dd');
      let total = 0, faltas = 0, atestados = 0, dayoff = 0;
      Object.values(metricasPorSetorDia).forEach(sd => {
        const d = sd[dataStr];
        if (d) { total += d.total; faltas += d.faltas; atestados += d.atestados; dayoff += d.dayoff; }
      });
      result[dataStr] = { total, faltas, atestados, dayoff };
    });
    return result;
  }, [diasPeriodo, metricasPorSetorDia]);

  // Nomes totais (todos setores) por dia
  const nomesTotaisPorDia = useMemo(() => {
    const result: Record<string, { faltas: string[]; suspensao: string[]; atestados: string[]; ferias: string[]; dayoff: string[] }> = {};
    diasPeriodo.forEach(dia => {
      const dataStr = format(dia, 'yyyy-MM-dd');
      const faltas: string[] = [];
      const suspensao: string[] = [];
      const atestados: string[] = [];
      const ferias: string[] = [];
      const dayoff: string[] = [];
      Object.entries(nomesPorSetorDia).forEach(([, setorData]) => {
        const d = setorData[dataStr];
        if (d) {
          faltas.push(...d.faltas);
          suspensao.push(...d.suspensao);
          atestados.push(...d.atestados);
          ferias.push(...d.ferias);
          dayoff.push(...d.dayoff);
        }
      });
      const hasAny = faltas.length > 0 || suspensao.length > 0 || atestados.length > 0 || ferias.length > 0 || dayoff.length > 0;
      if (hasAny) {
        result[dataStr] = { faltas: faltas.sort(), suspensao: suspensao.sort(), atestados: atestados.sort(), ferias: ferias.sort(), dayoff: dayoff.sort() };
      }
    });
    return result;
  }, [diasPeriodo, nomesPorSetorDia]);

  const hojeStr = format(new Date(), 'yyyy-MM-dd');

  if (!periodo || funcionariosAgrupados.length === 0) return null;

  const renderPopoverContent = (nomes: { faltas: string[]; suspensao: string[]; atestados: string[]; ferias: string[]; dayoff: string[] } | undefined, setor: string, dataLabel: string) => {
    if (!nomes) return null;
    const sections = [
      { label: 'Faltas', items: nomes.faltas, colorClass: 'text-destructive' },
      { label: 'Suspensão', items: nomes.suspensao, colorClass: 'text-warning' },
      { label: 'Atestados', items: nomes.atestados, colorClass: 'text-warning' },
      { label: '+1 Dia Férias', items: nomes.ferias, colorClass: 'text-primary' },
      { label: 'Day Off', items: nomes.dayoff, colorClass: 'text-info' },
    ].filter(s => s.items.length > 0);
    return (
      <div className="max-w-[260px]">
        <p className="text-[11px] font-bold text-foreground mb-2 border-b pb-1">{setor} — {dataLabel}</p>
        {sections.map((section, idx) => (
          <div key={section.label} className={idx < sections.length - 1 ? 'mb-2' : ''}>
            <p className={`text-[10px] font-bold ${section.colorClass} mb-0.5`}>{section.label} ({section.items.length})</p>
            {section.items.map((n, i) => (
              <p key={i} className="text-[10px] text-foreground leading-tight">• {n}</p>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderCelula = (
    faltas: number,
    atestados: number,
    isHoje: boolean,
    dataStr: string,
    setor: string,
    nomes: { faltas: string[]; suspensao: string[]; atestados: string[]; ferias: string[]; dayoff: string[] } | undefined,
    isTotalRow = false,
    isAlternateCol = false,
    folga = false,
    saldo?: number,
    dayoff = 0
  ) => {
    // Para os badges, F inclui F+SS e A inclui A+FE+DA (como antes)
    const badgeF = faltas;
    const badgeA = atestados + dayoff;
    const hasData = badgeF > 0 || badgeA > 0;
    const dataLabel = format(parseISO(dataStr), 'dd/MM (EEE)', { locale: ptBR });

    // Se é folga da Decoração e não tem faltas/atestados, mostrar 🛏️
    if (folga && !hasData) {
      return (
        <TableCell
          key={`${setor}-${dataStr}`}
          className={cn(
            "text-center py-1.5 px-1",
            isHoje && "!bg-green-100 dark:!bg-green-900/30",
            !isHoje && isAlternateCol && "bg-muted/90",
            !isHoje && !isAlternateCol && "bg-violet-50/50 dark:bg-violet-950/20",
          )}
        >
          <span className="text-[14px]" title="Folga escala Panamá">🛏️</span>
        </TableCell>
      );
    }

    const cellContent = (
      <div className="flex flex-col items-center justify-center gap-0.5">
        <div className="flex items-center justify-center gap-1">
          {folga && (
            <span className="text-[10px] opacity-60" title="Folga">🛏️</span>
          )}
           {badgeF > 0 && (
            <span className="inline-flex items-center justify-center min-w-[24px] h-[20px] rounded-md bg-destructive text-destructive-foreground font-bold text-[12px] px-1.5 shadow-sm">
              {badgeF}F
            </span>
          )}
          {badgeA > 0 && (
            <span className="inline-flex items-center justify-center min-w-[24px] h-[20px] rounded-md bg-warning text-warning-foreground font-bold text-[12px] px-1.5 shadow-sm">
              {badgeA}A
            </span>
          )}
        </div>
        {saldo != null && (
          <span className={cn(
           "inline-flex items-center justify-center h-[14px] rounded font-bold text-[9px] px-1 shadow-sm whitespace-nowrap",
            saldo > 0 ? "bg-success text-success-foreground" : saldo < 0 ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
          )}>
            {saldo > 0 ? `+${saldo}` : saldo} SALDO
          </span>
        )}
      </div>
    );

    if (hasData && nomes) {
      return (
        <TableCell
          key={`${setor}-${dataStr}`}
          className={cn(
            "text-center py-0 px-0",
            isHoje && "!bg-green-100 dark:!bg-green-900/30",
            !isHoje && isAlternateCol && !isTotalRow && "bg-muted/90",
            isTotalRow && !isHoje && "bg-muted/50",
            isTotalRow && !isHoje && isAlternateCol && "bg-muted/60",
            folga && "bg-violet-50/30 dark:bg-violet-950/10",
          )}
        >
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "w-full h-full cursor-pointer hover:bg-accent/50 rounded transition-colors py-1.5 px-1",
                  isHoje && "bg-green-100 dark:bg-green-900/30"
                )}
                type="button"
              >
                {cellContent}
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="p-3 w-auto" align="center">
              {renderPopoverContent(nomes, setor, dataLabel)}
            </PopoverContent>
          </Popover>
        </TableCell>
      );
    }

    return (
      <TableCell
        key={`${setor}-${dataStr}`}
        className={cn(
          "text-center py-1.5 px-1",
          isHoje && "!bg-green-100 dark:!bg-green-900/30",
            !isHoje && isAlternateCol && !isTotalRow && "bg-muted/90",
            isTotalRow && !isHoje && "bg-muted/50",
            isTotalRow && !isHoje && isAlternateCol && "bg-muted/60",
          !hasData && "text-muted-foreground/25"
        )}
      >
        <span className="text-[12px]">-</span>
      </TableCell>
    );
  };

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <CardTitle className="text-base font-extrabold tracking-wide text-foreground">MÉTRICAS POR SETOR / DIA</CardTitle>
            {gruposDisponiveis.length > 1 && (
              <div className="flex items-center gap-1.5">
                {gruposDisponiveis.map(grupo => (
                  <Button
                    key={grupo}
                    variant={gruposVisiveis.has(grupo) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleGrupo(grupo)}
                    className={cn(
                      "h-7 px-3 text-[10px] font-bold rounded-md transition-all",
                      gruposVisiveis.has(grupo) && "bg-primary text-primary-foreground shadow-sm"
                    )}
                  >
                    {grupo}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {blocosDias.length > 1 && (
            <div className="flex items-center gap-2">
              {blocosDias.map(bloco => (
                <Button
                  key={bloco.id}
                  variant={blocosVisiveis.has(bloco.id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleBloco(bloco.id)}
                  className={cn(
                    "h-8 px-4 text-[11px] font-bold gap-1.5 rounded-md transition-all",
                    blocosVisiveis.has(bloco.id) && "bg-primary text-primary-foreground shadow-sm"
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {bloco.label}
                </Button>
              ))}
              <Button
                variant={blocosVisiveis.size === blocosDias.length ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  if (blocosVisiveis.size === blocosDias.length) {
                    setBlocosVisiveis(new Set([blocosDias[blocosDias.length - 1].id]));
                  } else {
                    setBlocosVisiveis(new Set(blocosDias.map(b => b.id)));
                  }
                }}
                className={cn(
                  "h-8 px-4 text-[11px] font-bold rounded-md",
                  blocosVisiveis.size === blocosDias.length && "bg-primary/15 text-primary border border-primary/30"
                )}
              >
                TODOS
              </Button>
            </div>
          )}
        </div>
        {/* Legenda compacta */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-[20px] h-[16px] rounded-md bg-destructive text-destructive-foreground font-bold text-[9px]">F</span>
            <span className="text-[10px] text-muted-foreground font-medium">FALTA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-[20px] h-[16px] rounded-md bg-warning text-warning-foreground font-bold text-[9px]">A</span>
            <span className="text-[10px] text-muted-foreground font-medium">ATESTADO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-[20px] h-[16px] rounded-md bg-info text-info-foreground font-bold text-[9px]">DA</span>
            <span className="text-[10px] text-muted-foreground font-medium">DAY OFF</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[14px]">🛏️</span>
            <span className="text-[10px] text-muted-foreground font-medium">FOLGA ESCALA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-[20px] h-[16px] rounded-md bg-success text-success-foreground font-bold text-[9px]">S</span>
            <span className="text-[10px] text-muted-foreground font-medium">SALDO (SOBRA + RSV - AUS)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground/70 italic">Clique na célula para ver nomes</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-3">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-card border-b-2 border-border">
                <TableHead className="text-[13px] font-extrabold text-foreground sticky left-0 bg-card z-10 w-[180px] min-w-[180px] max-w-[180px] py-2 px-3 border-r border-border/50">SETOR</TableHead>
                <TableHead className="text-[13px] font-extrabold text-foreground text-center w-[60px] min-w-[60px] py-2">QTD</TableHead>
                {diasVisiveis.map((dia, colIndex) => {
                  const dataStr = format(dia, 'yyyy-MM-dd');
                  const isHoje = dataStr === hojeStr;
                  const diaSemana = format(dia, 'EEE', { locale: ptBR }).toUpperCase().replace('.', '');
                  const isDomingo = dia.getDay() === 0;
                  const isAlternate = colIndex % 2 === 1;
                  return (
                    <TableHead
                      key={dataStr}
                      className={cn(
                        "text-center min-w-[72px] px-1 py-2",
                        isHoje && "bg-green-100 dark:bg-green-900/30",
                        !isHoje && isAlternate && "bg-muted/90",
                        isDomingo && "text-destructive"
                      )}
                    >
                      <div className="text-[13px] font-extrabold">{format(dia, 'dd')}</div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide">{diaSemana}</div>
                    </TableHead>
                  );
                })}
                <TableHead className="text-[13px] font-extrabold text-destructive text-center min-w-[40px] py-2">∑F</TableHead>
                <TableHead className="text-[13px] font-extrabold text-warning text-center min-w-[40px] py-2">∑A</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcionariosAgrupsFiltrados.map(({ setor }, idx) => {
                const setorData = metricasPorSetorDia[setor];
                if (!setorData) return null;
                const totalFaltas = Object.values(setorData).reduce((s, d) => s + d.faltas, 0);
                const totalAtestados = Object.values(setorData).reduce((s, d) => s + d.atestados, 0);
                const qtdBase = Object.values(setorData)[0]?.total || 0;
                const setorNomes = nomesPorSetorDia[setor] || {};
                const isEven = idx % 2 === 0;
                const reserva = reservaFaltasPorSetor[setor];
                const sobra = sobraPorSetor[setor];

                return (
                  <TableRow key={setor} className={cn("hover:bg-accent/30 transition-colors", isEven ? "bg-card/50" : "bg-card")}>
                    <TableCell className={cn("text-[13px] font-semibold py-2 px-3 sticky left-0 z-10 whitespace-nowrap border-r border-border/50 w-[180px] min-w-[180px] max-w-[180px]", isEven ? "bg-card" : "bg-card")}>{setor}</TableCell>
                    <TableCell className="text-[13px] font-bold text-center py-2 text-muted-foreground w-[60px] min-w-[60px]">{qtdBase}</TableCell>
                    {diasVisiveis.map((dia, colIndex) => {
                      const dataStr = format(dia, 'yyyy-MM-dd');
                      const d = setorData[dataStr];
                      const f = d?.faltas || 0;
                      const a = d?.atestados || 0;
                      const da = d?.dayoff || 0;
                      const totalAusencias = f + a + da;
                      // SOPRO: no fim de semana (sáb/dom) sobra divide por 3 (3 turmas, 1 trabalha)
                      const isSopro = setor.toUpperCase().includes('SOPRO');
                      const isFimDeSemana = dia.getDay() === 0 || dia.getDay() === 6;
                      // Saldo = Sobra + Reserva - Ausências
                      // No fim de semana do SOPRO: Sobra/4 + Reserva/4 - Ausências
                      let saldo: number | undefined;
                      if (reserva != null || sobra != null) {
                        const sobraEfetiva = isSopro && isFimDeSemana ? Math.round((sobra || 0) / 4) : (sobra || 0);
                        const reservaEfetiva = isSopro && isFimDeSemana ? Math.round((reserva || 0) / 4) : (reserva || 0);
                        saldo = totalAusencias > 0 ? sobraEfetiva + reservaEfetiva - totalAusencias : undefined;
                      }
                      return renderCelula(f, a, dataStr === hojeStr, dataStr, setor, setorNomes[dataStr], false, colIndex % 2 === 1, d?.folga || false, saldo, da);
                    })}
                    <TableCell className="text-[13px] font-bold text-destructive text-center py-2">{totalFaltas || '-'}</TableCell>
                    <TableCell className="text-[13px] font-bold text-warning text-center py-2">{totalAtestados || '-'}</TableCell>
                  </TableRow>
                );
              })}
              {/* Linha TOTAL */}
              <TableRow className="border-t-2 border-border bg-card">
                <TableCell className="text-[13px] font-extrabold py-2 px-3 sticky left-0 bg-card z-10 border-r border-border/50 w-[180px] min-w-[180px] max-w-[180px]">TOTAL</TableCell>
                <TableCell className="text-[13px] font-extrabold text-center py-2 w-[60px] min-w-[60px]">
                  {Object.values(totaisPorDia)[0]?.total || 0}
                </TableCell>
                {diasVisiveis.map((dia, colIndex) => {
                  const dataStr = format(dia, 'yyyy-MM-dd');
                  const d = totaisPorDia[dataStr];
                  const f = d?.faltas || 0;
                  const a = d?.atestados || 0;
                  const da = d?.dayoff || 0;
                  return renderCelula(f, a, dataStr === hojeStr, dataStr, 'TOTAL', nomesTotaisPorDia[dataStr], true, colIndex % 2 === 1, false, undefined, da);
                })}
                <TableCell className="text-[13px] font-extrabold text-destructive text-center py-2">
                  {Object.values(totaisPorDia).reduce((s, d) => s + d.faltas, 0) || '-'}
                </TableCell>
                <TableCell className="text-[13px] font-extrabold text-warning text-center py-2">
                  {Object.values(totaisPorDia).reduce((s, d) => s + d.atestados, 0) || '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Histórico de Cálculo do Saldo */}
        {Object.keys(reservaFaltasPorSetor).length > 0 && (
          <Collapsible className="mt-4 mx-5">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2 text-[11px] font-bold h-8">
                <Info className="h-3.5 w-3.5" />
                HISTÓRICO DE CÁLCULO DO SALDO
                <ChevronDown className="h-3.5 w-3.5 transition-transform data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">
                    <strong>Fórmula:</strong> SALDO = (Sobra do Quadro + Reserva de Faltas) - Total de Ausências (F + A + DA).
                    No SOPRO, aos finais de semana, sobra e reserva são divididos por 4 (arredondados).
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-[11px] font-bold w-[200px]">SETOR</TableHead>
                        <TableHead className="text-[11px] font-bold text-center">QUADRO REAL</TableHead>
                        <TableHead className="text-[11px] font-bold text-center">SOBRA</TableHead>
                        <TableHead className="text-[11px] font-bold text-center">RSV. FALTAS</TableHead>
                        <TableHead className="text-[11px] font-bold text-center">BASE SALDO (SEM.)</TableHead>
                        <TableHead className="text-[11px] font-bold text-center">BASE SALDO (FDS)*</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {funcionariosAgrupsFiltrados.map(({ setor }) => {
                        const reserva = reservaFaltasPorSetor[setor] ?? 0;
                        const sobra = sobraPorSetor[setor] ?? 0;
                        const isSopro = setor.toUpperCase().includes('SOPRO');
                        const setorData = metricasPorSetorDia[setor];
                        const qtdBase = setorData ? Object.values(setorData)[0]?.total || 0 : 0;
                        const baseSemana = sobra + reserva;
                        const baseFds = isSopro
                          ? Math.round(sobra / 4) + Math.round(reserva / 4)
                          : baseSemana;
                        return (
                          <TableRow key={setor}>
                            <TableCell className="text-[11px] font-semibold py-1.5">{setor}</TableCell>
                            <TableCell className="text-[11px] font-bold text-center py-1.5">{qtdBase}</TableCell>
                            <TableCell className={cn(
                              "text-[11px] font-bold text-center py-1.5",
                              sobra > 0 ? "text-success" : sobra < 0 ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {sobra > 0 ? `+${sobra}` : sobra}
                            </TableCell>
                            <TableCell className="text-[11px] font-bold text-center py-1.5 text-info">{reserva}</TableCell>
                            <TableCell className={cn(
                              "text-[11px] font-bold text-center py-1.5",
                              baseSemana > 0 ? "text-success" : baseSemana < 0 ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {baseSemana > 0 ? `+${baseSemana}` : baseSemana}
                            </TableCell>
                            <TableCell className={cn(
                              "text-[11px] font-bold text-center py-1.5",
                              baseFds > 0 ? "text-success" : baseFds < 0 ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {isSopro ? (baseFds > 0 ? `+${baseFds}` : baseFds) : '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * FDS = Fim de Semana (SOPRO divide por 4). Os valores refletem o quadro atual — demissões alteram a sobra a partir da data de desligamento, sem afetar dias anteriores no cálculo diário.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
