import { useState, useMemo, useEffect } from 'react';
import { useFuncionariosNoQuadro, useFuncionarios } from '@/hooks/useFuncionarios';
import { useSetoresAtivos } from '@/hooks/useSetores';
import { useSituacoesAtivas } from '@/hooks/useSituacoes';
import { useQuadroPlanejado } from '@/hooks/useQuadroPlanejado';
import { useQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { useFuncionariosPrevisao } from '@/hooks/usePrevisoes';
import { useDemissoesPendentes, usePeriodosDemissao } from '@/hooks/useDemissoes';
import { useUsuario } from '@/contexts/UserContext';
import { useSetoresUsuario } from '@/hooks/useSetoresUsuario';

const GRUPOS = ['SOPRO', 'DECORAÇÃO'] as const;

export type GrupoType = typeof GRUPOS[number];

export function useDashboardData() {
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoType>('SOPRO');
  const { usuarioAtual, canExportExcel, isAdmin, isRHMode } = useUsuario();
  const { setoresNomes, isGestorSetor, temAcessoSopro, temAcessoDecoracao } = useSetoresUsuario();

  const { data: funcionariosQuadro = [], isLoading: loadingFunc } = useFuncionariosNoQuadro();
  const { data: todosFuncionarios = [] } = useFuncionarios();
  const { data: setores = [], isLoading: loadingSetores } = useSetoresAtivos();
  const { data: situacoes = [], isLoading: loadingSituacoes } = useSituacoesAtivas();
  const { data: quadroPlanejado = [], isLoading: loadingQuadro } = useQuadroPlanejado('SOPRO');
  const { data: quadroDecoracao = [], isLoading: loadingDecoracao } = useQuadroDecoracao();
  const { data: demissoesPendentes = [] } = useDemissoesPendentes();
  const { data: periodos = [] } = usePeriodosDemissao();
  const { data: funcionariosPrevisao = [] } = useFuncionariosPrevisao();

  const isLoading = loadingFunc || loadingSetores || loadingSituacoes || loadingQuadro || loadingDecoracao;
  const setoresUsuario = usuarioAtual?.setoresIds || [];

  // Ajustar grupo selecionado se gestor só tem acesso a um
  useEffect(() => {
    if (isGestorSetor && setoresNomes.size > 0) {
      if (!temAcessoSopro && temAcessoDecoracao) {
        setGrupoSelecionado('DECORAÇÃO');
      } else if (temAcessoSopro && !temAcessoDecoracao) {
        setGrupoSelecionado('SOPRO');
      }
    }
  }, [isGestorSetor, temAcessoSopro, temAcessoDecoracao, setoresNomes]);

  const filtrarPorSetorUsuario = (funcionarios: typeof funcionariosQuadro, grupoAtual: string) => {
    if (!isGestorSetor) return funcionarios;
    const setoresDoUsuario = setoresUsuario.map(id => setoresNomes.get(id) || '');
    const isGestorSopro = setoresDoUsuario.some(nome => nome.includes('SOPRO'));
    const isGestorDecoracao = setoresDoUsuario.some(nome =>
      nome.includes('DECORAÇÃO') || nome.includes('DECORACAO')
    );
    if (isGestorSopro && grupoAtual === 'SOPRO') {
      // Filtrar apenas pelos setores específicos do gestor
      return funcionarios.filter(f => setoresUsuario.includes(f.setor_id));
    }
    if (isGestorDecoracao && grupoAtual === 'DECORAÇÃO') {
      return funcionarios.filter(f => setoresUsuario.includes(f.setor_id));
    }
    return [];
  };

  const funcionariosSopro = useMemo(() => {
    const filtered = funcionariosQuadro.filter(f => {
      const setorNome = f.setor?.nome?.toUpperCase() || '';
      return setorNome.includes('SOPRO');
    });
    return filtrarPorSetorUsuario(filtered, 'SOPRO');
  }, [funcionariosQuadro, isGestorSetor, setoresUsuario, setoresNomes]);

  const funcionariosDecoracao = useMemo(() => {
    const filtered = funcionariosQuadro.filter(f => {
      const setorNome = f.setor?.nome?.toUpperCase() || '';
      return setorNome.includes('DECORAÇÃO') || setorNome.includes('DECORACAO');
    });
    return filtrarPorSetorUsuario(filtered, 'DECORAÇÃO');
  }, [funcionariosQuadro, isGestorSetor, setoresUsuario, setoresNomes]);

  const todosSopro = useMemo(() => {
    const filtered = todosFuncionarios.filter(f => {
      const setorNome = f.setor?.nome?.toUpperCase() || '';
      return setorNome.includes('SOPRO');
    });
    if (!isGestorSetor) return filtered;
    const setoresDoUsuario = setoresUsuario.map(id => setoresNomes.get(id) || '');
    const isGestorSopro = setoresDoUsuario.some(nome => nome.includes('SOPRO'));
    if (isGestorSopro) return filtered.filter(f => setoresUsuario.includes(f.setor_id));
    return [];
  }, [todosFuncionarios, isGestorSetor, setoresUsuario, setoresNomes]);

  const todosDecoracao = useMemo(() => {
    const filtered = todosFuncionarios.filter(f => {
      const setorNome = f.setor?.nome?.toUpperCase() || '';
      return setorNome.includes('DECORAÇÃO') || setorNome.includes('DECORACAO');
    });
    if (!isGestorSetor) return filtered;
    const setoresDoUsuario = setoresUsuario.map(id => setoresNomes.get(id) || '');
    const isGestorDecoracao = setoresDoUsuario.some(nome =>
      nome.includes('DECORAÇÃO') || nome.includes('DECORACAO')
    );
    if (isGestorDecoracao) return filtered.filter(f => setoresUsuario.includes(f.setor_id));
    return [];
  }, [todosFuncionarios, isGestorSetor, setoresUsuario, setoresNomes]);

  // Sumidos por turma
  const sumidosSopro = useMemo(() => {
    const result: Record<string, { total: number; nomes: string[] }> = {};
    ['A', 'B', 'C'].forEach(turma => {
      const grupoEsperado = `SOPRO ${turma}`;
      const sumidos = todosSopro.filter(f => {
        const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
        const grupoSetor = f.setor?.grupo?.toUpperCase() || '';
        return situacaoNome === 'SUMIDO' && grupoSetor === grupoEsperado;
      });
      result[turma] = { total: sumidos.length, nomes: sumidos.map(f => f.nome_completo) };
    });
    return result;
  }, [todosSopro]);

  const sumidosDecoracao = useMemo(() => {
    const result: Record<string, { total: number; nomes: string[] }> = {};
    ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'].forEach(turmaKey => {
      const sumidos = todosDecoracao.filter(f => {
        const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
        if (situacaoNome !== 'SUMIDO') return false;
        const turmaFunc = f.turma?.toUpperCase();
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isDia = setorNome.includes('DIA');
        const isNoite = setorNome.includes('NOITE');
        if (turmaFunc === 'T1' || turmaFunc === '1') {
          return (isDia && turmaKey === 'DIA-T1') || (isNoite && turmaKey === 'NOITE-T1');
        }
        if (turmaFunc === 'T2' || turmaFunc === '2') {
          return (isDia && turmaKey === 'DIA-T2') || (isNoite && turmaKey === 'NOITE-T2');
        }
        return false;
      });
      result[turmaKey] = { total: sumidos.length, nomes: sumidos.map(f => f.nome_completo) };
    });
    return result;
  }, [todosDecoracao]);

  // Calcular status por turma (cob. férias, treinamento)
  const calcularStatusPorTurma = (todosFunc: typeof todosFuncionarios, statusMatch: (nome: string) => boolean) => {
    const resultSopro: Record<string, { total: number; nomes: string[] }> = {};
    ['A', 'B', 'C'].forEach(turma => {
      const grupoEsperado = `SOPRO ${turma}`;
      const filtered = todosFunc.filter(f => {
        const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
        const grupoSetor = f.setor?.grupo?.toUpperCase() || '';
        return statusMatch(situacaoNome) && grupoSetor === grupoEsperado;
      });
      resultSopro[turma] = { total: filtered.length, nomes: filtered.map(f => f.nome_completo) };
    });

    const resultDeco: Record<string, { total: number; nomes: string[] }> = {};
    ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'].forEach(turmaKey => {
      const filtered = todosFunc.filter(f => {
        const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
        if (!statusMatch(situacaoNome)) return false;
        const turmaFunc = f.turma?.toUpperCase();
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isDia = setorNome.includes('DIA');
        const isNoite = setorNome.includes('NOITE');
        if (turmaFunc === 'T1' || turmaFunc === '1') {
          return (isDia && turmaKey === 'DIA-T1') || (isNoite && turmaKey === 'NOITE-T1');
        }
        if (turmaFunc === 'T2' || turmaFunc === '2') {
          return (isDia && turmaKey === 'DIA-T2') || (isNoite && turmaKey === 'NOITE-T2');
        }
        return false;
      });
      resultDeco[turmaKey] = { total: filtered.length, nomes: filtered.map(f => f.nome_completo) };
    });

    return { sopro: resultSopro, deco: resultDeco };
  };

  const cobFeriasData = useMemo(() => {
    const soproData = calcularStatusPorTurma(todosSopro, (nome) => nome.includes('COB') || nome.includes('COBERTURA'));
    const decoData = calcularStatusPorTurma(todosDecoracao, (nome) => nome.includes('COB') || nome.includes('COBERTURA'));
    return { sopro: soproData.sopro, deco: decoData.deco };
  }, [todosSopro, todosDecoracao]);

  const treinamentoData = useMemo(() => {
    const soproData = calcularStatusPorTurma(todosSopro, (nome) => nome.includes('TREINAMENTO'));
    const decoData = calcularStatusPorTurma(todosDecoracao, (nome) => nome.includes('TREINAMENTO'));
    return { sopro: soproData.sopro, deco: decoData.deco };
  }, [todosSopro, todosDecoracao]);

  // Desfalque sopro
  const desfalqueSopro = useMemo(() => {
    const result: Record<string, number> = { A: 0, B: 0, C: 0 };
    quadroPlanejado.forEach(q => {
      const reservaRefeicaoIndustria = Math.round(q.aux_maquina_industria / 6);
      const reservaRefeicaoGP = Math.round(q.aux_maquina_gp / 6);
      const totalNecessario =
        q.aux_maquina_industria + q.reserva_ferias_industria + reservaRefeicaoIndustria +
        q.reserva_faltas_industria + q.amarra_pallets + q.revisao_frasco +
        q.mod_sindicalista + q.controle_praga + q.aux_maquina_gp +
        q.reserva_faltas_gp + reservaRefeicaoGP + q.reserva_ferias_gp + q.aumento_quadro;

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

  // Desfalque decoração
  const desfalqueDecoracao = useMemo(() => {
    const result: Record<string, number> = {
      'DIA-T1': 0, 'DIA-T2': 0, 'NOITE-T1': 0, 'NOITE-T2': 0
    };
    quadroDecoracao.forEach(q => {
      const totalNecessario = q.aux_maquina + q.reserva_refeicao + q.reserva_faltas +
        q.reserva_ferias + q.apoio_topografia + q.reserva_afastadas + q.reserva_covid;
      const funcTurma = funcionariosDecoracao.filter(f => {
        const turma = f.turma?.toUpperCase();
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isDia = setorNome.includes('DIA');
        const isNoite = setorNome.includes('NOITE');
        if (turma === 'T1' || turma === '1') {
          return (isDia && q.turma === 'DIA-T1') || (isNoite && q.turma === 'NOITE-T1');
        }
        if (turma === 'T2' || turma === '2') {
          return (isDia && q.turma === 'DIA-T2') || (isNoite && q.turma === 'NOITE-T2');
        }
        return false;
      });
      const quadroReal = funcTurma.length;
      result[q.turma] = totalNecessario - quadroReal;
    });
    return result;
  }, [quadroDecoracao, funcionariosDecoracao]);

  return {
    grupoSelecionado,
    setGrupoSelecionado,
    isLoading,
    isRHMode,
    isGestorSetor,
    canExportExcel,
    temAcessoSopro,
    temAcessoDecoracao,
    funcionariosSopro,
    funcionariosDecoracao,
    todosSopro,
    todosDecoracao,
    todosFuncionarios,
    quadroPlanejado,
    quadroDecoracao,
    demissoesPendentes,
    periodos,
    funcionariosPrevisao,
    sumidosSopro,
    sumidosDecoracao,
    cobFeriasData,
    treinamentoData,
    desfalqueSopro,
    desfalqueDecoracao,
  };
}
