import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Filter, Search } from 'lucide-react';
import {
  usePeriodosFaltas,
  useRegistrosFaltas,
  useFuncionariosFaltas,
} from '@/hooks/useFaltas';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Funcionario } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Setores válidos para o controle de faltas
const SETORES_QUADRO_VALIDOS = [
  'MOD - SOPRO A',
  'MOD - SOPRO B',
  'MOD - SOPRO C',
  'PRODUÇÃO SOPRO G+P A',
  'PRODUÇÃO SOPRO G+P B',
  'PRODUÇÃO SOPRO G+P C',
  'DECORAÇÃO MOD DIA',
  'DECORAÇÃO MOD NOITE',
];

function isSetorDoQuadro(setorNome: string): boolean {
  const nomeUpper = setorNome.toUpperCase().trim();
  return SETORES_QUADRO_VALIDOS.some(s => nomeUpper === s.toUpperCase());
}

type FiltroSituacao = 'TODOS' | 'F' | 'A' | 'FE' | 'DA' | 'SS';

const SITUACAO_OPTIONS: { key: FiltroSituacao; label: string; cor: string }[] = [
  { key: 'TODOS', label: 'TODOS', cor: '' },
  { key: 'F', label: 'FALTAS', cor: 'text-destructive' },
  { key: 'A', label: 'ATESTADOS', cor: 'text-warning' },
  { key: 'SS', label: 'SUSPENSÃO', cor: 'text-orange-500' },
  { key: 'FE', label: 'FÉRIAS', cor: 'text-primary' },
  { key: 'DA', label: 'DAY OFF', cor: 'text-blue-500' },
];

