import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit, Search, Download, CheckCircle, XCircle, UserCheck, Clock, Upload, Send } from 'lucide-react';
import { ImportarAgencia } from '@/components/agencia/ImportarAgencia';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';

interface IntegracaoAgencia {
  id: string;
  nome_completo: string | null;
  setor: string | null;
  funcao: string | null;
  telefone: string | null;
  cpf: string | null;
  sexo: string | null;
  indicacao: string | null;
  residencia_fretado: string | null;
  ponto_referencia: string | null;
  camisa: string | null;
  calca: string | null;
  sapato: string | null;
  oculos: string | null;
  data_integracao: string | null;
  criado_por: string | null;
  created_at: string;
  compareceu: boolean | null;
  aprovado: boolean | null;
}

const camposVazios = {
  nome_completo: '',
  setor: '',
  funcao: '',
  telefone: '',
  cpf: '',
  sexo: '',
  indicacao: '',
  residencia_fretado: '',
  ponto_referencia: '',
  camisa: '',
  calca: '',
  sapato: '',
  oculos: '',
  data_integracao: '',
};

export default function Agencia() {
  const { isAdmin } = useAuth();
  const { usuarioAtual } = useUsuario();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editando, setEditando] = useState<IntegracaoAgencia | null>(null);
  const [form, setForm] = useState(camposVazios);
  const [busca, setBusca] = useState('');
  const [candidatoSelecionado, setCandidatoSelecionado] = useState<IntegracaoAgencia | null>(null);
  const [etapaDialog, setEtapaDialog] = useState<'compareceu' | 'aprovado' | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'presentes' | 'aguardando' | 'nao_compareceu'>('todos');
  const [abaAtiva, setAbaAtiva] = useState('integracao');

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['integracoes_agencia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integracoes_agencia')
        .select('*')
        .order('nome_completo', { ascending: true });
      if (error) throw error;
      return data as IntegracaoAgencia[];
    },
  });

  const salvarMutation = useMutation({
    mutationFn: async (dados: typeof camposVazios & { id?: string }) => {
      const payload = {
        ...dados,
        data_integracao: dados.data_integracao || null,
        criado_por: usuarioAtual?.nome || 'SISTEMA',
      };
      if (dados.id) {
        const { error } = await supabase.from('integracoes_agencia').update(payload).eq('id', dados.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('integracoes_agencia').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes_agencia'] });
      toast({ title: editando ? 'REGISTRO ATUALIZADO' : 'REGISTRO CRIADO' });
      setDialogOpen(false);
      setEditando(null);
      setForm(camposVazios);
    },
    onError: () => toast({ title: 'ERRO AO SALVAR', variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, campo, valor }: { id: string; campo: 'compareceu' | 'aprovado'; valor: boolean }) => {
      const update: Record<string, boolean | null> = { [campo]: valor };
      // Se não compareceu, aprovado fica null
      if (campo === 'compareceu' && !valor) {
        update.aprovado = null;
      }
      const { error } = await supabase.from('integracoes_agencia').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes_agencia'] });
      toast({ title: 'STATUS ATUALIZADO' });
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('integracoes_agencia').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integracoes_agencia'] });
      toast({ title: 'REGISTRO EXCLUÍDO' });
    },
  });

  const filtrados = useMemo(() => {
    let lista = registros;
    // Filtro de busca
    if (busca) {
      const termo = busca.toUpperCase();
      lista = lista.filter(r =>
        r.nome_completo?.toUpperCase().includes(termo) ||
        r.setor?.toUpperCase().includes(termo) ||
        r.cpf?.includes(termo)
      );
    }
    // Filtro de status
    if (filtroStatus === 'presentes') lista = lista.filter(r => r.compareceu === true);
    else if (filtroStatus === 'aguardando') lista = lista.filter(r => r.compareceu === true && r.aprovado === null);
    else if (filtroStatus === 'nao_compareceu') lista = lista.filter(r => r.compareceu === false);
    return lista;
  }, [registros, busca, filtroStatus]);

  const aprovados = useMemo(() => {
    let lista = registros.filter(r => r.aprovado === true);
    if (busca) {
      const termo = busca.toUpperCase();
      lista = lista.filter(r =>
        r.nome_completo?.toUpperCase().includes(termo) ||
        r.setor?.toUpperCase().includes(termo) ||
        r.cpf?.includes(termo)
      );
    }
    return lista;
  }, [registros, busca]);

  const abrirEditar = (reg: IntegracaoAgencia) => {
    setEditando(reg);
    setForm({
      nome_completo: reg.nome_completo || '',
      setor: reg.setor || '',
      funcao: reg.funcao || '',
      telefone: reg.telefone || '',
      cpf: reg.cpf || '',
      sexo: reg.sexo || '',
      indicacao: reg.indicacao || '',
      residencia_fretado: reg.residencia_fretado || '',
      ponto_referencia: reg.ponto_referencia || '',
      camisa: reg.camisa || '',
      calca: reg.calca || '',
      sapato: reg.sapato || '',
      oculos: reg.oculos || '',
      data_integracao: reg.data_integracao || '',
    });
    setDialogOpen(true);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm(camposVazios);
    setDialogOpen(true);
  };

  const clicarLinha = async (reg: IntegracaoAgencia) => {
    // Toggle compareceu diretamente ao clicar
    const novoValor = reg.compareceu === true ? null : true;
    const update: Record<string, boolean | null> = { compareceu: novoValor };
    if (!novoValor) {
      update.aprovado = null;
    }
    const { error } = await supabase.from('integracoes_agencia').update(update).eq('id', reg.id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['integracoes_agencia'] });
      toast({ title: novoValor ? 'MARCADO COMO PRESENTE' : 'PRESENÇA REMOVIDA' });
    }
  };

  const fecharDia = async () => {
    const pendentes = registros.filter(r => r.compareceu === null);
    if (pendentes.length === 0) {
      toast({ title: 'TODOS JÁ FORAM PROCESSADOS' });
      return;
    }
    if (!confirm(`MARCAR ${pendentes.length} CANDIDATO(S) COMO "NÃO COMPARECEU"?`)) return;
    for (const p of pendentes) {
      await supabase.from('integracoes_agencia').update({ compareceu: false }).eq('id', p.id);
    }
    queryClient.invalidateQueries({ queryKey: ['integracoes_agencia'] });
    toast({ title: `${pendentes.length} MARCADOS COMO NÃO COMPARECEU` });
  };

  const abrirAprovado = (reg: IntegracaoAgencia) => {
    if (!reg.compareceu) return;
    setCandidatoSelecionado(reg);
    setEtapaDialog('aprovado');
  };

  const responderAprovado = (valor: boolean) => {
    if (!candidatoSelecionado) return;
    statusMutation.mutate(
      { id: candidatoSelecionado.id, campo: 'aprovado', valor },
      {
        onSuccess: () => {
          setEtapaDialog(null);
          setCandidatoSelecionado(null);
        },
      }
    );
  };

  const getStatusBadge = (reg: IntegracaoAgencia) => {
    if (reg.compareceu === null) {
      return <Badge variant="secondary" className="text-[10px]"><Clock className="h-3 w-3 mr-1" />PENDENTE</Badge>;
    }
    if (!reg.compareceu) {
      return <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3 mr-1" />NÃO COMPARECEU</Badge>;
    }
    if (reg.aprovado === null) {
      return <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-700"><UserCheck className="h-3 w-3 mr-1" />PRESENTE - AGUARDANDO</Badge>;
    }
    if (reg.aprovado) {
      return <Badge className="text-[10px] bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />APROVADO</Badge>;
    }
    return <Badge variant="destructive" className="text-[10px]"><XCircle className="h-3 w-3 mr-1" />NÃO APROVADO</Badge>;
  };

  const baixarModelo = async () => {
    const XLSX = await import('xlsx-js-style');
    const modelo = [
      {
        'NOME COMPLETO': '',
        'SETOR': '',
        'FUNÇÃO': '',
        'TELEFONE': '',
        'CPF': '',
        'SEXO': '',
        'INDICAÇÃO': '',
        'RESIDÊNCIA (FRETADO)': '',
        'PONTO REFERÊNCIA': '',
        'CAMISA': '',
        'CALÇA': '',
        'SAPATO': '',
        'ÓCULOS': '',
        'DATA INTEGRAÇÃO': '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(modelo);
    // Ajustar largura das colunas
    ws['!cols'] = [
      { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MODELO');
    XLSX.writeFile(wb, 'modelo_agencia_integracao.xlsx');
    toast({ title: 'MODELO BAIXADO COM SUCESSO' });
  };

  const exportarExcel = async () => {
    const XLSX = await import('xlsx-js-style');
    const dados = filtrados.map(r => ({
      'NOME COMPLETO': r.nome_completo || '',
      'SETOR': r.setor || '',
      'FUNÇÃO': r.funcao || '',
      'TELEFONE': r.telefone || '',
      'CPF': r.cpf || '',
      'SEXO': r.sexo || '',
      'INDICAÇÃO': r.indicacao || '',
      'RESIDÊNCIA (FRETADO)': r.residencia_fretado || '',
      'PONTO REFERÊNCIA': r.ponto_referencia || '',
      'CAMISA': r.camisa || '',
      'CALÇA': r.calca || '',
      'SAPATO': r.sapato || '',
      'ÓCULOS': r.oculos || '',
      'DATA INTEGRAÇÃO': r.data_integracao ? format(new Date(r.data_integracao + 'T12:00:00'), 'dd/MM/yyyy') : '',
      'COMPARECEU': r.compareceu === null ? 'PENDENTE' : r.compareceu ? 'SIM' : 'NÃO',
      'APROVADO': r.aprovado === null ? '-' : r.aprovado ? 'SIM' : 'NÃO',
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AGÊNCIA');
    XLSX.writeFile(wb, `agencia_integracao_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const totalPresentes = registros.filter(r => r.compareceu === true).length;
  const totalAprovados = registros.filter(r => r.aprovado === true).length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AGÊNCIA - INTEGRAÇÃO</h1>
          <p className="text-muted-foreground text-sm">CADASTRO DE PESSOAL PARA INTEGRAÇÃO</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={baixarModelo}>
            <Download className="h-4 w-4 mr-1" /> MODELO
          </Button>
          <ImportarAgencia criado_por={usuarioAtual?.nome || 'SISTEMA'} />
          <Button variant="outline" size="sm" onClick={exportarExcel}>
            <Download className="h-4 w-4 mr-1" /> EXPORTAR
          </Button>
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-1" /> NOVO REGISTRO
          </Button>
          <Button size="sm" variant="destructive" onClick={fecharDia} disabled={registros.filter(r => r.compareceu === null).length === 0}>
            <XCircle className="h-4 w-4 mr-1" /> FECHAR DIA
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
        <TabsList>
          <TabsTrigger value="integracao">INTEGRAÇÃO</TabsTrigger>
          <TabsTrigger value="aprovados">APROVADOS ({registros.filter(r => r.aprovado === true).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="integracao" className="space-y-4">
          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant={filtroStatus === 'todos' ? 'default' : 'outline'} size="sm" onClick={() => setFiltroStatus('todos')}>TODOS ({registros.length})</Button>
            <Button variant={filtroStatus === 'presentes' ? 'default' : 'outline'} size="sm" onClick={() => setFiltroStatus('presentes')}>PRESENTES ({registros.filter(r => r.compareceu === true).length})</Button>
            <Button variant={filtroStatus === 'aguardando' ? 'default' : 'outline'} size="sm" onClick={() => setFiltroStatus('aguardando')}>AGUARDANDO ({registros.filter(r => r.compareceu === true && r.aprovado === null).length})</Button>
            <Button variant={filtroStatus === 'nao_compareceu' ? 'default' : 'outline'} size="sm" onClick={() => setFiltroStatus('nao_compareceu')}>NÃO COMPARECEU ({registros.filter(r => r.compareceu === false).length})</Button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="BUSCAR POR NOME, SETOR OU CPF..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-sm" />
            <Badge variant="secondary">{filtrados.length} REGISTROS</Badge>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NOME</TableHead>
                    <TableHead>SETOR</TableHead>
                    <TableHead>FUNÇÃO</TableHead>
                    <TableHead>TELEFONE</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>SEXO</TableHead>
                    <TableHead>DATA INT.</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8">CARREGANDO...</TableCell></TableRow>
                  ) : filtrados.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">NENHUM REGISTRO ENCONTRADO</TableCell></TableRow>
                  ) : (
                    filtrados.map(r => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => clicarLinha(r)}>
                        <TableCell className="font-medium whitespace-nowrap">{r.nome_completo || '-'}</TableCell>
                        <TableCell>{r.setor || '-'}</TableCell>
                        <TableCell>{r.funcao || '-'}</TableCell>
                        <TableCell>{r.telefone || '-'}</TableCell>
                        <TableCell>{r.cpf || '-'}</TableCell>
                        <TableCell>{r.sexo || '-'}</TableCell>
                        <TableCell>{r.data_integracao ? format(new Date(r.data_integracao + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell onClick={e => { e.stopPropagation(); if (r.compareceu) abrirAprovado(r); }}>{getStatusBadge(r)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => abrirEditar(r)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                              if (confirm('EXCLUIR ESTE REGISTRO?')) excluirMutation.mutate(r.id);
                            }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aprovados" className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="BUSCAR POR NOME, SETOR OU CPF..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-sm" />
            <Badge variant="secondary">{aprovados.length} APROVADOS</Badge>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NOME</TableHead>
                    <TableHead>SETOR</TableHead>
                    <TableHead>FUNÇÃO</TableHead>
                    <TableHead>TELEFONE</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>SEXO</TableHead>
                    <TableHead>DATA INT.</TableHead>
                    <TableHead>AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aprovados.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">NENHUM APROVADO AINDA</TableCell></TableRow>
                  ) : (
                    aprovados.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium whitespace-nowrap">{r.nome_completo || '-'}</TableCell>
                        <TableCell>{r.setor || '-'}</TableCell>
                        <TableCell>{r.funcao || '-'}</TableCell>
                        <TableCell>{r.telefone || '-'}</TableCell>
                        <TableCell>{r.cpf || '-'}</TableCell>
                        <TableCell>{r.sexo || '-'}</TableCell>
                        <TableCell>{r.data_integracao ? format(new Date(r.data_integracao + 'T12:00:00'), 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => abrirEditar(r)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => navigate('/previsao-admissao')}>
                              <Send className="h-4 w-4 mr-1" /> PREVISÃO
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de status - Aprovado */}
      <Dialog open={etapaDialog === 'aprovado'} onOpenChange={(open) => { if (!open) { setEtapaDialog(null); setCandidatoSelecionado(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>FOI APROVADO NA INTEGRAÇÃO?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">CANDIDATO: <strong>{candidatoSelecionado?.nome_completo || '-'}</strong></p>
          <div className="flex gap-3 justify-center mt-4">
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => responderAprovado(true)} disabled={statusMutation.isPending}>
              <CheckCircle className="h-5 w-5 mr-2" /> APROVADO
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => responderAprovado(false)} disabled={statusMutation.isPending}>
              <XCircle className="h-5 w-5 mr-2" /> NÃO APROVADO
            </Button>
          </div>
          <div className="flex justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => { setEtapaDialog(null); setCandidatoSelecionado(null); if (candidatoSelecionado) abrirEditar(candidatoSelecionado); }}>
              <Edit className="h-4 w-4 mr-1" /> EDITAR DADOS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog form edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'EDITAR REGISTRO' : 'NOVO REGISTRO - INTEGRAÇÃO'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>NOME COMPLETO</Label><Input value={form.nome_completo} onChange={e => setForm(p => ({ ...p, nome_completo: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>SETOR</Label><Input value={form.setor} onChange={e => setForm(p => ({ ...p, setor: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>FUNÇÃO</Label><Input value={form.funcao} onChange={e => setForm(p => ({ ...p, funcao: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>TELEFONE</Label><Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>SEXO</Label>
              <Select value={form.sexo} onValueChange={v => setForm(p => ({ ...p, sexo: v }))}>
                <SelectTrigger><SelectValue placeholder="SELECIONE" /></SelectTrigger>
                <SelectContent><SelectItem value="MASCULINO">MASCULINO</SelectItem><SelectItem value="FEMININO">FEMININO</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>INDICAÇÃO</Label><Input value={form.indicacao} onChange={e => setForm(p => ({ ...p, indicacao: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>RESIDÊNCIA (FRETADO)</Label><Input value={form.residencia_fretado} onChange={e => setForm(p => ({ ...p, residencia_fretado: e.target.value }))} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>PONTO REFERÊNCIA</Label><Input value={form.ponto_referencia} onChange={e => setForm(p => ({ ...p, ponto_referencia: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>CAMISA</Label><Input value={form.camisa} onChange={e => setForm(p => ({ ...p, camisa: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>CALÇA</Label><Input value={form.calca} onChange={e => setForm(p => ({ ...p, calca: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>SAPATO</Label><Input value={form.sapato} onChange={e => setForm(p => ({ ...p, sapato: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>ÓCULOS</Label>
              <Select value={form.oculos} onValueChange={v => setForm(p => ({ ...p, oculos: v }))}>
                <SelectTrigger><SelectValue placeholder="SELECIONE" /></SelectTrigger>
                <SelectContent><SelectItem value="SIM">SIM</SelectItem><SelectItem value="NÃO">NÃO</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>DATA INTEGRAÇÃO</Label><Input type="date" value={form.data_integracao} onChange={e => setForm(p => ({ ...p, data_integracao: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>CANCELAR</Button>
            <Button onClick={() => salvarMutation.mutate({ ...form, id: editando?.id })} disabled={salvarMutation.isPending}>
              {salvarMutation.isPending ? 'SALVANDO...' : 'SALVAR'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
