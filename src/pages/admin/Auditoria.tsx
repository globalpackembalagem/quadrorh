import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Search, Download, History, ChevronDown, ChevronUp,
  Plus, Pencil, Trash2, ArrowRightLeft, CalendarIcon,
  User, BarChart3, Clock, Filter, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
// xlsx-js-style loaded dynamically
import { toast } from 'sonner';

interface HistoricoItem {
  id: string;
  tabela: string;
  operacao: string;
  registro_id: string;
  dados_anteriores: Record<string, unknown> | null;
  dados_novos: Record<string, unknown> | null;
  usuario_nome: string | null;
  created_at: string;
}

const OP_CONFIG: Record<string, { label: string; icon: typeof Plus; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  INSERT: { label: 'CRIAÇÃO', icon: Plus, variant: 'default', color: 'text-emerald-600' },
  UPDATE: { label: 'EDIÇÃO', icon: Pencil, variant: 'secondary', color: 'text-blue-600' },
  DELETE: { label: 'EXCLUSÃO', icon: Trash2, variant: 'destructive', color: 'text-red-600' },
  TRANSFERENCIA: { label: 'TRANSFERÊNCIA', icon: ArrowRightLeft, variant: 'outline', color: 'text-violet-600' },
  MOVIMENTACAO: { label: 'MOVIMENTAÇÃO', icon: ArrowRightLeft, variant: 'outline', color: 'text-amber-600' },
};

const TABELA_LABELS: Record<string, string> = {
  funcionarios: 'Funcionários',
  demissoes: 'Demissões',
  quadro_planejado: 'Quadro Planejado',
  quadro_decoracao: 'Quadro Decoração',
  setores: 'Setores',
  situacoes: 'Situações',
  trocas_turno: 'Trocas de Turno',
  divergencias_quadro: 'Divergências',
  previsao_documentos: 'Previsão Docs',
  experiencia_decisoes: 'Experiência',
};

const CAMPO_LABELS: Record<string, string> = {
  nome: 'Nome', nome_completo: 'Nome', empresa: 'Empresa', matricula: 'Matrícula',
  setor: 'Setor', turma: 'Turma', situacao: 'Situação', cargo: 'Cargo',
  sexo: 'Sexo', data_admissao: 'Data Admissão', data_demissao: 'Data Demissão',
  observacoes: 'Observações', centro_custo: 'Centro Custo',
};

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined) return '—';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return format(parseISO(valor), 'dd/MM/yyyy');
  }
  return String(valor);
}

function getDiffs(ant: Record<string, unknown> | null, nov: Record<string, unknown> | null) {
  if (!ant && !nov) return [];
  const campos = new Set([...Object.keys(ant || {}), ...Object.keys(nov || {})]);
  const diffs: Array<{ campo: string; anterior: unknown; novo: unknown }> = [];
  campos.forEach(campo => {
    const vAnt = ant?.[campo], vNov = nov?.[campo];
    if (JSON.stringify(vAnt) !== JSON.stringify(vNov)) diffs.push({ campo, anterior: vAnt, novo: vNov });
  });
  return diffs;
}

function getNomeFuncionario(h: HistoricoItem): string {
  const n = h.dados_novos as Record<string, unknown> | null;
  const a = h.dados_anteriores as Record<string, unknown> | null;
  return ((n?.nome || n?.nome_completo || a?.nome || a?.nome_completo || '') as string) || '—';
}

