import { useState, useMemo, useCallback } from 'react';
import { QuadroPlanejado } from '@/types/database';
import { useUpdateQuadroPlanejado } from '@/hooks/useQuadroPlanejado';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface QuadroPlanejadoTableProps {
  grupo: string;
  dados: QuadroPlanejado[];
  turmas: string[];
}

interface LinhaConfig {
  key: string;
  label: string;
  empresa: 'GLOBALPACK' | 'G+P' | null;
  editavel: boolean;
  calculoFn?: (dados: QuadroPlanejado) => number;
}

const linhasConfig: LinhaConfig[] = [
  // GLOBALPACK
  { key: 'aux_maquina_industria', label: 'Auxiliares em Maquina (Industria)', empresa: 'GLOBALPACK', editavel: true },
  { key: 'reserva_ferias_industria', label: 'Reserva Férias (Industria)', empresa: 'GLOBALPACK', editavel: true },
  { key: 'reserva_refeicao_industria', label: 'Reserva Refeição (Industria)', empresa: 'GLOBALPACK', editavel: false, calculoFn: (d) => Math.round(d.aux_maquina_industria / 6) },
  { key: 'reserva_faltas_industria', label: 'Reserva Faltas (Industria)', empresa: 'GLOBALPACK', editavel: true },
  { key: 'amarra_pallets', label: 'Amarra Pallets (Industria)', empresa: 'GLOBALPACK', editavel: true },
  { key: 'revisao_frasco', label: 'Revisão Frasco (Industria)', empresa: 'GLOBALPACK', editavel: true },
  { key: 'mod_sindicalista', label: 'MOD Sindicalista (Industria)', empresa: 'GLOBALPACK', editavel: true },
  { key: 'controle_praga', label: 'Controle Praga (Industria) Limpeza Insumos', empresa: 'GLOBALPACK', editavel: true },
  // G+P
  { key: 'aux_maquina_gp', label: 'Auxiliares em Maquina (G+P)', empresa: 'G+P', editavel: true },
  { key: 'reserva_faltas_gp', label: 'Reserva Faltas (G+P)', empresa: 'G+P', editavel: true },
  { key: 'reserva_refeicao_gp', label: 'Reserva Refeição (G+P)', empresa: 'G+P', editavel: false, calculoFn: (d) => Math.round(d.aux_maquina_gp / 6) },
  { key: 'reserva_ferias_gp', label: 'Reserva Férias (G+P)', empresa: 'G+P', editavel: true },
  // Aumento
  { key: 'aumento_quadro', label: 'AUMENTO DE QUADRO (prévia planejamento)', empresa: null, editavel: true },
];

