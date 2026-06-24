import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePeriodosFaltas, useRegistrosFaltas, useFuncionariosFaltas } from '@/hooks/useFaltas';
import { useUsuario } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
        .select('id, funcionario_id, resolvido, observacoes, resolvido_por, resolvido_em')
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

    const faltasPorFuncionario = new Map<string, { funcionario: typeof funcionarios[number]; dias: string[] }>();

    registros.forEach(registro => {
      if (registro.tipo !== 'F' && registro.tipo !== 'SS') return;
      const funcionario = funcionariosElegiveis.get(registro.funcionario_id);
      if (!funcionario) return;

      const controle = controlesPorFuncionario.get(funcionario.id);
      const dataResolucao = controle?.resolvido && controle.resolvido_em ? controle.resolvido_em.slice(0, 10) : null;
      const dataMinima = dataResolucao && dataResolucao > DATA_INICIO_CONTAGEM ? dataResolucao : DATA_INICIO_CONTAGEM;
      const passouCorte = dataResolucao ? registro.data > dataMinima : registro.data >= dataMinima;
      if (!passouCorte) return;

      const atual = faltasPorFuncionario.get(funcionario.id) || { funcionario, dias: [] };
      if (!atual.dias.includes(registro.data)) atual.dias.push(registro.data);
      faltasPorFuncionario.set(funcionario.id, atual);
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

  const salvarStatus = useMutation({
    mutationFn: async ({ funcionarioId, resolvido, total, dias }: { funcionarioId: string; resolvido: boolean; total: number; dias: string[] }) => {
      const existente = controlesPorFuncionario.get(funcionarioId);
      const funcionario = funcionarios.find(f => f.id === funcionarioId);
      const usuarioNome = usuarioAtual?.nome || 'SISTEMA';
      const observacoes = `Acompanhamento RH: ${total} falta(s) desde ${DATA_INICIO_CONTAGEM}. Dias: ${dias.join(', ')}`;

      if (existente) {
        const { error } = await supabase
          .from('divergencias_quadro')
          .update({
            resolvido,
            status: resolvido ? 'resolvido' : 'pendente',
            resolvido_por: resolvido ? usuarioNome : null,
            resolvido_em: resolvido ? new Date().toISOString() : null,
            feedback_rh: resolvido ? `RH confirmou contato/acompanhamento em ${format(new Date(), 'dd/MM/yyyy HH:mm')}.` : null,
            observacoes,
          })
          .eq('id', existente.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('divergencias_quadro').insert({
        funcionario_id: funcionarioId,
        tipo_divergencia: TIPO_DIVERGENCIA,
        criado_por: usuarioNome,
        observacoes,
        descricao_acao: funcionario ? `Funcionario com 3+ faltas: ${funcionario.nome_completo}` : 'Funcionario com 3+ faltas',
        resolvido,
        status: resolvido ? 'resolvido' : 'pendente',
        resolvido_por: resolvido ? usuarioNome : null,
        resolvido_em: resolvido ? new Date().toISOString() : null,
      });
      if (error) throw error;
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
        <h1 className="text-lg font-bold text-foreground tracking-wide flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          ALERTAS DE FALTAS 3+
        </h1>
        <p className="text-sm text-muted-foreground">
          Conta faltas a partir de 01/06/2026. Quando um alerta e resolvido, a contagem zera e so volta com 3 novas faltas.
        </p>
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
                      <Badge variant={resolvido ? 'default' : 'outline'}>{resolvido ? 'Resolvido' : 'Nao resolvido'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{setor}{funcionario.turma ? ` - Turma ${funcionario.turma}` : ''}</p>
                    <p className="text-xs text-muted-foreground mt-1">Dias: {diasFormatados}</p>
                  </div>
                  {podeResolver && (
                    <Button
                      size="sm"
                      variant={resolvido ? 'outline' : 'default'}
                      onClick={() => salvarStatus.mutate({ funcionarioId: funcionario.id, resolvido: !resolvido, total: alerta.total, dias: alerta.dias })}
                      disabled={salvarStatus.isPending}
                      className="gap-1.5"
                    >
                      {resolvido ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {resolvido ? 'Reabrir' : 'Marcar resolvido'}
                    </Button>
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
