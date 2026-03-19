import { useMemo } from 'react';
import { ArrowRightLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricasTurmaCards } from '@/components/dashboard/MetricasTurmaCards';
import { useFuncionariosNoQuadro } from '@/hooks/useFuncionarios';
import { useQuadroPlanejado } from '@/hooks/useQuadroPlanejado';
import { useQuadroDecoracao } from '@/hooks/useQuadroDecoracao';
import { useFuncionariosPrevisao } from '@/hooks/usePrevisoes';
import { TrocaTurno } from '@/hooks/useTrocasTurno';
import { Funcionario } from '@/types/database';

interface SimuladorTrocaTurnoProps {
  trocasPendentes: TrocaTurno[];
  idsSimulando: Set<string>;
  onLimparSimulacao?: () => void;
}

export function SimuladorTrocaTurno({ trocasPendentes, idsSimulando, onLimparSimulacao }: SimuladorTrocaTurnoProps) {
  const { data: funcionariosQuadro = [] } = useFuncionariosNoQuadro();
  const { data: quadroPlanejadoSopro = [] } = useQuadroPlanejado('SOPRO');
  const { data: quadroDecoracao = [] } = useQuadroDecoracao();
  const { data: funcionariosPrevisao = [] } = useFuncionariosPrevisao();

  const trocasSimuladas = useMemo(() => {
    return trocasPendentes.filter(t => idsSimulando.has(t.id));
  }, [trocasPendentes, idsSimulando]);

  // Aplica as trocas selecionadas nos funcionários
  const funcionariosFinais = useMemo(() => {
    if (trocasSimuladas.length === 0) return funcionariosQuadro;

    return funcionariosQuadro.map(f => {
      const troca = trocasSimuladas.find(t => t.funcionario_id === f.id);
      if (!troca) return f;

      const setorDestino = funcionariosQuadro.find(
        func => func.setor_id === troca.setor_destino_id
      )?.setor;

      const novoSetor = setorDestino || {
        id: troca.setor_destino_id,
        nome: troca.setor_destino?.nome || 'SETOR DESTINO',
        ativo: true,
        conta_no_quadro: true,
        grupo: null,
        created_at: '',
        updated_at: '',
      };

      return {
        ...f,
        setor_id: troca.setor_destino_id,
        setor: novoSetor,
        turma: troca.turma_destino || f.turma,
      } as Funcionario;
    });
  }, [funcionariosQuadro, trocasSimuladas]);

  const funcionariosSopro = useMemo(() => {
    return funcionariosFinais.filter(f => {
      const grupo = f.setor?.grupo?.toUpperCase() || '';
      return grupo.startsWith('SOPRO');
    });
  }, [funcionariosFinais]);

  const funcionariosDecoracao = useMemo(() => {
    return funcionariosFinais.filter(f => {
      const grupo = f.setor?.grupo?.toUpperCase() || '';
      return grupo.includes('DECORAÇÃO') || grupo.includes('DECORACAO');
    });
  }, [funcionariosFinais]);

  const previsaoSopro = funcionariosPrevisao.filter(f => {
    const grupo = f.setor?.grupo?.toUpperCase() || '';
    return grupo.startsWith('SOPRO');
  });

  const previsaoDecoracao = funcionariosPrevisao.filter(f => {
    const grupo = f.setor?.grupo?.toUpperCase() || '';
    return grupo.includes('DECORAÇÃO') || grupo.includes('DECORACAO');
  });

  return (
    <div className="space-y-4">
      {trocasSimuladas.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-primary text-primary-foreground text-xs">
            📊 SIMULAÇÃO — {trocasSimuladas.length} MOVIMENTAÇÃO(ÕES) PENDENTE(S)
          </Badge>
          <div className="flex flex-wrap gap-1.5">
            {trocasSimuladas.map(t => (
              <Badge key={t.id} variant="outline" className="text-[10px] py-1 px-2 bg-background">
                {t.funcionario?.nome_completo?.toUpperCase()}
                <ArrowRightLeft className="h-2.5 w-2.5 mx-1 text-primary" />
                {t.setor_destino?.nome?.toUpperCase()}
                {t.data_programada && (
                  <span className="ml-1 text-primary font-semibold">
                    📅 {t.data_programada.split('-').reverse().join('/')}
                  </span>
                )}
              </Badge>
            ))}
          </div>
          {onLimparSimulacao && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={onLimparSimulacao}
            >
              <Trash2 className="h-3 w-3" />
              Limpar Simulação
            </Button>
          )}
        </div>
      )}

      {/* Cards SOPRO */}
      {funcionariosSopro.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground">SOPRO</h3>
          <MetricasTurmaCards
            grupo="SOPRO"
            funcionarios={funcionariosSopro}
            quadroPlanejadoSopro={quadroPlanejadoSopro}
            funcionariosPrevisao={previsaoSopro}
          />
        </div>
      )}

      {/* Cards DECORAÇÃO */}
      {funcionariosDecoracao.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-muted-foreground">DECORAÇÃO</h3>
          <MetricasTurmaCards
            grupo="DECORAÇÃO"
            funcionarios={funcionariosDecoracao}
            quadroPlanejadoDecoracao={quadroDecoracao}
            funcionariosPrevisao={previsaoDecoracao}
          />
        </div>
      )}
    </div>
  );
}
