import { useState, useMemo, useCallback } from 'react';
import { 
  useDivergencias, 
  Divergencia 
} from '@/hooks/useDivergencias';
import { useUsuario } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { inserirEventoSemDuplicata } from '@/hooks/useEventosSistema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { NovaDivergenciaForm } from '@/components/divergencias/NovaDivergenciaForm';
import { AcaoDivergenciaDialog } from '@/components/divergencias/AcaoDivergenciaDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FeedbackDivergenciaDialog } from '@/components/divergencias/FeedbackDivergenciaDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, AlertTriangle, CheckCircle, Clock, Filter, Hourglass, Bell, Eye, RotateCcw } from 'lucide-react';

export default function Divergencias() {
  const { data: divergencias = [], isLoading } = useDivergencias();
  const { usuarioAtual, isAdmin, canEditDemissoes } = useUsuario();
  
  const [novaDialogOpen, setNovaDialogOpen] = useState(false);
  const [acaoDialogOpen, setAcaoDialogOpen] = useState(false);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [divergenciaSelecionada, setDivergenciaSelecionada] = useState<Divergencia | null>(null);
  const [filtroGrupo, setFiltroGrupo] = useState<string | null>(null);
  const [filtroTurma, setFiltroTurma] = useState<string | null>(null);
  const [filtroVinculo, setFiltroVinculo] = useState<string | null>(null);
  const [previewDiv, setPreviewDiv] = useState<Divergencia | null>(null);

  const handleReenviarDivergencia = useCallback(async (div: Divergencia) => {
    try {
      const resultado = await inserirEventoSemDuplicata({
        tipo: 'divergencia_retorno',
        descricao: `DIVERGÊNCIA AGUARDANDO — ${div.funcionario?.nome_completo?.toUpperCase() || 'N/A'}`,
        funcionario_nome: div.funcionario?.nome_completo?.toUpperCase() || null,
        setor_nome: div.funcionario?.setor?.nome?.toUpperCase() || null,
        turma: div.funcionario?.turma || null,
        criado_por: usuarioAtual?.nome || 'RH',
        dados_extra: {
          tipo_divergencia: div.tipo_divergencia,
          descricao_acao: div.descricao_acao,
          mensagem_personalizada: `Divergência AGUARDANDO RETORNO | Funcionário: ${div.funcionario?.nome_completo?.toUpperCase()} | Tipo: ${div.tipo_divergencia} | Ação: ${div.descricao_acao || 'N/A'}`,
        },
      });
      if (resultado) {
        toast.success('Evento criado na Central de Notificações para reenvio!');
      } else {
        toast.info('Já existe evento pendente para este funcionário com este tipo.');
      }
    } catch {
      toast.error('Erro ao criar evento de notificação');
    }
  }, [usuarioAtual?.nome]);

  const handleClickDivergencia = (div: Divergencia) => {
    setDivergenciaSelecionada(div);
    if (div.status === 'aguardando') {
      setFeedbackDialogOpen(true);
    } else if (!div.resolvido) {
      setAcaoDialogOpen(true);
    }
  };

  const getGrupo = (div: Divergencia) => {
    const grupo = div.funcionario?.setor?.grupo?.toUpperCase() || '';
    if (grupo.startsWith('SOPRO')) return 'SOPRO';
    if (grupo.includes('DECORAÇÃO') || grupo.includes('DECORACAO')) return 'DECORAÇÃO';
    return 'OUTRO';
  };

  const isTemp = (d: Divergencia) => {
    const mat = d.funcionario?.matricula?.toUpperCase() || '';
    return mat.startsWith('TEMP');
  };

  const divergenciasFiltradas = useMemo(() => {
    return divergencias.filter(d => {
      if (filtroGrupo) {
        const grupo = getGrupo(d);
        if (grupo !== filtroGrupo) return false;
      }
      if (filtroTurma) {
        if (d.funcionario?.turma?.toUpperCase() !== filtroTurma) return false;
      }
      if (filtroVinculo === 'TEMP' && !isTemp(d)) return false;
      if (filtroVinculo === 'EFETIVO' && isTemp(d)) return false;
      return true;
    });
  }, [divergencias, filtroGrupo, filtroTurma, filtroVinculo]);

  const pendentes = divergenciasFiltradas.filter(d => !d.resolvido && d.status !== 'aguardando');
  const aguardando = divergenciasFiltradas.filter(d => d.status === 'aguardando' && !d.resolvido);
  const resolvidas = divergenciasFiltradas.filter(d => d.resolvido);

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'COB. FÉRIAS': return 'default';
      case 'SUMIDO': return 'destructive';
      case 'TREINAMENTO': return 'secondary';
      default: return 'outline';
    }
  };

  const podeCriarDivergencia = usuarioAtual?.pode_criar_divergencias || usuarioAtual?.pode_editar_faltas || isAdmin;

  const totalSopro = divergencias.filter(d => getGrupo(d) === 'SOPRO').length;
  const totalDecoracao = divergencias.filter(d => getGrupo(d) === 'DECORAÇÃO').length;
  const turmasParaFiltro = useMemo(() => {
    if (filtroGrupo === 'SOPRO') return ['1A', '1B', '2A', '2B'];
    if (filtroGrupo === 'DECORAÇÃO') return ['T1', 'T2'];
    // Sem grupo selecionado: mostra todas
    return ['1A', '1B', '2A', '2B', 'T1', 'T2'];
  }, [filtroGrupo]);

  const contadorTurma = (turma: string) => {
    return divergencias.filter(d => {
      const grupoOk = !filtroGrupo || getGrupo(d) === filtroGrupo;
      return grupoOk && d.funcionario?.turma?.toUpperCase() === turma;
    }).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">DIVERGÊNCIAS DO QUADRO</h1>
          <p className="page-description">
            GERENCIE AS DIVERGÊNCIAS REPORTADAS PELOS GESTORES
          </p>
        </div>
        {podeCriarDivergencia && (
          <Button size="sm" className="gap-2" onClick={() => setNovaDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            NOVA DIVERGÊNCIA
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground mr-1">GRUPO:</span>
        <Button size="sm" variant={filtroGrupo === null ? 'default' : 'outline'} className="h-7 text-xs"
          onClick={() => { setFiltroGrupo(null); setFiltroTurma(null); }}>
          TODOS ({divergencias.length})
        </Button>
        <Button size="sm" variant={filtroGrupo === 'SOPRO' ? 'default' : 'outline'} className="h-7 text-xs"
          onClick={() => { setFiltroGrupo(filtroGrupo === 'SOPRO' ? null : 'SOPRO'); setFiltroTurma(null); }}>
          SOPRO ({totalSopro})
        </Button>
        <Button size="sm" variant={filtroGrupo === 'DECORAÇÃO' ? 'default' : 'outline'} className="h-7 text-xs"
          onClick={() => { setFiltroGrupo(filtroGrupo === 'DECORAÇÃO' ? null : 'DECORAÇÃO'); setFiltroTurma(null); }}>
          DECORAÇÃO ({totalDecoracao})
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <span className="text-xs font-semibold text-muted-foreground mr-1">TURMA:</span>
        {turmasParaFiltro.map(t => (
          <Button key={t} size="sm" variant={filtroTurma === t ? 'default' : 'outline'} className="h-7 text-xs min-w-[40px]"
            onClick={() => setFiltroTurma(filtroTurma === t ? null : t)}>
            {t} ({contadorTurma(t)})
          </Button>
        ))}
        <div className="h-5 w-px bg-border mx-1" />
        <span className="text-xs font-semibold text-muted-foreground mr-1">VÍNCULO:</span>
        <Button size="sm" variant={filtroVinculo === 'EFETIVO' ? 'default' : 'outline'} className="h-7 text-xs"
          onClick={() => setFiltroVinculo(filtroVinculo === 'EFETIVO' ? null : 'EFETIVO')}>
          EFETIVO ({divergencias.filter(d => !isTemp(d)).length})
        </Button>
        <Button size="sm" variant={filtroVinculo === 'TEMP' ? 'default' : 'outline'} className="h-7 text-xs"
          onClick={() => setFiltroVinculo(filtroVinculo === 'TEMP' ? null : 'TEMP')}>
          TEMP ({divergencias.filter(d => isTemp(d)).length})
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              PENDENTES
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{pendentes.length}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-300 dark:border-amber-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-amber-600" />
              AGUARDANDO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{aguardando.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              RESOLVIDAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{resolvidas.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de divergências pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            DIVERGÊNCIAS PENDENTES
          </CardTitle>
          <CardDescription>
            CLIQUE NO FUNCIONÁRIO PARA ENVIAR PARA AGUARDANDO
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendentes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              NENHUMA DIVERGÊNCIA PENDENTE.
            </p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>MATRÍCULA</TableHead>
                    <TableHead>FUNCIONÁRIO / SETOR</TableHead>
                    <TableHead>TIPO / OBSERVAÇÕES</TableHead>
                     <TableHead>CRIADO POR</TableHead>
                     <TableHead>DATA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendentes.map(div => (
                    <TableRow key={div.id} className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleClickDivergencia(div)}>
                      <TableCell className="text-xs text-muted-foreground font-mono font-bold">
                        {div.funcionario?.matricula?.toUpperCase() || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-primary underline">
                          {div.funcionario?.nome_completo?.toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {div.funcionario?.setor?.nome?.toUpperCase()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(div.tipo_divergencia)}>{div.tipo_divergencia}</Badge>
                        {div.observacoes && (
                          <div className="text-xs text-muted-foreground mt-1">{div.observacoes.toUpperCase()}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{div.criado_por?.toUpperCase()}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(div.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de divergências AGUARDANDO */}
      {aguardando.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-amber-600" />
              AGUARDANDO RETORNO
            </CardTitle>
            <CardDescription>
              CLIQUE PARA DAR FEEDBACK E RESOLVER
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-50 dark:bg-amber-950/30">
                    <TableHead>MATRÍCULA</TableHead>
                    <TableHead>FUNCIONÁRIO / SETOR</TableHead>
                    <TableHead>TIPO</TableHead>
                    <TableHead>AÇÃO EM ANDAMENTO</TableHead>
                     <TableHead>CRIADO POR</TableHead>
                     <TableHead className="w-[80px]" />
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {aguardando.map(div => (
                     <TableRow key={div.id}
                       className="cursor-pointer bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40"
                       onClick={() => handleClickDivergencia(div)}>
                       <TableCell className="text-xs text-muted-foreground font-mono font-bold">
                         {div.funcionario?.matricula?.toUpperCase() || '—'}
                       </TableCell>
                       <TableCell>
                         <div className="font-medium text-amber-700 dark:text-amber-400 underline">
                           {div.funcionario?.nome_completo?.toUpperCase()}
                         </div>
                         <div className="text-xs text-muted-foreground mt-0.5">
                           {div.funcionario?.setor?.nome?.toUpperCase()}
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge variant={getBadgeVariant(div.tipo_divergencia)}>{div.tipo_divergencia}</Badge>
                       </TableCell>
                       <TableCell className="text-xs max-w-[200px]">
                         <span className="text-amber-700 dark:text-amber-400 font-medium">
                           {div.descricao_acao?.toUpperCase() || '—'}
                         </span>
                       </TableCell>
                       <TableCell className="text-sm">{div.criado_por?.toUpperCase()}</TableCell>
                       <TableCell>
                         <div className="flex items-center gap-1">
                           <Button
                             variant="ghost"
                             size="sm"
                             className="gap-1 text-xs h-7 px-2"
                             onClick={(e) => {
                               e.stopPropagation();
                               setPreviewDiv(div);
                             }}
                           >
                             <Eye className="h-3 w-3" />
                             VER
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             className="gap-1 text-xs h-7"
                             onClick={(e) => {
                               e.stopPropagation();
                               handleReenviarDivergencia(div);
                             }}
                           >
                             <RotateCcw className="h-3 w-3" />
                             REENVIAR
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de divergências resolvidas */}
      {resolvidas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              HISTÓRICO DE RESOLVIDAS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>MATRÍCULA</TableHead>
                    <TableHead>FUNCIONÁRIO</TableHead>
                    <TableHead>TIPO</TableHead>
                    <TableHead>FEEDBACK</TableHead>
                    <TableHead>RESOLVIDO POR</TableHead>
                    <TableHead>DATA RESOLUÇÃO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvidas.slice(0, 10).map(div => (
                    <TableRow key={div.id} className="opacity-70">
                      <TableCell className="text-xs text-muted-foreground font-mono font-bold">
                        {div.funcionario?.matricula?.toUpperCase() || '—'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {div.funcionario?.nome_completo?.toUpperCase()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{div.tipo_divergencia}</Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        {div.feedback_rh?.toUpperCase() || '—'}
                      </TableCell>
                      <TableCell>{div.resolvido_por?.toUpperCase()}</TableCell>
                      <TableCell>
                        {div.resolvido_em && format(new Date(div.resolvido_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <NovaDivergenciaForm open={novaDialogOpen} onOpenChange={setNovaDialogOpen} />
      <AcaoDivergenciaDialog divergencia={divergenciaSelecionada} open={acaoDialogOpen} onOpenChange={setAcaoDialogOpen} />
      <FeedbackDivergenciaDialog divergencia={divergenciaSelecionada} open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen} />

      {/* Preview da mensagem que será enviada */}
      <Dialog open={!!previewDiv} onOpenChange={(open) => { if (!open) setPreviewDiv(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              PRÉVIA DA NOTIFICAÇÃO
            </DialogTitle>
          </DialogHeader>
          {previewDiv && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">Como aparecerá para o gestor no modal "RH AVISA":</div>
              <div className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full p-2 bg-card border border-amber-200 dark:border-amber-800 shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-amber-600">DIVERGÊNCIA AGUARDANDO RETORNO</p>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-line leading-relaxed">
                      Divergência AGUARDANDO RETORNO{'\n'}
                      Funcionário: {previewDiv.funcionario?.nome_completo?.toUpperCase()}{'\n'}
                      Tipo: {previewDiv.tipo_divergencia}{'\n'}
                      Ação: {previewDiv.descricao_acao?.toUpperCase() || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Ao clicar <strong>REENVIAR</strong>, este evento será criado como pendente na Central de Notificações para envio.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
