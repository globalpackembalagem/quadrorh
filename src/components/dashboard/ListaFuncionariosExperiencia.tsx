import { useState, useMemo } from 'react';
import { Funcionario } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Clock, Download, Users, Search, ArrowLeft } from 'lucide-react';
import { useUsuario } from '@/contexts/UserContext';
import { useSetores } from '@/hooks/useSetores';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { format, differenceInDays, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// xlsx-js-style loaded dynamically
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ListaFuncionariosExperienciaProps {
  funcionarios: Funcionario[];
  grupo: 'SOPRO' | 'DECORAÇÃO';
  disabled?: boolean;
}

interface FuncionarioExperiencia extends Funcionario {
  diasDesdeAdmissao: number;
  dataVencimento: Date;
  contratoTipo: '30' | '60' | '90';
  diasParaVencimento: number;
  isTemporario: boolean;
}

// Prefixos de nome para SOPRO (fallback caso grupo não esteja preenchido)
const PREFIXOS_SOPRO = ['MOD - SOPRO', 'PRODUÇÃO SOPRO G+P'];

// Prefixos de nome para DECORAÇÃO (fallback)
const PREFIXOS_DECORACAO = ['DECORAÇÃO MOD', 'DECORACAO MOD'];

// Grupos cadastrados no banco para SOPRO
const GRUPOS_SOPRO = ['SOPRO A', 'SOPRO B', 'SOPRO C'];

// Grupos cadastrados no banco para DECORAÇÃO
const GRUPOS_DECORACAO = [
  'DECORAÇÃO DIA', 'DECORAÇÃO NOITE',
  'DECORAÇÃO DIA T1', 'DECORAÇÃO DIA T2',
  'DECORAÇÃO NOITE T1', 'DECORAÇÃO NOITE T2',
];

function isSetorValido(setor: { nome?: string | null; grupo?: string | null } | undefined, grupo: 'SOPRO' | 'DECORAÇÃO'): boolean {
  if (!setor) return false;
  const nomeUpper = (setor.nome || '').toUpperCase().trim();
  const grupoUpper = (setor.grupo || '').toUpperCase().trim();

  if (grupo === 'SOPRO') {
    // Verificar pelo campo grupo primeiro
    if (grupoUpper && GRUPOS_SOPRO.some(g => grupoUpper.startsWith(g.toUpperCase()))) return true;
    // Fallback pelo nome
    return PREFIXOS_SOPRO.some(p => nomeUpper.startsWith(p.toUpperCase()));
  } else {
    // Verificar pelo campo grupo primeiro
    if (grupoUpper && GRUPOS_DECORACAO.some(g => grupoUpper.toUpperCase().startsWith(g.toUpperCase()))) return true;
    // Fallback pelo nome
    return PREFIXOS_DECORACAO.some(p => nomeUpper.startsWith(p.toUpperCase()));
  }
}

export function ListaFuncionariosExperiencia({ funcionarios, grupo, disabled = false }: ListaFuncionariosExperienciaProps) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const { usuarioAtual, isAdmin } = useUsuario();
  const { data: setoresDb = [] } = useSetores();

  // Filtrar funcionários do grupo (usando campo grupo do setor ou prefixo do nome)
  const funcionariosDoGrupo = useMemo(() => {
    const setoresDoGestor = !isAdmin && usuarioAtual.setoresIds.length > 0
      ? new Set(usuarioAtual.setoresIds)
      : null;

    return funcionarios.filter(f => {
      const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
      const isAtivo = situacaoNome === 'ATIVO';

      if (!isAtivo || !f.data_admissao) return false;
      if (!isSetorValido(f.setor, grupo)) return false;

      // Se é gestor com setores específicos, filtrar apenas pelos seus setores
      if (setoresDoGestor) {
        return setoresDoGestor.has(f.setor_id);
      }

      return true;
    });
  }, [funcionarios, grupo, usuarioAtual, isAdmin, setoresDb]);

  // Lista unificada de todos em experiência
  const funcionariosExperiencia = useMemo(() => {
    const hoje = new Date();
    const lista: FuncionarioExperiencia[] = [];
    
    funcionariosDoGrupo.forEach(f => {
      const matricula = f.matricula?.toUpperCase() || '';
      const isTemporario = matricula.startsWith('TEMP');
      // data_admissao vem como YYYY-MM-DD; parseISO evita problema de fuso do new Date().
      const dataAdmissao = parseISO(f.data_admissao!);
      const diasDesdeAdmissao = differenceInDays(hoje, dataAdmissao);
      
      if (isTemporario) {
        // Temporários: 90 dias
        const dataVencimento90 = addDays(dataAdmissao, 90);
        const diasParaVencimento = differenceInDays(dataVencimento90, hoje);
        
        // Incluir se ainda não venceu ou venceu há até 3 dias
        if (diasParaVencimento >= -3) {
          lista.push({
            ...f,
            diasDesdeAdmissao,
            dataVencimento: dataVencimento90,
            contratoTipo: '90',
            diasParaVencimento,
            isTemporario: true,
          });
        }
      } else {
        // Efetivos: 30 e 60 dias
        const dataVencimento30 = addDays(dataAdmissao, 30);
        const dataVencimento60 = addDays(dataAdmissao, 60);
        const diasPara30 = differenceInDays(dataVencimento30, hoje);
        const diasPara60 = differenceInDays(dataVencimento60, hoje);
        
        if (diasPara30 >= -3) {
          // Ainda no período de 30 dias
          lista.push({
            ...f,
            diasDesdeAdmissao,
            dataVencimento: dataVencimento30,
            contratoTipo: '30',
            diasParaVencimento: diasPara30,
            isTemporario: false,
          });
        } else if (diasPara60 >= -3) {
          // No período de 60 dias
          lista.push({
            ...f,
            diasDesdeAdmissao,
            dataVencimento: dataVencimento60,
            contratoTipo: '60',
            diasParaVencimento: diasPara60,
            isTemporario: false,
          });
        }
      }
    });
    
    // Ordenar por dias para vencimento (mais urgente primeiro)
    return lista.sort((a, b) => a.diasParaVencimento - b.diasParaVencimento);
  }, [funcionariosDoGrupo]);

  // Aplicar busca
  const funcionariosFiltrados = useMemo(() => {
    if (!busca.trim()) return funcionariosExperiencia;
    
    const termoBusca = busca.toLowerCase();
    return funcionariosExperiencia.filter(f => 
      f.nome_completo.toLowerCase().includes(termoBusca) ||
      f.matricula?.toLowerCase().includes(termoBusca) ||
      f.setor?.nome?.toLowerCase().includes(termoBusca) ||
      f.turma?.toLowerCase().includes(termoBusca)
    );
  }, [funcionariosExperiencia, busca]);

  const totalExperiencia = funcionariosExperiencia.length;

  // Exportar para Excel
  const exportarExcel = async () => {
    const XLSX = await import('xlsx-js-style');
    const dados = funcionariosFiltrados.map(f => ({
      'Tipo': f.isTemporario ? 'Temporário' : 'Efetivo',
      'Setor': f.setor?.nome || '',
      'Turma': f.turma || '',
      'Nome': f.nome_completo,
      'Empresa': f.empresa || '',
      'Matrícula': f.matricula || '',
      // data_admissao vem como YYYY-MM-DD; parseISO evita problema de fuso do new Date().
      'Data Admissão': f.data_admissao ? format(parseISO(f.data_admissao), 'dd/MM/yyyy') : '',
      'Dias na Empresa': f.diasDesdeAdmissao,
      'Contrato': `${f.contratoTipo} dias`,
      'Data Vencimento': format(f.dataVencimento, 'dd/MM/yyyy'),
      'Dias Restantes': f.diasParaVencimento,
    }));
    
    if (dados.length === 0) {
      toast.error('Nenhum funcionário para exportar');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Experiência');
    
    const nomeArquivo = `Funcionarios_Experiencia_${grupo}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
    toast.success('Arquivo exportado com sucesso!');
  };

  return (
    <>
      <Button 
        size="lg"
        className="gap-2 font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-md whitespace-normal text-center leading-tight"
        onClick={() => setDialogAberto(true)}
        disabled={disabled}
        title={disabled ? 'Faça login para acessar' : ''}
      >
        <Clock className="h-5 w-5 shrink-0" />
        <span className="flex flex-col items-start">
          <span>Experiência</span>
          <span>Temporários</span>
        </span>
        <Badge variant="secondary" className="ml-1 bg-amber-500/30 text-white">
          {totalExperiencia}
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
                <Clock className="h-5 w-5" />
                Experiência / Temporários - {grupo}
                <Badge variant="secondary">{totalExperiencia}</Badge>
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

          <div className="flex-1 overflow-y-auto px-4">
            {funcionariosFiltrados.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum funcionário em período de experiência.</p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {funcionariosFiltrados.map(func => {
                  const isTemp = func.isTemporario;
                  return (
                    <div
                      key={func.id}
                      className={cn(
                        'rounded-lg border-l-4 px-4 py-3',
                        isTemp
                          ? 'border-l-orange-500 bg-orange-50/60'
                          : func.contratoTipo === '30'
                            ? 'border-l-blue-500 bg-blue-50/60'
                            : 'border-l-purple-500 bg-purple-50/60'
                      )}
                    >
                      {/* Linha principal: nome + badge + métrica em destaque */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="font-semibold text-sm">{func.nome_completo}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[11px] font-bold shrink-0 px-2',
                              isTemp
                                ? 'border-orange-500 text-orange-600 bg-orange-50'
                                : func.contratoTipo === '30'
                                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                                  : 'border-purple-500 text-purple-600 bg-purple-50'
                            )}
                          >
                            {isTemp ? 'TEMPORÁRIO' : `EXP. EFETIVO ${func.contratoTipo}d`}
                          </Badge>
                        </div>

                        {/* Métrica principal em destaque */}
                        <div className={cn(
                          'shrink-0 rounded-lg px-3 py-1.5 text-center min-w-[110px]',
                          isTemp
                            ? 'bg-orange-500 text-white'
                            : func.diasParaVencimento <= 7
                              ? 'bg-red-500 text-white'
                              : 'bg-blue-500 text-white'
                        )}>
                          {isTemp ? (
                            <>
                              <div className="text-lg font-bold leading-none">{func.diasDesdeAdmissao}</div>
                              <div className="text-[10px] font-medium opacity-90">DIAS TRABALHANDO</div>
                            </>
                          ) : func.diasParaVencimento < 0 ? (
                            <>
                              <div className="text-lg font-bold leading-none">{Math.abs(func.diasParaVencimento)}</div>
                              <div className="text-[10px] font-medium opacity-90">DIAS VENCIDO</div>
                            </>
                          ) : (
                            <>
                              <div className="text-lg font-bold leading-none">{func.diasParaVencimento}</div>
                              <div className="text-[10px] font-medium opacity-90">DIAS P/ TÉRMINO</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Linha secundária: infos sem repetição */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1.5">
                        <span className="font-medium text-foreground/70">{func.setor?.nome}</span>
                        {func.turma && <span>• Turma {func.turma}</span>}
                        <span>• {func.empresa || 'GLOBALPACK'}</span>
                        {func.matricula && !func.matricula.toUpperCase().startsWith('TEMP') && (
                          <span>• Mat: {func.matricula}</span>
                        )}
                        <span>• Adm: {format(parseISO(func.data_admissao!), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        <span>• Vence: {format(func.dataVencimento, 'dd/MM/yyyy')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
