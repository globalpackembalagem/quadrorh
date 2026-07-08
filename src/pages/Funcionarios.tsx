import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users, Trash2, Plus, X, ArrowRightLeft, Upload, Undo2, ChevronDown, ChevronUp, Filter, Download, Clock } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';
import { useFuncionarios, useUpdateFuncionario, useDeleteFuncionario, useCreateFuncionario } from '@/hooks/useFuncionarios';
import { useSetorFilter } from '@/hooks/useSetorFilter';
import { useCreateDemissao } from '@/hooks/useDemissoes';
import { useSetores, useSetoresAtivos } from '@/hooks/useSetores';
import { useSituacoes, useSituacoesAtivas } from '@/hooks/useSituacoes';
import { useAuth } from '@/hooks/useAuth';
import { useRegistrarHistoricoFuncionario, formatarDadosFuncionario } from '@/hooks/useHistoricoFuncionarios';
import { getTurmasPermitidasPorSetor, validarTurmaPorSetor } from '@/lib/turmas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImportarFuncionarios } from '@/components/funcionarios/ImportarFuncionarios';
import { ImportarTurmasDialog } from '@/components/funcionarios/ImportarTurmasDialog';
import { ExportarFuncionariosDialog } from '@/components/funcionarios/ExportarFuncionariosDialog';
import { ZerarBaseDialog } from '@/components/funcionarios/ZerarBaseDialog';
import { CamposSituacaoEspecial } from '@/components/funcionarios/CamposSituacaoEspecial';
import { TrocaUnificadaDialog } from '@/components/funcionarios/TrocaUnificadaDialog';
import { useCriarDivergenciaAuto, devecriarDivergencia } from '@/hooks/useDivergenciasAuto';

