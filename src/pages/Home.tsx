import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { LayoutDashboard } from 'lucide-react';
import { MetricasTurmaCards } from '@/components/dashboard/MetricasTurmaCards';
import { useAdmissaoRecente, agruparRecentesPorTurma } from '@/hooks/useAdmissaoRecente';
import { useTreinamentosPrevisao } from '@/hooks/useTreinamentosPrevisao';
import { HomeFaltasMetrics } from '@/components/home/HomeFaltasMetrics';

export default function Home() {
  const navigate = useNavigate();
  const data = useDashboardData();
  const { data: recentesSopro = [] } = useAdmissaoRecente('SOPRO');
  const { data: recentesDeco = [] } = useAdmissaoRecente('DECORAÇÃO');
  const { data: treinamentosPrevisao = [] } = useTreinamentosPrevisao();

  const recentesPorTurmaSopro = useMemo(() => agruparRecentesPorTurma(recentesSopro, 'SOPRO'), [recentesSopro]);
  const recentesPorTurmaDeco = useMemo(() => agruparRecentesPorTurma(recentesDeco, 'DECORAÇÃO'), [recentesDeco]);

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="home-premium-dashboard -m-4 min-h-[calc(100vh-3.5rem)] space-y-6 p-4 md:-m-6 md:p-6">
      <div className="flex min-h-[78px] items-center justify-between rounded-[20px] border border-white/20 bg-[linear-gradient(90deg,#003B95,#0057D9,#1976D2)] px-4 shadow-[0_16px_40px_rgba(0,87,217,.22)] sm:px-6">
        <div>
          <h1 className="text-lg font-bold tracking-wide text-white">QUADRO DE FUNCIONARIOS</h1>
          <p className="text-xs font-medium text-white/80">Dashboard de quadro em tempo real</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-2 rounded-xl border-white bg-white text-[#0057D9] shadow-sm hover:bg-[#EAF3FF] hover:text-[#003B95]">
          <LayoutDashboard className="h-4 w-4" />
          Ver quadro completo
        </Button>
      </div>

      <MetricasTurmaCards
        grupo="SOPRO"
        funcionarios={data.funcionariosSopro}
        todosFuncionariosArea={data.todosSopro}
        quadroPlanejadoSopro={data.quadroPlanejado}
        funcionariosPrevisao={data.funcionariosPrevisao}
        sumidosPorTurma={data.sumidosSopro}
        cobFeriasPorTurma={data.cobFeriasData.sopro}
        treinamentoPorTurma={data.treinamentoData.sopro}
        mostrarSumidos={false}
        recentesPorTurma={recentesPorTurmaSopro}
        treinamentosPrevisao={treinamentosPrevisao}
      />

      <MetricasTurmaCards
        grupo="DECORAÇÃO"
        funcionarios={data.funcionariosDecoracao}
        todosFuncionariosArea={data.todosDecoracao}
        quadroPlanejadoDecoracao={data.quadroDecoracao}
        funcionariosPrevisao={data.funcionariosPrevisao}
        sumidosPorTurma={data.sumidosDecoracao}
        cobFeriasPorTurma={data.cobFeriasData.deco}
        treinamentoPorTurma={data.treinamentoData.deco}
        mostrarSumidos={false}
        recentesPorTurma={recentesPorTurmaDeco}
        treinamentosPrevisao={treinamentosPrevisao}
      />

      <HomeFaltasMetrics />
    </div>
  );
}
