import { useMemo } from 'react';
import { Funcionario, QuadroDecoracao } from '@/types/database';
import { cn } from '@/lib/utils';

interface QuadroRealDecoracaoTableProps {
  funcionarios: Funcionario[];
  quadroPlanejado: QuadroDecoracao[];
}

const TURMAS_DECORACAO = ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'];

const turmasLabels: Record<string, string> = {
  'DIA-T1': 'DIA - TURMA 1',
  'DIA-T2': 'DIA - TURMA 2',
  'NOITE-T1': 'NOITE - TURMA 1',
  'NOITE-T2': 'NOITE - TURMA 2',
};

// Mapear turma do funcionário para turma do quadro
function mapearTurmaFuncionario(turmaFunc: string | null, setorNome: string | null): string | null {
  if (!setorNome) return null;
  
  const setorUpper = setorNome.toUpperCase();
  
  // Verificar se é setor de decoração que conta no quadro
  const isDecoracaoDia = setorUpper.includes('DECORAÇÃO MOD DIA') || setorUpper.includes('DECORACAO MOD DIA');
  const isDecoracaoNoite = setorUpper.includes('DECORAÇÃO MOD NOITE') || setorUpper.includes('DECORACAO MOD NOITE');
  
  if (!isDecoracaoDia && !isDecoracaoNoite) return null;
  
  // Se não tem turma definida, não pode mapear
  if (!turmaFunc) return null;
  
  const turmaUpper = turmaFunc.toUpperCase().trim();
  
  // Mapear turma T1/1 ou T2/2
  if (turmaUpper === 'T1' || turmaUpper === '1' || turmaUpper === 'TURMA 1') {
    return isDecoracaoDia ? 'DIA-T1' : 'NOITE-T1';
  }
  if (turmaUpper === 'T2' || turmaUpper === '2' || turmaUpper === 'TURMA 2') {
    return isDecoracaoDia ? 'DIA-T2' : 'NOITE-T2';
  }
  
  return null;
}

function calcularTotalPlanejado(dados: QuadroDecoracao): number {
  return (
    dados.aux_maquina +
    dados.reserva_refeicao +
    dados.reserva_faltas +
    dados.reserva_ferias +
    dados.apoio_topografia +
    dados.reserva_afastadas +
    dados.reserva_covid
  );
}

export function QuadroRealDecoracaoTable({ funcionarios, quadroPlanejado }: QuadroRealDecoracaoTableProps) {
  const planejadoPorTurma = useMemo(() => {
    const mapa: Record<string, QuadroDecoracao> = {};
    quadroPlanejado.forEach(q => {
      mapa[q.turma] = q;
    });
    return mapa;
  }, [quadroPlanejado]);

  // Agrupar funcionários por turma
  const dadosPorTurma = useMemo(() => {
    const result: Record<string, {
      total: number;
      temporarios: number;
      quadroReal: number;
      totalNecessario: number;
      desfalque: number;
    }> = {};

    TURMAS_DECORACAO.forEach(turma => {
      // Filtrar funcionários desta turma
      const funcTurma = funcionarios.filter(f => {
        const turmaMapeada = mapearTurmaFuncionario(f.turma, f.setor?.nome || null);
        return turmaMapeada === turma;
      });
      
      // Contar efetivos
      const efetivos = funcTurma.filter(f => 
        !f.matricula || !f.matricula.toUpperCase().startsWith('TEMP')
      ).length;
      
      // Contar temporários
      const temporarios = funcTurma.filter(f => 
        f.matricula && f.matricula.toUpperCase().startsWith('TEMP')
      ).length;
      
      const quadroReal = efetivos + temporarios;
      
      // Pegar total necessário do planejado
      const planejado = planejadoPorTurma[turma];
      const totalNecessario = planejado ? calcularTotalPlanejado(planejado) : 0;
      
      const desfalque = totalNecessario - quadroReal;

      result[turma] = {
        total: efetivos,
        temporarios,
        quadroReal,
        totalNecessario,
        desfalque,
      };
    });

    return result;
  }, [funcionarios, planejadoPorTurma]);

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 font-bold text-center uppercase tracking-wide bg-primary text-primary-foreground">
        DECORAÇÃO - QUADRO REAL
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary/15">
              <th className="text-left font-semibold py-2 px-3 border-b min-w-[200px]">
                DECORAÇÃO
              </th>
              {TURMAS_DECORACAO.map(turma => (
                <th key={turma} className="text-center font-semibold py-2 px-3 border-b min-w-[120px]">
                  {turmasLabels[turma]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Efetivos */}
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3 border-b font-medium">EFETIVOS</td>
              {TURMAS_DECORACAO.map(turma => (
                <td key={turma} className="text-center py-2 px-3 border-b tabular-nums">
                  {dadosPorTurma[turma]?.total || 0}
                </td>
              ))}
            </tr>
            
            {/* TEMPORÁRIOS */}
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3 border-b font-medium">TEMPORÁRIOS</td>
              {TURMAS_DECORACAO.map(turma => (
                <td key={turma} className="text-center py-2 px-3 border-b tabular-nums">
                  {dadosPorTurma[turma]?.temporarios || 0}
                </td>
              ))}
            </tr>
          </tbody>
          <tfoot>
            {/* QUADRO REAL */}
            <tr className="bg-primary/20 font-bold">
              <td className="py-2.5 px-3 border-t-2">QUADRO REAL</td>
              {TURMAS_DECORACAO.map(turma => (
                <td key={turma} className="text-center py-2.5 px-3 border-t-2 tabular-nums">
                  {dadosPorTurma[turma]?.quadroReal || 0}
                </td>
              ))}
            </tr>
            
            {/* Linha vazia */}
            <tr className="h-2 bg-muted/20"></tr>
            
            {/* DESFALQUE / SOBRA - fundo verde */}
            <tr className="bg-primary font-bold text-primary-foreground">
              <td className="py-3 px-3">DESFALQUE / SOBRA</td>
              {TURMAS_DECORACAO.map(turma => {
                const desfalque = dadosPorTurma[turma]?.desfalque || 0;
                // quadroFinal = Real - Necessário (invertido do desfalque)
                const quadroFinal = -desfalque;
                return (
                  <td 
                    key={turma} 
                    className={cn(
                      "text-center py-3 px-3 tabular-nums text-lg",
                      quadroFinal > 0 && "text-blue-200",
                      quadroFinal < 0 && "text-red-200",
                      quadroFinal === 0 && "text-white"
                    )}
                  >
                    {quadroFinal}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
