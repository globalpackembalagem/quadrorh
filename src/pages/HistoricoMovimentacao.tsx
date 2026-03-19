import { useState, useMemo } from 'react';
import { History, UserMinus, UserPlus, ArrowRightLeft, Filter, Settings2, Lock, LockOpen } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHistoricoMovimentacao } from '@/hooks/useHistoricoMovimentacao';
import { useHistoricoQuadro, CAMPOS_LABELS } from '@/hooks/useHistoricoQuadro';
import { useFuncionariosNoQuadro } from '@/hooks/useFuncionarios';
import { useQuadroPlanejado } from '@/hooks/useQuadroPlanejado';
import { useQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const TIPOS_MOVIMENTACAO_INFO: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  'ADMISSÃO': { icon: UserPlus, color: 'text-success', bg: 'bg-success/10', label: 'ADMISSÃO' },
  'PEDIDO DE DEMISSÃO': { icon: UserMinus, color: 'text-destructive', bg: 'bg-destructive/10', label: 'PED. DEMISSÃO' },
  'DISPENSA': { icon: UserMinus, color: 'text-destructive', bg: 'bg-destructive/10', label: 'DISPENSA' },
  'TÉRMINO CONTRATO': { icon: UserMinus, color: 'text-warning', bg: 'bg-warning/10', label: 'TÉRMINO CONTRATO' },
  'TRANSFERÊNCIA ENTRADA': { icon: ArrowRightLeft, color: 'text-primary', bg: 'bg-primary/10', label: 'TRANSF. ENTRADA' },
  'TRANSFERÊNCIA SAÍDA': { icon: ArrowRightLeft, color: 'text-warning', bg: 'bg-warning/10', label: 'TRANSF. SAÍDA' },
  'AFASTAMENTO': { icon: UserMinus, color: 'text-muted-foreground', bg: 'bg-muted', label: 'AFASTAMENTO' },
  'RETORNO': { icon: UserPlus, color: 'text-success', bg: 'bg-success/10', label: 'RETORNO' },
};

const GRUPOS_FILTRO = [
  { value: 'SOPRO A', label: 'Sopro A' },
  { value: 'SOPRO B', label: 'Sopro B' },
  { value: 'SOPRO C', label: 'Sopro C' },
  { value: 'DIA T1', label: 'Decoração DIA T1' },
  { value: 'DIA T2', label: 'Decoração DIA T2' },
  { value: 'NOITE T1', label: 'Decoração NOITE T1' },
  { value: 'NOITE T2', label: 'Decoração NOITE T2' },
];

function turmaToGrupo(tabela: string, turma: string, grupo?: string | null): string {
  if (tabela === 'quadro_planejado') return grupo ? `${grupo} ${turma}` : `SOPRO ${turma}`;
  if (tabela === 'quadro_decoracao') {
    const map: Record<string, string> = { 'DIA-T1': 'DIA T1', 'DIA-T2': 'DIA T2', 'NOITE-T1': 'NOITE T1', 'NOITE-T2': 'NOITE T2' };
    return map[turma] || turma;
  }
  return turma;
}

interface TimelineItem {
  id: string;
  tipo: 'movimentacao' | 'quadro';
  grupo: string;
  created_at: string;
  tipo_movimentacao?: string;
  funcionario_nome?: string;
  quadro_anterior?: number;
  quadro_novo?: number;
  necessario?: number;
  observacoes?: string | null;
  campo?: string;
  valor_anterior?: number;
  valor_novo?: number;
  usuario_nome?: string;
}

