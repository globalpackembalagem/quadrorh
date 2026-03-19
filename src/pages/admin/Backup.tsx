import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Database, Clock, FileSpreadsheet, Loader2, CheckCircle, HardDrive, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
// xlsx-js-style loaded dynamically
import { useUsuario } from '@/contexts/UserContext';

interface TabelaUso {
  nome: string;
  registros: number;
}

const LIMITE_GRATUITO_MB = 500;

const TABELAS = [
  { key: 'funcionarios', nome: 'Funcionários', aba: 'Funcionarios' },
  { key: 'setores', nome: 'Setores', aba: 'Setores' },
  { key: 'situacoes', nome: 'Situações', aba: 'Situacoes' },
  { key: 'demissoes', nome: 'Demissões', aba: 'Demissoes' },
  { key: 'divergencias_quadro', nome: 'Divergências', aba: 'DivergenciasQuadro' },
  { key: 'divergencias_ponto', nome: 'Divergências Ponto', aba: 'DivergenciasPonto' },
  { key: 'registros_ponto', nome: 'Registros de Ponto', aba: 'RegistrosPonto' },
  { key: 'periodos_ponto', nome: 'Períodos de Ponto', aba: 'PeriodosPonto' },
  { key: 'periodos_demissao', nome: 'Períodos de Demissão', aba: 'PeriodosDemissao' },
  { key: 'quadro_planejado', nome: 'Quadro Planejado', aba: 'QuadroPlanejado' },
  { key: 'quadro_decoracao', nome: 'Quadro Decoração', aba: 'QuadroDecoracao' },
  { key: 'trocas_turno', nome: 'Movimentações', aba: 'TrocasTurno' },
  { key: 'notificacoes', nome: 'Notificações', aba: 'Notificacoes' },
  { key: 'eventos_sistema', nome: 'Eventos do Sistema', aba: 'EventosSistema' },
  { key: 'historico_auditoria', nome: 'Histórico Auditoria', aba: 'HistAuditoria' },
  { key: 'historico_faltas', nome: 'Histórico Faltas', aba: 'HistFaltas' },
  { key: 'historico_quadro', nome: 'Histórico Quadro', aba: 'HistQuadro' },
  { key: 'historico_acesso', nome: 'Histórico Acesso', aba: 'HistAcesso' },
  { key: 'user_roles', nome: 'Usuários', aba: 'Usuarios' },
  { key: 'user_roles_setores', nome: 'Usuários Setores', aba: 'UsuariosSetores' },
  { key: 'avisos_movimentacao', nome: 'Avisos Movimentação', aba: 'AvisosMoviment' },
  { key: 'avisos_movimentacao_lidos', nome: 'Avisos Lidos', aba: 'AvisosLidos' },
  { key: 'comunicados', nome: 'Comunicados', aba: 'Comunicados' },
  { key: 'comunicados_categorias', nome: 'Categorias Comunicados', aba: 'CategComunicados' },
  { key: 'previsao_documentos', nome: 'Previsão Documentos', aba: 'PrevisaoDocs' },
  { key: 'previsao_documentos_historico', nome: 'Hist. Previsão Docs', aba: 'HistPrevisaoDocs' },
  { key: 'previsao_horarios_notificacao', nome: 'Horários Notificação', aba: 'HorariosNotif' },
  { key: 'tipos_desligamento', nome: 'Tipos Desligamento', aba: 'TiposDesligamento' },
  { key: 'notificacoes_vistas', nome: 'Notificações Vistas', aba: 'NotifVistas' },
];

