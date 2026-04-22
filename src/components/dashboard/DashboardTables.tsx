import { QuadroPlanejadoTable } from '@/components/dashboard/QuadroPlanejadoTable';
import { QuadroDecoracaoTable } from '@/components/dashboard/QuadroDecoracaoTable';
import { QuadroRealSoproTable } from '@/components/dashboard/QuadroRealSoproTable';
import { QuadroRealDecoracaoTable } from '@/components/dashboard/QuadroRealDecoracaoTable';
import { SubstituicaoReposicaoTable } from '@/components/dashboard/SubstituicaoReposicaoTable';
import { HistoricoQuadroTable } from '@/components/dashboard/HistoricoQuadroTable';
import type { GrupoType } from '@/hooks/useDashboardData';
import type { Funcionario, QuadroPlanejado, QuadroDecoracao } from '@/types/database';
import type { Demissao, PeriodoDemissao } from '@/types/demissao';

const TURMAS_SOPRO = ['A', 'B', 'C'] as const;

interface DashboardTablesProps {
  grupoSelecionado: GrupoType;
  funcionariosSopro: Funcionario[];
  funcionariosDecoracao: Funcionario[];
  todosSopro: Funcionario[];
  todosDecoracao: Funcionario[];
  quadroPlanejado: QuadroPlanejado[];
  quadroDecoracao: QuadroDecoracao[];
  demissoesPendentes: Demissao[];
  periodos: PeriodoDemissao[];
  desfalqueSopro: Record<string, number>;
  desfalqueDecoracao: Record<string, number>;
}

export function DashboardTables({
  grupoSelecionado,
  funcionariosSopro,
  funcionariosDecoracao,
  todosSopro,
  todosDecoracao,
  quadroPlanejado,
  quadroDecoracao,
  demissoesPendentes,
  periodos,
  desfalqueSopro,
  desfalqueDecoracao,
}: DashboardTablesProps) {
  if (grupoSelecionado === 'SOPRO') {
    return (
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
        <HistoricoQuadroTable grupo="SOPRO" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <QuadroDecoracaoTable dados={quadroDecoracao} />
      <QuadroRealDecoracaoTable
        funcionarios={funcionariosDecoracao}
        quadroPlanejado={quadroDecoracao}
      />
      <SubstituicaoReposicaoTable
        grupo="DECORAÇÃO"
        funcionarios={todosDecoracao}
        demissoesPendentes={demissoesPendentes}
        periodos={periodos}
        desfalquePorTurma={desfalqueDecoracao}
      />
      <HistoricoQuadroTable grupo="DECORAÇÃO" />
    </div>
  );
}
