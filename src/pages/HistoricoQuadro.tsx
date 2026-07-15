import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Download, History, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useHistoricoMovimentacaoQuadro, TIPOS_MOVIMENTACAO_QUADRO } from '@/hooks/useHistoricoMovimentacaoQuadro';
import { AREAS_QUADRO_TRAVA, AreaQuadroTrava, contarFuncionariosDaArea } from '@/hooks/useFuncionarios';
import { useSetoresAtivos } from '@/hooks/useSetores';
import { useUsuario } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { loadXLSX } from '@/lib/xlsx';
import { getTipoSetorTurma } from '@/lib/turmas';

type QuadroTrava = {
  id: string;
  area: AreaQuadroTrava;
  ativo: boolean;
  quantidade_inicial: number | null;
  created_at: string | null;
};

type RegistroHistoricoQuadro = ReturnType<typeof useHistoricoMovimentacaoQuadro>['data'] extends Array<infer T> ? T : any;
type RegistroHistoricoQuadroComSaldo = RegistroHistoricoQuadro & {
  quantidade_antes_calculada: number | null;
  quantidade_depois_calculada: number | null;
};

function montarLocalMovimentacao(setor?: string | null, turma?: string | null) {
  const setorFormatado = normalizarValorTabela(setor);
  const turmaFormatada = normalizarValorTabela(turma);
  if (setorFormatado !== '-' && turmaFormatada !== '-') return `${setorFormatado} / ${turmaFormatada}`;
  if (setorFormatado !== '-') return setorFormatado;
  if (turmaFormatada !== '-') return `TURMA ${turmaFormatada}`;
  return '-';
}

function normalizarValorTabela(valor?: string | number | null) {
  const texto = String(valor ?? '').trim();
  if (!texto || texto.toUpperCase() === 'NAO INFORMADO') return '-';
  return texto;
}

