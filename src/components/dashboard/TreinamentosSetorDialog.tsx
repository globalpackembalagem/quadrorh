import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GraduationCap, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TreinamentoPrevisao, enrichStatus, StatusIndicator, getStatusIndicator, countEmTreinamento } from '@/hooks/useTreinamentosPrevisao';
import { cn } from '@/lib/utils';

interface TreinamentosSetorDialogProps {
  grupoLabel: string;
  treinamentos: TreinamentoPrevisao[];
}

const STATUS_COLORS: Record<string, string> = {
  'EM TREINAMENTO': 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  'TREINAMENTO EXPIRADO': 'bg-destructive/10 text-destructive border-destructive/30',
  'INATIVO': 'bg-muted text-muted-foreground border-muted',
};

const INDICATOR_COLORS: Record<StatusIndicator, string> = {
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};

export function TreinamentoIndicator({ treinamentos }: { treinamentos: TreinamentoPrevisao[] }) {
  const indicator = getStatusIndicator(treinamentos);
  const count = countEmTreinamento(treinamentos);

  return (
    <div className="relative">
      <div className={cn('h-3 w-3 rounded-full', INDICATOR_COLORS[indicator])} />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

export function TreinamentosSetorDialog({ grupoLabel, treinamentos }: TreinamentosSetorDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [ordem, setOrdem] = useState<'newest' | 'oldest'>('oldest');

  const enriched = useMemo(() => treinamentos.map(enrichStatus), [treinamentos]);

  const filtered = useMemo(() => {
    let list = [...enriched];

    if (search) {
      const term = search.toUpperCase();
      list = list.filter(t =>
        t.nome_completo.toUpperCase().includes(term) ||
        (t.matricula || '').toUpperCase().includes(term)
      );
    }

    if (filtroStatus === 'em_treinamento') {
      list = list.filter(t => t.statusReal === 'EM TREINAMENTO');
    } else if (filtroStatus === 'expirado') {
      list = list.filter(t => t.statusReal === 'TREINAMENTO EXPIRADO');
    }

    list.sort((a, b) => {
      const dateA = new Date(a.treinamento_inicio).getTime();
      const dateB = new Date(b.treinamento_inicio).getTime();
      return ordem === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [enriched, search, filtroStatus, ordem]);

  const indicator = getStatusIndicator(treinamentos);
  const countActive = countEmTreinamento(treinamentos);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="relative flex items-center justify-center h-8 w-8 rounded-full bg-muted/60 hover:bg-muted transition-colors cursor-pointer"
          title={`Treinamentos - ${grupoLabel}`}
        >
          <GraduationCap className="h-4 w-4 text-foreground" />
          <div className={cn('absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card', INDICATOR_COLORS[indicator])} />
          {countActive > 0 && (
            <span className="absolute -top-2 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {countActive}
            </span>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5" />
            Treinamentos - {grupoLabel}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou matrícula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="em_treinamento">Em Treinamento</SelectItem>
              <SelectItem value="expirado">Expirado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ordem} onValueChange={v => setOrdem(v as 'newest' | 'oldest')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Ordem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Mais recente</SelectItem>
              <SelectItem value="oldest">Mais antigo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary badges */}
        <div className="flex gap-2 mb-4">
          <Badge variant="outline" className="gap-1">
            Total: {treinamentos.length}
          </Badge>
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 gap-1">
            Em Treinamento: {countActive}
          </Badge>
          <Badge className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
            Expirados: {treinamentos.length - countActive}
          </Badge>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum registro de treinamento encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Matrícula</TableHead>
                <TableHead className="text-xs">Nome</TableHead>
                <TableHead className="text-xs">Cargo</TableHead>
                <TableHead className="text-xs">Turma</TableHead>
                <TableHead className="text-xs">Início</TableHead>
                <TableHead className="text-xs">Expiração</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow key={t.id} className="text-xs">
                  <TableCell className="py-1.5">{t.matricula || '-'}</TableCell>
                  <TableCell className="font-medium py-1.5">{t.nome_completo}</TableCell>
                  <TableCell className="py-1.5">{t.cargo || '-'}</TableCell>
                  <TableCell className="py-1.5">{t.turma || '-'}</TableCell>
                  <TableCell className="py-1.5">
                    {format(new Date(t.treinamento_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="py-1.5">
                    {format(new Date(t.treinamento_expiracao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="py-1.5">
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', STATUS_COLORS[t.statusReal] || '')}>
                      {t.statusReal}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
