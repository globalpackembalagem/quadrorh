import { useState, useMemo } from 'react';
import { Plus, Trash2, ArrowRightLeft, Users, TrendingDown, TrendingUp, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { MetricasTurmaCards } from '@/components/dashboard/MetricasTurmaCards';
import { useFuncionariosNoQuadro } from '@/hooks/useFuncionarios';
import { useQuadroPlanejado } from '@/hooks/useQuadroPlanejado';
import { useQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { useFuncionariosPrevisao } from '@/hooks/usePrevisoes';
import { useDemissoes } from '@/hooks/useDemissoes';
import { useSetores } from '@/hooks/useSetores';
import { TrocaTurno } from '@/hooks/useTrocasTurno';
import { Funcionario } from '@/types/database';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AdmissaoSimulada {
  id: string;
  setor_id: string;
  turma: string;
  quantidade: number;
}

interface SimulacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trocasPendentes: TrocaTurno[];
  idsSimulando: Set<string>;
  setIdsSimulando: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export function SimulacaoModal({
  open,
  onOpenChange,
  trocasPendentes,
  idsSimulando,
  setIdsSimulando,
}: SimulacaoModalProps) {
  const { data: funcionariosQuadro = [] } = useFuncionariosNoQuadro();
  const { data: quadroPlanejadoSopro = [] } = useQuadroPlanejado('SOPRO');
  const { data: quadroDecoracao = [] } = useQuadroDecoracao();
  const { data: funcionariosPrevisao = [] } = useFuncionariosPrevisao();
  const { data: demissoes = [] } = useDemissoes();
  const { data: setores = [] } = useSetores();

  const [admissoesSimuladas, setAdmissoesSimuladas] = useState<AdmissaoSimulada[]>([]);
  const [novoSetor, setNovoSetor] = useState('');
  const [novaTurma, setNovaTurma] = useState('');
  const [novaQtd, setNovaQtd] = useState('1');
  const [secaoAberta, setSecaoAberta] = useState<Record<string, boolean>>({
    transferencias: true,
    demissoes: false,
    previsao: false,
    admissao: false,
  });

  const setoresAtivos = setores.filter(s => s.ativo);

  const trocasSimuladas = useMemo(() => {
    return trocasPendentes.filter(t => idsSimulando.has(t.id));
  }, [trocasPendentes, idsSimulando]);

  const demissoesPendentes = useMemo(() => {
    return demissoes.filter(d => !d.realizado);
  }, [demissoes]);

  const funcionariosComTrocas = useMemo(() => {
    if (trocasSimuladas.length === 0) return funcionariosQuadro;
    return funcionariosQuadro.map(f => {
      const troca = trocasSimuladas.find(t => t.funcionario_id === f.id);
      if (!troca) return f;
      const setorDestino = funcionariosQuadro.find(func => func.setor_id === troca.setor_destino_id)?.setor;
      const novoSetor = setorDestino || {
        id: troca.setor_destino_id,
        nome: troca.setor_destino?.nome || 'SETOR DESTINO',
        ativo: true, conta_no_quadro: true, grupo: null, created_at: '', updated_at: '',
      };
      return { ...f, setor_id: troca.setor_destino_id, setor: novoSetor, turma: troca.turma_destino || f.turma } as Funcionario;
    });
  }, [funcionariosQuadro, trocasSimuladas]);

  const funcionariosFinais = useMemo(() => {
    const extras: Funcionario[] = [];
    admissoesSimuladas.forEach(a => {
      const setor = setores.find(s => s.id === a.setor_id);
      for (let i = 0; i < a.quantidade; i++) {
        extras.push({
          id: `sim-${a.id}-${i}`,
          nome_completo: `ADMISSÃO SIMULADA`,
          sexo: 'masculino',
          setor_id: a.setor_id,
          situacao_id: '',
          observacoes: null,
          empresa: 'GLOBALPACK',
          matricula: null,
          data_admissao: null,
          cargo: null,
          centro_custo: null,
          turma: a.turma || null,
          data_demissao: null,
          cobertura_funcionario_id: null,
          treinamento_setor_id: null,
          sumido_desde: null,
          transferencia_programada: false,
          transferencia_data: null,
          transferencia_setor_id: null,
          nao_e_meu_funcionario: false,
          created_at: '',
          updated_at: '',
          setor: setor || undefined,
          situacao: { id: '', nome: 'ATIVO', conta_no_quadro: true, entra_no_ponto: true, ativa: true, created_at: '', updated_at: '' },
        } as Funcionario);
      }
    });
    return [...funcionariosComTrocas, ...extras];
  }, [funcionariosComTrocas, admissoesSimuladas, setores]);

  const funcionariosSopro = useMemo(() => {
    return funcionariosFinais.filter(f => {
      const grupo = f.setor?.grupo?.toUpperCase() || '';
      return grupo.startsWith('SOPRO');
    });
  }, [funcionariosFinais]);

  const funcionariosDecoracao = useMemo(() => {
    return funcionariosFinais.filter(f => {
      const grupo = f.setor?.grupo?.toUpperCase() || '';
      return grupo.includes('DECORAÇÃO') || grupo.includes('DECORACAO');
    });
  }, [funcionariosFinais]);

  const previsaoSopro = funcionariosPrevisao.filter(f => {
    const grupo = f.setor?.grupo?.toUpperCase() || '';
    return grupo.startsWith('SOPRO');
  });

  const previsaoDecoracao = funcionariosPrevisao.filter(f => {
    const grupo = f.setor?.grupo?.toUpperCase() || '';
    return grupo.includes('DECORAÇÃO') || grupo.includes('DECORACAO');
  });

  const handleAddAdmissao = () => {
    if (!novoSetor) return;
    setAdmissoesSimuladas(prev => [
      ...prev,
      { id: crypto.randomUUID(), setor_id: novoSetor, turma: novaTurma, quantidade: Math.max(1, parseInt(novaQtd) || 1) },
    ]);
    setNovoSetor('');
    setNovaTurma('');
    setNovaQtd('1');
  };

  const totalSimulacoes = trocasSimuladas.length + admissoesSimuladas.reduce((a, b) => a + b.quantidade, 0);

  const toggleSecao = (key: string) => {
    setSecaoAberta(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[95vw] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📊 SIMULAÇÃO DE QUADRO
          </DialogTitle>
          <DialogDescription>
            Simule o impacto de transferências, demissões, admissões no quadro
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* ===== RESUMO CARDS ===== */}
          <div className="flex flex-wrap gap-3">
            <Card className="flex-1 min-w-[130px]">
              <CardContent className="p-3 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground">TRANSFERÊNCIAS</p>
                  <p className="text-lg font-bold">{trocasSimuladas.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[130px]">
              <CardContent className="p-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-[10px] text-muted-foreground">DEMISSÕES</p>
                  <p className="text-lg font-bold">{demissoesPendentes.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[130px]">
              <CardContent className="p-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground">PREVISÕES</p>
                  <p className="text-lg font-bold">{funcionariosPrevisao.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1 min-w-[130px]">
              <CardContent className="p-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-[10px] text-muted-foreground">FICTÍCIAS</p>
                  <p className="text-lg font-bold">{admissoesSimuladas.reduce((a, b) => a + b.quantidade, 0)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ===== QUADRO SIMULADO (DASHBOARD) ===== */}
          {totalSimulacoes > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs">
              📊 SIMULAÇÃO ATIVA — {totalSimulacoes} ALTERAÇÃO(ÕES)
            </Badge>
          )}

          {trocasSimuladas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {trocasSimuladas.map(t => (
                <Badge key={t.id} variant="outline" className="text-[10px] py-1 px-2 bg-background">
                  {t.funcionario?.nome_completo?.toUpperCase()}
                  <ArrowRightLeft className="h-2.5 w-2.5 mx-1 text-primary" />
                  {t.setor_destino?.nome?.toUpperCase()}
                </Badge>
              ))}
            </div>
          )}

          {/* SOPRO */}
          {funcionariosSopro.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-muted-foreground">SOPRO</h3>
              <MetricasTurmaCards
                grupo="SOPRO"
                funcionarios={funcionariosSopro}
                quadroPlanejadoSopro={quadroPlanejadoSopro}
                funcionariosPrevisao={previsaoSopro}
              />
            </div>
          )}

          {/* DECORAÇÃO */}
          {funcionariosDecoracao.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-muted-foreground">DECORAÇÃO</h3>
              <MetricasTurmaCards
                grupo="DECORAÇÃO"
                funcionarios={funcionariosDecoracao}
                quadroPlanejadoDecoracao={quadroDecoracao}
                funcionariosPrevisao={previsaoDecoracao}
              />
            </div>
          )}

          {/* ===== SEÇÕES COLAPSÁVEIS ABAIXO ===== */}
          <div className="border-t pt-4 space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Dados para Simulação</h3>

            {/* TRANSFERÊNCIAS */}
            <Collapsible open={secaoAberta.transferencias} onOpenChange={() => toggleSecao('transferencias')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-9 text-xs font-bold px-3">
                  <span className="flex items-center gap-2">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
                    🔄 TRANSFERÊNCIAS PENDENTES ({trocasPendentes.length})
                  </span>
                  {secaoAberta.transferencias ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2 pl-2">
                {trocasPendentes.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-xs">Nenhuma pendente.</p>
                ) : (
                  <>
                    {trocasPendentes.map(t => {
                      const isSelected = idsSimulando.has(t.id);
                      return (
                        <Card
                          key={t.id}
                          className={`cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/10' : 'hover:bg-muted/50'}`}
                          onClick={() => {
                            setIdsSimulando(prev => {
                              const next = new Set(prev);
                              if (next.has(t.id)) next.delete(t.id);
                              else next.add(t.id);
                              return next;
                            });
                          }}
                        >
                          <CardContent className="p-2.5 flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 text-[10px] ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                              {isSelected && '✓'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs truncate">{t.funcionario?.nome_completo}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {t.setor_origem?.nome} → {t.setor_destino?.nome} {t.turma_destino ? `(${t.turma_destino})` : ''}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {idsSimulando.size > 0 && (
                      <Button size="sm" variant="outline" className="text-destructive text-[10px] h-7 gap-1" onClick={() => setIdsSimulando(new Set())}>
                        <Trash2 className="h-3 w-3" /> Limpar ({idsSimulando.size})
                      </Button>
                    )}
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* DEMISSÕES */}
            <Collapsible open={secaoAberta.demissoes} onOpenChange={() => toggleSecao('demissoes')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-9 text-xs font-bold px-3">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                    🔴 DEMISSÕES PENDENTES ({demissoesPendentes.length})
                  </span>
                  {secaoAberta.demissoes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 pl-2">
                {demissoesPendentes.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-xs">Nenhuma demissão pendente.</p>
                ) : (
                  <div className="space-y-1.5">
                    {demissoesPendentes.slice(0, 20).map(d => (
                      <div key={d.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/30">
                        <span className="text-destructive">●</span>
                        <span className="font-medium truncate flex-1">{d.funcionario?.nome_completo}</span>
                        <span className="text-muted-foreground text-[10px] shrink-0">{d.data_prevista}</span>
                      </div>
                    ))}
                    {demissoesPendentes.length > 20 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{demissoesPendentes.length - 20} demissões</p>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* PREVISÃO */}
            <Collapsible open={secaoAberta.previsao} onOpenChange={() => toggleSecao('previsao')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-9 text-xs font-bold px-3">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    🟢 PREVISÃO DE ADMISSÃO ({funcionariosPrevisao.length})
                  </span>
                  {secaoAberta.previsao ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 pl-2">
                {funcionariosPrevisao.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground text-xs">Nenhuma previsão.</p>
                ) : (
                  <div className="space-y-1.5">
                    {funcionariosPrevisao.slice(0, 20).map(f => (
                      <div key={f.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/30">
                        <span className="text-primary">●</span>
                        <span className="font-medium truncate flex-1">{f.nome_completo}</span>
                        <span className="text-muted-foreground text-[10px] shrink-0">{f.setor?.nome}</span>
                      </div>
                    ))}
                    {funcionariosPrevisao.length > 20 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{funcionariosPrevisao.length - 20} previsões</p>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* ADMISSÃO FICTÍCIA */}
            <Collapsible open={secaoAberta.admissao} onOpenChange={() => toggleSecao('admissao')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-9 text-xs font-bold px-3">
                  <span className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    ➕ ADMISSÃO FICTÍCIA ({admissoesSimuladas.reduce((a, b) => a + b.quantidade, 0)})
                  </span>
                  {secaoAberta.admissao ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 pl-2 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Setor</Label>
                    <Select value={novoSetor} onValueChange={setNovoSetor}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Setor" />
                      </SelectTrigger>
                      <SelectContent>
                        {setoresAtivos.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Turma</Label>
                    <Select value={novaTurma} onValueChange={setNovaTurma}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Turma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIA">DIA</SelectItem>
                        <SelectItem value="NOITE">NOITE</SelectItem>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="T1">T1</SelectItem>
                        <SelectItem value="T2">T2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Qtd</Label>
                    <Input type="number" min={1} max={50} value={novaQtd} onChange={(e) => setNovaQtd(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <Button size="sm" onClick={handleAddAdmissao} disabled={!novoSetor} className="gap-1 h-8 text-xs">
                    <Plus className="h-3 w-3" /> Adicionar
                  </Button>
                </div>

                {admissoesSimuladas.length > 0 && (
                  <div className="space-y-1.5">
                    {admissoesSimuladas.map(a => {
                      const setor = setores.find(s => s.id === a.setor_id);
                      return (
                        <div key={a.id} className="flex items-center justify-between px-2 py-1.5 rounded bg-muted/30 text-xs">
                          <span>{a.quantidade}x — {setor?.nome} {a.turma ? `(${a.turma})` : ''}</span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setAdmissoesSimuladas(prev => prev.filter(x => x.id !== a.id))}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                    <Button size="sm" variant="outline" className="text-destructive text-[10px] h-7 gap-1" onClick={() => setAdmissoesSimuladas([])}>
                      <Trash2 className="h-3 w-3" /> Limpar
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