function normalizarBusca(valor?: string | null) {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return '-';
  return new Date(valor).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarArea(area: AreaQuadroTrava) {
  return area.replace('DIA-T', 'DIA - T').replace('NOITE-T', 'NOITE - T');
}

function isTransferencia(tipo?: string | null) {
  return String(tipo ?? '').toUpperCase().includes('TRANSFERENCIA');
}

function montarSetorMovimentacao(item: any) {
  if (String(item.tipo_movimentacao ?? '').toUpperCase() === 'ADMISSAO') {
    return montarLocalMovimentacao(item.setor_destino_nome, item.turma_destino);
  }
  if (String(item.tipo_movimentacao ?? '').toUpperCase() === 'DEMISSAO') {
    return montarLocalMovimentacao(item.setor_origem_nome, item.turma_origem);
  }
  return '-';
}

function areaDoRegistro(item: any): AreaQuadroTrava | null {
  const setorOrigem = normalizarBusca(item.setor_origem_nome);
  const setorDestino = normalizarBusca(item.setor_destino_nome);
  const setores = `${setorOrigem} ${setorDestino}`;
  const turmaOrigem = normalizarBusca(item.turma_origem);
  const turmaDestino = normalizarBusca(item.turma_destino);
  const turmas = `${turmaOrigem} ${turmaDestino}`;

  if (setores.includes('SOPRO A') || setores.includes('G+P A')) return 'SOPRO A';
  if (setores.includes('SOPRO B') || setores.includes('G+P B')) return 'SOPRO B';
  if (setores.includes('SOPRO C') || setores.includes('G+P C')) return 'SOPRO C';

  const isDia = setores.includes('DECORACAO') && setores.includes('DIA');
  const isNoite = setores.includes('DECORACAO') && setores.includes('NOITE');
  const isT1 = turmas.includes('T1') || turmas.split(/\s+/).includes('1');
  const isT2 = turmas.includes('T2') || turmas.split(/\s+/).includes('2');

  if (isDia && isT1) return 'DECORACAO DIA-T1';
  if (isDia && isT2) return 'DECORACAO DIA-T2';
  if (isNoite && isT1) return 'DECORACAO NOITE-T1';
  if (isNoite && isT2) return 'DECORACAO NOITE-T2';
  return null;
}

export default function HistoricoQuadro() {
  const { usuarioAtual, isAdmin } = useUsuario();
  const { data: setores = [] } = useSetoresAtivos();
  const [setorId, setSetorId] = useState('todos');
  const [tipo, setTipo] = useState('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [busca, setBusca] = useState('');
  const [areaSelecionada, setAreaSelecionada] = useState<AreaQuadroTrava>('SOPRO A');

  const areasSopro = AREAS_QUADRO_TRAVA.filter((area) => area.startsWith('SOPRO'));
  const areasDecoracao = AREAS_QUADRO_TRAVA.filter((area) => area.startsWith('DECORACAO'));

  const { data: travasAtivas = [] } = useQuery({
    queryKey: ['quadro_travas_ativas_historico'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('quadro_travas')
        .select('id, area, ativo, quantidade_inicial, created_at')
        .in('area', AREAS_QUADRO_TRAVA)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as QuadroTrava[];
    },
  });

  const { data: contagensAtuais = {} as Record<AreaQuadroTrava, number> } = useQuery({
    queryKey: ['quadro_travas_contagens_atuais'],
    queryFn: async () => {
      const entradas = await Promise.all(
        AREAS_QUADRO_TRAVA.map(async (area) => [area, await contarFuncionariosDaArea(area)] as const)
      );
      return Object.fromEntries(entradas) as Record<AreaQuadroTrava, number>;
    },
  });

  const travasPorArea = useMemo(() => {
    const mapa = new Map<AreaQuadroTrava, QuadroTrava>();
    travasAtivas.forEach((trava) => {
      if (!mapa.has(trava.area)) mapa.set(trava.area, trava);
    });
    return mapa;
  }, [travasAtivas]);

  const setoresDoQuadro = useMemo(
    () => setores.filter((setor) => getTipoSetorTurma(setor)),
    [setores]
  );

  const setoresPermitidos = useMemo(() => {
    if (isAdmin || usuarioAtual.setoresIds.length === 0) return setoresDoQuadro;
    return setoresDoQuadro.filter((setor) => usuarioAtual.setoresIds.includes(setor.id));
  }, [isAdmin, setoresDoQuadro, usuarioAtual.setoresIds]);

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

      if (areaSelecionada && areaDoRegistro(item) !== areaSelecionada) return false;

      if (!termo) return true;
      return [
        item.funcionario_nome,
        item.matricula,
        item.tipo_movimentacao,
        item.setor_origem_nome,
        item.setor_destino_nome,
      ].some((valor) => valor?.toLowerCase().includes(termo));
    });
  }, [areaSelecionada, busca, historico, isAdmin, setoresPermitidos, usuarioAtual.setoresIds.length]);

  const registrosComSaldo = useMemo<RegistroHistoricoQuadroComSaldo[]>(() => {
    const trava = travasPorArea.get(areaSelecionada);
    let saldo = trava?.quantidade_inicial ?? null;

    return [...registrosVisiveis]
      .sort((a, b) => {
        const dataA = new Date(a.created_at ?? a.data_movimentacao).getTime();
        const dataB = new Date(b.created_at ?? b.data_movimentacao).getTime();
        return dataA - dataB;
      })
      .map((item) => {
        const antes = item.quantidade_antes ?? saldo;
        const depois = item.quantidade_depois ?? (antes !== null ? antes + (item.impacto ?? 0) : null);
        saldo = depois;
        return {
          ...item,
          quantidade_antes_calculada: antes,
          quantidade_depois_calculada: depois,
        };
      })
      .sort((a, b) => {
        const dataA = new Date(a.created_at ?? a.data_movimentacao).getTime();
        const dataB = new Date(b.created_at ?? b.data_movimentacao).getTime();
        return dataB - dataA;
      });
  }, [areaSelecionada, registrosVisiveis, travasPorArea]);

  const podeAcessar = isAdmin || usuarioAtual.setoresIds.length > 0;

  const renderAreaCard = (area: AreaQuadroTrava) => {
    const trava = travasPorArea.get(area);
    const quantidadeInicial = trava?.quantidade_inicial;
    const atual = contagensAtuais[area] ?? 0;
    const selecionada = areaSelecionada === area;

    return (
      <button
        key={area}
        type="button"
        onClick={() => setAreaSelecionada(area)}
        className={`flex h-full min-h-[116px] flex-col rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:border-primary/50 ${
          selecionada ? 'border-primary ring-2 ring-primary/15' : 'border-border'
        }`}
      >
        <div className="mb-3 text-sm font-bold text-foreground">{formatarArea(area)}</div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          <div className="flex min-h-[64px] flex-col justify-between rounded-lg bg-muted/60 p-3">
            <div className="truncate text-[10px] font-bold uppercase leading-tight text-muted-foreground" title={`Trava ${formatarDataHora(trava?.created_at)}`}>
              Trava {formatarDataHora(trava?.created_at)}
            </div>
            <div className="mt-1 text-3xl font-bold leading-none text-primary">
              {quantidadeInicial ?? '-'}
            </div>
          </div>
          <div className="flex min-h-[64px] flex-col justify-between rounded-lg bg-muted/60 p-3">
            <div className="text-[10px] font-bold uppercase leading-tight text-muted-foreground">Atual</div>
            <div className="mt-1 text-3xl font-bold leading-none text-primary">{atual}</div>
          </div>
        </div>
      </button>
    );
  };

  const exportarExcel = async () => {
    if (registrosComSaldo.length === 0) {
      toast.info('Nenhum registro para exportar');
      return;
    }

    const XLSX = await loadXLSX();
    const dados = registrosComSaldo.map((item) => ({
      Data: format(parseISO(item.data_movimentacao), 'dd/MM/yyyy'),
      Funcionario: normalizarValorTabela(item.funcionario_nome),
      Matricula: normalizarValorTabela(item.matricula),
      Tipo: normalizarValorTabela(item.tipo_movimentacao),
      Setor: isTransferencia(item.tipo_movimentacao) ? '-' : montarSetorMovimentacao(item),
      Origem: isTransferencia(item.tipo_movimentacao) ? montarLocalMovimentacao(item.setor_origem_nome, item.turma_origem) : '-',
      Destino: isTransferencia(item.tipo_movimentacao) ? montarLocalMovimentacao(item.setor_destino_nome, item.turma_destino) : '-',
      Impacto: item.impacto,
      'Antes': item.quantidade_antes_calculada ?? '',
      'Atual': item.quantidade_depois_calculada ?? '',
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
          <CardTitle className="text-base">Resumo do Quadro Travado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Sopro</div>
            <div className="grid gap-3 md:grid-cols-3">
              {areasSopro.map(renderAreaCard)}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-bold uppercase text-muted-foreground">Decoracao</div>
            <div className="grid gap-3 md:grid-cols-4">
              {areasDecoracao.map(renderAreaCard)}
            </div>
          </div>
        </CardContent>
      </Card>

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
            Detalhes da Area: {formatarArea(areaSelecionada)} <Badge variant="secondary">{registrosComSaldo.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Funcionario</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Origem / Setor</TableHead>
                <TableHead>Destino</TableHead>
		                <TableHead>Impacto</TableHead>
		                <TableHead>Antes / Atual</TableHead>
		              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
	                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : registrosComSaldo.length === 0 ? (
                <TableRow>
	                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma movimentacao registrada.</TableCell>
                </TableRow>
              ) : (
                registrosComSaldo.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{format(parseISO(item.data_movimentacao), 'dd/MM/yyyy')}</TableCell>
	                    <TableCell>
	                      <div className="font-medium">{normalizarValorTabela(item.funcionario_nome)}</div>
	                      <div className="text-xs text-muted-foreground">{normalizarValorTabela(item.matricula)}</div>
	                    </TableCell>
	                    <TableCell>{normalizarValorTabela(item.tipo_movimentacao)}</TableCell>
	                    {isTransferencia(item.tipo_movimentacao) ? (
	                      <>
		                    <TableCell>{montarLocalMovimentacao(item.setor_origem_nome, item.turma_origem)}</TableCell>
		                    <TableCell>{montarLocalMovimentacao(item.setor_destino_nome, item.turma_destino)}</TableCell>
	                      </>
	                    ) : (
	                      <TableCell colSpan={2}>{montarSetorMovimentacao(item)}</TableCell>
	                    )}
                    <TableCell>
                      <Badge variant={item.impacto < 0 ? 'destructive' : item.impacto > 0 ? 'default' : 'outline'}>
                        {item.impacto > 0 ? `+${item.impacto}` : item.impacto}
                      </Badge>
	                    </TableCell>
		                    <TableCell>{item.quantidade_antes_calculada ?? '-'} / {item.quantidade_depois_calculada ?? '-'}</TableCell>
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

