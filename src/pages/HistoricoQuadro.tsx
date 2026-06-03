import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Download, History, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useHistoricoMovimentacaoQuadro, TIPOS_MOVIMENTACAO_QUADRO } from '@/hooks/useHistoricoMovimentacaoQuadro';
import { useSetoresAtivos } from '@/hooks/useSetores';
import { useUsuario } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function HistoricoQuadro() {
  const { usuarioAtual, isAdmin } = useUsuario();
  const { data: setores = [] } = useSetoresAtivos();
  const [setorId, setSetorId] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [busca, setBusca] = useState('');

  const setoresPermitidos = useMemo(() => {
    if (isAdmin || usuarioAtual.setoresIds.length === 0) return setores;
    return setores.filter((setor) => usuarioAtual.setoresIds.includes(setor.id));
  }, [isAdmin, setores, usuarioAtual.setoresIds]);

  const setorFiltro = setorId === 'todos' && !isAdmin && usuarioAtual.setoresIds.length === 1
    ? usuarioAtual.setoresIds[0]
    : setorId;

  const { data: historico = [], isLoading } = useHistoricoMovimentacaoQuadro({
    setorId: setorFiltro,
    tipo,
    dataInicio,
    dataFim,
  });

  const registrosVisiveis = useMemo(() => {
    const permitidos = new Set(setoresPermitidos.map((setor) => setor.id));
    const termo = busca.trim().toLowerCase();

    return historico.filter((item) => {
      if (!isAdmin && usuarioAtual.setoresIds.length > 0) {
        const podeVer = (item.setor_origem_id && permitidos.has(item.setor_origem_id))
          || (item.setor_destino_id && permitidos.has(item.setor_destino_id));
        if (!podeVer) return false;
      }

      if (!termo) return true;
      return [
        item.funcionario_nome,
        item.matricula,
        item.tipo_movimentacao,
        item.setor_origem_nome,
        item.setor_destino_nome,
        item.observacao,
      ].some((valor) => valor?.toLowerCase().includes(termo));
    });
  }, [busca, historico, isAdmin, setoresPermitidos, usuarioAtual.setoresIds.length]);

  const podeAcessar = isAdmin || usuarioAtual.setoresIds.length > 0;

  const exportarExcel = async () => {
    if (registrosVisiveis.length === 0) {
      toast.info('Nenhum registro para exportar');
      return;
    }

    const XLSX = await import('xlsx-js-style');
    const dados = registrosVisiveis.map((item) => ({
      Data: format(parseISO(item.data_movimentacao), 'dd/MM/yyyy'),
      Funcionario: item.funcionario_nome,
      Matricula: item.matricula || '',
      Tipo: item.tipo_movimentacao,
      'Setor origem': item.setor_origem_nome || '',
      'Turma origem': item.turma_origem || '',
      'Setor destino': item.setor_destino_nome || '',
      'Turma destino': item.turma_destino || '',
      Impacto: item.impacto,
      'Quantidade antes': item.quantidade_antes ?? '',
      'Quantidade depois': item.quantidade_depois ?? '',
      Usuario: item.usuario_nome,
      Observacao: item.observacao || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Historico do Quadro');
    XLSX.writeFile(workbook, `historico_quadro_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast.success('Excel exportado com sucesso');
  };

  if (!podeAcessar) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Acesso restrito aos administradores e responsaveis por setor.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            Historico do Quadro
          </h1>
          <p className="text-sm text-muted-foreground">
            Movimentacoes que alteram ou justificam o quadro por setor.
          </p>
        </div>
        <Button onClick={exportarExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Setor</Label>
            <Select value={setorId} onValueChange={setSetorId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {setoresPermitidos.map((setor) => (
                  <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {TIPOS_MOVIMENTACAO_QUADRO.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Inicio</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, matricula..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Registros <Badge variant="secondary">{registrosVisiveis.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Funcionario</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Impacto</TableHead>
                <TableHead>Antes/Depois</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Observacao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : registrosVisiveis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">Nenhuma movimentacao registrada.</TableCell>
                </TableRow>
              ) : (
                registrosVisiveis.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(parseISO(item.data_movimentacao), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <div className="font-medium">{item.funcionario_nome}</div>
                      <div className="text-xs text-muted-foreground">{item.matricula || '-'}</div>
                    </TableCell>
                    <TableCell>{item.tipo_movimentacao}</TableCell>
                    <TableCell>{item.setor_origem_nome || '-'}{item.turma_origem ? ` / ${item.turma_origem}` : ''}</TableCell>
                    <TableCell>{item.setor_destino_nome || '-'}{item.turma_destino ? ` / ${item.turma_destino}` : ''}</TableCell>
                    <TableCell>
                      <Badge variant={item.impacto < 0 ? 'destructive' : item.impacto > 0 ? 'default' : 'outline'}>
                        {item.impacto > 0 ? `+${item.impacto}` : item.impacto}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.quantidade_antes ?? '-'} / {item.quantidade_depois ?? '-'}</TableCell>
                    <TableCell>{item.usuario_nome}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{item.observacao || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
