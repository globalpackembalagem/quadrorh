import { useState } from 'react';
import { History, Search, ChevronDown, ChevronUp, Download, Filter } from 'lucide-react';
import { useHistoricoAuditoria } from '@/hooks/useHistorico';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// xlsx-js-style loaded dynamically

interface DetalhesExpandidos {
  [key: string]: boolean;
}

export function HistoricoFuncionariosDialog() {
  const { data: historico = [], isLoading } = useHistoricoAuditoria('funcionarios');
  const [search, setSearch] = useState('');
  const [expandidos, setExpandidos] = useState<DetalhesExpandidos>({});
  const [filtroTurma, setFiltroTurma] = useState(false);

  const toggleExpandido = (id: string) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredHistorico = historico.filter(h => {
    const dadosNovos = h.dados_novos as Record<string, unknown> | null;
    const dadosAnteriores = h.dados_anteriores as Record<string, unknown> | null;

    // Filtro turma: só mostrar registros onde turma mudou
    if (filtroTurma) {
      const turmaAnterior = dadosAnteriores?.turma;
      const turmaNova = dadosNovos?.turma;
      if (JSON.stringify(turmaAnterior) === JSON.stringify(turmaNova)) return false;
    }

    if (!search) return true;
    const searchLower = search.toLowerCase();
    const nomeNovo = dadosNovos?.nome as string || '';
    const nomeAnterior = dadosAnteriores?.nome as string || '';
    
    return (
      h.usuario_nome?.toLowerCase().includes(searchLower) ||
      h.operacao.toLowerCase().includes(searchLower) ||
      nomeNovo.toLowerCase().includes(searchLower) ||
      nomeAnterior.toLowerCase().includes(searchLower)
    );
  });

  const exportarHistoricoExcel = async () => {
    if (filteredHistorico.length === 0) return;
    const XLSX = await import('xlsx-js-style');
    const dados = filteredHistorico.map(h => {
      const dadosNovos = h.dados_novos as Record<string, unknown> | null;
      const dadosAnteriores = h.dados_anteriores as Record<string, unknown> | null;
      return {
        'Data': format(parseISO(h.created_at), 'dd/MM/yyyy HH:mm'),
        'Usuário': h.usuario_nome || '',
        'Operação': h.operacao,
        'Funcionário': (dadosNovos?.nome || dadosAnteriores?.nome || '') as string,
        'Turma Anterior': (dadosAnteriores?.turma || '') as string,
        'Turma Nova': (dadosNovos?.turma || '') as string,
        'Setor Anterior': (dadosAnteriores?.setor || '') as string,
        'Setor Novo': (dadosNovos?.setor || '') as string,
      };
    });
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    XLSX.writeFile(wb, `Historico_Funcionarios_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const getOperacaoLabel = (operacao: string) => {
    switch (operacao) {
      case 'INSERT': return 'Criação';
      case 'UPDATE': return 'Edição';
      case 'DELETE': return 'Exclusão';
      case 'TRANSFERENCIA': return 'Transferência';
      default: return operacao;
    }
  };

  const getOperacaoBadgeVariant = (operacao: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (operacao) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'DELETE': return 'destructive';
      case 'TRANSFERENCIA': return 'outline';
      default: return 'outline';
    }
  };

  const formatarValor = (valor: unknown): string => {
    if (valor === null || valor === undefined) return '-';
    if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
    if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return format(parseISO(valor), 'dd/MM/yyyy');
    }
    return String(valor);
  };

  const renderDiferencas = (dadosAnteriores: Record<string, unknown> | null, dadosNovos: Record<string, unknown> | null) => {
    if (!dadosAnteriores && !dadosNovos) return null;
    
    const campos = new Set([
      ...Object.keys(dadosAnteriores || {}),
      ...Object.keys(dadosNovos || {}),
    ]);

    const diferencas: Array<{ campo: string; anterior: unknown; novo: unknown }> = [];
    
    campos.forEach(campo => {
      const valorAnterior = dadosAnteriores?.[campo];
      const valorNovo = dadosNovos?.[campo];
      
      if (JSON.stringify(valorAnterior) !== JSON.stringify(valorNovo)) {
        diferencas.push({ campo, anterior: valorAnterior, novo: valorNovo });
      }
    });

    if (diferencas.length === 0) return null;

    const campoLabels: Record<string, string> = {
      nome: 'Nome',
      empresa: 'Empresa',
      matricula: 'Matrícula',
      setor: 'Setor',
      turma: 'Turma',
      situacao: 'Situação',
      cargo: 'Cargo',
      sexo: 'Sexo',
      data_admissao: 'Data Admissão',
      data_demissao: 'Data Demissão',
      observacoes: 'Observações',
      transferencia_programada: 'Transf. Programada',
      transferencia_data: 'Data Transf.',
      transferencia_setor_id: 'Setor Destino',
      setor_origem: 'Setor Origem',
      setor_destino: 'Setor Destino',
      data_programada: 'Data Programada',
    };

    return (
      <div className="mt-2 space-y-1 text-xs">
        {diferencas.map(({ campo, anterior, novo }) => (
          <div key={campo} className="flex flex-wrap gap-1 items-center">
            <span className="font-medium text-muted-foreground">
              {campoLabels[campo] || campo}:
            </span>
            {anterior !== undefined && anterior !== null && (
              <span className="line-through text-destructive">{formatarValor(anterior)}</span>
            )}
            {anterior !== undefined && anterior !== null && novo !== undefined && novo !== null && (
              <span className="text-muted-foreground">→</span>
            )}
            {novo !== undefined && novo !== null && (
              <span className="text-primary font-medium">{formatarValor(novo)}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          Histórico
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações - Funcionários
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca e filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, usuário ou operação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              size="sm"
              variant={filtroTurma ? 'default' : 'outline'}
              onClick={() => setFiltroTurma(!filtroTurma)}
              className="gap-1"
            >
              <Filter className="h-3 w-3" />
              TURMAS
            </Button>
            <Button size="sm" variant="outline" onClick={exportarHistoricoExcel} disabled={filteredHistorico.length === 0}>
              <Download className="h-3 w-3 mr-1" />
              EXCEL
            </Button>
          </div>

          {/* Lista de histórico */}
          <div className="max-h-[500px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredHistorico.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum histórico encontrado</p>
              </div>
            ) : (
              filteredHistorico.map((h) => {
                const dadosNovos = h.dados_novos as Record<string, unknown> | null;
                const dadosAnteriores = h.dados_anteriores as Record<string, unknown> | null;
                const nomeFuncionario = (dadosNovos?.nome || dadosAnteriores?.nome || 'Funcionário') as string;
                const isExpandido = expandidos[h.id];

                return (
                  <div
                    key={h.id}
                    className="rounded-lg border bg-card p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant={getOperacaoBadgeVariant(h.operacao)}
                          >
                            {getOperacaoLabel(h.operacao)}
                          </Badge>
                          <span className="font-medium truncate">{nomeFuncionario}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          <span className="font-medium">{h.usuario_nome}</span>
                          <span className="mx-1">•</span>
                          <span>
                            {format(parseISO(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>

                        {/* Detalhes expandidos */}
                        {isExpandido && renderDiferencas(dadosAnteriores, dadosNovos)}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpandido(h.id)}
                        className="shrink-0"
                      >
                        {isExpandido ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Exibindo últimos 100 registros
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
