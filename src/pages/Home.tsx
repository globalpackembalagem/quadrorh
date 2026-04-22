import { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Clock } from 'lucide-react';
import { MetricasTurmaCards } from '@/components/dashboard/MetricasTurmaCards';
import { useAdmissaoRecente, agruparRecentesPorTurma } from '@/hooks/useAdmissaoRecente';
import { useTreinamentosPrevisao } from '@/hooks/useTreinamentosPrevisao';
import { useMemo } from 'react';
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground tracking-wide">QUADRO DE FUNCIONÁRIOS</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/faltas')} className="gap-2">
            <Clock className="h-4 w-4" />
            Faltas
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Quadro Completo
          </Button>
        </div>
      </div>

      {/* SOPRO Cards */}
      <MetricasTurmaCards
        grupo="SOPRO"
        funcionarios={data.funcionariosSopro}
        quadroPlanejadoSopro={data.quadroPlanejado}
        funcionariosPrevisao={data.funcionariosPrevisao}
        sumidosPorTurma={data.sumidosSopro}
        cobFeriasPorTurma={data.cobFeriasData.sopro}
        treinamentoPorTurma={data.treinamentoData.sopro}
        mostrarSumidos={false}
        recentesPorTurma={recentesPorTurmaSopro}
        treinamentosPrevisao={treinamentosPrevisao}
      />

      {/* DECORAÇÃO Cards */}
      <MetricasTurmaCards
        grupo="DECORAÇÃO"
        funcionarios={data.funcionariosDecoracao}
        quadroPlanejadoDecoracao={data.quadroDecoracao}
        funcionariosPrevisao={data.funcionariosPrevisao}
        sumidosPorTurma={data.sumidosDecoracao}
        cobFeriasPorTurma={data.cobFeriasData.deco}
        treinamentoPorTurma={data.treinamentoData.deco}
        mostrarSumidos={false}
        recentesPorTurma={recentesPorTurmaDeco}
        treinamentosPrevisao={treinamentosPrevisao}
      />

      {/* Métricas de Faltas */}
      <HomeFaltasMetrics />
    </div>
  );
}
