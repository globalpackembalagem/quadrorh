import { useMemo, useEffect, useState } from 'react';
import { useAdmissaoRecente, agruparRecentesPorTurma } from '@/hooks/useAdmissaoRecente';
import { Wind, ShieldAlert, ClipboardList, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useFuncionariosNoQuadro, useFuncionarios } from '@/hooks/useFuncionarios';
import { useQuadroPlanejado } from '@/hooks/useQuadroPlanejado';
import { useFuncionariosPrevisao } from '@/hooks/usePrevisoes';
import { useDemissoesPendentes, usePeriodosDemissao, useDemissoesRealizadas } from '@/hooks/useDemissoes';
import { QuadroPlanejadoTable } from '@/components/dashboard/QuadroPlanejadoTable';
import { QuadroRealSoproTable } from '@/components/dashboard/QuadroRealSoproTable';
import { SubstituicaoReposicaoTable } from '@/components/dashboard/SubstituicaoReposicaoTable';
import { MetricasTurmaCards } from '@/components/dashboard/MetricasTurmaCards';
import { ListaFuncionariosSetor } from '@/components/dashboard/ListaFuncionariosSetor';
import { ListaFuncionariosExperiencia } from '@/components/dashboard/ListaFuncionariosExperiencia';
import { EscalaSoproCalendario } from '@/components/sopro/EscalaSoproCalendario';
import { useUsuario } from '@/contexts/UserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const TURMAS_SOPRO = ['A', 'B', 'C'] as const;