function calcularTotal(dados: QuadroPlanejado): number {
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

function calcularTemporarios(total: number): number {
  return Math.round(total * 0.2);
}

function calcularQuadroEfetivo(total: number, temporarios: number): number {
  return total - temporarios;
}

export function QuadroPlanejadoTable({ grupo, dados, turmas }: QuadroPlanejadoTableProps) {
  const updateMutation = useUpdateQuadroPlanejado();
  const [editingCell, setEditingCell] = useState<{ id: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const dadosPorTurma = useMemo(() => {
    const mapa: Record<string, QuadroPlanejado> = {};
    dados.forEach(d => {
      mapa[d.turma] = d;
    });
    return mapa;
  }, [dados]);

  const handleStartEdit = useCallback((id: string, key: string, valor: number) => {
    setEditingCell({ id, key });
    setEditValue(valor.toString());
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingCell) return;
    
    const novoValor = parseInt(editValue) || 0;
    updateMutation.mutate({
      id: editingCell.id,
      [editingCell.key]: novoValor,
    });
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, updateMutation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  }, [handleSaveEdit]);

  const getValorLinha = (linha: LinhaConfig, dados: QuadroPlanejado): number => {
    if (linha.calculoFn) {
      return linha.calculoFn(dados);
    }
    return (dados as any)[linha.key] || 0;
  };

  // Calcular totais por turma
  const totaisPorTurma = useMemo(() => {
    const result: Record<string, { total: number; temporarios: number; efetivo: number }> = {};
    turmas.forEach(turma => {
      const d = dadosPorTurma[turma];
      if (d) {
        const total = calcularTotal(d);
        const temporarios = calcularTemporarios(total);
        const efetivo = calcularQuadroEfetivo(total, temporarios);
        result[turma] = { total, temporarios, efetivo };
      }
    });
    return result;
  }, [dadosPorTurma, turmas]);

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 font-bold text-center uppercase tracking-wide bg-primary text-primary-foreground">
        {grupo}
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
            <tr className="bg-muted/50">
              <th className="text-left font-semibold py-2 px-3 border-b"></th>
              <th className="text-left font-semibold py-2 px-3 border-b">
                Auxiliares
              </th>
              {turmas.map(turma => (
                <th key={turma} className="text-center font-semibold py-2 px-3 border-b bg-primary/10">
                  {grupo} {turma}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhasConfig.map((linha, index) => (
              <tr 
                key={linha.key} 
                className={cn(
                  'hover:bg-muted/30 transition-colors',
                  linha.empresa === 'G+P' && index === 8 && 'border-t-2 border-primary/20',
                  linha.key === 'aumento_quadro' && 'border-t-2 border-primary/20'
                )}
              >
                <td className="py-2 px-3 border-b text-xs text-muted-foreground font-medium text-center">
                  {linha.empresa || ''}
                </td>
                <td className={cn(
                  'py-2 px-3 border-b',
                  !linha.editavel && 'text-muted-foreground italic'
                )}>
                  {linha.label}
                  {!linha.editavel && <span className="ml-2 text-xs">(calculado)</span>}
                </td>
                {turmas.map(turma => {
                  const d = dadosPorTurma[turma];
                  if (!d) return <td key={turma} className="text-center py-2 px-3 border-b">-</td>;
                  
                  const valor = getValorLinha(linha, d);
                  const isEditing = editingCell?.id === d.id && editingCell?.key === linha.key;
                  
                  return (
                    <td key={turma} className="text-center py-2 px-3 border-b">
                      {linha.editavel ? (
                        isEditing ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSaveEdit}
                            onKeyDown={handleKeyDown}
                            className="w-20 h-8 text-center mx-auto"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => handleStartEdit(d.id, linha.key, valor)}
                            className="w-full h-full py-1 px-2 hover:bg-primary/10 rounded transition-colors tabular-nums font-medium"
                          >
                            {valor}
                          </button>
                        )
                      ) : (
                        <span className="tabular-nums text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          {valor}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            {/* Linha vazia */}
            <tr className="h-2 bg-muted/20"></tr>
            
            {/* TOTAL */}
            <tr className="bg-primary/20 font-bold">
              <td className="py-2.5 px-3 border-t-2"></td>
              <td className="py-2.5 px-3 border-t-2">TOTAL</td>
              {turmas.map(turma => (
                <td key={turma} className="text-center py-2.5 px-3 border-t-2 tabular-nums">
                  {totaisPorTurma[turma]?.total || 0}
                </td>
              ))}
            </tr>
            
            {/* QUADRO EFETIVO */}
            <tr className="bg-muted/30">
              <td className="py-2 px-3 border-b"></td>
              <td className="py-2 px-3 border-b">QUADRO EFETIVO (futuro)</td>
              {turmas.map(turma => (
                <td key={turma} className="text-center py-2 px-3 border-b tabular-nums">
                  {totaisPorTurma[turma]?.efetivo || 0}
                </td>
              ))}
            </tr>
            
            {/* TEMPORÁRIOS */}
            <tr className="bg-muted/30">
              <td className="py-2 px-3 border-b"></td>
              <td className="py-2 px-3 border-b">TEMPORÁRIOS (futuro) <span className="text-xs text-muted-foreground">(20%)</span></td>
              {turmas.map(turma => (
                <td key={turma} className="text-center py-2 px-3 border-b tabular-nums">
                  {totaisPorTurma[turma]?.temporarios || 0}
                </td>
              ))}
            </tr>
            
            {/* Linha vazia */}
            <tr className="h-2 bg-muted/20"></tr>
            
            {/* TOTAL QUADRO NECESSÁRIO */}
            <tr className="bg-primary font-bold text-primary-foreground">
              <td className="py-3 px-3"></td>
              <td className="py-3 px-3">TOTAL QUADRO NECESSÁRIO</td>
              {turmas.map(turma => (
                <td key={turma} className="text-center py-3 px-3 tabular-nums text-lg">
                  {totaisPorTurma[turma]?.total || 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
