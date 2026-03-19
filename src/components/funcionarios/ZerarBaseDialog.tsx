import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSituacoes } from '@/hooks/useSituacoes';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OpcaoZerar {
  id: string;
  label: string;
  descricao: string;
  queryKey: string;
  dependeDeFuncionarios: boolean;
}

const OPCOES_ZERAR: OpcaoZerar[] = [
  {
    id: 'registros_ponto',
    label: 'Registros de Ponto',
    descricao: 'Faltas e presenças registradas',
    queryKey: 'registros-ponto',
    dependeDeFuncionarios: true,
  },
  {
    id: 'demissoes',
    label: 'Demissões',
    descricao: 'Demissões programadas e realizadas',
    queryKey: 'demissoes',
    dependeDeFuncionarios: true,
  },
  {
    id: 'divergencias',
    label: 'Divergências',
    descricao: 'Divergências de quadro registradas',
    queryKey: 'divergencias',
    dependeDeFuncionarios: true,
  },
  {
    id: 'funcionarios',
    label: 'Funcionários',
    descricao: 'Filtrar por situação abaixo',
    queryKey: 'funcionarios',
    dependeDeFuncionarios: false,
  },
];

export function ZerarBaseDialog() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [situacoesSelecionadas, setSituacoesSelecionadas] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const { data: situacoes = [] } = useSituacoes();

  const CONFIRM_PHRASE = 'ZERAR';

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      if (id === 'funcionarios') {
        setSelecionados(['registros_ponto', 'demissoes', 'divergencias', 'funcionarios']);
      } else {
        setSelecionados((prev) => [...prev, id]);
      }
    } else {
      if (id === 'funcionarios') {
        setSituacoesSelecionadas([]);
      }
      setSelecionados((prev) => prev.filter((s) => s !== id));
    }
  };

  const handleSituacaoToggle = (situacaoId: string, checked: boolean) => {
    if (checked) {
      setSituacoesSelecionadas((prev) => [...prev, situacaoId]);
    } else {
      setSituacoesSelecionadas((prev) => prev.filter((s) => s !== situacaoId));
    }
  };

  const selecionarTodasSituacoes = () => {
    setSituacoesSelecionadas(situacoes.map(s => s.id));
  };

  const funcionariosSelecionado = selecionados.includes('funcionarios');

  const handleZerarBase = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      toast.error(`Digite "${CONFIRM_PHRASE}" para confirmar`);
      return;
    }

    if (selecionados.length === 0) {
      toast.error('Selecione ao menos uma opção para limpar');
      return;
    }

    // Se funcionários selecionado mas sem situações, exigir seleção
    if (funcionariosSelecionado && situacoesSelecionadas.length === 0) {
      toast.error('Selecione ao menos uma situação para excluir funcionários');
      return;
    }

    setIsDeleting(true);

    try {
      // Se tiver filtro por situação, primeiro buscar IDs dos funcionários
      let funcionarioIds: string[] = [];
      
      if (funcionariosSelecionado && situacoesSelecionadas.length > 0) {
        const { data: funcs, error: fetchError } = await supabase
          .from('funcionarios')
          .select('id')
          .in('situacao_id', situacoesSelecionadas);
        
        if (fetchError) throw new Error('Erro ao buscar funcionários');
        funcionarioIds = funcs?.map(f => f.id) || [];
        
        if (funcionarioIds.length === 0) {
          toast.info('Nenhum funcionário encontrado com as situações selecionadas');
          setIsDeleting(false);
          return;
        }
      }

      // Helper para deletar em lotes (evita limite do Supabase)
      const TAMANHO_LOTE = 100;
      
      const deletarPontoEmLotes = async (ids: string[]) => {
        for (let i = 0; i < ids.length; i += TAMANHO_LOTE) {
          const lote = ids.slice(i, i + TAMANHO_LOTE);
          const { error } = await supabase.from('registros_ponto').delete().in('funcionario_id', lote);
          if (error) throw error;
        }
      };

      const deletarDemissoesEmLotes = async (ids: string[]) => {
        for (let i = 0; i < ids.length; i += TAMANHO_LOTE) {
          const lote = ids.slice(i, i + TAMANHO_LOTE);
          const { error } = await supabase.from('demissoes').delete().in('funcionario_id', lote);
          if (error) throw error;
        }
      };

      const deletarDivergenciasEmLotes = async (ids: string[]) => {
        for (let i = 0; i < ids.length; i += TAMANHO_LOTE) {
          const lote = ids.slice(i, i + TAMANHO_LOTE);
          const { error } = await supabase.from('divergencias_quadro').delete().in('funcionario_id', lote);
          if (error) throw error;
        }
      };

      const deletarFuncionariosEmLotes = async (ids: string[]) => {
        for (let i = 0; i < ids.length; i += TAMANHO_LOTE) {
          const lote = ids.slice(i, i + TAMANHO_LOTE);
          const { error } = await supabase.from('funcionarios').delete().in('id', lote);
          if (error) throw error;
        }
      };

      // Deletar registros de ponto
      if (selecionados.includes('registros_ponto')) {
        try {
          if (funcionarioIds.length > 0) {
            await deletarPontoEmLotes(funcionarioIds);
          } else if (!funcionariosSelecionado) {
            const { error } = await supabase
              .from('registros_ponto')
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
          }
          queryClient.invalidateQueries({ queryKey: ['registros-ponto'] });
        } catch {
          throw new Error('Falha ao limpar Registros de Ponto');
        }
      }

      // Deletar demissões
      if (selecionados.includes('demissoes')) {
        try {
          if (funcionarioIds.length > 0) {
            await deletarDemissoesEmLotes(funcionarioIds);
          } else if (!funcionariosSelecionado) {
            const { error } = await supabase
              .from('demissoes')
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
          }
          queryClient.invalidateQueries({ queryKey: ['demissoes'] });
        } catch {
          throw new Error('Falha ao limpar Demissões');
        }
      }

      // Deletar divergências
      if (selecionados.includes('divergencias')) {
        try {
          if (funcionarioIds.length > 0) {
            await deletarDivergenciasEmLotes(funcionarioIds);
          } else if (!funcionariosSelecionado) {
            const { error } = await supabase
              .from('divergencias_quadro')
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');
            if (error) throw error;
          }
          queryClient.invalidateQueries({ queryKey: ['divergencias'] });
        } catch {
          throw new Error('Falha ao limpar Divergências');
        }
      }

      // Deletar funcionários
      if (funcionariosSelecionado && funcionarioIds.length > 0) {
        try {
          await deletarFuncionariosEmLotes(funcionarioIds);
          queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
        } catch {
          throw new Error('Falha ao limpar Funcionários');
        }
      }

      const situacoesNomes = situacoes
        .filter(s => situacoesSelecionadas.includes(s.id))
        .map(s => s.nome)
        .join(', ');
      
      toast.success(
        funcionariosSelecionado && situacoesSelecionadas.length > 0
          ? `${funcionarioIds.length} funcionário(s) com situação "${situacoesNomes}" removidos!`
          : 'Dados limpos com sucesso!'
      );
      setOpen(false);
      setConfirmText('');
      setSelecionados([]);
      setSituacoesSelecionadas([]);
    } catch (error) {
      console.error('Erro ao zerar base:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao limpar dados');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setConfirmText('');
      setSelecionados([]);
      setSituacoesSelecionadas([]);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Zerar Base
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zerar Base de Dados
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Selecione o que deseja <strong>remover permanentemente</strong>:
              </p>
              
              <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                {OPCOES_ZERAR.map((opcao) => {
                  const isChecked = selecionados.includes(opcao.id);
                  const isDisabled = opcao.dependeDeFuncionarios && funcionariosSelecionado;
                  
                  return (
                    <div key={opcao.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={opcao.id}
                        checked={isChecked}
                        onCheckedChange={(checked) => handleToggle(opcao.id, checked as boolean)}
                        disabled={isDisabled || isDeleting}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <Label
                          htmlFor={opcao.id}
                          className={`text-sm font-medium cursor-pointer ${isDisabled ? 'text-muted-foreground' : ''}`}
                        >
                          {opcao.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {opcao.descricao}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {funcionariosSelecionado && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Filtrar por Situação:</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={selecionarTodasSituacoes}
                      disabled={isDeleting}
                    >
                      Selecionar todas
                    </Button>
                  </div>
                  <ScrollArea className="h-32 border rounded-lg p-2 bg-muted/20">
                    <div className="space-y-2">
                      {situacoes.map((situacao) => (
                        <div key={situacao.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`sit-${situacao.id}`}
                            checked={situacoesSelecionadas.includes(situacao.id)}
                            onCheckedChange={(checked) => handleSituacaoToggle(situacao.id, checked as boolean)}
                            disabled={isDeleting}
                          />
                          <Label
                            htmlFor={`sit-${situacao.id}`}
                            className="text-sm cursor-pointer flex items-center gap-2"
                          >
                            {situacao.nome}
                            {!situacao.ativa && (
                              <span className="text-xs text-muted-foreground">(inativa)</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    {situacoesSelecionadas.length} situação(ões) selecionada(s)
                  </p>
                </div>
              )}

              {funcionariosSelecionado && (
                <p className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
                  ⚠️ Ao zerar funcionários, os registros relacionados (ponto, demissões, divergências) também serão removidos.
                </p>
              )}

              <p className="text-destructive font-medium text-sm">
                Esta ação NÃO pode ser desfeita!
              </p>
              
              <div>
                <Label htmlFor="confirm" className="text-sm">
                  Digite <strong>{CONFIRM_PHRASE}</strong> para confirmar:
                </Label>
                <Input
                  id="confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder={CONFIRM_PHRASE}
                  className="mt-2"
                  disabled={isDeleting}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleZerarBase();
            }}
            disabled={
              confirmText !== CONFIRM_PHRASE || 
              isDeleting || 
              selecionados.length === 0 ||
              (funcionariosSelecionado && situacoesSelecionadas.length === 0)
            }
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Limpando...
              </>
            ) : (
              `Limpar ${selecionados.length} item(s)`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
