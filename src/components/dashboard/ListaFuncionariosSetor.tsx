import { useState, useMemo } from 'react';
import { Funcionario } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { useCreateDivergencia, useDivergenciasPendentes } from '@/hooks/useDivergencias';
import { useUsuario } from '@/contexts/UserContext';
import { useSetores } from '@/hooks/useSetores';
import { useSituacoes } from '@/hooks/useSituacoes';
import { Users, AlertTriangle, Calendar, BookOpen, Eye, Download, Search, Clock, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// xlsx-js-style loaded dynamically
import { toast } from 'sonner';

interface ListaFuncionariosSetorProps {
  grupo: 'SOPRO' | 'DECORAÇÃO';
  funcionarios: Funcionario[];
  disabled?: boolean;
}

// Setores válidos para SOPRO
const SETORES_SOPRO_VALIDOS = [
  'MOD - SOPRO A',
  'MOD - SOPRO B',
  'MOD - SOPRO C',
  'PRODUÇÃO SOPRO G+P A',
  'PRODUÇÃO SOPRO G+P B',
  'PRODUÇÃO SOPRO G+P C',
];

// Setores válidos para DECORAÇÃO
const SETORES_DECORACAO_VALIDOS = [
  'DECORAÇÃO MOD DIA',
  'DECORAÇÃO MOD NOITE',
  'DECORACAO MOD DIA',
  'DECORACAO MOD NOITE',
];

const TIPOS_DIVERGENCIA = [
  { id: 'COB. FÉRIAS', label: 'Cob. Férias', icon: Calendar },
  { id: 'SUMIDO', label: 'Sumido', icon: Eye },
  { id: 'TREINAMENTO', label: 'Treinamento', icon: BookOpen },
];

function isSetorValido(setorNome: string, grupo: 'SOPRO' | 'DECORAÇÃO'): boolean {
  const nomeUpper = setorNome.toUpperCase().trim();
  
  if (grupo === 'SOPRO') {
    return SETORES_SOPRO_VALIDOS.some(s => nomeUpper === s.toUpperCase());
  } else {
    return SETORES_DECORACAO_VALIDOS.some(s => nomeUpper === s.toUpperCase());
  }
}

function getExperienciaBadge(func: Funcionario): { label: string; className: string } | null {
  if (!func.data_admissao) return null;
  
  const hoje = new Date();
  const dataAdmissao = parseISO(func.data_admissao);
  const matricula = func.matricula?.toUpperCase() || '';
  const isTemporario = matricula.startsWith('TEMP');
  
  if (isTemporario) {
    const diasPara90 = differenceInDays(addDays(dataAdmissao, 90), hoje);
    if (diasPara90 >= -3) {
      return { label: 'Temporário', className: '!bg-orange-500 hover:!bg-orange-600 text-white' };
    }
  } else {
    const diasPara60 = differenceInDays(addDays(dataAdmissao, 60), hoje);
    if (diasPara60 >= -3) {
      return { label: 'Experiência Efetivo', className: '!bg-amber-500 hover:!bg-amber-600 text-white' };
    }
  }
  return null;
}

function contaNoQuadro(func: Funcionario): boolean {
  const setorContaNoQuadro = func.setor?.conta_no_quadro === true;
  const setorAtivo = func.setor?.ativo === true;
  const situacaoContaNoQuadro = func.situacao?.conta_no_quadro === true;
  const situacaoAtiva = func.situacao?.ativa === true;
  return setorContaNoQuadro && setorAtivo && situacaoContaNoQuadro && situacaoAtiva;
}

export function ListaFuncionariosSetor({ grupo, funcionarios, disabled = false }: ListaFuncionariosSetorProps) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  
  const createDivergencia = useCreateDivergencia();
  const { data: divergenciasPendentes = [] } = useDivergenciasPendentes();

  const { usuarioAtual, isAdmin } = useUsuario();
  const { data: setoresDb = [] } = useSetores();

  // Filtrar funcionários do setor usando a MESMA lógica do dashboard (conta_no_quadro)
  const funcionariosSetor = useMemo(() => {
    const setoresDoGestor = !isAdmin && usuarioAtual.setoresIds.length > 0
      ? usuarioAtual.setoresIds.map(id => {
          const setor = setoresDb.find(s => s.id === id);
          return setor?.nome?.toUpperCase().trim() || '';
        }).filter(Boolean)
      : null;

    return funcionarios.filter(f => {
      const setorNome = f.setor?.nome || '';
      
      // Usar mesma lógica do dashboard: setor e situação com conta_no_quadro=true
      const setorContaNoQuadro = f.setor?.conta_no_quadro === true;
      const setorAtivo = f.setor?.ativo === true;
      const situacaoContaNoQuadro = f.situacao?.conta_no_quadro === true;
      const situacaoAtiva = f.situacao?.ativa === true;
      
      if (!setorContaNoQuadro || !setorAtivo || !situacaoContaNoQuadro || !situacaoAtiva) return false;
      if (!isSetorValido(setorNome, grupo)) return false;
      
      if (setoresDoGestor) {
        return setoresDoGestor.includes(setorNome.toUpperCase().trim());
      }
      
      return true;
    });
  }, [funcionarios, grupo, usuarioAtual, isAdmin, setoresDb]);

  // Aplicar busca
  const funcionariosFiltrados = useMemo(() => {
    if (!busca.trim()) return funcionariosSetor;
    
    const termoBusca = busca.toLowerCase();
    return funcionariosSetor.filter(f => 
      f.nome_completo.toLowerCase().includes(termoBusca) ||
      f.matricula?.toLowerCase().includes(termoBusca) ||
      f.setor?.nome?.toLowerCase().includes(termoBusca) ||
      f.turma?.toLowerCase().includes(termoBusca)
    );
  }, [funcionariosSetor, busca]);

  const handleCriarDivergencia = async (funcionario: Funcionario, tipo: string) => {
    const obs = observacoes[funcionario.id] || '';
    await createDivergencia.mutateAsync({
      funcionario_id: funcionario.id,
      tipo_divergencia: tipo,
      criado_por: 'Gestor',
      observacoes: obs || null,
    });
    setObservacoes(prev => {
      const next = { ...prev };
      delete next[funcionario.id];
      return next;
    });
  };

  const temDivergenciaPendente = (funcionarioId: string) => {
    return divergenciasPendentes.some(d => d.funcionario_id === funcionarioId);
  };

  const getDivergenciaTipo = (funcionarioId: string) => {
    const div = divergenciasPendentes.find(d => d.funcionario_id === funcionarioId);
    return div?.tipo_divergencia;
  };

  // Exportar para Excel
  const exportarExcel = async () => {
    const XLSX = await import('xlsx-js-style');
    const dados = funcionariosFiltrados.map(f => ({
      'Empresa': f.empresa || '',
      'Matrícula': f.matricula || '',
      'Nome': f.nome_completo,
      'Setor': f.setor?.nome || '',
      'Turma': f.turma || '',
      'Situação': f.situacao?.nome || '',
      'Cargo': f.cargo || '',
      'Data Admissão': f.data_admissao ? format(parseISO(f.data_admissao), 'dd/MM/yyyy') : '',
      'Conta no Quadro': contaNoQuadro(f) ? 'SIM' : 'NÃO',
    }));

    if (dados.length === 0) {
      toast.error('Nenhum funcionário para exportar');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionários');
    
    const nomeArquivo = `Funcionarios_${grupo}_${format(new Date(), 'dd-MM-yyyy_HH-mm')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
    toast.success('Arquivo exportado com sucesso!');
  };

  return (
    <>
      <Button 
        size="lg"
        className="gap-2 font-semibold shadow-md"
        onClick={() => setDialogAberto(true)}
        disabled={disabled}
        title={disabled ? 'Faça login para acessar' : ''}
      >
        <Users className="h-5 w-5" />
        Funcionários
        <Badge variant="secondary" className="ml-1 bg-primary-foreground/20 text-primary-foreground">
          {funcionariosSetor.length}
        </Badge>
      </Button>

      {dialogAberto && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setDialogAberto(false)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Users className="h-5 w-5" />
                Funcionários - {grupo}
                <Badge variant="secondary">{funcionariosSetor.length}</Badge>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportarExcel} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>

          {/* Busca */}
          <div className="relative p-4 pb-2 shrink-0">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, matrícula, setor ou turma..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabela */}
          <div className="flex-1 overflow-auto px-4">
            {funcionariosFiltrados.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum funcionário encontrado.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background z-10 border-b">
                  <tr className="text-left">
                    <th className="p-2">Empresa</th>
                    <th className="p-2">Matrícula</th>
                    <th className="p-2">Nome</th>
                    <th className="p-2">Setor</th>
                    <th className="p-2">Turma</th>
                    <th className="p-2">Situação</th>
                    <th className="p-2">Admissão</th>
                    <th className="p-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {funcionariosFiltrados.map(func => {
                    const temDivergencia = temDivergenciaPendente(func.id);
                    const tipoDivergencia = getDivergenciaTipo(func.id);
                    const situacaoNome = func.situacao?.nome?.toUpperCase() || '';
                    const isAtivoOuFerias = situacaoNome === 'ATIVO' || situacaoNome === 'FÉRIAS' || situacaoNome === 'FERIAS';
                    const isSumido = situacaoNome === 'SUMIDO';
                    const expBadge = getExperienciaBadge(func);
                    
                    return (
                      <tr 
                        key={func.id}
                        className={`border-b hover:bg-muted/50 ${
                          temDivergencia ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <td className="p-2">{func.empresa || '-'}</td>
                        <td className="p-2">{func.matricula || '-'}</td>
                        <td className="p-2 font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            {func.nome_completo}
                            {temDivergencia && (
                              <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px] px-1.5 py-0">
                                <AlertTriangle className="h-3 w-3 mr-0.5" />
                                {tipoDivergencia}
                              </Badge>
                            )}
                            {expBadge && (
                              <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${expBadge.className}`}>
                                <Clock className="h-3 w-3 mr-0.5" />
                                {expBadge.label}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2">{func.setor?.nome || '-'}</td>
                        <td className="p-2">{func.turma || '-'}</td>
                        <td className="p-2">
                          <Badge
                            className="text-white border-0"
                            style={{ backgroundColor: isSumido ? '#ef4444' : isAtivoOuFerias ? '#3b82f6' : '#f97316' }}
                          >
                            {func.situacao?.nome}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {func.data_admissao 
                            ? format(parseISO(func.data_admissao), 'dd/MM/yyyy')
                            : '-'
                          }
                        </td>
                        <td className="p-2 text-right">
                          {!temDivergencia && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">Ajuste</Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-2" align="end">
                                <div className="space-y-2">
                                  <Textarea
                                    placeholder="Observação (opcional)..."
                                    value={observacoes[func.id] || ''}
                                    onChange={(e) => setObservacoes(prev => ({ ...prev, [func.id]: e.target.value }))}
                                    className="text-xs min-h-[60px] resize-none"
                                  />
                                  <div className="space-y-1">
                                    {TIPOS_DIVERGENCIA.map(tipo => (
                                      <Button
                                        key={tipo.id}
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start gap-2"
                                        onClick={() => handleCriarDivergencia(func, tipo.id)}
                                        disabled={createDivergencia.isPending}
                                      >
                                        <tipo.icon className="h-4 w-4" />
                                        {tipo.label}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Total */}
          <div className="text-sm text-muted-foreground p-4 border-t shrink-0">
            Total: {funcionariosFiltrados.length} funcionário(s)
          </div>
        </div>
      )}
    </>
  );
}
