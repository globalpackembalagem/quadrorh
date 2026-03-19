import { useMemo } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardGroupSelector } from '@/components/dashboard/DashboardGroupSelector';
import { DashboardTables } from '@/components/dashboard/DashboardTables';
import { MetricasTurmaCards } from '@/components/dashboard/MetricasTurmaCards';
import { useAdmissaoRecente, agruparRecentesPorTurma } from '@/hooks/useAdmissaoRecente';
import { toast } from 'sonner';
// xlsx-js-style loaded dynamically
import { format } from 'date-fns';

export default function Dashboard() {
  const data = useDashboardData();
  const { data: recentes = [] } = useAdmissaoRecente(data.grupoSelecionado);
  const recentesPorTurma = useMemo(() => agruparRecentesPorTurma(recentes, data.grupoSelecionado), [recentes, data.grupoSelecionado]);

  const getTurmaLabel = (func: any, grupo: string): string => {
    const setorNome = func.setor?.nome?.toUpperCase() || '';
    const turma = func.turma?.toUpperCase()?.trim() || '';

    if (grupo === 'SOPRO') {
      const grupoSetor = func.setor?.grupo?.toUpperCase() || '';
      const match = grupoSetor.match(/SOPRO\s+([ABC])/);
      if (match) return `SOPRO ${match[1]}`;
      if (['A', 'B', 'C'].includes(turma)) return `SOPRO ${turma}`;
      return 'SOPRO (SEM TURMA)';
    }

    const isDia = setorNome.includes('DIA');
    const isNoite = setorNome.includes('NOITE');
    if (turma === 'T1' || turma === '1') return isDia ? 'DIA-T1' : isNoite ? 'NOITE-T1' : 'SEM TURMA';
    if (turma === 'T2' || turma === '2') return isDia ? 'DIA-T2' : isNoite ? 'NOITE-T2' : 'SEM TURMA';
    return 'SEM TURMA';
  };

  const exportarExcelPorTurma = async () => {
    const XLSX = await import('xlsx-js-style');
    const grupo = data.grupoSelecionado;
    const funcionarios = grupo === 'SOPRO' ? data.funcionariosSopro : data.funcionariosDecoracao;

    if (funcionarios.length === 0) {
      toast.error('Nenhum funcionário para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Agrupar por turma
    const porTurma: Record<string, typeof funcionarios> = {};
    funcionarios.forEach(f => {
      const turmaLabel = getTurmaLabel(f, grupo);
      if (!porTurma[turmaLabel]) porTurma[turmaLabel] = [];
      porTurma[turmaLabel].push(f);
    });

    // Ordenar turmas
    const turmasOrdenadas = Object.keys(porTurma).sort();

    // Aba RESUMO
    const resumoData = turmasOrdenadas.map(turma => ({
      'Turma': turma,
      'Quantidade': porTurma[turma].length,
    }));
    resumoData.push({ 'Turma': 'TOTAL', 'Quantidade': funcionarios.length });
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 20 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Uma aba por turma
    turmasOrdenadas.forEach(turma => {
      const funcs = porTurma[turma].sort((a, b) =>
        a.nome_completo.localeCompare(b.nome_completo)
      );
      const dadosAba = funcs.map((f, idx) => ({
        'Nº': idx + 1,
        'Nome': f.nome_completo,
        'Matrícula': f.matricula || '',
        'Situação': f.situacao?.nome || '',
        'Cargo': f.cargo || '',
        'Empresa': f.empresa || '',
        'Admissão': f.data_admissao ? format(new Date(f.data_admissao), 'dd/MM/yyyy') : '',
      }));
      const ws = XLSX.utils.json_to_sheet(dadosAba);
      ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 14 }, { wch: 12 }];
      const nomeAba = turma.length > 31 ? turma.substring(0, 31) : turma;
      XLSX.utils.book_append_sheet(wb, ws, nomeAba);
    });

    const dataAtual = format(new Date(), 'dd-MM-yyyy_HH-mm');
    XLSX.writeFile(wb, `${grupo}_PorTurma_${dataAtual}.xlsx`);
    toast.success(`Excel exportado: ${funcionarios.length} funcionário(s) em ${turmasOrdenadas.length} turma(s)`);
  };

  const exportarExcel = async () => {
    const XLSX = await import('xlsx-js-style');
    const wb = XLSX.utils.book_new();

    const resumoSoproData = data.quadroPlanejado.map(q => {
      const funcTurma = data.funcionariosSopro.filter(f => {
        const turma = f.turma?.toUpperCase() || '';
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        return turma === q.turma || setorNome.includes(`SOPRO ${q.turma}`);
      });
      const planejado = q.aux_maquina_industria + q.reserva_ferias_industria +
        q.reserva_faltas_industria + q.amarra_pallets + q.revisao_frasco +
        q.mod_sindicalista + q.controle_praga + q.aux_maquina_gp +
        q.reserva_faltas_gp + q.reserva_ferias_gp + q.aumento_quadro;
      return {
        'Turma': q.turma,
        'Quadro Planejado': planejado,
        'Quadro Real': funcTurma.length,
        'Diferença': funcTurma.length - planejado,
      };
    });
    const wsSopro = XLSX.utils.json_to_sheet(resumoSoproData);
    XLSX.utils.book_append_sheet(wb, wsSopro, 'Resumo SOPRO');

    const resumoDecoData = data.quadroDecoracao.map(q => {
      const funcTurma = data.funcionariosDecoracao.filter(f => {
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
      const planejado = q.aux_maquina + q.reserva_refeicao + q.reserva_faltas +
        q.reserva_ferias + q.apoio_topografia + q.reserva_afastadas + q.reserva_covid;
      return {
        'Turma': q.turma,
        'Quadro Planejado': planejado,
        'Quadro Real': funcTurma.length,
        'Diferença': funcTurma.length - planejado,
      };
    });
    const wsDeco = XLSX.utils.json_to_sheet(resumoDecoData);
    XLSX.utils.book_append_sheet(wb, wsDeco, 'Resumo DECORAÇÃO');

    const funcSoproData = data.funcionariosSopro.map(f => ({
      'Nome': f.nome_completo,
      'Matrícula': f.matricula || '',
      'Setor': f.setor?.nome || '',
      'Turma': f.turma || '',
      'Situação': f.situacao?.nome || '',
      'Cargo': f.cargo || '',
      'Admissão': f.data_admissao || '',
    }));
    const wsFuncSopro = XLSX.utils.json_to_sheet(funcSoproData);
    XLSX.utils.book_append_sheet(wb, wsFuncSopro, 'Funcionários SOPRO');

    const funcDecoData = data.funcionariosDecoracao.map(f => ({
      'Nome': f.nome_completo,
      'Matrícula': f.matricula || '',
      'Setor': f.setor?.nome || '',
      'Turma': f.turma || '',
      'Situação': f.situacao?.nome || '',
      'Cargo': f.cargo || '',
      'Admissão': f.data_admissao || '',
    }));
    const wsFuncDeco = XLSX.utils.json_to_sheet(funcDecoData);
    XLSX.utils.book_append_sheet(wb, wsFuncDeco, 'Funcionários DECORAÇÃO');

    const dataAtual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `quadro_funcionarios_${dataAtual}.xlsx`);
    toast.success('Excel exportado com sucesso!');
  };

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        isGestorSetor={data.isGestorSetor}
        isRHMode={data.isRHMode}
        podeExportar={data.canExportExcel}
        onExportarExcel={exportarExcel}
        onExportarPorTurma={exportarExcelPorTurma}
        grupoSelecionado={data.grupoSelecionado}
      />

      <DashboardGroupSelector
        grupoSelecionado={data.grupoSelecionado}
        setGrupoSelecionado={data.setGrupoSelecionado}
        temAcessoSopro={data.temAcessoSopro}
        temAcessoDecoracao={data.temAcessoDecoracao}
        isRHMode={data.isRHMode}
        isGestorSetor={data.isGestorSetor}
        todosSopro={data.todosSopro}
        todosDecoracao={data.todosDecoracao}
        todosFuncionarios={data.todosFuncionarios}
      />

      <MetricasTurmaCards
        grupo={data.grupoSelecionado}
        funcionarios={data.grupoSelecionado === 'SOPRO' ? data.funcionariosSopro : data.funcionariosDecoracao}
        quadroPlanejadoSopro={data.quadroPlanejado}
        quadroPlanejadoDecoracao={data.quadroDecoracao}
        funcionariosPrevisao={data.funcionariosPrevisao}
        sumidosPorTurma={data.grupoSelecionado === 'SOPRO' ? data.sumidosSopro : data.sumidosDecoracao}
        cobFeriasPorTurma={data.grupoSelecionado === 'SOPRO' ? data.cobFeriasData.sopro : data.cobFeriasData.deco}
        treinamentoPorTurma={data.grupoSelecionado === 'SOPRO' ? data.treinamentoData.sopro : data.treinamentoData.deco}
        mostrarSumidos={false}
        recentesPorTurma={recentesPorTurma}
      />

      <DashboardTables
        grupoSelecionado={data.grupoSelecionado}
        funcionariosSopro={data.funcionariosSopro}
        funcionariosDecoracao={data.funcionariosDecoracao}
        todosSopro={data.todosSopro}
        todosDecoracao={data.todosDecoracao}
        quadroPlanejado={data.quadroPlanejado}
        quadroDecoracao={data.quadroDecoracao}
        demissoesPendentes={data.demissoesPendentes}
        periodos={data.periodos}
        desfalqueSopro={data.desfalqueSopro}
        desfalqueDecoracao={data.desfalqueDecoracao}
      />
    </div>
  );
}