export default function IntegracaoFaltas() {
  const { data: periodos = [], isLoading: loadingPeriodos } = usePeriodosFaltas();
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>('');
  const { isAdmin, userRole } = useAuth();
  
  const periodoAtivoId = useMemo(() => {
    const periodoAberto = periodos.find(p => p.status === 'aberto');
    return periodoAberto?.id || periodos[0]?.id || '';
  }, [periodos]);

  const periodoEfetivo = periodoSelecionado || periodoAtivoId;
  const periodo = periodos.find(p => p.id === periodoEfetivo);
  
  const { data: funcionarios = [], isLoading: loadingFuncionarios } = useFuncionariosFaltas(periodoEfetivo, periodo);
  const { data: registros = [], isLoading: loadingRegistros } = useRegistrosFaltas(periodoEfetivo);

  // Estados de filtro
  const [setoresSelecionados, setSetoresSelecionados] = useState<string[]>([]);
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>('TODOS');

  const setoresOptions: MultiSelectOption[] = useMemo(() => {
    return SETORES_QUADRO_VALIDOS.map(setor => ({
      value: setor,
      label: setor,
    }));
  }, []);

  // Filtra funcionários
  const funcionariosFiltrados = useMemo(() => {
    let filtered = funcionarios;
    
    filtered = filtered.filter(func => {
      const setorNome = func.setor?.nome || '';
      return isSetorDoQuadro(setorNome);
    });
    
    if (!isAdmin) {
      const setoresUsuario = userRole?.setores_ids || [];
      if (setoresUsuario.length === 0) return [];
      filtered = filtered.filter(func => setoresUsuario.includes(func.setor_id));
    }
    
    if (setoresSelecionados.length > 0) {
      filtered = filtered.filter(func => {
        const setorNome = func.setor?.nome?.toUpperCase().trim() || '';
        return setoresSelecionados.some(s => s.toUpperCase() === setorNome);
      });
    }
    
    if (filtroNome.trim()) {
      const termo = filtroNome.toUpperCase().trim();
      filtered = filtered.filter(func => 
        func.nome_completo.toUpperCase().includes(termo) ||
        func.matricula?.toUpperCase().includes(termo)
      );
    }
    
    return filtered;
  }, [funcionarios, isAdmin, userRole, setoresSelecionados, filtroNome]);

  // Calcula total de faltas/atestados por funcionário
  const totaisPorFuncionario = useMemo(() => {
    const result: Record<string, { faltas: number; atestados: number; ferias: number; dayoff: number; suspensao: number }> = {};
    
    funcionariosFiltrados.forEach(func => {
      result[func.id] = { faltas: 0, atestados: 0, ferias: 0, dayoff: 0, suspensao: 0 };
    });
    
    registros.forEach(r => {
      if (result[r.funcionario_id]) {
        if (r.tipo === 'F') result[r.funcionario_id].faltas++;
        if (r.tipo === 'A') result[r.funcionario_id].atestados++;
        if (r.tipo === 'FE') result[r.funcionario_id].ferias++;
        if (r.tipo === 'DA' || r.tipo === 'DF') result[r.funcionario_id].dayoff++;
        if (r.tipo === 'SS') result[r.funcionario_id].suspensao++;
      }
    });
    
    return result;
  }, [registros, funcionariosFiltrados]);

  // Filtra por situação selecionada
  const funcionariosExibidos = useMemo(() => {
    let list = funcionariosFiltrados;
    
    // Sempre mostrar apenas quem tem ocorrência
    list = list.filter(func => {
      const totais = totaisPorFuncionario[func.id];
      if (!totais) return false;
      const total = totais.faltas + totais.atestados + totais.ferias + totais.dayoff + totais.suspensao;
      return total > 0;
    });

    // Filtro por situação específica
    if (filtroSituacao !== 'TODOS') {
      list = list.filter(func => {
        const totais = totaisPorFuncionario[func.id];
        if (!totais) return false;
        switch (filtroSituacao) {
          case 'F': return totais.faltas > 0;
          case 'A': return totais.atestados > 0;
          case 'FE': return totais.ferias > 0;
          case 'DA': return totais.dayoff > 0;
          case 'SS': return totais.suspensao > 0;
          default: return true;
        }
      });
    }
    
    return list.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  }, [funcionariosFiltrados, totaisPorFuncionario, filtroSituacao]);

  const formatarPeriodo = (dataInicio: string, dataFim: string) => {
    const inicio = parseISO(dataInicio);
    const fim = parseISO(dataFim);
    return `${format(inicio, 'dd/MM', { locale: ptBR })} - ${format(fim, 'dd/MM', { locale: ptBR })}`;
  };

  const isLoading = loadingPeriodos || loadingFuncionarios || loadingRegistros;

  // Contadores por situação
  const contadores = useMemo(() => {
    const c = { faltas: 0, atestados: 0, ferias: 0, dayoff: 0, suspensao: 0, total: 0 };
    funcionariosFiltrados.forEach(func => {
      const t = totaisPorFuncionario[func.id];
      if (!t) return;
      c.faltas += t.faltas;
      c.atestados += t.atestados;
      c.ferias += t.ferias;
      c.dayoff += t.dayoff;
      c.suspensao += t.suspensao;
    });
    c.total = c.faltas + c.atestados + c.ferias + c.dayoff + c.suspensao;
    return c;
  }, [funcionariosFiltrados, totaisPorFuncionario]);

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">INTEGRAÇÃO DE FALTAS</h1>
          <p className="page-description">Visualização consolidada de ocorrências por período</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="h-8 px-3 text-xs">
            {funcionariosExibidos.length} funcionários
          </Badge>
          <Badge variant="secondary" className="h-8 px-3 text-xs">
            {contadores.total} ocorrências
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Período */}
        <div className="w-48">
          <Select value={periodoEfetivo} onValueChange={setPeriodoSelecionado}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="SELECIONE UM PERÍODO" />
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

        <div className="h-6 w-px bg-border mx-1" />

        {/* Filtro de Setor */}
        <div className="flex items-center gap-2 min-w-[220px]">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <MultiSelect
              options={setoresOptions}
              selected={setoresSelecionados}
              onChange={setSetoresSelecionados}
              placeholder="Todos os setores"
              searchPlaceholder="Buscar setor..."
              emptyMessage="Nenhum setor encontrado"
              maxDisplay={1}
              className="text-xs"
            />
          </div>
          {setoresSelecionados.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => setSetoresSelecionados([])}
            >
              Limpar
            </Button>
          )}
        </div>

        {/* Filtro por Nome */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nome ou matrícula..."
            value={filtroNome}
            onChange={(e) => setFiltroNome(e.target.value)}
            className="h-9 w-56 pl-8"
          />
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Filtros por Situação */}
        <div className="flex items-center gap-1.5">
          {SITUACAO_OPTIONS.map(({ key, label, cor }) => {
            const isActive = filtroSituacao === key;
            return (
              <Button
                key={key}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroSituacao(key)}
                className={cn(
                  "h-8 px-3 text-[11px] font-bold",
                  isActive && "shadow-sm"
                )}
              >
                {label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : funcionariosExibidos.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">NENHUM REGISTRO ENCONTRADO</p>
          <p>Não há funcionários com ocorrências para os filtros selecionados</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SETOR</TableHead>
                <TableHead>FUNCIONÁRIO</TableHead>
                <TableHead>MATRÍCULA</TableHead>
                <TableHead className="text-center">FALTAS</TableHead>
                <TableHead className="text-center">ATESTADOS</TableHead>
                <TableHead className="text-center">FÉRIAS</TableHead>
                <TableHead className="text-center">DAY OFF</TableHead>
                <TableHead className="text-center">SUSPENSÃO</TableHead>
                <TableHead className="text-center">TOTAL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcionariosExibidos.map((func) => {
                const totais = totaisPorFuncionario[func.id] || { faltas: 0, atestados: 0, ferias: 0, dayoff: 0, suspensao: 0 };
                const total = totais.faltas + totais.atestados + totais.ferias + totais.dayoff + totais.suspensao;
                
                return (
                  <TableRow key={func.id}>
                    <TableCell className="font-medium text-xs">
                      {func.setor?.nome?.toUpperCase() || '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {func.nome_completo.toUpperCase()}
                    </TableCell>
                    <TableCell>{func.matricula || '-'}</TableCell>
                    <TableCell className="text-center">
                      {totais.faltas > 0 ? (
                        <Badge variant="destructive">{totais.faltas}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {totais.atestados > 0 ? (
                        <Badge className="bg-warning text-warning-foreground">{totais.atestados}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {totais.ferias > 0 ? (
                        <Badge className="bg-purple-500 text-white">{totais.ferias}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {totais.dayoff > 0 ? (
                        <Badge className="bg-blue-500 text-white">{totais.dayoff}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {totais.suspensao > 0 ? (
                        <Badge className="bg-orange-500 text-white">{totais.suspensao}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {total}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}