export default function HistoricoMovimentacao() {
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);

  const filtro = selectedGrupos.length > 0 ? selectedGrupos : undefined;
  const { data: movimentacoes = [], isLoading: l1 } = useHistoricoMovimentacao(filtro);
  const { data: quadroChanges = [], isLoading: l2 } = useHistoricoQuadro();
  const { data: funcionariosQuadro = [] } = useFuncionariosNoQuadro();
  const { data: quadroPlanejado = [] } = useQuadroPlanejado('SOPRO');
  const { data: quadroDecoracao = [] } = useQuadroDecoracao();

  const isLoading = l1 || l2;

  // Calculate real headcount per grupo (same logic as dashboard)
  const quadroRealPorGrupo = useMemo(() => {
    const result: Record<string, { real: number; necessario: number }> = {};

    // SOPRO A, B, C
    quadroPlanejado.forEach(q => {
      const grupoKey = `SOPRO ${q.turma}`;
      const reservaRefeicaoIndustria = Math.round(q.aux_maquina_industria / 6);
      const reservaRefeicaoGP = Math.round(q.aux_maquina_gp / 6);
      const totalNecessario =
        q.aux_maquina_industria + q.reserva_ferias_industria + reservaRefeicaoIndustria +
        q.reserva_faltas_industria + q.amarra_pallets + q.revisao_frasco +
        q.mod_sindicalista + q.controle_praga + q.aux_maquina_gp +
        q.reserva_faltas_gp + reservaRefeicaoGP + q.reserva_ferias_gp + q.aumento_quadro;

      const grupoEsperado = `SOPRO ${q.turma}`;
      const funcTurma = funcionariosQuadro.filter(f => {
        const grupoSetor = f.setor?.grupo?.toUpperCase() || '';
        return grupoSetor === grupoEsperado;
      });
      result[grupoKey] = { real: funcTurma.length, necessario: totalNecessario };
    });

    // DECORAÇÃO
    quadroDecoracao.forEach(q => {
      const turmaMap: Record<string, string> = {
        'DIA-T1': 'DIA T1', 'DIA-T2': 'DIA T2', 'NOITE-T1': 'NOITE T1', 'NOITE-T2': 'NOITE T2',
      };
      const grupoKey = turmaMap[q.turma] || q.turma;
      const totalNecessario = q.aux_maquina + q.reserva_refeicao + q.reserva_faltas +
        q.reserva_ferias + q.apoio_topografia + q.reserva_afastadas + q.reserva_covid;

      const funcTurma = funcionariosQuadro.filter(f => {
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isDeco = setorNome.includes('DECORAÇÃO') || setorNome.includes('DECORACAO');
        if (!isDeco) return false;
        const turmaFunc = f.turma?.toUpperCase();
        const isDia = setorNome.includes('DIA');
        const isNoite = setorNome.includes('NOITE');
        if (turmaFunc === 'T1' || turmaFunc === '1') {
          return (isDia && q.turma === 'DIA-T1') || (isNoite && q.turma === 'NOITE-T1');
        }
        if (turmaFunc === 'T2' || turmaFunc === '2') {
          return (isDia && q.turma === 'DIA-T2') || (isNoite && q.turma === 'NOITE-T2');
        }
        return false;
      });
      result[grupoKey] = { real: funcTurma.length, necessario: totalNecessario };
    });

    return result;
  }, [funcionariosQuadro, quadroPlanejado, quadroDecoracao]);

  const toggleGrupo = (grupo: string) => {
    setSelectedGrupos(prev =>
      prev.includes(grupo) ? prev.filter(g => g !== grupo) : [...prev, grupo]
    );
  };

  // Always show all groups even if no history items
  const grupoCards = useMemo(() => {
    const allItems: TimelineItem[] = [];

    movimentacoes.forEach(m => {
      allItems.push({
        id: m.id, tipo: 'movimentacao', grupo: m.grupo, created_at: m.created_at,
        tipo_movimentacao: m.tipo_movimentacao, funcionario_nome: m.funcionario_nome,
        quadro_anterior: m.quadro_anterior, quadro_novo: m.quadro_novo,
        necessario: m.necessario, observacoes: m.observacoes,
      });
    });

    quadroChanges.forEach(q => {
      const grupoLabel = turmaToGrupo(q.tabela, q.turma, q.grupo);
      if (selectedGrupos.length > 0 && !selectedGrupos.includes(grupoLabel)) return;
      allItems.push({
        id: q.id, tipo: 'quadro', grupo: grupoLabel, created_at: q.created_at,
        campo: q.campo, valor_anterior: q.valor_anterior, valor_novo: q.valor_novo,
        usuario_nome: q.usuario_nome,
      });
    });

    // Group by sector
    const byGrupo: Record<string, TimelineItem[]> = {};

    // Initialize all groups so cards always show
    const gruposToShow = selectedGrupos.length > 0 ? selectedGrupos : GRUPOS_FILTRO.map(g => g.value);
    gruposToShow.forEach(g => { byGrupo[g] = []; });

    allItems.forEach(item => {
      if (!byGrupo[item.grupo]) byGrupo[item.grupo] = [];
      byGrupo[item.grupo].push(item);
    });

    // Sort items within each group by date desc
    Object.values(byGrupo).forEach(items => {
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Determine order
    const order = GRUPOS_FILTRO.map(g => g.value);
    const sortedKeys = Object.keys(byGrupo).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    return sortedKeys.map(grupo => {
      const items = byGrupo[grupo];
      const dashData = quadroRealPorGrupo[grupo];
      const quadroAtual = dashData?.real ?? 0;
      const necessario = dashData?.necessario ?? 0;

      return { grupo, items, quadroAtual, necessario };
    });
  }, [movimentacoes, quadroChanges, selectedGrupos, quadroRealPorGrupo]);

  const totalRegistros = grupoCards.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <History className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">HISTÓRICO DE MOVIMENTAÇÃO</h1>
          <p className="text-sm text-muted-foreground">Todas as movimentações e alterações de quadro</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filtrar por setor:</span>
          {selectedGrupos.length > 0 && (
            <button onClick={() => setSelectedGrupos([])} className="text-xs text-primary hover:underline ml-auto">
              Limpar filtros
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {GRUPOS_FILTRO.map(g => (
            <button
              key={g.value}
              onClick={() => toggleGrupo(g.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                selectedGrupos.includes(g.value)
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          {totalRegistros} registro{totalRegistros !== 1 ? 's' : ''} encontrado{totalRegistros !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Cards por grupo */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {grupoCards.map(({ grupo, items, quadroAtual, necessario }) => (
            <GrupoCard key={grupo} grupo={grupo} items={items} quadroAtual={quadroAtual} necessario={necessario} />
          ))}
        </div>
      )}
    </div>
  );
}

function GrupoCard({ grupo, items, quadroAtual, necessario }: {
  grupo: string;
  items: TimelineItem[];
  quadroAtual: number;
  necessario: number;
}) {
  const [trancado, setTrancado] = useState(false);
  const [dataRef, setDataRef] = useState('');
  const diff = quadroAtual - necessario;

  const handleTrancar = () => {
    if (!trancado) {
      setDataRef(format(new Date(), 'dd/MM/yyyy'));
      setTrancado(true);
    } else {
      setTrancado(false);
      setDataRef('');
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase">{grupo}</div>
          <div className="flex items-center gap-1.5">
            {trancado ? (
              <div className="flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                <Lock className="h-3 w-3" />
                {dataRef}
              </div>
            ) : (
              <Input
                value={dataRef}
                onChange={e => setDataRef(e.target.value)}
                className="w-[100px] h-6 text-[10px] text-center"
                placeholder="dd/MM/yyyy"
              />
            )}
            <button
              onClick={handleTrancar}
              className={cn(
                "p-1 rounded transition-colors",
                trancado 
                  ? "text-success hover:text-success/80" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title={trancado ? "Destrancar" : "Trancar data de referência"}
            >
              {trancado ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-4xl font-black text-foreground">{quadroAtual}</span>
          <span className="text-lg text-muted-foreground font-medium">/ {necessario}</span>
          {diff !== 0 && (
            <span className={cn(
              "ml-2 text-sm font-bold",
              diff > 0 ? "text-success" : "text-destructive"
            )}>
              {diff > 0 ? `+${diff} SOBRA` : `${diff} FALTA`}
            </span>
          )}
        </div>
      </div>

      {/* Lista de movimentações */}
      <div className="divide-y divide-border/50 max-h-[400px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">Sem movimentações registradas</div>
        ) : items.map(item => (
          <div key={item.id} className="px-4 py-2.5 text-sm hover:bg-muted/20 transition-colors">
            {item.tipo === 'movimentacao' ? (
              <MovimentacaoLine item={item} />
            ) : (
              <QuadroLine item={item} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MovimentacaoLine({ item }: { item: TimelineItem }) {
  const info = TIPOS_MOVIMENTACAO_INFO[item.tipo_movimentacao || ''] || {
    label: item.tipo_movimentacao || '', color: 'text-muted-foreground'
  };
  const dataStr = format(parseISO(item.created_at), "dd/MM/yyyy", { locale: ptBR });
  const horaStr = format(parseISO(item.created_at), "HH:mm");

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-muted-foreground">{dataStr}</span>
        <span className="text-muted-foreground">–</span>
        <span className={cn("font-bold", info.color)}>{info.label}</span>
        <span className="text-muted-foreground">–</span>
        <span className="font-semibold text-foreground">{item.funcionario_nome}</span>
      </div>
      <div className="flex items-center gap-2 pl-2 text-xs text-muted-foreground">
        <span>Quadro: {item.quadro_anterior} → <span className="font-bold text-foreground">{item.quadro_novo}</span> / {item.necessario}</span>
        <span>·</span>
        <span>{horaStr}</span>
      </div>
      {item.observacoes && (
        <div className="text-xs text-muted-foreground italic pl-2">{item.observacoes}</div>
      )}
    </div>
  );
}

function QuadroLine({ item }: { item: TimelineItem }) {
  const campoLabel = CAMPOS_LABELS[item.campo || ''] || item.campo;
  const diff = (item.valor_novo || 0) - (item.valor_anterior || 0);
  const dataStr = format(parseISO(item.created_at), "dd/MM/yyyy", { locale: ptBR });

  return (
    <div className="flex items-center gap-1.5 flex-wrap text-muted-foreground">
      <Settings2 className="h-3.5 w-3.5 shrink-0" />
      <span>{dataStr}</span>
      <span>–</span>
      <span className="font-medium text-foreground">{campoLabel}:</span>
      <span>{item.valor_anterior} → {item.valor_novo}</span>
      <span className={cn("font-bold", diff > 0 ? "text-success" : diff < 0 ? "text-destructive" : "")}>
        ({diff > 0 ? '+' : ''}{diff})
      </span>
      {item.usuario_nome && <span className="text-xs">por {item.usuario_nome}</span>}
    </div>
  );
}
