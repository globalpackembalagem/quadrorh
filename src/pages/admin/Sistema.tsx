import { useEffect, useMemo, useState } from 'react';
import { Save, Settings, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSituacoes } from '@/hooks/useSituacoes';
import { useSistemaConfig, useUpdateSistemaConfig } from '@/hooks/useSistemaConfig';

const normalizar = (texto?: string | null) =>
  (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

const situacaoBloqueadaParaIndisponiveis = (nome: string) => {
  const n = normalizar(nome);
  return (
    n === 'ATIVO' ||
    n.includes('PREVISAO') ||
    n.includes('DEMISSAO') ||
    n.includes('PEDIDO') ||
    n.includes('TERMINO') ||
    n.includes('DESLIG')
  );
};

export default function Sistema() {
  const { data: situacoes = [], isLoading } = useSituacoes();
  const { indisponiveisSituacaoIds } = useSistemaConfig();
  const updateConfig = useUpdateSistemaConfig();
  const [selecionados, setSelecionados] = useState<string[]>(indisponiveisSituacaoIds);

  const situacoesDisponiveis = useMemo(
    () => situacoes.filter(s => s.ativa && !situacaoBloqueadaParaIndisponiveis(s.nome)),
    [situacoes]
  );

  useEffect(() => {
    setSelecionados(indisponiveisSituacaoIds);
  }, [indisponiveisSituacaoIds.join('|')]);

  const toggleSituacao = (id: string) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const salvar = async () => {
    try {
      await updateConfig.mutateAsync({ indisponiveis_situacao_ids: selecionados });
      toast.success('Configuracao dos INDISPONIVEIS salva.');
    } catch (error: any) {
      console.error('Erro ao salvar indisponiveis:', error);
      toast.error(error?.message || 'Erro ao salvar configuracao dos INDISPONIVEIS.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Settings className="h-6 w-6 text-primary" />
          CONFIGURACAO DOS INDISPONIVEIS
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina quais situacoes aparecem no botao/card INDISPONIVEIS do quadro de funcionarios.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Situacoes do botao INDISPONIVEIS</CardTitle>
          <p className="text-sm text-muted-foreground">
            As situacoes selecionadas aparecem agrupadas em INDISPONIVEIS no quadro.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {selecionados.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {situacoes
                .filter(s => selecionados.includes(s.id))
                .map(s => (
                  <Badge key={s.id} variant="secondary" className="gap-1 px-3 py-1">
                    {s.nome}
                    <button type="button" onClick={() => toggleSituacao(s.id)} aria-label={`Remover ${s.nome}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Carregando situacoes...</div>
            ) : (
              situacoesDisponiveis.map(s => {
                const ativo = selecionados.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSituacao(s.id)}
                    className={[
                      'rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors',
                      ativo
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-card text-foreground hover:bg-accent',
                    ].join(' ')}
                  >
                    {s.nome}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={salvar} disabled={updateConfig.isPending} className="gap-2">
              <Save className="h-4 w-4" />
              {updateConfig.isPending ? 'Salvando...' : 'Salvar indisponiveis'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
