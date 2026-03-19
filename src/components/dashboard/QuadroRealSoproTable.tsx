import { useMemo } from 'react';
import { Funcionario, QuadroPlanejado } from '@/types/database';
import { cn } from '@/lib/utils';

interface QuadroRealSoproTableProps {
  funcionarios: Funcionario[];
  quadroPlanejado: QuadroPlanejado[];
  turmas: string[];
}

function calcularTotalPlanejado(dados: QuadroPlanejado): number {
  const reservaRefeicaoIndustria = Math.round(dados.aux_maquina_industria / 6);
  const reservaRefeicaoGP = Math.round(dados.aux_maquina_gp / 6);
  
  return (
    dados.aux_maquina_industria +
    dados.reserva_ferias_industria +
    reservaRefeicaoIndustria +
    dados.reserva_faltas_industria +
    dados.amarra_pallets +
    dados.revisao_frasco +
    dados.mod_sindicalista +
    dados.controle_praga +
    dados.aux_maquina_gp +
    dados.reserva_faltas_gp +
    reservaRefeicaoGP +
    dados.reserva_ferias_gp +
    dados.aumento_quadro
  );
}

export function QuadroRealSoproTable({ funcionarios, quadroPlanejado, turmas }: QuadroRealSoproTableProps) {
  const planejadoPorTurma = useMemo(() => {
    const mapa: Record<string, QuadroPlanejado> = {};
    quadroPlanejado.forEach(q => {
      mapa[q.turma] = q;
    });
    return mapa;
  }, [quadroPlanejado]);

  // Agrupar funcionários por grupo do setor (SOPRO A, SOPRO B, SOPRO C)
  const dadosPorTurma = useMemo(() => {
    const result: Record<string, {
      gp: number;
      globalpack: number;
      temporarios: number;
      quadroReal: number;
      totalNecessario: number;
      desfalque: number;
    }> = {};

    turmas.forEach(turma => {
      // Filtrar funcionários pelo grupo do setor (ex: "SOPRO A", "SOPRO B", "SOPRO C")
      const grupoEsperado = `SOPRO ${turma}`;
      const funcTurma = funcionarios.filter(f => {
        const grupoSetor = f.setor?.grupo?.toUpperCase() || '';
        return grupoSetor === grupoEsperado;
      });
      
      // Contar G+P: funcionários do setor "PRODUÇÃO SOPRO G+P" (efetivos - sem TEMP)
      const gp = funcTurma.filter(f => {
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isSetorGP = setorNome.includes('G+P') || setorNome.includes('PRODUÇÃO SOPRO G+P');
        const isTemporario = f.matricula && f.matricula.toUpperCase().startsWith('TEMP');
        return isSetorGP && !isTemporario;
      }).length;
      
      // Contar GLOBALPACK: funcionários do setor "MOD - SOPRO" (efetivos - sem TEMP)
      const globalpack = funcTurma.filter(f => {
        const setorNome = f.setor?.nome?.toUpperCase() || '';
        const isSetorMOD = setorNome.includes('MOD - SOPRO') || (setorNome.includes('MOD') && setorNome.includes('SOPRO') && !setorNome.includes('G+P'));
        const isTemporario = f.matricula && f.matricula.toUpperCase().startsWith('TEMP');
        return isSetorMOD && !isTemporario;
      }).length;
      
      // Contar temporários (qualquer setor com matrícula começando com TEMP)
      const temporarios = funcTurma.filter(f => 
        f.matricula && f.matricula.toUpperCase().startsWith('TEMP')
      ).length;
      
      const quadroReal = gp + globalpack + temporarios;
      
      // Pegar total necessário do planejado
      const planejado = planejadoPorTurma[turma];
      const totalNecessario = planejado ? calcularTotalPlanejado(planejado) : 0;
      
      const desfalque = totalNecessario - quadroReal;

      result[turma] = {
        gp,
        globalpack,
        temporarios,
        quadroReal,
        totalNecessario,
        desfalque,
      };
    });

    return result;
  }, [funcionarios, turmas, planejadoPorTurma]);

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 font-bold text-center uppercase tracking-wide bg-primary text-primary-foreground">
        SOPRO - QUADRO REAL
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-12" />
            <col className="w-[188px]" />
            {turmas.map(turma => (
              <col key={turma} className="w-[100px]" />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-primary/15">
              <th className="py-2 px-3 border-b"></th>
              <th className="text-left font-semibold py-2 px-3 border-b">
                SOPRO
              </th>
              {turmas.map(turma => (
                <th key={turma} className="text-center font-semibold py-2 px-3 border-b">
                  SOPRO {turma}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* G+P / PLASTICASE */}
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3 border-b"></td>
              <td className="py-2 px-3 border-b font-medium">G+P</td>
              {turmas.map(turma => (
                <td key={turma} className="text-center py-2 px-3 border-b tabular-nums">
                  {dadosPorTurma[turma]?.gp || 0}
                </td>
              ))}
            </tr>
            
            {/* GLOBALPACK */}
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3 border-b"></td>
              <td className="py-2 px-3 border-b font-medium">GLOBALPACK</td>
              {turmas.map(turma => (
                <td key={turma} className="text-center py-2 px-3 border-b tabular-nums">
                  {dadosPorTurma[turma]?.globalpack || 0}
                </td>
              ))}
            </tr>
            
            {/* TEMPORÁRIOS */}
            <tr className="hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3 border-b"></td>
              <td className="py-2 px-3 border-b font-medium">TEMPORÁRIOS</td>
              {turmas.map(turma => (
                <td key={turma} className="text-center py-2 px-3 border-b tabular-nums">
                  {dadosPorTurma[turma]?.temporarios || 0}
                </td>
              ))}
            </tr>
          </tbody>
          <tfoot>
            {/* QUADRO REAL */}
            <tr className="bg-primary/20 font-bold">
              <td className="py-2.5 px-3 border-t-2"></td>
              <td className="py-2.5 px-3 border-t-2">QUADRO REAL</td>
              {turmas.map(turma => (
                <td key={turma} className="text-center py-2.5 px-3 border-t-2 tabular-nums">
                  {dadosPorTurma[turma]?.quadroReal || 0}
                </td>
              ))}
            </tr>
            
            {/* Linha vazia */}
            <tr className="h-2 bg-muted/20"></tr>
            
            {/* DESFALQUE / SOBRA - fundo verde */}
            <tr className="bg-primary font-bold text-primary-foreground">
              <td className="py-3 px-3"></td>
              <td className="py-3 px-3">DESFALQUE / SOBRA</td>
              {turmas.map(turma => {
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
