import { useState, useMemo, useCallback } from 'react';
import { QuadroDecoracao } from '@/types/database';
import { useUpdateQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { Input } from '@/components/ui/input';

interface QuadroDecoracaoTableProps {
  dados: QuadroDecoracao[];
}

interface LinhaConfig {
  key: 'aux_maquina' | 'reserva_refeicao' | 'reserva_faltas' | 'reserva_ferias' | 'apoio_topografia' | 'reserva_afastadas' | 'reserva_covid';
  label: string;
}

const linhasConfig: LinhaConfig[] = [
  { key: 'aux_maquina', label: 'Auxiliares em Maquina' },
  { key: 'reserva_refeicao', label: 'Reserva Refeicao' },
  { key: 'reserva_faltas', label: 'Reserva Faltas' },
  { key: 'reserva_ferias', label: 'Reserva Ferias' },
  { key: 'apoio_topografia', label: 'Apoio Topografia' },
  { key: 'reserva_afastadas', label: 'Reserva Afastadas' },
  { key: 'reserva_covid', label: 'Reserva Covid' },
];

const turmasLabels: Record<string, string> = {
  'DIA-T1': 'DIA - TURMA 1',
  'DIA-T2': 'DIA - TURMA 2',
  'NOITE-T1': 'NOITE - TURMA 1',
  'NOITE-T2': 'NOITE - TURMA 2',
};

function calcularTotal(dados: QuadroDecoracao): number {
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

export function QuadroDecoracaoTable({ dados }: QuadroDecoracaoTableProps) {
  const updateMutation = useUpdateQuadroDecoracao();
  const [editingCell, setEditingCell] = useState<{ id: string; key: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const turmasOrdenadas = ['DIA-T1', 'DIA-T2', 'NOITE-T1', 'NOITE-T2'];

  const dadosPorTurma = useMemo(() => {
    const mapa: Record<string, QuadroDecoracao> = {};
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

    const novoValor = parseInt(editValue, 10) || 0;
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

  const totaisPorTurma = useMemo(() => {
    const result: Record<string, number> = {};
    turmasOrdenadas.forEach(turma => {
      const d = dadosPorTurma[turma];
      if (d) {
        result[turma] = calcularTotal(d);
      }
    });
    return result;
  }, [dadosPorTurma]);

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      <div className="px-4 py-3 font-bold text-center uppercase tracking-wide bg-primary text-primary-foreground">
        DECORACAO
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left font-semibold py-2 px-3 border-b min-w-[220px]">
                Auxiliares
              </th>
              {turmasOrdenadas.map(turma => (
                <th key={turma} className="text-center font-semibold py-2 px-3 border-b min-w-[120px] bg-primary/10">
                  {turmasLabels[turma]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhasConfig.map((linha) => (
              <tr
                key={linha.key}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="py-2 px-3 border-b">
                  {linha.label}
                </td>
                {turmasOrdenadas.map(turma => {
                  const d = dadosPorTurma[turma];
                  if (!d) return <td key={turma} className="text-center py-2 px-3 border-b">-</td>;

                  const valor = d[linha.key] as number;
                  const isEditing = editingCell?.id === d.id && editingCell?.key === linha.key;

                  return (
                    <td key={turma} className="text-center py-2 px-3 border-b">
                      {isEditing ? (
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
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="h-2 bg-muted/20"></tr>
            <tr className="bg-primary font-bold text-primary-foreground">
              <td className="py-3 px-3">TOTAL QUADRO NECESSARIO</td>
              {turmasOrdenadas.map(turma => (
                <td key={turma} className="text-center py-3 px-3 tabular-nums text-lg">
                  {totaisPorTurma[turma] || 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
