import { useState } from 'react';
import { History, Plus, UserMinus, UserPlus, ArrowRightLeft, TrendingUp, TrendingDown, Minus, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHistoricoMovimentacao, useRegistrarMovimentacao } from '@/hooks/useHistoricoMovimentacao';
import { useUsuario } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TIPOS_MOVIMENTACAO = [
  { value: 'ADMISSÃO', label: 'Admissão', icon: UserPlus, color: 'text-success' },
  { value: 'PEDIDO DE DEMISSÃO', label: 'Pedido de Demissão', icon: UserMinus, color: 'text-destructive' },
  { value: 'DISPENSA', label: 'Dispensa', icon: UserMinus, color: 'text-destructive' },
  { value: 'TÉRMINO CONTRATO', label: 'Término de Contrato', icon: UserMinus, color: 'text-warning' },
  { value: 'TRANSFERÊNCIA ENTRADA', label: 'Transferência (Entrada)', icon: ArrowRightLeft, color: 'text-primary' },
  { value: 'TRANSFERÊNCIA SAÍDA', label: 'Transferência (Saída)', icon: ArrowRightLeft, color: 'text-warning' },
  { value: 'AFASTAMENTO', label: 'Afastamento', icon: UserMinus, color: 'text-muted-foreground' },
  { value: 'RETORNO', label: 'Retorno', icon: UserPlus, color: 'text-success' },
];

const GRUPOS_FILTRO = [
  { value: 'SOPRO A', label: 'Sopro A' },
  { value: 'SOPRO B', label: 'Sopro B' },
  { value: 'SOPRO C', label: 'Sopro C' },
  { value: 'DIA T1', label: 'Deco DIA T1' },
  { value: 'DIA T2', label: 'Deco DIA T2' },
  { value: 'NOITE T1', label: 'Deco NOITE T1' },
  { value: 'NOITE T2', label: 'Deco NOITE T2' },
];

// ── Single card button (opens filtered by one grupo) ──
interface CardProps {
  grupo: string;
  quadroAtual: number;
  necessario: number;
}

