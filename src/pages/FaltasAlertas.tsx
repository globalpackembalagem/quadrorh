import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Clock, Download, Hourglass, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePeriodosFaltas, useRegistrosFaltas, useFuncionariosFaltas } from '@/hooks/useFaltas';
import { useUsuario } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { loadXLSX } from '@/lib/xlsx';

const TIPO_DIVERGENCIA = 'FALTAS_3_MAIS_RH';
const DATA_INICIO_CONTAGEM = '2026-06-01';

function normalizar(texto?: string | null) {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function isTemporario(funcionario: any) {
  const matricula = normalizar(funcionario.matricula);
  const situacao = normalizar(funcionario.situacao?.nome);
  return matricula.startsWith('TEMP') && situacao === 'ATIVO';
}

const RH_ALERTA_3_MAIS = ['ELIANE', 'KARINA', 'GILMARA'];

function calcularSequenciaFaltas(registrosFuncionario: any[], dataMinima: string) {
  const ordenados = registrosFuncionario
    .filter(registro => registro.data >= dataMinima)
    .sort((a, b) => a.data.localeCompare(b.data));

  let sequenciaAtual: string[] = [];
  let maiorSequencia: string[] = [];

  ordenados.forEach(registro => {
    if (registro.tipo === 'F') {
      if (!sequenciaAtual.includes(registro.data)) sequenciaAtual.push(registro.data);
      if (sequenciaAtual.length >= maiorSequencia.length) maiorSequencia = [...sequenciaAtual];
      return;
    }

    sequenciaAtual = [];
  });

  return maiorSequencia;
}

export default function FaltasAlertas() {
  const { isAdmin, isRHMode, canEditFaltas } = useAuth();
  const { usuarioAtual } = useUsuario();
  const queryClient = useQueryClient();
  const nomeUsuario = normalizar(usuarioAtual.nome);
  const podeVer = isRHMode;
  const podeResolver = isAdmin || RH_ALERTA_3_MAIS.includes(nomeUsuario);

  const { data: periodos = [] } = usePeriodosFaltas();
  const periodo = useMemo(() => periodos.find(p => p.status === 'aberto') || periodos[0], [periodos]);
  const periodoId = periodo?.id;
  const { data: funcionarios = [] } = useFuncionariosFaltas(periodoId, periodo);
  const { data: registros = [] } = useRegistrosFaltas(periodoId);

  const { data: controles = [] } = useQuery({
    queryKey: ['faltas-3-mais-controles', periodoId],
    enabled: podeVer && !!periodoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divergencias_quadro')
        .select('id, funcionario_id, resolvido, status, observacoes, resolvido_por, resolvido_em')
        .eq('tipo_divergencia', TIPO_DIVERGENCIA);
      if (error) throw error;
      return data || [];
    },
  });

  const controlesPorFuncionario = useMemo(() => {
    const map = new Map<string, (typeof controles)[number]>();
    controles.forEach(item => map.set(item.funcionario_id, item));
    return map;
  }, [controles]);

  const alertas = useMemo(() => {
    if (!podeVer || !periodoId) return [];

    const funcionariosElegiveis = new Map(
      funcionarios
        .filter(func => {
          const situacao = normalizar(func.situacao?.nome);
          const desligado = situacao.includes('DEMISS') || situacao.includes('DESLIG') || !!func.data_demissao;
          return !desligado && isTemporario(func);
        })
        .map(func => [func.id, func])
    );

    const registrosPorFuncionario = new Map<string, any[]>();
    registros.forEach(registro => {
      if (!funcionariosElegiveis.has(registro.funcionario_id)) return;
      const atual = registrosPorFuncionario.get(registro.funcionario_id) || [];
      atual.push(registro);
      registrosPorFuncionario.set(registro.funcionario_id, atual);
    });

    const faltasPorFuncionario = new Map<string, { funcionario: typeof funcionarios[number]; dias: string[] }>();

    funcionariosElegiveis.forEach(funcionario => {
      const controle = controlesPorFuncionario.get(funcionario.id);
      const dataResolucao = controle?.resolvido && controle.resolvido_em ? controle.resolvido_em.slice(0, 10) : null;
      const dataMinima = dataResolucao && dataResolucao > DATA_INICIO_CONTAGEM ? dataResolucao : DATA_INICIO_CONTAGEM;
      const sequencia = calcularSequenciaFaltas(registrosPorFuncionario.get(funcionario.id) || [], dataResolucao ? dataMinima : DATA_INICIO_CONTAGEM);

      if (sequencia.length >= 3) {
        faltasPorFuncionario.set(funcionario.id, { funcionario, dias: sequencia });
      }
    });

    return Array.from(faltasPorFuncionario.values())
      .filter(item => item.dias.length >= 3)
      .filter(item => !controlesPorFuncionario.get(item.funcionario.id)?.resolvido)
      .map(item => ({
        ...item,
        dias: item.dias.sort(),
        total: item.dias.length,
        controle: controlesPorFuncionario.get(item.funcionario.id),
      }))
      .sort((a, b) => b.total - a.total || a.funcionario.nome_completo.localeCompare(b.funcionario.nome_completo));
  }, [podeVer, periodoId, funcionarios, registros, controlesPorFuncionario]);

  const exportarExcel = async () => {
    if (alertas.length === 0) {
      toast.info('Nenhum alerta para exportar.');
      return;
    }

    const XLSX = await loadXLSX();
    const linhas = alertas.map(alerta => {
      const funcionario = alerta.funcionario;
      return {
        Nome: funcionario.nome_completo,
        Matricula: funcionario.matricula || '',
        Setor: funcionario.setor?.nome || funcionario.setor?.grupo || '',
        Turma: funcionario.turma || '',
        Faltas: alerta.total,
        Dias: alerta.dias.map(d => format(parseISO(d), 'dd/MM/yyyy', { locale: ptBR })).join(', '),
        Status: alerta.controle?.resolvido ? 'Resolvido' : alerta.controle?.status === 'aguardando' ? 'Aguardando agência' : 'Pendente',
      };
    });
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alertas 3+');
    XLSX.writeFile(wb, `alertas_faltas_3_mais_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const salvarStatus = useMutation({
    mutationFn: async ({ funcionarioId, acao, total, dias }: { funcionarioId: string; acao: 'resolvido' | 'reabrir' | 'aguardando'; total: number; dias: string[] }) => {
      const existente = controlesPorFuncionario.get(funcionarioId);
      const funcionario = funcionarios.find(f => f.id === funcionarioId);
      const usuarioNome = usuarioAtual?.nome || 'SISTEMA';
      const observacoes = `Acompanhamento RH: ${total} falta(s) desde ${DATA_INICIO_CONTAGEM}. Dias: ${dias.join(', ')}`;
      const resolvido = acao === 'resolvido';
      const status = acao === 'aguardando' ? 'aguardando' : resolvido ? 'resolvido' : 'pendente';

      if (existente) {
        const { error } = await supabase
          .from('divergencias_quadro')
          .update({
            resolvido,
            status,
            resolvido_por: resolvido ? usuarioNome : null,
            resolvido_em: resolvido ? new Date().toISOString() : null,
            feedback_rh: resolvido ? `RH confirmou contato/acompanhamento em ${format(new Date(), 'dd/MM/yyyy HH:mm')}.` : null,
            observacoes,
          })
          .eq('id', existente.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('divergencias_quadro').insert({
          funcionario_id: funcionarioId,
          tipo_divergencia: TIPO_DIVERGENCIA,
          criado_por: usuarioNome,
          observacoes,
          descricao_acao: funcionario ? `Funcionario com 3+ faltas: ${funcionario.nome_completo}` : 'Funcionario com 3+ faltas',
          resolvido,
          status,
          resolvido_por: resolvido ? usuarioNome : null,
          resolvido_em: resolvido ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }

      if (acao === 'aguardando' && funcionario) {
        const { data: realParceria } = await supabase
          .from('user_roles')
          .select('id')
          .eq('ativo', true)
          .ilike('nome', 'REAL PARCERIA');

        const setor = funcionario.setor?.nome || funcionario.setor?.grupo || 'Sem setor';
        const diasFormatados = dias.map(d => format(parseISO(d), 'dd/MM', { locale: ptBR })).join(', ');
        const referenciaId = `faltas-3-mais-${funcionario.id}`;

        if (realParceria?.length) {
          await supabase.from('notificacoes').insert(realParceria.map((destinatario: any) => ({
            user_role_id: destinatario.id,
            tipo: 'alerta_temp_sumido',
            titulo: 'Verificar TEMP com 3+ faltas',
            mensagem: `${usuarioNome} enviou para a agência verificar:\n\n${funcionario.matricula || 'TEMP'} - ${funcionario.nome_completo}\nSetor: ${setor}${funcionario.turma ? `\nTurma: ${funcionario.turma}` : ''}\nFaltas (${total}): ${diasFormatados}\n\nClique em CIENTE para ocultar nesta sessão ou RESPONDER se tiver retorno.`,
            referencia_id: referenciaId,
          })));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faltas-3-mais-controles'] });
      toast.success('Status atualizado.');
    },
    onError: () => toast.error('Erro ao atualizar status.'),
  });

  if (!podeVer) {
    return <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">Sem acesso aos alertas de faltas.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-wide flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ALERTAS DE FALTAS 3+
            </h1>
            <p className="text-sm text-muted-foreground">
              Conta 3 faltas seguidas a partir de 01/06/2026, ignorando folgas/dias sem registro. Suspensao, presenca, atestado, ferias ou day off quebram a sequencia.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportarExcel} disabled={alertas.length === 0} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Excel
          </Button>
        </div>
      </div>

      {!periodo ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">Nenhum periodo de faltas encontrado.</div>
      ) : alertas.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">Nenhum funcionario ativo com 3 ou mais faltas na regra atual.</div>
      ) : (
        <div className="space-y-3">
          {alertas.map(alerta => {
            const funcionario = alerta.funcionario;
            const resolvido = alerta.controle?.resolvido === true;
            const aguardando = alerta.controle?.status === 'aguardando' && !resolvido;
            const setor = funcionario.setor?.nome || funcionario.setor?.grupo || 'Sem setor';
            const diasFormatados = alerta.dias.map(d => format(parseISO(d), 'dd/MM', { locale: ptBR })).join(', ');

            return (
              <div key={funcionario.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-sm">{funcionario.nome_completo}</p>
                      <Badge variant="secondary">{funcionario.matricula || 'Sem matricula'}</Badge>
                      <Badge variant="destructive">{alerta.total} faltas</Badge>
                      <Badge variant={resolvido ? 'default' : aguardando ? 'secondary' : 'outline'}>
                        {resolvido ? 'Resolvido' : aguardando ? 'Aguardando agência' : 'Nao resolvido'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{setor}{funcionario.turma ? ` - Turma ${funcionario.turma}` : ''}</p>
                    <p className="text-xs text-muted-foreground mt-1">Dias: {diasFormatados}</p>
                  </div>
                  {podeResolver && (
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {!resolvido && (
                        <Button
                          size="sm"
                          variant={aguardando ? 'secondary' : 'outline'}
                          onClick={() => salvarStatus.mutate({ funcionarioId: funcionario.id, acao: 'aguardando', total: alerta.total, dias: alerta.dias })}
                          disabled={salvarStatus.isPending}
                          className="gap-1.5"
                        >
                          <Hourglass className="h-3.5 w-3.5" />
                          Aguardando
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={resolvido ? 'outline' : 'default'}
                        onClick={() => salvarStatus.mutate({ funcionarioId: funcionario.id, acao: resolvido ? 'reabrir' : 'resolvido', total: alerta.total, dias: alerta.dias })}
                        disabled={salvarStatus.isPending}
                        className="gap-1.5"
                      >
                        {resolvido ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {resolvido ? 'Reabrir' : 'Marcar resolvido'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex gap-2">
        <Clock className="h-4 w-4 shrink-0" />
        Funcionarios desligados nao aparecem nesta lista.
      </div>
    </div>
  );
}
