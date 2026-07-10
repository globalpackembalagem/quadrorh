import { useState, useMemo, useCallback } from 'react';
import { QuadroDecoracao } from '@/types/database';
import { useUpdateQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface QuadroDecoracaoTableProps {
  dados: QuadroDecoracao[];
}

interface LinhaConfig {
  key: 'aux_maquina' | 'reserva_refeicao' | 'reserva_faltas' | 'reserva_ferias' | 'apoio_topografia' | 'reserva_afastadas' | 'reserva_covid';
  label: string;
  editavel: boolean;
}

const linhasConfig: LinhaConfig[] = [
  { key: 'aux_maquina', label: 'Auxiliares em Maquina', editavel: true },
  { key: 'reserva_refeicao', label: 'Reserva Refeicao', editavel: true },
  { key: 'reserva_faltas', label: 'Reserva Faltas', editavel: true },
  { key: 'reserva_ferias', label: 'Reserva Ferias', editavel: true },
  { key: 'apoio_topografia', label: 'Apoio Topografia', editavel: true },
  { key: 'reserva_afastadas', label: 'Reserva Afastadas', editavel: true },
  { key: 'reserva_covid', label: 'Reserva Covid', editavel: true },
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
  const [alteracoesPendentes, setAlteracoesPendentes] = useState<Record<string, number>>({});
  const [dataInicioNotificacao, setDataInicioNotificacao] = useState(() => new Date().toISOString().slice(0, 10));

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
    setEditValue((alteracoesPendentes[`${id}:${key}`] ?? valor).toString());
  }, [alteracoesPendentes]);

  const handleSaveEdit = useCallback(() => {
    if (!editingCell) return;

    const novoValor = parseInt(editValue, 10) || 0;
    setAlteracoesPendentes(prev => ({
      ...prev,
      [`${editingCell.id}:${editingCell.key}`]: novoValor,
    }));
    setEditingCell(null);
    setEditValue('');
	  }, [editingCell, editValue]);

  const handleSalvarAlteracoes = useCallback(() => {
    Object.entries(alteracoesPendentes).forEach(([chave, valor]) => {
      const [id, key] = chave.split(':');
      updateMutation.mutate({
        id,
        [key]: valor,
        data_inicio_notificacao: dataInicioNotificacao,
      });
    });
    setAlteracoesPendentes({});
  }, [alteracoesPendentes, dataInicioNotificacao, updateMutation]);

  const handleCancelarAlteracoes = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
    setAlteracoesPendentes({});
  }, []);

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
	      <div className="px-4 py-3 bg-primary text-primary-foreground">
	        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
	          <div className="font-bold text-center sm:text-left uppercase tracking-wide">DECORACAO</div>
	          <label className="flex items-center justify-center gap-2 text-xs font-semibold">
	            A PARTIR DE
	            <Input
	              type="date"
	              value={dataInicioNotificacao}
	              onChange={(e) => setDataInicioNotificacao(e.target.value)}
	              className="h-8 w-[150px] bg-background text-foreground"
	            />
	          </label>
	        </div>
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

                  const chave = `${d.id}:${linha.key}`;
                  const valorOriginal = d[linha.key] as number;
                  const valor = alteracoesPendentes[chave] ?? valorOriginal;
                  const temAlteracao = alteracoesPendentes[chave] !== undefined && alteracoesPendentes[chave] !== valorOriginal;
                  const isEditing = editingCell?.id === d.id && editingCell?.key === linha.key;

                  return (
                    <td key={turma} className="text-center py-2 px-3 border-b">
                      {linha.editavel ? (
                      isEditing ? (
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="w-20 h-8 text-center mx-auto"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => handleStartEdit(d.id, linha.key, valor)}
                          className={`w-full h-full py-1 px-2 hover:bg-primary/10 rounded transition-colors tabular-nums font-medium ${temAlteracao ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-300' : ''}`}
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
      {Object.keys(alteracoesPendentes).length > 0 && (
        <div className="flex items-center justify-end gap-2 border-t bg-amber-50 px-4 py-3">
          <span className="mr-auto text-sm font-medium text-amber-900">
            {Object.keys(alteracoesPendentes).length} alteracao pendente
          </span>
          <Button variant="outline" size="sm" onClick={handleCancelarAlteracoes}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSalvarAlteracoes} disabled={updateMutation.isPending}>
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}
