import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Clock, Search, Trash2, AlertTriangle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFuncionariosNoQuadro } from '@/hooks/useFuncionarios';
import { useSetores } from '@/hooks/useSetores';
import { useSituacoes } from '@/hooks/useSituacoes';
import { Funcionario } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { normalizarTextoSistema } from '@/lib/normalizacao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type StatusConferencia = 'CONFERIDO' | 'VER_DEPOIS' | 'ANALISAR_EXCLUSAO' | 'PENDENTE';
type SetorFiltro = 'TODOS' | 'SOPRO_A' | 'SOPRO_B' | 'SOPRO_C' | 'DECORACAO_DIA' | 'DECORACAO_NOITE';

interface ConferenciaRegistro {
  funcionario_id: string;
  status: StatusConferencia;
  atualizado_por: string | null;
  updated_at: string | null;
}

const STATUS_LABEL: Record<StatusConferencia, string> = {
  PENDENTE: 'CONFERENCIA',
  CONFERIDO: 'CONFIRMADOS',
  VER_DEPOIS: 'AGUARDAR',
  ANALISAR_EXCLUSAO: 'EXCLUIR',
};

const STATUS_CLASS: Record<StatusConferencia, string> = {
  PENDENTE: 'bg-slate-100 text-slate-700 border-slate-200',
  CONFERIDO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  VER_DEPOIS: 'bg-amber-100 text-amber-700 border-amber-200',
  ANALISAR_EXCLUSAO: 'bg-red-100 text-red-700 border-red-200',
};

const ROW_CLASS: Record<StatusConferencia, string> = {
  PENDENTE: 'hover:bg-muted/50',
  CONFERIDO: 'bg-emerald-50 hover:bg-emerald-100',
  VER_DEPOIS: 'bg-amber-50 hover:bg-amber-100',
  ANALISAR_EXCLUSAO: 'bg-red-50 hover:bg-red-100',
};

const SETOR_FILTROS: Array<{ value: SetorFiltro; label: string }> = [
  { value: 'TODOS', label: 'TODOS SETORES' },
  { value: 'SOPRO_A', label: 'SOPRO A' },
  { value: 'SOPRO_B', label: 'SOPRO B' },
  { value: 'SOPRO_C', label: 'SOPRO C' },
  { value: 'DECORACAO_DIA', label: 'DECORACAO DIA' },
  { value: 'DECORACAO_NOITE', label: 'DECORACAO NOITE' },
];

function temLetraSetor(texto: string, letra: 'A' | 'B' | 'C') {
  return new RegExp(`(^|[^A-Z0-9])${letra}([^A-Z0-9]|$)`).test(texto);
}

function obterSetorFiltro(func: Funcionario): Exclude<SetorFiltro, 'TODOS'> | null {
  const nomeSetor = normalizarTextoSistema(func.setor?.nome) || '';
  const grupoSetor = normalizarTextoSistema(func.setor?.grupo) || '';
  const texto = `${nomeSetor} ${grupoSetor}`;

  if (texto.includes('SOPRO')) {
    if (temLetraSetor(texto, 'A')) return 'SOPRO_A';
    if (temLetraSetor(texto, 'B')) return 'SOPRO_B';
    if (temLetraSetor(texto, 'C')) return 'SOPRO_C';
  }

  if (texto.includes('DECORACAO')) {
    if (texto.includes('NOITE')) return 'DECORACAO_NOITE';
    if (texto.includes('DIA')) return 'DECORACAO_DIA';
  }

  return null;
}

function formatarData(isoDate?: string | null) {
  if (!isoDate) return '-';
  try {
    return format(parseISO(isoDate), 'dd/MM/yyyy');
  } catch {
    return '-';
  }
}

