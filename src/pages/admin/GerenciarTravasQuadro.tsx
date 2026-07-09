import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Lock, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AREAS_QUADRO_TRAVA, AreaQuadroTrava, contarFuncionariosDaArea } from '@/hooks/useFuncionarios';
import { useTravarQuadro } from '@/hooks/useQuadroTrava';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type QuadroTrava = {
  id: string;
  area: AreaQuadroTrava;
  ativo: boolean;
  usuario_nome: string | null;
  observacao: string | null;
  quantidade_inicial: number | null;
  created_at: string | null;
};

type RegistroHistoricoTrava = {
  id: string;
  funcionario_nome: string | null;
  campo_alterado: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  usuario_nome: string | null;
  created_at: string | null;
};

function formatarData(data?: string | null) {
  if (!data) return '-';
  return new Date(data).toLocaleString('pt-BR');
}

export default function GerenciarTravasQuadro() {
  const [travaSelecionada, setTravaSelecionada] = useState<QuadroTrava | null>(null);
  const travarQuadro = useTravarQuadro();

  const travasQuery = useQuery({
    queryKey: ['quadro_travas', 'ativas_por_area'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('quadro_travas')
        .select('*')
        .in('area', [...AREAS_QUADRO_TRAVA])
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as QuadroTrava[];
    },
  });

  const contagensQuery = useQuery({
    queryKey: ['quadro_travas', 'contagens_atuais'],
    queryFn: async () => {
      const entradas = await Promise.all(
        AREAS_QUADRO_TRAVA.map(async (area) => [area, await contarFuncionariosDaArea(area)] as const)
      );
      return Object.fromEntries(entradas) as Record<AreaQuadroTrava, number>;
    },
  });

  const historicoQuery = useQuery({
    queryKey: ['quadro_historico', travaSelecionada?.id],
    enabled: !!travaSelecionada?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('quadro_historico')
        .select('id, funcionario_nome, campo_alterado, valor_anterior, valor_novo, usuario_nome, created_at')
        .eq('trava_id', travaSelecionada!.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as RegistroHistoricoTrava[];
    },
  });

  const travasPorArea = new Map((travasQuery.data || []).map((trava) => [trava.area, trava]));

  const handleTravar = async (area: AreaQuadroTrava, atual: number, jaTravada: boolean) => {
    const acao = jaTravada ? 'RETRAVAR' : 'TRAVAR';
    const mensagem = jaTravada
      ? `Confirma retravar ${area} com ${atual} funcionarios? Isso vai reiniciar o marco.`
      : `Confirma travar ${area} com ${atual} funcionarios?`;

    if (!window.confirm(mensagem)) return;

    await travarQuadro.mutateAsync(area);
    await Promise.all([travasQuery.refetch(), contagensQuery.refetch()]);
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Gerenciar Travas do Quadro</h1>
        <p className="page-description">
          Controle o marco inicial por area e acompanhe as alteracoes registradas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Areas do quadro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atual</TableHead>
                  <TableHead>Inicial</TableHead>
                  <TableHead>Data trava</TableHead>
                  <TableHead>Diferenca</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {AREAS_QUADRO_TRAVA.map((area) => {
                  const trava = travasPorArea.get(area);
                  const atual = contagensQuery.data?.[area] ?? 0;
                  const inicial = trava?.quantidade_inicial ?? null;
                  const diferenca = inicial === null ? null : atual - inicial;

                  return (
                    <TableRow key={area}>
                      <TableCell className="font-semibold">{area}</TableCell>
                      <TableCell>
                        <Badge variant={trava ? 'default' : 'outline'}>
                          {trava ? 'TRAVADA' : 'LIVRE'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{contagensQuery.isLoading ? '...' : atual}</TableCell>
                      <TableCell className="font-mono">{inicial ?? '-'}</TableCell>
                      <TableCell>{formatarData(trava?.created_at)}</TableCell>
                      <TableCell>
                        {diferenca === null ? '-' : (
                          <Badge variant={diferenca < 0 ? 'destructive' : diferenca > 0 ? 'default' : 'outline'}>
                            {diferenca > 0 ? `+${diferenca}` : diferenca}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant={trava ? 'secondary' : 'default'}
                            disabled={travarQuadro.isPending || contagensQuery.isLoading}
                            onClick={() => handleTravar(area, atual, !!trava)}
                          >
                            {trava ? <RotateCcw className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                            {trava ? 'Retravar' : 'Travar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!trava}
                            onClick={() => setTravaSelecionada(trava || null)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            Ver historico
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {travaSelecionada && (
        <Card>
          <CardHeader>
            <CardTitle>Historico - {travaSelecionada.area}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionario</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(historicoQuery.data || []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.funcionario_nome || '-'}</TableCell>
                      <TableCell>{item.campo_alterado || '-'}</TableCell>
                      <TableCell>{item.valor_anterior || '-'}</TableCell>
                      <TableCell>{item.valor_novo || '-'}</TableCell>
                      <TableCell>{item.usuario_nome || '-'}</TableCell>
                      <TableCell>{formatarData(item.created_at)}</TableCell>
                    </TableRow>
                  ))}
                  {!historicoQuery.isLoading && (historicoQuery.data || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhum registro encontrado para esta trava.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