export default function Sopro() {
  const navigate = useNavigate();
  const { usuarioAtual, isAdmin } = useUsuario();
  const { data: funcionariosQuadro = [], isLoading: loadingFunc } = useFuncionariosNoQuadro();
  const { data: todosFuncionarios = [] } = useFuncionarios();
  const { data: quadroPlanejado = [], isLoading: loadingQuadro } = useQuadroPlanejado('SOPRO');
  const { data: demissoesPendentes = [] } = useDemissoesPendentes();
  const { data: demissoesRealizadas = [] } = useDemissoesRealizadas();
  const { data: periodos = [] } = usePeriodosDemissao();
  const { data: funcionariosPrevisao = [] } = useFuncionariosPrevisao();
  const [setoresNomes, setSetoresNomes] = useState<Map<string, string>>(new Map());
  const { data: recentes = [] } = useAdmissaoRecente('SOPRO');
  const recentesPorTurma = useMemo(() => agruparRecentesPorTurma(recentes, 'SOPRO'), [recentes]);



  const isLoading = loadingFunc || loadingQuadro;

  // Buscar nomes dos setores
  useEffect(() => {
    const fetchSetores = async () => {
      const { data } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true);
      
      if (data) {
        const map = new Map<string, string>();
        data.forEach(s => map.set(s.id, s.nome));
        setSetoresNomes(map);
      }
    };
    fetchSetores();
  }, []);

  // Verificar se o gestor tem acesso ao Sopro e identificar turmas que pode EDITAR
  // IMPORTANTE: Gestores SOPRO podem VER todas as turmas, mas só EDITAR as suas
  const setoresCarregados = setoresNomes.size > 0;
  const { temAcessoSopro, turmasEditaveis } = useMemo(() => {
    if (!usuarioAtual || isAdmin) {
      return { temAcessoSopro: true, turmasEditaveis: ['A', 'B', 'C'] };
    }
    if (usuarioAtual.setoresIds.length === 0) {
      return { temAcessoSopro: true, turmasEditaveis: ['A', 'B', 'C'] };
    }
    // Enquanto setores não carregaram, assumir acesso (evita redirect prematuro)
    if (!setoresCarregados) {
      return { temAcessoSopro: true, turmasEditaveis: ['A', 'B', 'C'] };
    }
    
    // Verificar quais turmas o gestor pode EDITAR (baseado nos setores dele)
    const turmas: string[] = [];
    let temAlgumSopro = false;
    usuarioAtual.setoresIds.forEach(setorId => {
      const setorNome = setoresNomes.get(setorId)?.toUpperCase() || '';
      if (setorNome.includes('SOPRO')) {
        temAlgumSopro = true;
        if (setorNome.includes('SOPRO A') || setorNome.includes('SOPRO G+P A')) turmas.push('A');
        if (setorNome.includes('SOPRO B') || setorNome.includes('SOPRO G+P B')) turmas.push('B');
        if (setorNome.includes('SOPRO C') || setorNome.includes('SOPRO G+P C')) turmas.push('C');
      }
    });
    
    // Remover duplicatas
    const turmasUnicas = [...new Set(turmas)];
    
    return { 
      temAcessoSopro: temAlgumSopro, 
      turmasEditaveis: turmasUnicas
    };
  }, [usuarioAtual, isAdmin, setoresNomes, setoresCarregados]);

  // Filtrar funcionários por grupo
  const funcionariosSopro = useMemo(() => {
    return funcionariosQuadro.filter(f => {
      const setorNome = f.setor?.nome?.toUpperCase() || '';
      return setorNome.includes('SOPRO');
    });
  }, [funcionariosQuadro]);

  // Todos os funcionários (para a tabela de substituição - inclui sumidos, etc)
  const todosSopro = useMemo(() => {
    return todosFuncionarios.filter(f => {
      const setorNome = f.setor?.nome?.toUpperCase() || '';
      return setorNome.includes('SOPRO');
    });
  }, [todosFuncionarios]);

  // Calcular desfalque por turma para passar à tabela de substituição
  // MESMA lógica do Dashboard.tsx para manter consistência
  const desfalqueSopro = useMemo(() => {
    const result: Record<string, number> = { A: 0, B: 0, C: 0 };
    
    quadroPlanejado.forEach(q => {
      // IMPORTANTE: usar a MESMA fórmula do Dashboard
      const reservaRefeicaoIndustria = Math.round(q.aux_maquina_industria / 6);
      const reservaRefeicaoGP = Math.round(q.aux_maquina_gp / 6);

      const totalNecessario =
        q.aux_maquina_industria +
        q.reserva_ferias_industria +
        reservaRefeicaoIndustria +
        q.reserva_faltas_industria +
        q.amarra_pallets +
        q.revisao_frasco +
        q.mod_sindicalista +
        q.controle_praga +
        q.aux_maquina_gp +
        q.reserva_faltas_gp +
        reservaRefeicaoGP +
        q.reserva_ferias_gp +
        q.aumento_quadro;

      const grupoEsperado = `SOPRO ${q.turma}`;
      const funcTurma = funcionariosSopro.filter(f => {
        const grupoSetor = f.setor?.grupo?.toUpperCase() || '';
        return grupoSetor === grupoEsperado;
      });

      const gp = funcTurma.filter(f => {
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isSetorGP = setorNome.includes('G+P') || setorNome.includes('PRODUÇÃO SOPRO G+P');
        const isTemporario = !!(f.matricula && f.matricula.toUpperCase().startsWith('TEMP'));
        return isSetorGP && !isTemporario;
      }).length;

      const globalpack = funcTurma.filter(f => {
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isSetorMOD =
          setorNome.includes('MOD - SOPRO') ||
          (setorNome.includes('MOD') && setorNome.includes('SOPRO') && !setorNome.includes('G+P'));
        const isTemporario = !!(f.matricula && f.matricula.toUpperCase().startsWith('TEMP'));
        return isSetorMOD && !isTemporario;
      }).length;

      const temporarios = funcTurma.filter(f => !!(f.matricula && f.matricula.toUpperCase().startsWith('TEMP'))).length;

      const quadroReal = gp + globalpack + temporarios;
      result[q.turma] = totalNecessario - quadroReal;
    });
    
    return result;
  }, [quadroPlanejado, funcionariosSopro]);

  // Não redirecionar - apenas ocultar conteúdo se sem acesso
  // O redirecionamento causava loop infinito: /quadro-geral → /home → /quadro-geral
  if (!temAcessoSopro) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-700">
          <Wind className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SOPRO</h1>
          <p className="text-muted-foreground">
            QUADRO DE FUNCIONÁRIOS DO SETOR DE SOPRO
            {turmasEditaveis.length < 3 && turmasEditaveis.length > 0 && (
              <span className="ml-2 text-sm font-medium text-primary">
                (EDITA: TURMA {turmasEditaveis.join(', ')})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Toolbar / Barra de ações */}
      <div className="flex items-center gap-2 border rounded-lg bg-muted/30 p-2 overflow-x-auto">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0 font-semibold border-2 hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={() => navigate('/faltas')}
        >
          <ClipboardList className="h-4 w-4" />
          FALTAS
        </Button>
        <div className="w-px h-6 bg-border shrink-0" />
        <ListaFuncionariosSetor
          grupo="SOPRO"
          funcionarios={todosFuncionarios}
        />
        <ListaFuncionariosExperiencia
          funcionarios={todosFuncionarios}
          grupo="SOPRO"
        />
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="sm"
              className="gap-2 shrink-0 font-semibold bg-green-700 hover:bg-green-800"
            >
              <Calendar className="h-4 w-4" />
              Escala
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
            <EscalaSoproCalendario />
          </DialogContent>
        </Dialog>
      </div>




      {/* Cards de Resumo por Turma */}
      <MetricasTurmaCards
        grupo="SOPRO"
        funcionarios={funcionariosSopro}
        quadroPlanejadoSopro={quadroPlanejado}
        funcionariosPrevisao={funcionariosPrevisao}
        recentesPorTurma={recentesPorTurma}
      />

      {/* Tabelas do Quadro */}
      <div className="space-y-6">
        <QuadroPlanejadoTable
          grupo="SOPRO"
          dados={quadroPlanejado}
          turmas={[...TURMAS_SOPRO]}
        />
        <QuadroRealSoproTable
          funcionarios={funcionariosSopro}
          quadroPlanejado={quadroPlanejado}
          turmas={[...TURMAS_SOPRO]}
        />
        <SubstituicaoReposicaoTable
          grupo="SOPRO"
          funcionarios={todosSopro}
          demissoesPendentes={demissoesPendentes}
          periodos={periodos}
          desfalquePorTurma={desfalqueSopro}
        />
      </div>
    </div>
  );
}
