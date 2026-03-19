import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useHistoricoQuadro, CAMPOS_LABELS } from '@/hooks/useHistoricoQuadro';
import { useUsuario } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, ArrowRight, Clock, User } from 'lucide-react';

interface HistoricoQuadroTableProps {
  grupo: 'SOPRO' | 'DECORAÇÃO';
}

export function HistoricoQuadroTable({ grupo }: HistoricoQuadroTableProps) {
  const { isAdmin } = useUsuario();
  const tabela = grupo === 'SOPRO' ? 'quadro_planejado' : 'quadro_decoracao';
  const { data: historico = [], isLoading } = useHistoricoQuadro(tabela);

  // Só mostra para administradores
  if (!isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (historico.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma alteração registrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Histórico de Alterações - {grupo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {historico.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-medium">
                      {item.grupo ? `${item.grupo} ${item.turma}` : item.turma}
                    </Badge>
                    <span className="text-sm font-medium">
                      {CAMPOS_LABELS[item.campo] || item.campo}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {item.usuario_nome}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 rounded bg-destructive/10 text-destructive font-medium tabular-nums">
                    {item.valor_anterior}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium tabular-nums">
                    {item.valor_novo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