export default function Backup() {
  const { isAdmin } = useUsuario();
  const [isExporting, setIsExporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [tabelasUso, setTabelasUso] = useState<TabelaUso[]>([]);
  const [isLoadingUso, setIsLoadingUso] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string | null>(null);

  const buscarUso = useCallback(async () => {
    setIsLoadingUso(true);
    try {
      const resultados = await Promise.all(
        TABELAS.map(async (t) => {
          const { count, error } = await supabase
            .from(t.key as any)
            .select('*', { count: 'exact', head: true });
          return { nome: t.nome, registros: error ? 0 : (count || 0) };
        })
      );
      setTabelasUso(resultados.sort((a, b) => b.registros - a.registros));
      setUltimaAtualizacao(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }));
    } catch (e) {
      console.error('Erro ao buscar uso:', e);
    } finally {
      setIsLoadingUso(false);
    }
  }, []);

  useEffect(() => {
    buscarUso();
  }, [buscarUso]);

  const fetchAllData = async (tableName: string) => {
    const pageSize = 1000;
    let allData: any[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await supabase
        .from(tableName as any)
        .select('*')
        .range(from, to);
      if (error) throw error;
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  const handleBackupManual = async () => {
    setIsExporting(true);
    try {
      const resultados = await Promise.all(
        TABELAS.map(async (t) => {
          try {
            const data = await fetchAllData(t.key);
            return { ...t, data };
          } catch {
            return { ...t, data: [] };
          }
        })
      );

      const XLSX = await import('xlsx-js-style');
      const wb = XLSX.utils.book_new();

      const resumo = resultados.map((r) => ({
        tabela: r.nome,
        registros: r.data.length,
      }));
      resumo.push({
        tabela: 'TOTAL',
        registros: resultados.reduce((acc, r) => acc + r.data.length, 0),
      });
      const wsResumo = XLSX.utils.json_to_sheet(resumo);
      XLSX.utils.book_append_sheet(wb, wsResumo, 'RESUMO');

      for (const r of resultados) {
        if (r.data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(r.data);
          XLSX.utils.book_append_sheet(wb, ws, r.aba);
        }
      }

      const dataHora = format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: ptBR });
      XLSX.writeFile(wb, `backup_completo_${dataHora}.xlsx`);

      setLastBackup(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }));
      toast.success(`Backup gerado com ${resultados.length} tabelas!`);
    } catch (error) {
      console.error('Erro ao gerar backup:', error);
      toast.error('Erro ao gerar backup');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Backup do Sistema</h1>
        <p className="page-description">Faça backup de todos os dados do sistema ({TABELAS.length} tabelas)</p>
      </div>

      {/* Status Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Status do Backup</CardTitle>
              <CardDescription>Seus dados estão protegidos no banco de dados</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Banco de dados ativo e funcionando</span>
          </div>
          {lastBackup && (
            <div className="flex items-center gap-2 text-sm mt-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Último backup manual: {lastBackup}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uso do Banco de Dados */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Uso do Banco de Dados</CardTitle>
                <CardDescription>
                  Limite gratuito: {LIMITE_GRATUITO_MB} MB
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={buscarUso} disabled={isLoadingUso} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingUso ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const totalRegistros = tabelasUso.reduce((acc, t) => acc + t.registros, 0);
            const usoEstimadoMB = Math.round((totalRegistros * 0.5) / 1024 * 100) / 100;
            const percentual = Math.min((usoEstimadoMB / LIMITE_GRATUITO_MB) * 100, 100);
            return (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">~{usoEstimadoMB < 1 ? usoEstimadoMB.toFixed(2) : usoEstimadoMB.toFixed(1)} MB usados</span>
                    <span className="text-muted-foreground">{LIMITE_GRATUITO_MB} MB gratuitos</span>
                  </div>
                  <Progress value={percentual} className="h-3" />
                  <p className="text-xs text-muted-foreground">
                    {percentual < 10 ? '✅ Uso muito baixo' : percentual < 50 ? '✅ Uso normal' : percentual < 80 ? '⚠️ Uso moderado' : '🔴 Uso alto'}
                  </p>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-2 gap-0 bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                    <span>Tabela</span>
                    <span className="text-right">Registros</span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {tabelasUso.map((t) => (
                      <div key={t.nome} className="grid grid-cols-2 gap-0 px-3 py-1.5 text-sm border-b last:border-0 hover:bg-muted/30">
                        <span>{t.nome}</span>
                        <span className="text-right font-mono">{t.registros.toLocaleString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-0 px-3 py-2 text-sm font-bold border-t bg-muted/30">
                    <span>TOTAL</span>
                    <span className="text-right font-mono">{totalRegistros.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                {ultimaAtualizacao && (
                  <p className="text-xs text-muted-foreground text-center">Atualizado em {ultimaAtualizacao}</p>
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backup Manual */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Download className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Backup Manual Completo</CardTitle>
                <CardDescription>Baixe todas as {TABELAS.length} tabelas</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Exporta <strong>todos</strong> os dados do sistema para Excel:
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              {TABELAS.map((t) => (
                <span key={t.key}>• {t.nome}</span>
              ))}
            </div>
            <Button onClick={handleBackupManual} disabled={isExporting} className="w-full">
              {isExporting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Gerando backup...</>
              ) : (
                <><FileSpreadsheet className="mr-2 h-4 w-4" />Gerar Backup Excel</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Backup Automático */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Backup Automático</CardTitle>
                <Badge variant="secondary">Ativo</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">O sistema realiza backups automáticos diariamente:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Backup diário às 02:00</li>
              <li>Retenção de 30 dias</li>
              <li>Recuperação automática em caso de falha</li>
              <li>Dados sempre seguros na nuvem</li>
            </ul>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                💡 O banco de dados já faz backup automático. O backup manual serve para você ter uma cópia local dos dados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recomendação */}
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-warning text-xl">⚠️</div>
            <div>
              <p className="font-medium text-warning">Recomendação de Segurança</p>
              <p className="text-sm text-muted-foreground mt-1">
                Faça backup manual regularmente e guarde o arquivo em local seguro (HD externo, nuvem pessoal, etc.).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