import { Funcionario, SexoTipo, EmpresaTipo } from '@/types/database';
import { format, parseISO, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { loadXLSX } from '@/lib/xlsx';
import { normalizarTextoSistema } from '@/lib/normalizacao';
// xlsx-js-style loaded dynamically
import { toast } from 'sonner';

function isoDateToExcelSerial(isoDate?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate || '');
  if (!match) return '';

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

// ─── Componente de Temporários ──────────────────────────────────────────────────
type OrdenacaoTemporarios = 'nome' | 'admissao';

const LIDERES_SOLICITAM_DESLIGAMENTO_TEMP = ['ALEX', 'AMILTON', 'LEILA', 'SILVIA', 'LUCIANO'];
const DESTINATARIOS_SOLICITACAO_TEMP = ['PAULO', 'LUCIANO'];
type AcaoTemporario = 'DESLIGAMENTO' | 'EFETIVACAO';
type SolicitacaoTemporario = {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  matricula: string | null;
  setor_nome: string | null;
  turma: string | null;
  acao: AcaoTemporario;
  motivo: string | null;
  solicitado_por_id: string | null;
  solicitado_por_nome: string;
  solicitado_em: string;
  status: string;
  observacao_admin: string | null;
};

function normalizarNomeUsuario(nome?: string | null) {
  return normalizarTextoSistema(nome || '').trim();
}

function getSessionToken() {
  try {
    const usuario = JSON.parse(localStorage.getItem('usuario_logado') || 'null');
    return usuario?.session_token || null;
  } catch {
    return null;
  }
}

function TemporariosTab({
  funcionarios,
  userRole,
  isRHMode,
}: {
  funcionarios: Funcionario[];
  userRole?: { nome?: string | null; id?: string | null } | null;
  isRHMode: boolean;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTemporarios>('nome');
  const [funcionarioSolicitado, setFuncionarioSolicitado] = useState<Funcionario | null>(null);
  const [acaoSolicitacao, setAcaoSolicitacao] = useState<AcaoTemporario>('DESLIGAMENTO');
  const [motivoSolicitacao, setMotivoSolicitacao] = useState('');
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
  const [pedindoSenha, setPedindoSenha] = useState(false);
  const [enviandoSolicitacao, setEnviandoSolicitacao] = useState(false);
  const [solicitacaoEditando, setSolicitacaoEditando] = useState<SolicitacaoTemporario | null>(null);
  const [editMotivo, setEditMotivo] = useState('');
  const [editStatus, setEditStatus] = useState('PENDENTE');
  const [editAcao, setEditAcao] = useState<AcaoTemporario>('DESLIGAMENTO');
  const [editObservacao, setEditObservacao] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const podeSolicitarDesligamentoTemp = isRHMode
    && LIDERES_SOLICITAM_DESLIGAMENTO_TEMP.includes(normalizarNomeUsuario(userRole?.nome));
  const isLuciano = normalizarNomeUsuario(userRole?.nome) === 'LUCIANO';
  const isLiderSolicitanteTemp = LIDERES_SOLICITAM_DESLIGAMENTO_TEMP.includes(normalizarNomeUsuario(userRole?.nome)) && !isLuciano;
  const podeGerenciarSolicitacoesTemp = isRHMode && !isLiderSolicitanteTemp;

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['solicitacoes-temporarios'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('solicitacoes_temporarios')
        .select('*')
        .order('solicitado_em', { ascending: false })
        .limit(80);
      if (error) throw error;
      return (data || []) as SolicitacaoTemporario[];
    },
    enabled: isRHMode,
  });

  const temporarios = useMemo(() => {
    return funcionarios.filter(f => {
      const mat = f.matricula?.toUpperCase() || '';
      const situacao = normalizarTextoSistema(f.situacao?.nome) || '';
      return mat.startsWith('TEMP') && situacao === 'ATIVO';
    });
  }, [funcionarios]);

  const filtrados = useMemo(() => {
    const lista = !search.trim() ? temporarios : temporarios.filter(f => {
      const s = search.toLowerCase();
      return (
        f.nome_completo.toLowerCase().includes(s) ||
        f.matricula?.toLowerCase().includes(s) ||
        f.setor?.nome?.toLowerCase().includes(s) ||
        f.turma?.toLowerCase().includes(s)
      );
    });

    return [...lista].sort((a, b) => {
      if (ordenacao === 'admissao') {
        const dataA = a.data_admissao || '';
        const dataB = b.data_admissao || '';
        return dataA.localeCompare(dataB) || a.nome_completo.localeCompare(b.nome_completo);
      }
      return a.nome_completo.localeCompare(b.nome_completo);
    });
  }, [temporarios, search, ordenacao]);

  const solicitacoesPorFuncionario = useMemo(() => {
    const mapa = new Map<string, SolicitacaoTemporario>();
    solicitacoes.forEach((sol) => {
      if (!mapa.has(sol.funcionario_id) && sol.status !== 'CANCELADA') {
        mapa.set(sol.funcionario_id, sol);
      }
    });
    return mapa;
  }, [solicitacoes]);

  const abrirSolicitacao = (func: Funcionario, acao: AcaoTemporario) => {
    setFuncionarioSolicitado(func);
    setAcaoSolicitacao(acao);
    setMotivoSolicitacao('');
    setSenhaConfirmacao('');
    setPedindoSenha(false);
  };

  const enviarSolicitacaoTemporario = async () => {
    if (!funcionarioSolicitado) return;
    const isDesligamento = acaoSolicitacao === 'DESLIGAMENTO';

    if (isDesligamento && motivoSolicitacao.trim().length < 15) {
      toast.error('Informe o motivo com mais detalhes.');
      return;
    }
    if (!pedindoSenha) {
      setPedindoSenha(true);
      return;
    }
    if (!senhaConfirmacao) {
      toast.error('Informe sua senha para confirmar.');
      return;
    }

    setEnviandoSolicitacao(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-handler', {
        body: {
          action: 'criar_solicitacao_temporario',
          user_id: userRole?.id,
          senha: senhaConfirmacao,
          funcionario: {
            id: funcionarioSolicitado.id,
            nome_completo: funcionarioSolicitado.nome_completo,
            matricula: funcionarioSolicitado.matricula || 'TEMP',
            setor_id: funcionarioSolicitado.setor_id,
            setor_nome: funcionarioSolicitado.setor?.nome || 'SEM SETOR',
            turma: funcionarioSolicitado.turma,
            data_admissao: funcionarioSolicitado.data_admissao,
          },
          acao: acaoSolicitacao,
          motivo: isDesligamento ? motivoSolicitacao.trim() : (motivoSolicitacao.trim() || null),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(isDesligamento ? 'Solicitacao registrada para o RH.' : 'Solicitacao de efetivacao enviada para o RH.');
      setFuncionarioSolicitado(null);
      setMotivoSolicitacao('');
      setSenhaConfirmacao('');
      setPedindoSenha(false);
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-temporarios'] });
    } catch (error: any) {
      toast.error(`Erro ao enviar solicitacao: ${error?.message || 'erro desconhecido'}`);
    } finally {
      setEnviandoSolicitacao(false);
    }
  };

  const abrirEdicaoSolicitacao = (solicitacao: SolicitacaoTemporario) => {
    setSolicitacaoEditando(solicitacao);
    setEditMotivo(solicitacao.motivo || '');
    setEditStatus(solicitacao.status || 'PENDENTE');
    setEditAcao(solicitacao.acao || 'DESLIGAMENTO');
    setEditObservacao(solicitacao.observacao_admin || '');
  };

  const salvarEdicaoSolicitacao = async () => {
    if (!solicitacaoEditando) return;
    setSalvandoEdicao(true);
    try {
      const sessionToken = getSessionToken();
      const { data, error } = await supabase.functions.invoke('auth-handler', {
        body: {
          action: 'admin_update_solicitacao_temporario',
          session_token: sessionToken,
          solicitacao_id: solicitacaoEditando.id,
          campos: {
            acao: editAcao,
            motivo: editMotivo || null,
            status: editStatus,
            observacao_admin: editObservacao || null,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Solicitacao atualizada.');
      setSolicitacaoEditando(null);
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-temporarios'] });
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error?.message || 'erro desconhecido'}`);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, matrícula, setor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-8" />
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0">
            <X className="h-3 w-3" />
          </Button>
        )}
        </div>

        <Select value={ordenacao} onValueChange={(value) => setOrdenacao(value as OrdenacaoTemporarios)}>
          <SelectTrigger className="w-full md:w-[210px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Ordem alfabetica</SelectItem>
            <SelectItem value="admissao">Ordem de admissao</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="data-table text-xs w-full">
          <thead>
            <tr>
              <th className="w-[80px]">Matrícula</th>
              <th>Funcionário</th>
              <th className="w-[100px]">Admissão</th>
              <th className="w-[100px]">Data 90 Dias</th>
              <th className="w-[100px]">Data 180 Dias</th>
              {podeSolicitarDesligamentoTemp && <th className="w-[180px]">Acao</th>}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
		                <td colSpan={podeSolicitarDesligamentoTemp ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum temporário encontrado</p>
                </td>
              </tr>
            ) : (
              filtrados.map(func => {
                const dataAdm = func.data_admissao ? parseISO(func.data_admissao) : null;
                const data90 = dataAdm ? addDays(dataAdm, 90) : null;
                const data180 = dataAdm ? addDays(dataAdm, 180) : null;
                const hoje = new Date();
                const vencido = data90 && data90 <= hoje;
                const vencido180 = data180 && data180 <= hoje;

                return (
                  <tr
                    key={func.id}
                    className={podeSolicitarDesligamentoTemp ? 'hover:bg-muted/50 cursor-pointer' : 'hover:bg-muted/50'}
                    onClick={() => {
                      if (podeSolicitarDesligamentoTemp) abrirSolicitacao(func, 'DESLIGAMENTO');
                    }}
                  >
                    <td className="text-muted-foreground">{func.matricula || '-'}</td>
                    <td className="min-w-[300px]">
                      <div className="font-medium">{func.nome_completo}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{func.setor?.nome || 'SEM SETOR'}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span>TURMA: {func.turma || '-'}</span>
                      </div>
                    </td>
                    <td>{dataAdm ? format(dataAdm, 'dd/MM/yyyy') : '-'}</td>
                    <td>
                      {data90 ? (
                        <Badge
                          className="text-white border-0 text-[10px]"
                          style={{ backgroundColor: vencido ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}
                        >
                          {format(data90, 'dd/MM/yyyy')}
                        </Badge>
                      ) : '-'}
                    </td>
                    <td>
                      {data180 ? (
                        <Badge
                          className="text-white border-0 text-[10px]"
                          style={{ backgroundColor: vencido180 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}
                        >
                          {format(data180, 'dd/MM/yyyy')}
                        </Badge>
                      ) : '-'}
                    </td>
                    {podeSolicitarDesligamentoTemp && (
                      <td>
                        {solicitacoesPorFuncionario.has(func.id) ? (
                          <Badge variant="outline">SOLICITADO</Badge>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/10"
                              onClick={(event) => {
                                event.stopPropagation();
                                abrirSolicitacao(func, 'EFETIVACAO');
                              }}
                            >
                              EFETIVAR
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-xs font-semibold text-destructive hover:bg-destructive/10"
                              onClick={(event) => {
                                event.stopPropagation();
                                abrirSolicitacao(func, 'DESLIGAMENTO');
                              }}
                            >
                              SUBSTITUIR
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-muted-foreground">
        Total: {filtrados.length} temporário(s)
      </div>

      {solicitacoes.length > 0 && (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-semibold">SOLICITACOES DE TEMPORARIOS</h3>
          </div>
          <table className="data-table text-xs w-full">
            <thead>
              <tr>
                <th>Funcionario</th>
                <th className="w-[120px]">Acao</th>
                {podeGerenciarSolicitacoesTemp && <th className="w-[180px]">Solicitado por</th>}
                <th className="w-[140px]">Data/Hora</th>
                <th>Motivo/Obs.</th>
                <th className="w-[110px]">Status</th>
                {podeGerenciarSolicitacoesTemp && <th className="w-[90px]">Editar</th>}
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((sol) => (
                <tr key={sol.id}>
                  <td>
                    <div className="font-medium">{sol.funcionario_nome}</div>
                    <div className="text-[11px] text-muted-foreground">{sol.setor_nome || '-'} • TURMA: {sol.turma || '-'}</div>
                  </td>
                  <td>
                    <Badge variant={sol.acao === 'DESLIGAMENTO' ? 'destructive' : 'default'}>
                      {sol.acao === 'DESLIGAMENTO' ? 'SUBSTITUIR' : 'EFETIVAR'}
                    </Badge>
                  </td>
                  {podeGerenciarSolicitacoesTemp && <td>{sol.solicitado_por_nome}</td>}
                  <td>{format(new Date(sol.solicitado_em), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="max-w-[260px] truncate">
                    {(podeGerenciarSolicitacoesTemp || sol.solicitado_por_id === userRole?.id) ? (sol.motivo || sol.observacao_admin || '-') : '-'}
                  </td>
                  <td>{sol.status}</td>
                  {podeGerenciarSolicitacoesTemp && (
                    <td>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => abrirEdicaoSolicitacao(sol)}>
                        Editar
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!funcionarioSolicitado} onOpenChange={(open) => {
        if (!open) {
          setFuncionarioSolicitado(null);
          setMotivoSolicitacao('');
          setSenhaConfirmacao('');
          setPedindoSenha(false);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{acaoSolicitacao === 'DESLIGAMENTO' ? 'Solicitar desligamento' : 'Solicitar efetivacao'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-semibold">{funcionarioSolicitado?.nome_completo}</p>
              <p className="text-muted-foreground">
                {funcionarioSolicitado?.matricula || '-'} | {funcionarioSolicitado?.setor?.nome || '-'} | {funcionarioSolicitado?.turma || '-'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{acaoSolicitacao === 'DESLIGAMENTO' ? 'Motivo *' : 'Observacao'}</Label>
              <Input value={motivoSolicitacao} onChange={e => setMotivoSolicitacao(e.target.value)} placeholder={acaoSolicitacao === 'DESLIGAMENTO' ? 'Informe o motivo da substituicao' : 'Opcional'} disabled={pedindoSenha} />
            </div>
            {pedindoSenha && (
              <div className="space-y-2">
                <Label>Senha de login *</Label>
                <Input
                  type="password"
                  value={senhaConfirmacao}
                  onChange={e => setSenhaConfirmacao(e.target.value)}
                  placeholder="Confirme com sua senha"
                  autoFocus
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFuncionarioSolicitado(null)} disabled={enviandoSolicitacao}>Cancelar</Button>
              <Button onClick={enviarSolicitacaoTemporario} disabled={enviandoSolicitacao}>
                {enviandoSolicitacao ? 'Enviando...' : pedindoSenha ? 'Confirmar e enviar' : 'Salvar motivo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!solicitacaoEditando} onOpenChange={(open) => !open && setSolicitacaoEditando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar solicitacao</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-semibold">{solicitacaoEditando?.funcionario_nome}</p>
              <p className="text-muted-foreground">{solicitacaoEditando?.solicitado_por_nome}</p>
            </div>
            <div className="space-y-2">
              <Label>Acao</Label>
              <Select value={editAcao} onValueChange={(value) => setEditAcao(value as AcaoTemporario)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EFETIVACAO">EFETIVAR</SelectItem>
                  <SelectItem value="DESLIGAMENTO">SUBSTITUIR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDENTE">PENDENTE</SelectItem>
                  <SelectItem value="LIBERADA_PARA_EDICAO">LIBERADA PARA EDICAO</SelectItem>
                  <SelectItem value="CIENTE">CIENTE</SelectItem>
                  <SelectItem value="AJUSTADA">AJUSTADA</SelectItem>
                  <SelectItem value="CANCELADA">CANCELADA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input value={editMotivo} onChange={e => setEditMotivo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Observacao RH/Admin</Label>
              <Input value={editObservacao} onChange={e => setEditObservacao(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSolicitacaoEditando(null)} disabled={salvandoEdicao}>Cancelar</Button>
              <Button onClick={salvarEdicaoSolicitacao} disabled={salvandoEdicao}>
                {salvandoEdicao ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Funcionarios() {
  const { data: todosFuncionarios = [], isLoading } = useFuncionarios();
  const { filtrarPorSetor } = useSetorFilter();
  const funcionarios = useMemo(() => filtrarPorSetor(todosFuncionarios), [todosFuncionarios, filtrarPorSetor]);
  const { data: setores = [] } = useSetores();
  const { data: setoresAtivos = [] } = useSetoresAtivos();
  const { data: todasSituacoes = [] } = useSituacoes();
  const { data: situacoesAtivas = [] } = useSituacoesAtivas();
  const { canEditFuncionarios, isVisualizacao, isAdmin, isRHMode, userRole } = useAuth();
  const isRealParceria = userRole?.nome?.toUpperCase() === 'REAL PARCERIA';
  const podeEditarFuncionarios = canEditFuncionarios && !isVisualizacao && !isRealParceria;
  const updateFuncionario = useUpdateFuncionario();
  const deleteFuncionario = useDeleteFuncionario();
  const createFuncionario = useCreateFuncionario();
  const createDemissao = useCreateDemissao();
  const criarDivergencia = useCriarDivergenciaAuto();
  const registrarHistorico = useRegistrarHistoricoFuncionario();


  // Estado para o prompt de demissão ao mudar situação
  const [demissaoPromptOpen, setDemissaoPromptOpen] = useState(false);
  const [demissaoPromptData, setDemissaoPromptData] = useState<{
    funcionarioId: string;
    funcionarioNome: string;
    setorNome: string;
    isPedido: boolean;
  } | null>(null);

  // Gestor não-admin mas logado
  const isGestor = isRHMode && !isAdmin;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importarTurmasOpen, setImportarTurmasOpen] = useState(false);
  const [turmaFilter, setTurmaFilter] = useFilterPersistence<string>('func_turma', 'TODOS');
  const [situacaoFilter, setSituacaoFilter] = useFilterPersistence<string>('func_situacao', 'TODAS');
  const [admissaoInicioFilter, setAdmissaoInicioFilter] = useFilterPersistence<string>('func_admissao_inicio', '');
  const [admissaoFimFilter, setAdmissaoFimFilter] = useFilterPersistence<string>('func_admissao_fim', '');
  const [grupoFilter, setGrupoFilter] = useFilterPersistence<'TODOS' | 'SOPRO' | 'DECORACAO' | 'AJUSTAR_SITUACAO'>('func_grupo', 'TODOS');
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null);

  // Form state
  const [empresa, setEmpresa] = useState<EmpresaTipo>('GLOBALPACK');
  const [matricula, setMatricula] = useState('');
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [dataAdmissao, setDataAdmissao] = useState('');
  const [cargo, setCargo] = useState('');
  const [setorId, setSetorId] = useState('');
  const [turma, setTurma] = useState('');
  const [situacaoId, setSituacaoId] = useState('');
  const [sexo, setSexo] = useState<SexoTipo>('masculino');
  const [dataDemissao, setDataDemissao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [coberturaFuncionarioId, setCoberturaFuncionarioId] = useState('');
  const [coberturaDataInicio, setCoberturaDataInicio] = useState('');
  const [coberturaDataFim, setCoberturaDataFim] = useState('');
  const [treinamentoSetorId, setTreinamentoSetorId] = useState('');
  const [sumidoDesde, setSumidoDesde] = useState('');
  const [naoEMeuFuncionario, setNaoEMeuFuncionario] = useState(false);

  const somenteNumerosCpf = (valor: string) => valor.replace(/\D/g, '');
  const formatarCpf = (valor: string) => {
    const n = somenteNumerosCpf(valor).slice(0, 11);
    return n
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // funcionariosAtivosParaContagem mantido para compatibilidade com view do gestor
  const funcionariosAtivosParaContagem = useMemo(() => {
    return funcionarios.filter(f => {
      const sitNome = f.situacao?.nome?.toUpperCase() || '';
      return sitNome !== 'DEMISSÃO' && sitNome !== 'PED. DEMISSÃO';
    });
  }, [funcionarios]);

  // Turmas de cada grupo
  const TURMAS_SOPRO = ['1A', '1B', '2A', '2B'];
  const TURMAS_DECORACAO = ['T1', 'T2'];

  // Funcionários pré-filtrados pelo grupo selecionado
  const funcionariosDoGrupo = useMemo(() => {
    if (grupoFilter === 'TODOS') return funcionarios;
    if (grupoFilter === 'AJUSTAR_SITUACAO') {
      return funcionarios.filter(f => normalizarTextoSistema(f.situacao?.nome) === 'AJUSTAR SITUACAO');
    }
    if (grupoFilter === 'SOPRO') {
      return funcionarios.filter(f => {
        const grupo = (f.setor as any)?.grupo?.toUpperCase() || '';
        return grupo.startsWith('SOPRO');
      });
    }
    if (grupoFilter === 'DECORACAO') {
      return funcionarios.filter(f => {
        const grupo = (f.setor as any)?.grupo?.toUpperCase() || '';
        return grupo.startsWith('DECORAÇÃO') || grupo.startsWith('DECORACAO');
      });
    }
    return funcionarios;
  }, [funcionarios, grupoFilter]);

  const funcionariosAtivosGrupo = useMemo(() => {
    return funcionariosDoGrupo.filter(f => {
      const sitNome = f.situacao?.nome?.toUpperCase() || '';
      return sitNome !== 'DEMISSÃO' && sitNome !== 'PED. DEMISSÃO';
    });
  }, [funcionariosDoGrupo]);

  // Apenas ATIVO e FÉRIAS para contagens nos filtros
  const funcionariosAtivosFeriasGrupo = useMemo(() => {
    return funcionariosDoGrupo.filter(f => {
      const sitNome = f.situacao?.nome?.toUpperCase() || '';
      return sitNome === 'ATIVO' || sitNome === 'FÉRIAS';
    });
  }, [funcionariosDoGrupo]);

  const turmaOptions = useMemo(() => {
    const turmasPermitidas = grupoFilter === 'SOPRO'
      ? TURMAS_SOPRO
      : grupoFilter === 'DECORACAO'
      ? TURMAS_DECORACAO
      : null;

    const turmas = new Map<string, number>();
    funcionariosAtivosFeriasGrupo.forEach(f => {
      const t = f.turma || 'SEM TURMA';
      if (t === 'SEM TURMA') {
        // SEM TURMA: contar apenas funcionários dos setores do quadro (SOPRO e DECORAÇÃO)
        const grupo = (f.setor as any)?.grupo?.toUpperCase() || '';
        const isQuadroSoproDeco = grupo.startsWith('SOPRO') || grupo.startsWith('DECORAÇÃO') || grupo.startsWith('DECORACAO');
        if (isQuadroSoproDeco) {
          turmas.set(t, (turmas.get(t) || 0) + 1);
        }
      } else if (!turmasPermitidas || turmasPermitidas.includes(t)) {
        turmas.set(t, (turmas.get(t) || 0) + 1);
      }
    });
    const sorted = Array.from(turmas.entries()).sort(([a], [b]) => {
      if (a === 'SEM TURMA') return 1;
      if (b === 'SEM TURMA') return -1;
      return a.localeCompare(b);
    });
    return [['TODOS', funcionariosAtivosFeriasGrupo.length] as [string, number], ...sorted];
  }, [funcionariosAtivosFeriasGrupo, grupoFilter]);

  const filteredFuncionarios = useMemo(() => {
    let result = funcionariosDoGrupo;
    if (turmaFilter !== 'TODOS') {
      if (turmaFilter === 'SEM TURMA') {
        // SEM TURMA: mostrar apenas ATIVO/FÉRIAS sem turma dos setores do quadro (SOPRO e DECORAÇÃO)
        result = result.filter(f => {
          const sitNome = f.situacao?.nome?.toUpperCase() || '';
          const grupo = (f.setor as any)?.grupo?.toUpperCase() || '';
          const isQuadroSoproDeco = grupo.startsWith('SOPRO') || grupo.startsWith('DECORAÇÃO') || grupo.startsWith('DECORACAO');
          return !f.turma && (sitNome === 'ATIVO' || sitNome === 'FÉRIAS') && isQuadroSoproDeco;
        });
      } else {
        result = result.filter(f => f.turma === turmaFilter);
      }
    }
    if (situacaoFilter !== 'TODAS') {
      result = result.filter(f => f.situacao_id === situacaoFilter);
    }
    if (admissaoInicioFilter) {
      result = result.filter(f => !!f.data_admissao && f.data_admissao >= admissaoInicioFilter);
    }
    if (admissaoFimFilter) {
      result = result.filter(f => !!f.data_admissao && f.data_admissao <= admissaoFimFilter);
    }
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      result = result.filter(f =>
        f.nome_completo.toLowerCase().includes(s) ||
        f.matricula?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [funcionariosDoGrupo, debouncedSearch, turmaFilter, situacaoFilter, admissaoInicioFilter, admissaoFimFilter]);

  // Agrupado por turma para a view do gestor
  const funcionariosPorTurma = useMemo(() => {
    const ativos = funcionarios.filter(f => {
      const sitNome = f.situacao?.nome?.toUpperCase() || '';
      return sitNome !== 'DEMISSÃO' && sitNome !== 'PED. DEMISSÃO';
    });
    const map = new Map<string, Funcionario[]>();
    ativos.forEach(f => {
      const t = f.turma || 'SEM TURMA';
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(f);
    });
    const sorted = Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'SEM TURMA') return 1;
      if (b === 'SEM TURMA') return -1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [funcionarios]);

  const resetForm = () => {
    setEmpresa('GLOBALPACK');
    setMatricula('');
    setCpf('');
    setNome('');
    setDataAdmissao('');
    setCargo('');
    setSetorId('');
    setTurma('');
    setSituacaoId('');
    setSexo('masculino');
    setDataDemissao('');
    setObservacoes('');
    setCoberturaFuncionarioId('');
    setCoberturaDataInicio('');
    setCoberturaDataFim('');
    setTreinamentoSetorId('');
    setSumidoDesde('');
    setNaoEMeuFuncionario(false);
    setEditingFuncionario(null);
  };

  const openEdit = (func: Funcionario) => {
    setEditingFuncionario(func);
    setEmpresa(func.empresa as EmpresaTipo || 'GLOBALPACK');
    setMatricula(func.matricula || '');
    setCpf((func as any).cpf || '');
    setNome(func.nome_completo);
    setDataAdmissao(func.data_admissao || '');
    setCargo(func.cargo || '');
    setSetorId(func.setor_id);
    setTurma(func.turma || '');
    setSituacaoId(func.situacao_id);
    setSexo(func.sexo);
    setDataDemissao(func.data_demissao || '');
    setObservacoes(func.observacoes || '');
    setCoberturaFuncionarioId(func.cobertura_funcionario_id || '');
    setCoberturaDataInicio(func.cobertura_data_inicio || '');
    setCoberturaDataFim(func.cobertura_data_fim || '');
    setTreinamentoSetorId(func.treinamento_setor_id || '');
    setSumidoDesde(func.sumido_desde || '');
    setNaoEMeuFuncionario(func.nao_e_meu_funcionario || false);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const situacaoAtualNome = situacoesAtivas.find(s => s.id === situacaoId)?.nome || editingFuncionario?.situacao?.nome || null;
    const setorSelecionado = setoresAtivos.find(s => s.id === setorId) || editingFuncionario?.setor || null;
    const validacaoTurma = validarTurmaPorSetor(setorSelecionado, turma, situacaoAtualNome);
    if (!validacaoTurma.valida) {
      toast.error(validacaoTurma.mensagem || 'TURMA INVALIDA');
      return;
    }

    // Gestor: apenas atualizar turma
    if (!isAdmin && editingFuncionario) {
      const turmaAnterior = editingFuncionario.turma;
      const novaTurma = validacaoTurma.turma;
      await updateFuncionario.mutateAsync({
        id: editingFuncionario.id,
        turma: novaTurma,
      });
      if (turmaAnterior !== novaTurma) {
        await registrarHistorico.mutateAsync({
          tabela: 'funcionarios',
          operacao: 'UPDATE',
          registro_id: editingFuncionario.id,
          dados_anteriores: { nome: editingFuncionario.nome_completo, turma: turmaAnterior || null } as Record<string, any>,
          dados_novos: { nome: editingFuncionario.nome_completo, turma: novaTurma } as Record<string, any>,
        });
      }
      setDialogOpen(false);
      resetForm();
      return;
    }

    if (!nome || !setorId || !situacaoId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const situacaoSelecionada = situacoesAtivas.find(s => s.id === situacaoId);
    const situacaoNome = situacaoSelecionada?.nome || '';
    const situacaoNormalizada = normalizarTextoSistema(situacaoNome) || '';
    const hojeISO = new Date().toLocaleDateString('en-CA');
    const situacaoAtivo = situacoesAtivas.find(s => normalizarTextoSistema(s.nome) === 'ATIVO');
    const situacaoProgramavel = (
      situacaoNormalizada.includes('AUXILIO') ||
      situacaoNormalizada.includes('DOENCA') ||
      situacaoNormalizada.includes('TREINAMENTO') ||
      situacaoNormalizada === 'FERIAS' ||
      situacaoNormalizada.includes('FERIAS')
    ) && !situacaoNormalizada.includes('COB');
    const temInicioProgramado = situacaoProgramavel && !!coberturaDataInicio;
    const deveManterAtivoAteInicio = temInicioProgramado && coberturaDataInicio > hojeISO;
    const deveRetornarAtivo = temInicioProgramado && !!coberturaDataFim && coberturaDataFim <= hojeISO;
    const situacaoIdEfetiva = (deveManterAtivoAteInicio || deveRetornarAtivo) && situacaoAtivo?.id ? situacaoAtivo.id : situacaoId;
    const situacaoNomeEfetiva = situacoesAtivas.find(s => s.id === situacaoIdEfetiva)?.nome || situacaoNome;
    const situacoesSemCpfObrigatorio = [
      'DEMISSAO', 'PED. DEMISSAO', 'PEDIDO DEMISSAO',
      'PEDIDO DE DEMISSAO', 'TERMINO CONTRATO', 'TERMINO DE CONTRATO',
    ];

    if ((deveManterAtivoAteInicio || deveRetornarAtivo) && !situacaoAtivo?.id) {
      toast.error('SITUACAO ATIVO NAO ENCONTRADA.');
      return;
    }

    const cpfFormatado = cpf.trim() ? formatarCpf(cpf) : null;
    if (!situacoesSemCpfObrigatorio.includes(situacaoNormalizada) && !cpfFormatado) {
      toast.error('CPF E OBRIGATORIO PARA FUNCIONARIO ATUAL.');
      return;
    }
    if (cpfFormatado && somenteNumerosCpf(cpfFormatado).length !== 11) {
      toast.error('CPF INVALIDO. INFORME 11 NUMEROS.');
      return;
    }

    const data = {
      empresa,
      matricula: matricula || null,
      cpf: cpfFormatado,
      nome_completo: nome,
      data_admissao: dataAdmissao || null,
      cargo: cargo || null,
      setor_id: setorId,
      turma: validacaoTurma.turma,
      situacao_id: situacaoIdEfetiva,
      sexo,
      data_demissao: dataDemissao || null,
      observacoes: observacoes || null,
      cobertura_funcionario_id: coberturaFuncionarioId && coberturaFuncionarioId !== 'nenhum' ? coberturaFuncionarioId : null,
      cobertura_data_inicio: coberturaDataInicio || null,
      cobertura_data_fim: coberturaDataFim || null,
      treinamento_setor_id: treinamentoSetorId && treinamentoSetorId !== 'nenhum' ? treinamentoSetorId : null,
      sumido_desde: sumidoDesde || null,
      nao_e_meu_funcionario: naoEMeuFuncionario,
    };

    let funcionarioId: string;
    const dadosAnteriores = editingFuncionario
      ? formatarDadosFuncionario(editingFuncionario as unknown as Record<string, unknown>, setoresAtivos, situacoesAtivas)
      : null;

    if (editingFuncionario) {
      await updateFuncionario.mutateAsync({ id: editingFuncionario.id, ...data });
      funcionarioId = editingFuncionario.id;
      const dadosNovos = formatarDadosFuncionario(data as unknown as Record<string, unknown>, setoresAtivos, situacoesAtivas);
      await registrarHistorico.mutateAsync({
        tabela: 'funcionarios',
        operacao: 'UPDATE',
        registro_id: funcionarioId,
        dados_anteriores: dadosAnteriores,
        dados_novos: dadosNovos,
      });
    } else {
      const result = await createFuncionario.mutateAsync(data);
      funcionarioId = result?.id || '';
      if (funcionarioId) {
        const dadosNovos = formatarDadosFuncionario(data as unknown as Record<string, unknown>, setoresAtivos, situacoesAtivas);
        await registrarHistorico.mutateAsync({
          tabela: 'funcionarios',
          operacao: 'INSERT',
          registro_id: funcionarioId,
          dados_anteriores: null,
          dados_novos: dadosNovos,
        });
      }
    }

    if (funcionarioId && temInicioProgramado) {
      const { data: programacaoData, error: programacaoError } = await supabase.functions.invoke('auth-handler', {
        body: {
          action: 'programar_situacao_funcionario',
          session_token: getSessionToken(),
          funcionario_id: funcionarioId,
          situacao_id: situacaoId,
          data_inicio: coberturaDataInicio,
          data_fim: coberturaDataFim || null,
          observacao: observacoes || null,
        },
      });
      if (programacaoError) throw programacaoError;
      if (programacaoData?.error) throw new Error(programacaoData.error);
    }

    const { criar, tipo } = devecriarDivergencia(situacaoNomeEfetiva);
    if (criar && funcionarioId) {
      let obs = '';
      if (situacaoNomeEfetiva.toUpperCase().includes('SUMIDO') && sumidoDesde) {
        obs = `Funcionário sumido desde ${format(parseISO(sumidoDesde), 'dd/MM/yyyy')}`;
      } else if (situacaoNomeEfetiva.toUpperCase().includes('TREINAMENTO') && treinamentoSetorId) {
        const setorTreinamento = setoresAtivos.find(s => s.id === treinamentoSetorId);
        obs = `Em treinamento no setor: ${setorTreinamento?.nome || 'Não informado'}`;
      } else if (situacaoNomeEfetiva.toUpperCase().includes('COB') && coberturaFuncionarioId) {
        const funcCoberto = funcionarios.find(f => f.id === coberturaFuncionarioId);
        obs = `Cobrindo férias de: ${funcCoberto?.nome_completo || 'Não informado'}`;
      }
      await criarDivergencia.mutateAsync({ funcionario_id: funcionarioId, tipo_divergencia: tipo, observacoes: obs });
      toast.info('Divergência criada para análise do RH');
    }

    setDialogOpen(false);
    resetForm();

    // Verificar se mudou para situação de demissão e oferecer criar registro
    if (editingFuncionario && funcionarioId) {
      const situacaoAnteriorNome = editingFuncionario.situacao?.nome?.toUpperCase() || '';
      const novaSituacaoNome = situacaoNome.toUpperCase();
      const situacoesDesligamento = ['DEMISSÃO', 'PED. DEMISSÃO'];
      const eraDesligamento = situacoesDesligamento.some(s => situacaoAnteriorNome.includes(s));
      const agoraDesligamento = situacoesDesligamento.some(s => novaSituacaoNome.includes(s));
      
      if (!eraDesligamento && agoraDesligamento) {
        const setorFunc = setoresAtivos.find(s => s.id === setorId);
        setDemissaoPromptData({
          funcionarioId,
          funcionarioNome: nome,
          setorNome: setorFunc?.nome || '',
          isPedido: novaSituacaoNome.includes('PED'),
        });
        setDemissaoPromptOpen(true);
      }
    }
  };

  const exportarTudo = async () => {
    if (!funcionarios.length) { toast.error('Nenhum funcionário para exportar'); return; }
    const XLSX = await loadXLSX();
    const dados = funcionarios.map(f => ({
      'Matrícula': f.matricula || '',
      'Nome': f.nome_completo,
      'Sexo': f.sexo === 'masculino' ? 'M' : 'F',
      'Setor': f.setor?.nome || '',
      'Situação': f.situacao?.nome || '',
      'Empresa': f.empresa || '',
      'Data Admissão': isoDateToExcelSerial(f.data_admissao),
      'Cargo': f.cargo || '',
      'Turma': f.turma || '',
      'Data Demissão': isoDateToExcelSerial(f.data_demissao),
      'Observações': f.observacoes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    Object.keys(ws).forEach((cellRef) => {
      const cell = ws[cellRef];
      if (cellRef[0] !== '!' && cell?.t === 's') {
        cell.v = normalizarTextoSistema(cell.v) || '';
      }
    });
    const headers = Object.keys(dados[0]);
    const colDataAdmissao = XLSX.utils.encode_col(headers.indexOf('Data Admissão'));
    const colDataDemissao = XLSX.utils.encode_col(headers.indexOf('Data Demissão'));
    for (let row = 2; row <= dados.length + 1; row++) {
      [colDataAdmissao, colDataDemissao].forEach((col) => {
        const cell = ws[`${col}${row}`];
        if (cell && typeof cell.v === 'number') {
          cell.t = 'n';
          cell.z = 'dd/mm/yyyy';
        }
      });
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionários');
    XLSX.writeFile(wb, `Funcionarios_Todos_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Arquivo exportado com sucesso!');
  };

  const removerAcentos = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  const handleRemoverAcentos = async () => {
    const comAcento = funcionarios.filter(f => f.nome_completo !== removerAcentos(f.nome_completo));
    if (comAcento.length === 0) {
      toast.info('Nenhum nome com acento encontrado!');
      return;
    }
    const confirmar = window.confirm(`Serão atualizados ${comAcento.length} nome(s). Deseja continuar?`);
    if (!confirmar) return;

    let count = 0;
    for (const f of comAcento) {
      try {
        await updateFuncionario.mutateAsync({
          id: f.id,
          nome_completo: removerAcentos(f.nome_completo),
        });
        count++;
      } catch {
        // continua
      }
    }
    toast.success(`${count} nome(s) atualizado(s) com sucesso!`);
  };

  const handleMaiusculo = async () => {
    const comMinusculo = funcionarios.filter(f => f.nome_completo !== f.nome_completo.toUpperCase());
    if (comMinusculo.length === 0) {
      toast.info('Todos os nomes já estão em maiúsculo!');
      return;
    }
    const confirmar = window.confirm(`Serão convertidos ${comMinusculo.length} nome(s) para MAIÚSCULO. Deseja continuar?`);
    if (!confirmar) return;

    let count = 0;
    for (const f of comMinusculo) {
      try {
        await updateFuncionario.mutateAsync({
          id: f.id,
          nome_completo: f.nome_completo.toUpperCase(),
        });
        count++;
      } catch {
        // continua
      }
    }
    toast.success(`${count} nome(s) convertido(s) para maiúsculo!`);
  };

  // Detectar grupo do gestor pelo setor dos funcionários
  const gestorGrupo = useMemo(() => {
    for (const f of funcionarios) {
      const grupo = (f.setor as any)?.grupo?.toUpperCase() || '';
      if (grupo.startsWith('SOPRO')) return 'SOPRO';
      if (grupo.startsWith('DECORAÇ') || grupo.startsWith('DECORAC')) return 'DECORACAO';
    }
    return 'OUTROS';
  }, [funcionarios]);

  const [gestorTurmaFilter, setGestorTurmaFilter] = useState('TODOS');
  const [gestorTurnoFilter, setGestorTurnoFilter] = useState('TODOS');

  // Funcionários filtrados para gestor: ordem alfabética + filtros
  const gestorFuncionariosFiltrados = useMemo(() => {
    let result = funcionarios.filter(f => {
      const sitNome = f.situacao?.nome?.toUpperCase() || '';
      return sitNome !== 'DEMISSÃO' && sitNome !== 'PED. DEMISSÃO';
    });

    if (gestorGrupo === 'SOPRO') {
      if (gestorTurmaFilter !== 'TODOS') {
        result = result.filter(f => f.turma === gestorTurmaFilter);
      }
    } else if (gestorGrupo === 'DECORACAO') {
      if (gestorTurnoFilter !== 'TODOS') {
        const setorNomeUpper = gestorTurnoFilter.toUpperCase();
        result = result.filter(f => {
          const nome = f.setor?.nome?.toUpperCase() || '';
          return nome.includes(setorNomeUpper);
        });
      }
      if (gestorTurmaFilter !== 'TODOS') {
        result = result.filter(f => f.turma === gestorTurmaFilter);
      }
    }

    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      result = result.filter(f =>
        f.nome_completo.toLowerCase().includes(s) ||
        f.matricula?.toLowerCase().includes(s)
      );
    }

    return result.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  }, [funcionarios, gestorGrupo, gestorTurmaFilter, gestorTurnoFilter, debouncedSearch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Vista do Gestor (logado, não admin) ──────────────────────────────────────

  if (isGestor) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="page-title">FUNCIONÁRIOS</h1>
            <p className="page-description">CLIQUE EM UM FUNCIONÁRIO PARA EDITAR A TURMA</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportarFuncionariosDialog funcionarios={funcionarios} setores={setores} situacoes={todasSituacoes} />
          </div>
        </div>

        <Tabs defaultValue="lista">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="lista">LISTA</TabsTrigger>
            <TabsTrigger value="temporarios" className="gap-1">
              <Clock className="h-3 w-3" />
              TEMPORÁRIOS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lista" className="mt-4 space-y-4">
            {/* Busca */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou matrícula..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-8"
              />
              {search && (
                <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Filtros por turma/turno */}
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {gestorGrupo === 'SOPRO' && (
                <>
                  {['TODOS', '1A', '1B', '2A', '2B'].map(t => (
                    <Button
                      key={t}
                      size="sm"
                      variant={gestorTurmaFilter === t ? 'default' : 'outline'}
                      onClick={() => setGestorTurmaFilter(t)}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      {t}
                    </Button>
                  ))}
                </>
              )}
              {gestorGrupo === 'DECORACAO' && (
                <>
                  <span className="text-xs font-bold text-muted-foreground">TURNO:</span>
                  {['TODOS', 'DIA', 'NOITE'].map(t => (
                    <Button
                      key={t}
                      size="sm"
                      variant={gestorTurnoFilter === t ? 'default' : 'outline'}
                      onClick={() => setGestorTurnoFilter(t)}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      {t}
                    </Button>
                  ))}
                  <span className="text-xs font-bold text-muted-foreground ml-2">TURMA:</span>
                  {['TODOS', 'T1', 'T2'].map(t => (
                    <Button
                      key={t}
                      size="sm"
                      variant={gestorTurmaFilter === t ? 'default' : 'outline'}
                      onClick={() => setGestorTurmaFilter(t)}
                      className="h-8 px-3 text-xs font-bold"
                    >
                      {t}
                    </Button>
                  ))}
                </>
              )}
            </div>

            {/* Lista única em ordem alfabética */}
            <div className="rounded-lg border bg-card overflow-x-auto">
              <table className="data-table text-xs w-full">
                <thead>
                  <tr>
                    <th className="w-[80px]">MATRÍCULA</th>
                    <th>NOME</th>
                    <th className="w-[130px]">SETOR</th>
                    <th className="w-[100px]">TURMA</th>
                    <th className="w-[120px]">SITUAÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {gestorFuncionariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum funcionário encontrado</p>
                      </td>
                    </tr>
                  ) : (
                    gestorFuncionariosFiltrados.map(func => {
                      const sitNome = func.situacao?.nome?.toUpperCase() || '';
                      const isAtivoOuFerias = sitNome === 'ATIVO' || sitNome === 'FÉRIAS';
                      return (
                        <tr
                          key={func.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => openEdit(func)}
                        >
                          <td className="text-muted-foreground">{func.matricula || '-'}</td>
                          <td className="font-medium">{func.nome_completo}</td>
                          <td className="text-xs text-muted-foreground">{func.setor?.nome}</td>
                          <td>{func.turma || '-'}</td>
                          <td>
                            <Badge
                              className="text-white border-0 text-[10px]"
                              style={{ backgroundColor: isAtivoOuFerias ? 'hsl(var(--primary))' : 'hsl(var(--warning))' }}
                            >
                              {func.situacao?.nome}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-sm text-muted-foreground">
              Total: {gestorFuncionariosFiltrados.length} funcionário(s)
            </div>
          </TabsContent>

          <TabsContent value="temporarios" className="mt-4">
            <TemporariosTab funcionarios={funcionarios} userRole={userRole} isRHMode={isRHMode} />
          </TabsContent>
        </Tabs>

        {/* Dialog edição turma (gestor) */}
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>EDITAR TURMA — {editingFuncionario?.nome_completo}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
                <p><strong>MATRÍCULA:</strong> {editingFuncionario?.matricula || 'TEMP'}</p>
                <p><strong>SETOR:</strong> {editingFuncionario?.setor?.nome}</p>
                <p><strong>SITUAÇÃO:</strong> {editingFuncionario?.situacao?.nome}</p>
              </div>
	              <div className="space-y-2">
	                <Label htmlFor="turma">TURMA</Label>
	                <Select value={turma || 'sem_turma'} onValueChange={(v) => setTurma(v === 'sem_turma' ? '' : v)}>
	                  <SelectTrigger>
	                    <SelectValue placeholder="Selecione a turma" />
	                  </SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="sem_turma">SEM TURMA</SelectItem>
	                    {getTurmasPermitidasPorSetor(editingFuncionario?.setor).map((opcao) => (
	                      <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
	                    ))}
	                  </SelectContent>
	                </Select>
	              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>CANCELAR</Button>
                <Button type="submit" disabled={updateFuncionario.isPending}>SALVAR TURMA</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Vista do Admin / RH ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="page-title">FUNCIONÁRIOS</h1>
            <p className="page-description">
              {podeEditarFuncionarios ? 'CLIQUE EM UM FUNCIONÁRIO PARA EDITAR' : 'VISUALIZE E PESQUISE OS FUNCIONÁRIOS'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <Button onClick={openNew} className="h-10 gap-2" disabled={!podeEditarFuncionarios}>
              <Plus className="h-4 w-4" />
              NOVO FUNCIONÁRIO
            </Button>
            {podeEditarFuncionarios && <TrocaUnificadaDialog funcionarios={funcionarios} />}
            {isAdmin && (
              <Button className="h-10" variant="outline" onClick={() => setImportarTurmasOpen(true)}>
                <Upload className="h-4 w-4 mr-1" />
                TURMAS
              </Button>
            )}
            {podeEditarFuncionarios && <ZerarBaseDialog />}
            <ExportarFuncionariosDialog funcionarios={funcionarios} setores={setores} situacoes={todasSituacoes} />
            {podeEditarFuncionarios && <ImportarFuncionarios setores={setores} situacoes={todasSituacoes} />}
          </div>
        </div>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList className="h-auto flex-wrap rounded-lg bg-muted p-1">
          <TabsTrigger value="lista">LISTA</TabsTrigger>
          <TabsTrigger value="temporarios" className="gap-1">
            <Clock className="h-3 w-3" />
            TEMPORÁRIOS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filtros
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.5fr)_minmax(220px,1fr)_160px_160px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou matricula..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-10 pl-9 pr-8"
                />
                {search && (
                  <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <Select value={situacaoFilter} onValueChange={setSituacaoFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Situacao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas as situacoes</SelectItem>
                  {todasSituacoes.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input type="date" value={admissaoInicioFilter} onChange={e => setAdmissaoInicioFilter(e.target.value)} title="Admissao de" className="h-10" />
              <Input type="date" value={admissaoFimFilter} onChange={e => setAdmissaoFimFilter(e.target.value)} title="Admissao ate" className="h-10" />
            </div>
          </div>

          {/* Filtro por grupo (SOPRO / DECORACAO) + Turma */}

          {isAdmin && (
            <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
              {/* Linha 1: Grupos */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-14 shrink-0">GRUPO</span>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { key: 'TODOS', label: 'TODOS', count: funcionarios.filter(f => { const s = f.situacao?.nome?.toUpperCase() || ''; return s === 'ATIVO' || s === 'FÉRIAS'; }).length },
                    { key: 'SOPRO', label: 'SOPRO', count: funcionarios.filter(f => { const s = f.situacao?.nome?.toUpperCase() || ''; const g = ((f.setor as any)?.grupo || '').toUpperCase(); return (s === 'ATIVO' || s === 'FÉRIAS') && g.startsWith('SOPRO'); }).length },
                    { key: 'DECORACAO', label: 'DECORAÇÃO', count: funcionarios.filter(f => { const s = f.situacao?.nome?.toUpperCase() || ''; const g = ((f.setor as any)?.grupo || '').toUpperCase(); return (s === 'ATIVO' || s === 'FÉRIAS') && (g.startsWith('DECORAÇÃO') || g.startsWith('DECORACAO')); }).length },
                    { key: 'AJUSTAR_SITUACAO', label: 'AJUSTAR SITUACAO', count: funcionarios.filter(f => normalizarTextoSistema(f.situacao?.nome) === 'AJUSTAR SITUACAO').length },
                  ] as { key: 'TODOS' | 'SOPRO' | 'DECORACAO' | 'AJUSTAR_SITUACAO'; label: string; count: number }[]).map(g => {
                    const active = grupoFilter === g.key;
                    return (
                      <button
                        key={g.key}
                        onClick={() => { setGrupoFilter(g.key); setTurmaFilter('TODOS'); }}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold transition-colors border ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {g.label}
                        <span className={`text-[10px] font-normal tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {g.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Separador + Linha 2: Turmas */}
              {turmaOptions.length > 2 && (
                <>
                  <div className="border-t border-border/50" />
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-14 shrink-0 pt-0.5">TURMA</span>
                    <div className="flex flex-wrap gap-1.5">
                      {turmaOptions.map(([label, count]) => {
                        const active = turmaFilter === label;
                        return (
                          <button
                            key={label}
                            onClick={() => setTurmaFilter(label)}
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold transition-colors border ${
                              active
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                            }`}
                          >
                            {label}
                            <span className={`text-[10px] font-normal tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Filtro por turma (não-admin) */}
          {!isAdmin && turmaOptions.length > 2 && (
            <div className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-14 shrink-0 pt-0.5">TURMA</span>
                <div className="flex flex-wrap gap-1.5">
                  {turmaOptions.map(([label, count]) => {
                    const active = turmaFilter === label;
                    return (
                      <button
                        key={label}
                        onClick={() => setTurmaFilter(label)}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold transition-colors border ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {label}
                        <span className={`text-[10px] font-normal tabular-nums ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tabela */}
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="data-table text-xs">
                <thead>
                  <tr>
                    <th className="w-[80px]">Empresa</th>
                    <th className="w-[80px]">Matrícula</th>
                    <th className="max-w-[140px]">Nome</th>
                    <th className="w-[120px]">Setor</th>
                    <th className="w-[80px]">Turma</th>
                    <th className="w-[120px]">Situação</th>
                    <th className="w-[100px]">Admissão</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFuncionarios.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Nenhum funcionário encontrado</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFuncionarios.map(func => {
                      const situacaoNome = func.situacao?.nome?.toUpperCase() || '';
                      const isAtivoOuFerias = situacaoNome === 'ATIVO' || situacaoNome === 'FÉRIAS';
                      const temTransferencia = func.transferencia_programada;
                      return (
                        <tr
                          key={func.id}
                          className={podeEditarFuncionarios ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/50'}
                          onClick={() => podeEditarFuncionarios && openEdit(func)}
                        >
                          <td>{func.empresa}</td>
                          <td>{func.matricula || '-'}</td>
                          <td className="font-medium max-w-[140px] overflow-hidden">
                            <div className="flex items-center gap-1 truncate">
                              <span className="truncate">{func.nome_completo}</span>
                              {temTransferencia && (
                                <Badge variant="outline" className="bg-accent text-primary border-primary/30 text-[10px] px-1.5 py-0">
                                  <ArrowRightLeft className="h-3 w-3 mr-0.5" />
                                  TRANSF.
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap">{func.setor?.nome}</td>
                          <td>{func.turma || '-'}</td>
                          <td>
                            <Badge
                              className="text-white border-0"
                              style={{ backgroundColor: isAtivoOuFerias ? 'hsl(var(--primary))' : 'hsl(var(--warning))' }}
                            >
                              {func.situacao?.nome}
                            </Badge>
                          </td>
                          <td>
                            {func.data_admissao ? format(parseISO(func.data_admissao), 'dd/MM/yyyy') : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
            <span>Resultado da consulta</span>
            <span className="font-semibold text-foreground">{filteredFuncionarios.length} funcionario(s)</span>
          </div>
        </TabsContent>

        <TabsContent value="temporarios" className="mt-4">
          <TemporariosTab funcionarios={funcionarios} userRole={userRole} isRHMode={isRHMode} />
        </TabsContent>
      </Tabs>

      {/* Dialog Admin/RH */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-[650px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* Empresa e Matrícula */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={empresa} onValueChange={v => setEmpresa(v as EmpresaTipo)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBALPACK">GLOBALPACK</SelectItem>
                    <SelectItem value="G+P">G+P</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Número ou TEMP" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>CPF * (OBRIGATORIO PARA FUNCIONARIO ATUAL)</Label>
              <Input
                value={cpf}
                onChange={e => setCpf(formatarCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
              />
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do funcionário" required />
            </div>

            {/* Admissão e Cargo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Admissão</Label>
                <Input type="date" value={dataAdmissao} onChange={e => setDataAdmissao(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Cargo do funcionário" />
              </div>
            </div>

            {/* Setor e Turma — agora sempre visíveis para admin */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={setorId} onValueChange={setSetorId} required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {setoresAtivos.map(setor => (
                      <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
	              <div className="space-y-2">
	                <Label>Turma</Label>
	                <Select value={turma || 'sem_turma'} onValueChange={(v) => setTurma(v === 'sem_turma' ? '' : v)}>
	                  <SelectTrigger>
	                    <SelectValue placeholder="Selecione a turma" />
	                  </SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="sem_turma">SEM TURMA</SelectItem>
	                    {getTurmasPermitidasPorSetor(setoresAtivos.find(s => s.id === setorId)).map((opcao) => (
	                      <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
	                    ))}
	                  </SelectContent>
	                </Select>
	              </div>
            </div>

            {/* Situação e Sexo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Situação</Label>
                <Select value={situacaoId} onValueChange={setSituacaoId} required>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {situacoesAtivas.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={sexo} onValueChange={v => setSexo(v as SexoTipo)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campos condicionais situação */}
            <CamposSituacaoEspecial
              situacaoNome={situacoesAtivas.find(s => s.id === situacaoId)?.nome || ''}
              coberturaFuncionarioId={coberturaFuncionarioId}
              setCoberturaFuncionarioId={setCoberturaFuncionarioId}
              funcionariosParaCobertura={funcionarios.filter(f =>
                f.id !== editingFuncionario?.id &&
                f.situacao?.nome?.toUpperCase() === 'FÉRIAS'
              )}
              coberturaDataInicio={coberturaDataInicio}
              setCoberturaDataInicio={setCoberturaDataInicio}
              coberturaDataFim={coberturaDataFim}
              setCoberturaDataFim={setCoberturaDataFim}
              treinamentoSetorId={treinamentoSetorId}
              setTreinamentoSetorId={setTreinamentoSetorId}
              setoresDisponiveis={setoresAtivos}
              sumidoDesde={sumidoDesde}
              setSumidoDesde={setSumidoDesde}
            />

            {/* Transferência */}
            {editingFuncionario?.transferencia_programada && (
              <div className="rounded-lg border border-purple-300 bg-purple-50 p-3">
                <div className="flex items-center gap-2 text-purple-700">
                  <ArrowRightLeft className="h-4 w-4" />
                  <span className="font-medium">Transferência Programada</span>
                </div>
                <div className="mt-1 text-sm text-purple-600">
                  <p><strong>Data:</strong> {editingFuncionario.transferencia_data ? format(parseISO(editingFuncionario.transferencia_data), 'dd/MM/yyyy') : '-'}</p>
                  <p><strong>Setor destino:</strong> {setoresAtivos.find(s => s.id === editingFuncionario.transferencia_setor_id)?.nome || '-'}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Data de Demissão</Label>
              <Input type="date" value={dataDemissao} onChange={e => setDataDemissao(e.target.value)} />
            </div>

            <div className="flex justify-between pt-4 flex-wrap gap-2">
              <div className="flex gap-2 flex-wrap">
                {editingFuncionario && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir <strong>{editingFuncionario?.nome_completo}</strong>?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            if (editingFuncionario) {
                              const dadosAnteriores = formatarDadosFuncionario(
                                editingFuncionario as unknown as Record<string, unknown>,
                                setoresAtivos,
                                situacoesAtivas
                              );
                              await deleteFuncionario.mutateAsync(editingFuncionario.id);
                              await registrarHistorico.mutateAsync({
                                tabela: 'funcionarios',
                                operacao: 'DELETE',
                                registro_id: editingFuncionario.id,
                                dados_anteriores: dadosAnteriores,
                                dados_novos: null,
                              });
                              setDialogOpen(false);
                              resetForm();
                            }
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {editingFuncionario && (
                  <Button type="button" variant="secondary" size="sm" onClick={() => toast.info('Use o botão "Troca de Setor" no cabeçalho da página')}>
                    <ArrowRightLeft className="h-4 w-4 mr-1" />
                    Transferência
                  </Button>
                )}

                {editingFuncionario && (() => {
                  const sitNome = editingFuncionario.situacao?.nome?.toUpperCase() || '';
                  const isPrevisao = sitNome.includes('PREVISÃO') || sitNome.includes('PREVISAO');
                  if (isPrevisao) return null;
                  const sitPrevisao = situacoesAtivas.find(s => {
                    const n = s.nome.toUpperCase();
                    return n.includes('PREVISÃO') || n.includes('PREVISAO');
                  });
                  if (!sitPrevisao) return null;
                  return (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="text-amber-600 border-amber-300 hover:bg-amber-50">
                          <Undo2 className="h-4 w-4 mr-1" />
                          Retornar à Previsão
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Retornar à Previsão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja retornar <strong>{editingFuncionario.nome_completo}</strong> para a situação <strong>PREVISÃO</strong>?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              try {
                              await updateFuncionario.mutateAsync({ id: editingFuncionario.id, situacao_id: sitPrevisao.id });
                                // Excluir registros de treinamento do funcionário
                                await supabase
                                  .from('treinamentos_previsao')
                                  .delete()
                                  .eq('funcionario_id', editingFuncionario.id);
                                await registrarHistorico.mutateAsync({
                                  tabela: 'funcionarios',
                                  operacao: 'UPDATE',
                                  registro_id: editingFuncionario.id,
                                  dados_anteriores: { nome: editingFuncionario.nome_completo, situacao: editingFuncionario.situacao?.nome } as Record<string, any>,
                                  dados_novos: { nome: editingFuncionario.nome_completo, situacao: 'PREVISÃO' } as Record<string, any>,
                                });
                                toast.success(`${editingFuncionario.nome_completo} retornado à PREVISÃO (treinamento excluído)`);
                                setDialogOpen(false);
                                resetForm();
                              } catch (err: any) {
                                toast.error(`Erro: ${err.message}`);
                              }
                            }}
                            className="bg-amber-600 text-white hover:bg-amber-700"
                          >
                            Confirmar Retorno
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  );
                })()}
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateFuncionario.isPending || createFuncionario.isPending}>
                  {editingFuncionario ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ImportarTurmasDialog open={importarTurmasOpen} onOpenChange={setImportarTurmasOpen} onSuccess={() => setImportarTurmasOpen(false)} />

      {/* Dialog de prompt para criar registro de demissão */}
      <AlertDialog open={demissaoPromptOpen} onOpenChange={setDemissaoPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar no Controle de Demissões?</AlertDialogTitle>
            <AlertDialogDescription>
              A situação de <strong>{demissaoPromptData?.funcionarioNome}</strong> foi alterada para{' '}
              <strong>{demissaoPromptData?.isPedido ? 'PED. DEMISSÃO' : 'DEMISSÃO'}</strong>.
              <br /><br />
              Deseja também criar um registro no <strong>Controle de Demissões</strong> com notificação para os gestores?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, apenas alterar situação</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!demissaoPromptData) return;
                try {
                  const hoje = new Date().toISOString().split('T')[0];
                  const situacaoPedDemissao = todasSituacoes.find(s => s.nome.toUpperCase() === 'PED. DEMISSÃO');
                  
                  await createDemissao.mutateAsync({
                    funcionario_id: demissaoPromptData.funcionarioId,
                    tipo_desligamento: demissaoPromptData.isPedido ? 'Pedido de Demissão' : undefined,
                    data_prevista: hoje,
                    setor_nome: demissaoPromptData.setorNome,
                    criado_por_nome: 'Sistema (via cadastro)',
                    funcionario_nome: demissaoPromptData.funcionarioNome || undefined,
                    skipSituacaoUpdate: true,
                    situacaoPedidoDemissaoId: situacaoPedDemissao?.id,
                  });
                  toast.success('Registro de demissão criado e gestores notificados!');
                } catch {
                  toast.error('Erro ao criar registro de demissão');
                }
                setDemissaoPromptData(null);
              }}
            >
              Sim, registrar e notificar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
