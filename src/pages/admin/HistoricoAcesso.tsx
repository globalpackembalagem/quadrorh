import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Search, Monitor, Smartphone, UserCheck, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Filtro = 'todos' | 'logados' | 'visitantes';
type Periodo = '7d' | '30d' | '90d';

export default function HistoricoAcesso() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [periodo, setPeriodo] = useState<Periodo>('7d');

  const diasAtras = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90;
  const dataLimite = subDays(new Date(), diasAtras).toISOString();

  const { data: acessos = [], isLoading } = useQuery({
    queryKey: ['historico-acesso', dataLimite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_acesso')
        .select('*')
        .gte('data_acesso', dataLimite)
        .order('data_acesso', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const filtrados = useMemo(() => {
    return acessos.filter((a) => {
      const isVisitante = a.user_role_id === 'visualizacao';
      if (filtro === 'logados' && isVisitante) return false;
      if (filtro === 'visitantes' && !isVisitante) return false;
      if (busca && !a.nome_usuario.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [acessos, filtro, busca]);

  const totalLogados = acessos.filter(a => a.user_role_id !== 'visualizacao').length;
  const totalVisitantes = acessos.filter(a => a.user_role_id === 'visualizacao').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Histórico de Acesso</h1>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold">{acessos.length}</p>
          <p className="text-xs text-muted-foreground">Total de acessos</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalLogados}</p>
          <p className="text-xs text-muted-foreground">Com login</p>
        </div>
        <div className="bg-card border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{totalVisitantes}</p>
          <p className="text-xs text-muted-foreground">Visitantes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(['todos', 'logados', 'visitantes'] as Filtro[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filtro === f ? 'default' : 'outline'}
              onClick={() => setFiltro(f)}
              className="capitalize"
            >
              {f}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['7d', '30d', '90d'] as Periodo[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={periodo === p ? 'secondary' : 'ghost'}
              onClick={() => setPeriodo(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Dispositivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum acesso encontrado
                </TableCell>
              </TableRow>
            ) : (
              filtrados.map((a) => {
                const isVisitante = a.user_role_id === 'visualizacao';
                return (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">
                      {format(parseISO(a.data_acesso), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{a.nome_usuario}</TableCell>
                    <TableCell>
                      {isVisitante ? (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Eye className="h-3 w-3" />
                          Visitante
                        </Badge>
                      ) : (
                        <Badge className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
                          <UserCheck className="h-3 w-3" />
                          Login
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {a.dispositivo === 'MOBILE' ? (
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