export default function Auditoria() {
  const [search, setSearch] = useState('');
  const [filtroOperacao, setFiltroOperacao] = useState<string>('TODOS');
  const [filtroTabela, setFiltroTabela] = useState<string>('TODOS');
  const [filtroUsuario, setFiltroUsuario] = useState<string>('TODOS');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('7');
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});

  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['auditoria_completa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as HistoricoItem[];
    },
  });

  const toggleExpandido = (id: string) => setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));

  // Extrair listas únicas para filtros
  const usuarios = useMemo(() => [...new Set(historico.map(h => h.usuario_nome).filter(Boolean))].sort() as string[], [historico]);
  const tabelas = useMemo(() => [...new Set(historico.map(h => h.tabela))].sort(), [historico]);

  // Filtrar
  const filtrado = useMemo(() => {
    return historico.filter(h => {
      // Período
      const dt = parseISO(h.created_at);
      if (filtroPeriodo === 'custom') {
        if (dataInicio && isBefore(dt, startOfDay(dataInicio))) return false;
        if (dataFim && isAfter(dt, endOfDay(dataFim))) return false;
      } else {
        const dias = parseInt(filtroPeriodo);
        if (isBefore(dt, subDays(new Date(), dias))) return false;
      }

      if (filtroOperacao !== 'TODOS' && h.operacao !== filtroOperacao) return false;
      if (filtroTabela !== 'TODOS' && h.tabela !== filtroTabela) return false;
      if (filtroUsuario !== 'TODOS' && h.usuario_nome !== filtroUsuario) return false;

      if (search) {
        const s = search.toLowerCase();
        const nome = getNomeFuncionario(h).toLowerCase();
        return (
          nome.includes(s) ||
          (h.usuario_nome || '').toLowerCase().includes(s) ||
          h.operacao.toLowerCase().includes(s) ||
          h.tabela.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [historico, search, filtroOperacao, filtroTabela, filtroUsuario, filtroPeriodo, dataInicio, dataFim]);

  // Estatísticas
  const stats = useMemo(() => {
    const ops: Record<string, number> = {};
    const usrs: Record<string, number> = {};
    filtrado.forEach(h => {
      ops[h.operacao] = (ops[h.operacao] || 0) + 1;
      if (h.usuario_nome) usrs[h.usuario_nome] = (usrs[h.usuario_nome] || 0) + 1;
    });
    const topUser = Object.entries(usrs).sort((a, b) => b[1] - a[1])[0];
    return { total: filtrado.length, ops, topUser: topUser ? { nome: topUser[0], count: topUser[1] } : null };
  }, [filtrado]);

  const limparFiltros = () => {
    setSearch('');
    setFiltroOperacao('TODOS');
    setFiltroTabela('TODOS');
    setFiltroUsuario('TODOS');
    setFiltroPeriodo('7');
    setDataInicio(undefined);
    setDataFim(undefined);
  };

  const temFiltroAtivo = search || filtroOperacao !== 'TODOS' || filtroTabela !== 'TODOS' || filtroUsuario !== 'TODOS' || filtroPeriodo !== '7';

  const exportarExcel = async () => {
    if (!filtrado.length) return;
    const XLSX = await import('xlsx-js-style');
    const dados = filtrado.map(h => ({
      'Data/Hora': format(parseISO(h.created_at), 'dd/MM/yyyy HH:mm:ss'),
      'Usuário': h.usuario_nome || '',
      'Operação': OP_CONFIG[h.operacao]?.label || h.operacao,
      'Tabela': TABELA_LABELS[h.tabela] || h.tabela,
      'Funcionário': getNomeFuncionario(h),
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria');
    XLSX.writeFile(wb, `Auditoria_${format(new Date(), 'dd-MM-yyyy_HHmm')}.xlsx`);
    toast.success('Exportado com sucesso!');
  };

  return (
    <div className="p-4 space-y-4 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">AUDITORIA DO SISTEMA</h1>
          <Badge variant="outline" className="text-xs">{stats.total} registros</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={exportarExcel} disabled={!filtrado.length} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          EXPORTAR
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><BarChart3 className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground">TOTAL</p>
              <p className="text-lg font-black">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2"><Plus className="h-4 w-4 text-emerald-600" /></div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground">CRIAÇÕES</p>
              <p className="text-lg font-black">{stats.ops.INSERT || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2"><Pencil className="h-4 w-4 text-blue-600" /></div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground">EDIÇÕES</p>
              <p className="text-lg font-black">{stats.ops.UPDATE || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/10 p-2"><User className="h-4 w-4 text-violet-600" /></div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground">MAIS ATIVO</p>
              <p className="text-sm font-bold truncate">{stats.topUser?.nome || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar nome, usuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Hoje</SelectItem>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroOperacao} onValueChange={setFiltroOperacao}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todas Ops.</SelectItem>
            {Object.entries(OP_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroTabela} onValueChange={setFiltroTabela}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todas Tabelas</SelectItem>
            {tabelas.map(t => (
              <SelectItem key={t} value={t}>{TABELA_LABELS[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos Usuários</SelectItem>
            {usuarios.map(u => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {temFiltroAtivo && (
          <Button size="sm" variant="ghost" onClick={limparFiltros} className="h-8 gap-1 text-xs text-muted-foreground">
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      {/* Período personalizado */}
      {filtroPeriodo === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <CalendarIcon className="h-3 w-3" />
                {dataInicio ? format(dataInicio, 'dd/MM/yyyy') : 'Data início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataInicio} onSelect={setDataInicio} locale={ptBR} /></PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <CalendarIcon className="h-3 w-3" />
                {dataFim ? format(dataFim, 'dd/MM/yyyy') : 'Data fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dataFim} onSelect={setDataFim} locale={ptBR} /></PopoverContent>
          </Popover>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-1.5 max-h-[calc(100vh-380px)] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtrado.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          filtrado.map((h) => {
            const op = OP_CONFIG[h.operacao] || OP_CONFIG.UPDATE;
            const OpIcon = op.icon;
            const nome = getNomeFuncionario(h);
            const isExp = expandidos[h.id];
            const diffs = getDiffs(h.dados_anteriores as Record<string, unknown> | null, h.dados_novos as Record<string, unknown> | null);

            return (
              <div
                key={h.id}
                className="group flex gap-3 rounded-lg border bg-card p-3 hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => diffs.length > 0 && toggleExpandido(h.id)}
              >
                {/* Ícone da operação */}
                <div className={cn('rounded-lg p-2 shrink-0 h-fit', `bg-${op.color.replace('text-', '')}/10`)}>
                  <OpIcon className={cn('h-4 w-4', op.color)} />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={op.variant} className="text-[10px] h-5">{op.label}</Badge>
                        <Badge variant="outline" className="text-[10px] h-5">{TABELA_LABELS[h.tabela] || h.tabela}</Badge>
                        {nome !== '—' && <span className="text-xs font-semibold truncate">{nome}</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="font-medium">{h.usuario_nome || 'Sistema'}</span>
                        <Clock className="h-3 w-3 ml-1" />
                        <span>{format(parseISO(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                    {diffs.length > 0 && (
                      <div className="shrink-0 text-muted-foreground">
                        {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    )}
                  </div>

                  {/* Detalhes expandidos */}
                  {isExp && diffs.length > 0 && (
                    <div className="mt-2 rounded-md border bg-muted/30 p-2.5 space-y-1">
                      {diffs.map(({ campo, anterior, novo }) => (
                        <div key={campo} className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-muted-foreground w-24 shrink-0">
                            {CAMPO_LABELS[campo] || campo}
                          </span>
                          {anterior != null && (
                            <span className="line-through text-destructive/70 truncate max-w-[150px]">
                              {formatarValor(anterior)}
                            </span>
                          )}
                          {anterior != null && novo != null && (
                            <span className="text-muted-foreground">→</span>
                          )}
                          {novo != null && (
                            <span className="font-semibold text-primary truncate max-w-[200px]">
                              {formatarValor(novo)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
