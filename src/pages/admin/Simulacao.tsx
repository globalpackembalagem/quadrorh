import { useState, useMemo } from 'react';
import { Plus, Trash2, ArrowRightLeft, Users, TrendingDown, TrendingUp, X, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useTrocasTurno, TrocaTurno } from '@/hooks/useTrocasTurno';
import { Funcionario } from '@/types/database';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AdmissaoSimulada {
  id: string;
  setor_id: string;
  turma: string;
  quantidade: number;
}

export default function Simulacao() {
  const { data: funcionariosQuadro = [] } = useFuncionariosNoQuadro();
  const { data: quadroPlanejadoSopro = [] } = useQuadroPlanejado('SOPRO');
  const { data: quadroDecoracao = [] } = useQuadroDecoracao();
  const { data: funcionariosPrevisao = [] } = useFuncionariosPrevisao();
  const { data: demissoes = [] } = useDemissoes();
  const { data: setores = [] } = useSetores();
  const { data: trocas = [] } = useTrocasTurno();

  const [admissoesSimuladas, setAdmissoesSimuladas] = useState<AdmissaoSimulada[]>([]);
  const [novoSetor, setNovoSetor] = useState('');
  const [novaTurma, setNovaTurma] = useState('');
  const [novaQtd, setNovaQtd] = useState('1');
  const [idsTransferenciasSimulando, setIdsTransferenciasSimulando] = useState<Set<string>>(new Set());
  const [idsDemissoesSimulando, setIdsDemissoesSimulando] = useState<Set<string>>(new Set());
  const [idsPrevisaoSimulando, setIdsPrevisaoSimulando] = useState<Set<string>>(new Set());
  const [secaoAberta, setSecaoAberta] = useState<Record<string, boolean>>({
    transferencias: true,
    demissoes: false,
    previsao: false,
    admissao: false,
  });

  const setoresAtivos = setores.filter(s => s.ativo);

  const trocasPendentes = useMemo(() => {
    return trocas.filter(t => !t.efetivada && t.status === 'pendente_rh');
  }, [trocas]);

  const trocasSimuladas = useMemo(() => {
    return trocasPendentes.filter(t => idsTransferenciasSimulando.has(t.id));
  }, [trocasPendentes, idsTransferenciasSimulando]);

  const demissoesPendentes = useMemo(() => {
    return demissoes.filter(d => !d.realizado);
  }, [demissoes]);

  const demissoesSimuladas = useMemo(() => {
    return demissoesPendentes.filter(d => idsDemissoesSimulando.has(d.id));
  }, [demissoesPendentes, idsDemissoesSimulando]);

  const previsaoSimulada = useMemo(() => {
    return funcionariosPrevisao.filter(f => idsPrevisaoSimulando.has(f.id));
  }, [funcionariosPrevisao, idsPrevisaoSimulando]);

  // Apply transfers
  const funcionariosComTrocas = useMemo(() => {
    if (trocasSimuladas.length === 0) return funcionariosQuadro;
    return funcionariosQuadro.map(f => {
      const troca = trocasSimuladas.find(t => t.funcionario_id === f.id);
      if (!troca) return f;
      const setorDestino = funcionariosQuadro.find(func => func.setor_id === troca.setor_destino_id)?.setor;
      const novoSetorObj = setorDestino || {
        id: troca.setor_destino_id,
        nome: troca.setor_destino?.nome || 'SETOR DESTINO',
        ativo: true, conta_no_quadro: true, grupo: null, created_at: '', updated_at: '',
      };
      return { ...f, setor_id: troca.setor_destino_id, setor: novoSetorObj, turma: troca.turma_destino || f.turma } as Funcionario;
    });
  }, [funcionariosQuadro, trocasSimuladas]);

  // Remove dismissed employees
  const funcionariosComDemissoes = useMemo(() => {
    if (demissoesSimuladas.length === 0) return funcionariosComTrocas;
    const demitidosIds = new Set(demissoesSimuladas.map(d => d.funcionario_id));
    return funcionariosComTrocas.filter(f => !demitidosIds.has(f.id));
  }, [funcionariosComTrocas, demissoesSimuladas]);

  // Add previsão employees
  const funcionariosComPrevisao = useMemo(() => {
    if (previsaoSimulada.length === 0) return funcionariosComDemissoes;
    // Previsão employees are already in the system with a "PREVISÃO" situation
    // We need to treat them as if they were active (conta_no_quadro = true)
    const previsaoIds = new Set(previsaoSimulada.map(f => f.id));
    const previsaoComoAtivos = previsaoSimulada.map(f => ({
      ...f,
      situacao: { ...f.situacao!, conta_no_quadro: true },
    }));
    // Add previsão as active (they may already be in the list but with conta_no_quadro=false)
    const semPrevisao = funcionariosComDemissoes.filter(f => !previsaoIds.has(f.id));
    return [...semPrevisao, ...previsaoComoAtivos];
  }, [funcionariosComDemissoes, previsaoSimulada]);

  // Add fictional admissions
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
    return [...funcionariosComPrevisao, ...extras];
  }, [funcionariosComPrevisao, admissoesSimuladas, setores]);

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

  const totalSimulacoes = trocasSimuladas.length + demissoesSimuladas.length + previsaoSimulada.length + admissoesSimuladas.reduce((a, b) => a + b.quantidade, 0);

  const toggleSecao = (key: string) => {
    setSecaoAberta(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTransferencia = (id: string) => {
    setIdsTransferenciasSimulando(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDemissao = (id: string) => {
    setIdsDemissoesSimulando(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePrevisao = (id: string) => {
    setIdsPrevisaoSimulando(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">📊 SIMULAÇÃO DE QUADRO</h1>
        <p className="page-description text-xs">
          Clique em SIMULAR nos itens abaixo para ver o impacto no quadro
        </p>
      </div>

      {/* ===== RESUMO CARDS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card>
          <CardContent className="p-2 flex items-center gap-2">
            <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
            <div>
              <p className="text-[9px] text-muted-foreground">TRANSFERÊNCIAS</p>
              <p className="text-sm font-bold">{trocasSimuladas.length}<span className="text-[10px] font-normal text-muted-foreground">/{trocasPendentes.length}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            <div>
              <p className="text-[9px] text-muted-foreground">DEMISSÕES</p>
              <p className="text-sm font-bold">{demissoesSimuladas.length}<span className="text-[10px] font-normal text-muted-foreground">/{demissoesPendentes.length}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <div>
              <p className="text-[9px] text-muted-foreground">PREVISÕES</p>
              <p className="text-sm font-bold">{previsaoSimulada.length}<span className="text-[10px] font-normal text-muted-foreground">/{funcionariosPrevisao.length}</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-primary" />
            <div>
              <p className="text-[9px] text-muted-foreground">FICTÍCIAS</p>
              <p className="text-sm font-bold">{admissoesSimuladas.reduce((a, b) => a + b.quantidade, 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={totalSimulacoes > 0 ? 'border-primary bg-primary/5' : ''}>
          <CardContent className="p-2 flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-primary" />
            <div>
              <p className="text-[9px] text-muted-foreground">TOTAL SIMULANDO</p>
              <p className="text-sm font-bold">{totalSimulacoes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badge simulação ativa */}
      {totalSimulacoes > 0 && (
        <Badge className="bg-primary text-primary-foreground text-[10px]">
          📊 SIMULAÇÃO ATIVA — {totalSimulacoes} ALTERAÇÃO(ÕES)
        </Badge>
      )}

      {/* Badges das simulações ativas */}
      {(trocasSimuladas.length > 0 || demissoesSimuladas.length > 0 || previsaoSimulada.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {trocasSimuladas.map(t => (
            <Badge key={t.id} variant="outline" className="text-[9px] py-0.5 px-1.5 bg-background cursor-pointer" onClick={() => toggleTransferencia(t.id)}>
              🔄 {t.funcionario?.nome_completo?.split(' ')[0]} → {t.setor_destino?.nome}
              <X className="h-2.5 w-2.5 ml-1" />
            </Badge>
          ))}
          {demissoesSimuladas.map(d => (
            <Badge key={d.id} variant="outline" className="text-[9px] py-0.5 px-1.5 bg-destructive/10 border-destructive/30 cursor-pointer" onClick={() => toggleDemissao(d.id)}>
              🔴 {d.funcionario?.nome_completo?.split(' ')[0]}
              <X className="h-2.5 w-2.5 ml-1" />
            </Badge>
          ))}
          {previsaoSimulada.map(f => (
            <Badge key={f.id} variant="outline" className="text-[9px] py-0.5 px-1.5 bg-primary/10 border-primary/30 cursor-pointer" onClick={() => togglePrevisao(f.id)}>
              🟢 {f.nome_completo?.split(' ')[0]}
              <X className="h-2.5 w-2.5 ml-1" />
            </Badge>
          ))}
        </div>
      )}

      {/* ===== QUADRO SIMULADO (DASHBOARD) - Always visible ===== */}
      {funcionariosSopro.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-muted-foreground">SOPRO</h3>
          <MetricasTurmaCards
            grupo="SOPRO"
            funcionarios={funcionariosSopro}
            quadroPlanejadoSopro={quadroPlanejadoSopro}
            funcionariosPrevisao={previsaoSopro}
          />
        </div>
      )}

      {funcionariosDecoracao.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-muted-foreground">DECORAÇÃO</h3>
          <MetricasTurmaCards
            grupo="DECORAÇÃO"
            funcionarios={funcionariosDecoracao}
            quadroPlanejadoDecoracao={quadroDecoracao}
            funcionariosPrevisao={previsaoDecoracao}
          />
        </div>
      )}

      {/* ===== SEÇÕES COLAPSÁVEIS ===== */}
      <div className="border-t pt-3 space-y-1.5">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Dados para Simulação</h3>

        {/* TRANSFERÊNCIAS */}
        <Collapsible open={secaoAberta.transferencias} onOpenChange={() => toggleSecao('transferencias')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-8 text-xs font-bold px-3">
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="h-3 w-3 text-primary" />
                🔄 TRANSFERÊNCIAS PENDENTES ({trocasPendentes.length})
                {trocasSimuladas.length > 0 && <Badge className="bg-primary text-primary-foreground text-[9px] h-4 px-1.5">{trocasSimuladas.length} simulando</Badge>}
              </span>
              {secaoAberta.transferencias ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5 pt-1 pl-2">
            {trocasPendentes.length === 0 ? (
              <p className="text-center py-3 text-muted-foreground text-[10px]">Nenhuma pendente.</p>
            ) : (
              <>
                <div className="flex gap-1.5 mb-1">
                  <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1" onClick={() => setIdsTransferenciasSimulando(new Set(trocasPendentes.map(t => t.id)))}>
                    <Eye className="h-2.5 w-2.5" /> Simular Todos
                  </Button>
                  {idsTransferenciasSimulando.size > 0 && (
                    <Button size="sm" variant="outline" className="text-destructive text-[10px] h-6 gap-1" onClick={() => setIdsTransferenciasSimulando(new Set())}>
                      <Trash2 className="h-2.5 w-2.5" /> Limpar ({idsTransferenciasSimulando.size})
                    </Button>
                  )}
                </div>
                {trocasPendentes.map(t => {
                  const isSelected = idsTransferenciasSimulando.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-primary/15 border border-primary/30' : 'bg-muted/30 hover:bg-muted/50'}`}
                      onClick={() => toggleTransferencia(t.id)}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 text-[9px] ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                        {isSelected && '✓'}
                      </div>
                      <span className="font-medium truncate flex-1">{t.funcionario?.nome_completo}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {t.setor_origem?.nome} → {t.setor_destino?.nome}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* DEMISSÕES */}
        <Collapsible open={secaoAberta.demissoes} onOpenChange={() => toggleSecao('demissoes')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-8 text-xs font-bold px-3">
              <span className="flex items-center gap-2">
                <TrendingDown className="h-3 w-3 text-destructive" />
                🔴 DEMISSÕES PENDENTES ({demissoesPendentes.length})
                {demissoesSimuladas.length > 0 && <Badge className="bg-destructive text-destructive-foreground text-[9px] h-4 px-1.5">{demissoesSimuladas.length} simulando</Badge>}
              </span>
              {secaoAberta.demissoes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1 pl-2">
            {demissoesPendentes.length === 0 ? (
              <p className="text-center py-3 text-muted-foreground text-[10px]">Nenhuma demissão pendente.</p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-1.5 mb-1">
                  <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1" onClick={() => setIdsDemissoesSimulando(new Set(demissoesPendentes.map(d => d.id)))}>
                    <Eye className="h-2.5 w-2.5" /> Simular Todos
                  </Button>
                  {idsDemissoesSimulando.size > 0 && (
                    <Button size="sm" variant="outline" className="text-destructive text-[10px] h-6 gap-1" onClick={() => setIdsDemissoesSimulando(new Set())}>
                      <Trash2 className="h-2.5 w-2.5" /> Limpar ({idsDemissoesSimulando.size})
                    </Button>
                  )}
                </div>
                {demissoesPendentes.slice(0, 30).map(d => {
                  const isSelected = idsDemissoesSimulando.has(d.id);
                  return (
                    <div
                      key={d.id}
                      className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-destructive/15 border border-destructive/30' : 'bg-muted/30 hover:bg-muted/50'}`}
                      onClick={() => toggleDemissao(d.id)}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 text-[9px] ${isSelected ? 'bg-destructive border-destructive text-destructive-foreground' : 'border-muted-foreground/30'}`}>
                        {isSelected && '✓'}
                      </div>
                      <span className="font-medium truncate flex-1">{d.funcionario?.nome_completo}</span>
                      <span className="text-muted-foreground text-[10px] shrink-0">{d.data_prevista}</span>
                    </div>
                  );
                })}
                {demissoesPendentes.length > 30 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{demissoesPendentes.length - 30} demissões</p>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* PREVISÃO */}
        <Collapsible open={secaoAberta.previsao} onOpenChange={() => toggleSecao('previsao')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-8 text-xs font-bold px-3">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-primary" />
                🟢 PREVISÃO DE ADMISSÃO ({funcionariosPrevisao.length})
                {previsaoSimulada.length > 0 && <Badge className="bg-primary text-primary-foreground text-[9px] h-4 px-1.5">{previsaoSimulada.length} simulando</Badge>}
              </span>
              {secaoAberta.previsao ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1 pl-2">
            {funcionariosPrevisao.length === 0 ? (
              <p className="text-center py-3 text-muted-foreground text-[10px]">Nenhuma previsão.</p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex gap-1.5 mb-1">
                  <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1" onClick={() => setIdsPrevisaoSimulando(new Set(funcionariosPrevisao.map(f => f.id)))}>
                    <Eye className="h-2.5 w-2.5" /> Simular Todos
                  </Button>
                  {idsPrevisaoSimulando.size > 0 && (
                    <Button size="sm" variant="outline" className="text-destructive text-[10px] h-6 gap-1" onClick={() => setIdsPrevisaoSimulando(new Set())}>
                      <Trash2 className="h-2.5 w-2.5" /> Limpar ({idsPrevisaoSimulando.size})
                    </Button>
                  )}
                </div>
                {funcionariosPrevisao.slice(0, 30).map(f => {
                  const isSelected = idsPrevisaoSimulando.has(f.id);
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-primary/15 border border-primary/30' : 'bg-muted/30 hover:bg-muted/50'}`}
                      onClick={() => togglePrevisao(f.id)}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 text-[9px] ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                        {isSelected && '✓'}
                      </div>
                      <span className="font-medium truncate flex-1">{f.nome_completo}</span>
                      <span className="text-muted-foreground text-[10px] shrink-0">{f.setor?.nome}</span>
                    </div>
                  );
                })}
                {funcionariosPrevisao.length > 30 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{funcionariosPrevisao.length - 30} previsões</p>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* ADMISSÃO FICTÍCIA */}
        <Collapsible open={secaoAberta.admissao} onOpenChange={() => toggleSecao('admissao')}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between h-8 text-xs font-bold px-3">
              <span className="flex items-center gap-2">
                <Users className="h-3 w-3 text-primary" />
                ➕ ADMISSÃO FICTÍCIA ({admissoesSimuladas.reduce((a, b) => a + b.quantidade, 0)})
              </span>
              {secaoAberta.admissao ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-1 pl-2 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-[10px]">Setor</Label>
                <Select value={novoSetor} onValueChange={setNovoSetor}>
                  <SelectTrigger className="h-7 text-xs">
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
                  <SelectTrigger className="h-7 text-xs">
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
                <Input type="number" min={1} max={50} value={novaQtd} onChange={(e) => setNovaQtd(e.target.value)} className="h-7 text-xs" />
              </div>
              <Button size="sm" onClick={handleAddAdmissao} disabled={!novoSetor} className="gap-1 h-7 text-xs">
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </div>

            {admissoesSimuladas.length > 0 && (
              <div className="space-y-1">
                {admissoesSimuladas.map(a => {
                  const setor = setores.find(s => s.id === a.setor_id);
                  return (
                    <div key={a.id} className="flex items-center justify-between px-2 py-1 rounded bg-muted/30 text-xs">
                      <span>{a.quantidade}x — {setor?.nome} {a.turma ? `(${a.turma})` : ''}</span>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive" onClick={() => setAdmissoesSimuladas(prev => prev.filter(x => x.id !== a.id))}>
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  );
                })}
                <Button size="sm" variant="outline" className="text-destructive text-[10px] h-6 gap-1" onClick={() => setAdmissoesSimuladas([])}>
                  <Trash2 className="h-2.5 w-2.5" /> Limpar
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