export default function ConferenciaFuncionarios() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<StatusConferencia | 'TODOS'>('PENDENTE');
  const [setorFiltro, setSetorFiltro] = useState<SetorFiltro>('TODOS');
  const [turmaFiltro, setTurmaFiltro] = useState('TODAS');
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<Funcionario | null>(null);
  const [setorEdit, setSetorEdit] = useState('');
  const [turmaEdit, setTurmaEdit] = useState('');
  const [situacaoEdit, setSituacaoEdit] = useState('');
  const [admissaoEdit, setAdmissaoEdit] = useState('');
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const { data: funcionarios = [], isLoading: loadingFuncionarios } = useFuncionariosNoQuadro();
  const { data: setores = [] } = useSetores();
  const { data: situacoes = [] } = useSituacoes();

  const setoresOrdenados = useMemo(() => {
    return [...setores]
      .filter((setor) => setor.ativo)
      .sort((a, b) => {
        if (a.conta_no_quadro !== b.conta_no_quadro) return a.conta_no_quadro ? -1 : 1;
        return (normalizarTextoSistema(a.nome) || '').localeCompare(normalizarTextoSistema(b.nome) || '');
      });
  }, [setores]);

  const turmasDisponiveis = useMemo(() => {
    const setor = setores.find((item) => item.id === setorEdit);
    const nomeSetor = normalizarTextoSistema(setor?.nome) || '';
    const grupoSetor = normalizarTextoSistema(setor?.grupo) || '';
    if (nomeSetor.includes('SOPRO') || grupoSetor.includes('SOPRO')) return ['1A', '1B', '2A', '2B', 'SEM TURMA'];
    if (nomeSetor.includes('DECORACAO') || grupoSetor.includes('DECORACAO')) return ['T1', 'T2', 'SEM TURMA'];

    const turmas = new Set<string>();
    funcionarios.forEach((func) => {
      const turma = normalizarTextoSistema(func.turma);
      if (turma) turmas.add(turma);
    });
    turmas.add('SEM TURMA');
    return Array.from(turmas).sort();
  }, [funcionarios, setorEdit, setores]);

  const { data: conferencias = [], isLoading: loadingConferencias, error } = useQuery({
    queryKey: ['conferencia_funcionarios'],
    queryFn: async () => {
      const { data, error: queryError } = await (supabase as any)
        .from('conferencia_funcionarios')
        .select('funcionario_id,status,atualizado_por,updated_at');

      if (queryError) throw queryError;
      return (data || []) as ConferenciaRegistro[];
    },
  });

  const conferenciaMap = useMemo(() => {
    return new Map(conferencias.map((item) => [item.funcionario_id, item]));
  }, [conferencias]);

  const marcarStatus = useMutation({
    mutationFn: async ({ funcionarioId, status }: { funcionarioId: string; status: StatusConferencia }) => {
      const { error: mutationError } = await (supabase as any)
        .from('conferencia_funcionarios')
        .upsert({
          funcionario_id: funcionarioId,
          status,
          atualizado_por: normalizarTextoSistema(userRole?.nome) || 'SISTEMA',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'funcionario_id' });

      if (mutationError) throw mutationError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conferencia_funcionarios'] });
    },
    onError: () => {
      toast.error('ERRO AO SALVAR CONFERENCIA');
    },
  });

  const excluirFuncionario = useMutation({
    mutationFn: async (funcionarioId: string) => {
      const { error: deleteError } = await supabase
        .from('funcionarios')
        .delete()
        .eq('id', funcionarioId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      queryClient.invalidateQueries({ queryKey: ['conferencia_funcionarios'] });
      toast.success('FUNCIONARIO EXCLUIDO');
    },
    onError: () => {
      toast.error('NAO FOI POSSIVEL EXCLUIR. PODE EXISTIR REGISTRO VINCULADO.');
    },
  });

  const abrirModal = (func: Funcionario) => {
    setFuncionarioSelecionado(func);
    setSetorEdit(func.setor_id || '');
    setTurmaEdit(normalizarTextoSistema(func.turma) || '');
    setSituacaoEdit(func.situacao_id || '');
    setAdmissaoEdit(func.data_admissao || '');
  };

  const salvarAjustes = useMutation({
    mutationFn: async () => {
      if (!funcionarioSelecionado) return;
      const { error: updateError } = await supabase
        .from('funcionarios')
        .update({
          setor_id: setorEdit,
          turma: normalizarTextoSistema(turmaEdit === 'SEM TURMA' ? null : turmaEdit),
          situacao_id: situacaoEdit,
          data_admissao: admissaoEdit || null,
        })
        .eq('id', funcionarioSelecionado.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      toast.success('AJUSTES SALVOS');
      setFuncionarioSelecionado(null);
    },
    onError: () => {
      toast.error('ERRO AO SALVAR AJUSTES');
    },
  });

  const lista = useMemo(() => {
    const termo = normalizarTextoSistema(busca) || '';

    return funcionarios
      .map((func) => {
        const registro = conferenciaMap.get(func.id);
        const status = registro?.status || 'PENDENTE';
        return { func, registro, status };
      })
      .filter(({ func, status }) => {
        if (filtro !== 'TODOS' && status !== filtro) return false;
        if (setorFiltro !== 'TODOS' && obterSetorFiltro(func) !== setorFiltro) return false;
        const turma = normalizarTextoSistema(func.turma) || 'SEM TURMA';
        if (turmaFiltro !== 'TODAS' && turma !== turmaFiltro) return false;
        if (!termo) return true;

        const textoBusca = [
          func.matricula,
          func.nome_completo,
          func.setor?.nome,
          func.turma,
          func.situacao?.nome,
        ].map((valor) => normalizarTextoSistema(valor) || '').join(' ');

        return textoBusca.includes(termo);
      })
      .sort((a, b) => {
        const nomeA = normalizarTextoSistema(a.func.nome_completo) || '';
        const nomeB = normalizarTextoSistema(b.func.nome_completo) || '';
        return nomeA.localeCompare(nomeB);
      });
  }, [busca, conferenciaMap, filtro, funcionarios, setorFiltro, turmaFiltro]);

  const funcionariosBaseFiltros = useMemo(() => {
    return funcionarios.filter((func) => {
      const status = conferenciaMap.get(func.id)?.status || 'PENDENTE';
      if (filtro !== 'TODOS' && status !== filtro) return false;
      if (setorFiltro !== 'TODOS' && obterSetorFiltro(func) !== setorFiltro) return false;
      return true;
    });
  }, [conferenciaMap, filtro, funcionarios, setorFiltro]);

  const setoresFiltroTotais = useMemo(() => {
    const map = new Map<SetorFiltro, number>();
    SETOR_FILTROS.forEach((item) => map.set(item.value, 0));

    funcionarios.forEach((func) => {
      const status = conferenciaMap.get(func.id)?.status || 'PENDENTE';
      if (filtro !== 'TODOS' && status !== filtro) return;

      map.set('TODOS', (map.get('TODOS') || 0) + 1);
      const grupo = obterSetorFiltro(func);
      if (grupo) map.set(grupo, (map.get(grupo) || 0) + 1);
    });

    return map;
  }, [conferenciaMap, filtro, funcionarios]);

  const turmas = useMemo(() => {
    const map = new Map<string, number>();
    funcionariosBaseFiltros.forEach((func) => {
      const turma = normalizarTextoSistema(func.turma) || 'SEM TURMA';
      map.set(turma, (map.get(turma) || 0) + 1);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'SEM TURMA') return 1;
      if (b === 'SEM TURMA') return -1;
      return a.localeCompare(b);
    });
  }, [funcionariosBaseFiltros]);

  const totais = useMemo(() => {
    const base = { TODOS: funcionarios.length, PENDENTE: 0, CONFERIDO: 0, VER_DEPOIS: 0, ANALISAR_EXCLUSAO: 0 };
    funcionarios.forEach((func) => {
      const status = conferenciaMap.get(func.id)?.status || 'PENDENTE';
      if (status in base) base[status] += 1;
    });
    return base;
  }, [conferenciaMap, funcionarios]);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">CONFERENCIA DE FUNCIONARIOS</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          TABELA DE CONFERENCIA AINDA NAO EXISTE NO SUPABASE. RODE O SQL QUE PASSEI NO CHAT E RECARREGUE A PAGINA.
        </div>
      </div>
    );
  }

  const loading = loadingFuncionarios || loadingConferencias;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CONFERENCIA DE FUNCIONARIOS</h1>
        <p className="text-sm text-muted-foreground">CLIQUE NA LINHA PARA MARCAR COMO CONFERIDO.</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="BUSCAR POR ID, NOME, SETOR OU SITUACAO..."
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(['PENDENTE', 'CONFERIDO', 'VER_DEPOIS', 'ANALISAR_EXCLUSAO', 'TODOS'] as const).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={filtro === status ? 'default' : 'outline'}
              onClick={() => setFiltro(status)}
            >
              {status === 'TODOS' ? 'TODOS' : STATUS_LABEL[status]} ({totais[status]})
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {SETOR_FILTROS.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={setorFiltro === item.value ? 'default' : 'outline'}
              onClick={() => {
                setSetorFiltro(item.value);
                setTurmaFiltro('TODAS');
              }}
            >
              {item.label} ({setoresFiltroTotais.get(item.value) || 0})
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={turmaFiltro === 'TODAS' ? 'default' : 'outline'} onClick={() => setTurmaFiltro('TODAS')}>
            TODAS TURMAS ({funcionariosBaseFiltros.length})
          </Button>
          {turmas.map(([turma, total]) => (
            <Button key={turma} size="sm" variant={turmaFiltro === turma ? 'default' : 'outline'} onClick={() => setTurmaFiltro(turma)}>
              {turma} ({total})
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs font-bold uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">NOME</th>
              <th className="px-4 py-3">SETOR</th>
              <th className="px-4 py-3">TURMA</th>
              <th className="px-4 py-3">ADMISSAO</th>
              <th className="px-4 py-3">SITUACAO</th>
              <th className="px-4 py-3">STATUS</th>
              <th className="px-4 py-3 text-right">ACAO</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  CARREGANDO...
                </td>
              </tr>
            ) : lista.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  NENHUM FUNCIONARIO ENCONTRADO.
                </td>
              </tr>
            ) : (
              lista.map(({ func, status }) => (
                <tr
                  key={func.id}
                  className={`cursor-pointer border-t ${ROW_CLASS[status] || ROW_CLASS.PENDENTE}`}
                  onClick={() => abrirModal(func)}
                >
                  <td className="px-4 py-3 font-medium">{normalizarTextoSistema(func.matricula) || '-'}</td>
                  <td className="px-4 py-3 font-semibold">{normalizarTextoSistema(func.nome_completo)}</td>
                  <td className="px-4 py-3">{normalizarTextoSistema(func.setor?.nome) || '-'}</td>
                  <td className="px-4 py-3 font-semibold">{normalizarTextoSistema(func.turma) || 'SEM TURMA'}</td>
                  <td className="px-4 py-3">{formatarData(func.data_admissao)}</td>
                  <td className="px-4 py-3">{normalizarTextoSistema(func.situacao?.nome) || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={STATUS_CLASS[status] || STATUS_CLASS.PENDENTE}>
                      {STATUS_LABEL[status] || status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {status === 'ANALISAR_EXCLUSAO' ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={(event) => {
                            event.stopPropagation();
                            const confirmar = window.confirm(`EXCLUIR DEFINITIVO: ${normalizarTextoSistema(func.nome_completo)}?`);
                            if (confirmar) excluirFuncionario.mutate(func.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> EXCLUIR DEFINITIVO
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            abrirModal(func);
                          }}
                        >
                          ABRIR
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4" />
        <p>NO BOTAO EXCLUIR, DIGITE DUPLICADO PARA APAGAR DIRETO OU ANALISAR PARA ENVIAR PARA A ABA EXCLUIR.</p>
      </div>

      <Dialog open={!!funcionarioSelecionado} onOpenChange={(open) => !open && setFuncionarioSelecionado(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>CONFERIR FUNCIONARIO</DialogTitle>
          </DialogHeader>

          {funcionarioSelecionado && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <div className="font-bold">{normalizarTextoSistema(funcionarioSelecionado.nome_completo)}</div>
                <div className="text-muted-foreground">
                  ID: {normalizarTextoSistema(funcionarioSelecionado.matricula) || '-'} | SETOR ATUAL: {normalizarTextoSistema(funcionarioSelecionado.setor?.nome) || '-'}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>SETOR</Label>
                  <Select value={setorEdit} onValueChange={setSetorEdit}>
                    <SelectTrigger>
                      <SelectValue placeholder="SELECIONE" />
                    </SelectTrigger>
                    <SelectContent>
                      {setoresOrdenados.map((setor) => (
                        <SelectItem key={setor.id} value={setor.id}>
                          {normalizarTextoSistema(setor.nome)}{setor.conta_no_quadro ? ' • QUADRO' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>TURMA</Label>
                  <Select value={turmaEdit || 'SEM TURMA'} onValueChange={setTurmaEdit}>
                    <SelectTrigger>
                      <SelectValue placeholder="SELECIONE" />
                    </SelectTrigger>
                    <SelectContent>
                      {turmasDisponiveis.map((turma) => (
                        <SelectItem key={turma} value={turma}>
                          {turma}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>SITUACAO</Label>
                  <Select value={situacaoEdit} onValueChange={setSituacaoEdit}>
                    <SelectTrigger>
                      <SelectValue placeholder="SELECIONE" />
                    </SelectTrigger>
                    <SelectContent>
                      {situacoes.filter((situacao) => situacao.ativa).map((situacao) => (
                        <SelectItem key={situacao.id} value={situacao.id}>
                          {normalizarTextoSistema(situacao.nome)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>DATA ADMISSAO</Label>
                  <Input type="date" value={admissaoEdit} onChange={(event) => setAdmissaoEdit(event.target.value)} />
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="gap-1"
                    onClick={() => {
                      marcarStatus.mutate({ funcionarioId: funcionarioSelecionado.id, status: 'CONFERIDO' });
                      setFuncionarioSelecionado(null);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" /> OK
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1"
                    onClick={() => {
                      marcarStatus.mutate({ funcionarioId: funcionarioSelecionado.id, status: 'VER_DEPOIS' });
                      setFuncionarioSelecionado(null);
                    }}
                  >
                    <Clock className="h-4 w-4" /> AGUARDAR
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1 text-red-700 hover:text-red-700"
                    onClick={() => {
                      const acao = normalizarTextoSistema(window.prompt('DIGITE DUPLICADO PARA EXCLUIR AGORA OU ANALISAR PARA ENVIAR PARA A ABA EXCLUIR') || '');
                      if (acao === 'DUPLICADO') {
                        excluirFuncionario.mutate(funcionarioSelecionado.id);
                      } else if (acao === 'ANALISAR') {
                        marcarStatus.mutate({ funcionarioId: funcionarioSelecionado.id, status: 'ANALISAR_EXCLUSAO' });
                      } else {
                        toast.info('NENHUMA ACAO REALIZADA');
                        return;
                      }
                      setFuncionarioSelecionado(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> EXCLUIR?
                  </Button>
                </div>

                <Button onClick={() => salvarAjustes.mutate()} disabled={salvarAjustes.isPending}>
                  {salvarAjustes.isPending ? 'SALVANDO...' : 'SALVAR AJUSTES'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