export function HistoricoMovimentacaoDialog({ grupo, quadroAtual, necessario }: CardProps) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState('');
  const [nome, setNome] = useState('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [obs, setObs] = useState('');

  const { data: historico = [], isLoading } = useHistoricoMovimentacao(grupo);
  const registrar = useRegistrarMovimentacao();
  const { usuarioAtual } = useUsuario();

  const isSaida = ['PEDIDO DE DEMISSÃO', 'DISPENSA', 'TÉRMINO CONTRATO', 'TRANSFERÊNCIA SAÍDA', 'AFASTAMENTO'].includes(tipo);
  const novoQuadro = isSaida ? quadroAtual - 1 : quadroAtual + 1;

  const handleSubmit = () => {
    if (!tipo || !nome.trim()) {
      toast.error('Preencha tipo e nome do funcionário');
      return;
    }
    registrar.mutate({
      grupo,
      tipo_movimentacao: tipo,
      funcionario_nome: nome.trim().toUpperCase(),
      data,
      quadro_anterior: quadroAtual,
      quadro_novo: novoQuadro,
      necessario,
      observacoes: obs || null,
      criado_por: usuarioAtual?.nome || null,
    }, {
      onSuccess: () => {
        toast.success('Movimentação registrada');
        setShowForm(false);
        setTipo('');
        setNome('');
        setObs('');
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center justify-center h-7 w-7 rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors cursor-pointer"
          title="Histórico de Movimentação"
        >
          <History className="h-4 w-4 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico - {grupo}
          </DialogTitle>
        </DialogHeader>

        {/* Current state */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
          <span className="text-sm font-medium text-muted-foreground">Quadro Atual:</span>
          <span className="text-2xl font-bold tabular-nums">{quadroAtual}</span>
          <span className="text-sm text-muted-foreground">/ {necessario}</span>
          <DiffBadge diff={quadroAtual - necessario} />
        </div>

        {/* Add button */}
        {!showForm && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Registrar Movimentação
          </Button>
        )}

        {/* Form */}
        {showForm && (
          <MovimentacaoForm
            tipo={tipo} setTipo={setTipo}
            nome={nome} setNome={setNome}
            data={data} setData={setData}
            obs={obs} setObs={setObs}
            quadroAtual={quadroAtual} novoQuadro={novoQuadro} necessario={necessario}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isPending={registrar.isPending}
            showPreview={!!tipo}
          />
        )}

        <HistoricoList historico={historico} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
}

// ── Full-page / multi-filter dialog ──
interface FullHistoricoProps {
  gruposDisponiveis?: typeof GRUPOS_FILTRO;
}

export function HistoricoMovimentacaoFullDialog({ gruposDisponiveis = GRUPOS_FILTRO }: FullHistoricoProps) {
  const [open, setOpen] = useState(false);
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);

  const filtro = selectedGrupos.length > 0 ? selectedGrupos : undefined;
  const { data: historico = [], isLoading } = useHistoricoMovimentacao(filtro);

  const toggleGrupo = (grupo: string) => {
    setSelectedGrupos(prev =>
      prev.includes(grupo) ? prev.filter(g => g !== grupo) : [...prev, grupo]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Histórico Movimentação
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Movimentação
          </DialogTitle>
        </DialogHeader>

        {/* Filter buttons */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filtrar por setor:</span>
            {selectedGrupos.length > 0 && (
              <button
                onClick={() => setSelectedGrupos([])}
                className="text-xs text-primary hover:underline ml-auto"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {gruposDisponiveis.map(g => (
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
        </div>

        {/* Results count */}
        <div className="text-xs text-muted-foreground">
          {historico.length} registro{historico.length !== 1 ? 's' : ''} encontrado{historico.length !== 1 ? 's' : ''}
        </div>

        <HistoricoList historico={historico} isLoading={isLoading} showGrupo />
      </DialogContent>
    </Dialog>
  );
}

// ── Shared sub-components ──

function DiffBadge({ diff }: { diff: number }) {
  return (
    <div className={cn(
      "ml-auto flex items-center gap-1 text-sm font-semibold",
      diff > 0 && "text-success",
      diff < 0 && "text-destructive",
      diff === 0 && "text-muted-foreground"
    )}>
      {diff > 0 ? <><TrendingUp className="h-3.5 w-3.5" />+{diff}</> :
       diff < 0 ? <><TrendingDown className="h-3.5 w-3.5" />{diff}</> :
       <><Minus className="h-3.5 w-3.5" />OK</>}
    </div>
  );
}

function MovimentacaoForm({ tipo, setTipo, nome, setNome, data, setData, obs, setObs, quadroAtual, novoQuadro, necessario, onSubmit, onCancel, isPending, showPreview }: any) {
  return (
    <div className="space-y-3 p-3 rounded-lg border bg-card">
      <Select value={tipo} onValueChange={setTipo}>
        <SelectTrigger><SelectValue placeholder="Tipo de movimentação" /></SelectTrigger>
        <SelectContent>
          {TIPOS_MOVIMENTACAO.map(t => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input placeholder="Nome do funcionário" value={nome} onChange={e => setNome(e.target.value)} />
      <Input type="date" value={data} onChange={e => setData(e.target.value)} />
      <Input placeholder="Observações (opcional)" value={obs} onChange={e => setObs(e.target.value)} />
      {showPreview && (
        <div className="text-xs text-muted-foreground p-2 rounded bg-muted/50">
          Quadro: {quadroAtual} → <span className="font-bold text-foreground">{novoQuadro}</span> / {necessario}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={onSubmit} disabled={isPending}>Salvar</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

function HistoricoList({ historico, isLoading, showGrupo = false }: { historico: any[]; isLoading: boolean; showGrupo?: boolean }) {
  return (
    <div className="space-y-2 mt-2">
      {isLoading && <div className="text-sm text-muted-foreground text-center py-4">Carregando...</div>}
      {!isLoading && historico.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação registrada</div>
      )}
      {historico.map((item: any) => {
        const tipoInfo = TIPOS_MOVIMENTACAO.find(t => t.value === item.tipo_movimentacao);
        const Icon = tipoInfo?.icon || ArrowRightLeft;
        const colorClass = tipoInfo?.color || 'text-muted-foreground';
        const diff = item.quadro_novo - item.necessario;

        return (
          <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
            <div className={cn("mt-0.5 shrink-0", colorClass)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {showGrupo && (
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-foreground">
                    {item.grupo}
                  </span>
                )}
                <span className={cn("text-xs font-semibold px-1.5 py-0.5 rounded",
                  colorClass,
                  tipoInfo?.color.includes('success') ? 'bg-success/10' :
                  tipoInfo?.color.includes('destructive') ? 'bg-destructive/10' :
                  tipoInfo?.color.includes('warning') ? 'bg-warning/10' : 'bg-primary/10'
                )}>
                  {item.tipo_movimentacao}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="text-sm font-semibold mt-1">{item.funcionario_nome}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {item.quadro_anterior} → <span className="font-bold text-foreground">{item.quadro_novo}</span> / {item.necessario}
                </span>
                <span className={cn(
                  "text-xs font-semibold",
                  diff > 0 && "text-success",
                  diff < 0 && "text-destructive",
                  diff === 0 && "text-muted-foreground"
                )}>
                  {diff > 0 ? `+${diff} sobra` : diff < 0 ? `${diff} falta` : 'OK'}
                </span>
              </div>
              {item.observacoes && (
                <div className="text-xs text-muted-foreground mt-1 italic">{item.observacoes}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
