import { useState } from 'react';
import { Divergencia, useFeedbackDivergencia } from '@/hooks/useDivergencias';
import { useUsuario } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { inserirEventoSemDuplicata } from '@/hooks/useEventosSistema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CheckCircle, MessageSquare } from 'lucide-react';

const OPCOES_FEEDBACK = [
  'Funcionário justificou ausência',
  'Agência retornou com informações',
  'Funcionário retornou ao trabalho',
  'Funcionário será desligado',
  'Situação regularizada',
];

interface FeedbackDivergenciaDialogProps {
  divergencia: Divergencia | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDivergenciaDialog({
  divergencia,
  open,
  onOpenChange,
}: FeedbackDivergenciaDialogProps) {
  const { usuarioAtual, isAdmin, canEditDemissoes } = useUsuario();
  const feedbackDivergencia = useFeedbackDivergencia();

  const [loading, setLoading] = useState(false);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<string | null>(null);
  const [textoAdicional, setTextoAdicional] = useState('');

  if (!divergencia) return null;

  const funcionario = divergencia.funcionario;
  const podeEditar = isAdmin || canEditDemissoes;

  const criarEventoCentral = async (descricao: string, mensagem: string) => {
    try {
      await inserirEventoSemDuplicata({
        tipo: 'divergencia_feedback',
        descricao,
        funcionario_nome: funcionario?.nome_completo?.toUpperCase() || null,
        setor_nome: funcionario?.setor?.nome?.toUpperCase() || null,
        turma: funcionario?.turma || null,
        criado_por: usuarioAtual?.nome || 'RH',
        dados_extra: {
          mensagem_personalizada: mensagem,
          gestor_criador: divergencia.criado_por,
        },
      });
    } catch (err) {
      console.error('Erro ao criar evento:', err);
    }
  };

  const handleEnviarFeedback = async () => {
    if (!opcaoSelecionada) {
      toast.error('SELECIONE UMA OPÇÃO DE RETORNO');
      return;
    }

    const feedbackCompleto = textoAdicional.trim()
      ? `${opcaoSelecionada} — ${textoAdicional.trim()}`
      : opcaoSelecionada;

    setLoading(true);
    try {
      await feedbackDivergencia.mutateAsync({
        id: divergencia.id,
        feedback_rh: feedbackCompleto,
        resolvido_por: usuarioAtual?.nome || 'RH',
      });

      await criarEventoCentral(
        `✅ RETORNO DIVERGÊNCIA — ${funcionario?.nome_completo?.toUpperCase() || 'FUNCIONÁRIO'}`,
        `${feedbackCompleto.toUpperCase()} | Funcionário: ${funcionario?.nome_completo?.toUpperCase()} | Setor: ${funcionario?.setor?.nome?.toUpperCase() || 'N/A'}`
      );

      toast.success('FEEDBACK ENVIADO! GESTOR NOTIFICADO. DIVERGÊNCIA RESOLVIDA.');
      setOpcaoSelecionada(null);
      setTextoAdicional('');
      onOpenChange(false);
    } catch (error) {
      toast.error('ERRO AO ENVIAR FEEDBACK');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            FEEDBACK AO GESTOR
          </DialogTitle>
          <DialogDescription>
            SELECIONE O RETORNO E NOTIFIQUE O GESTOR
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">FUNCIONÁRIO:</span>
              <span className="font-semibold">{funcionario?.nome_completo?.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">MATRÍCULA:</span>
              <span className="font-mono text-xs font-bold">{funcionario?.matricula?.toUpperCase() || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">GESTOR:</span>
              <span className="font-semibold">{divergencia.criado_por?.toUpperCase()}</span>
            </div>
            {divergencia.descricao_acao && (
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                <span className="text-sm text-muted-foreground">AÇÃO EM ANDAMENTO:</span>
                <p className="text-sm mt-1 font-medium">{divergencia.descricao_acao.toUpperCase()}</p>
              </div>
            )}
          </div>

          {/* Opções de feedback */}
          {podeEditar && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-semibold">SELECIONE O RETORNO:</label>
                <div className="space-y-1.5">
                  {OPCOES_FEEDBACK.map((opcao) => (
                    <Button
                      key={opcao}
                      variant={opcaoSelecionada === opcao ? 'default' : 'outline'}
                      size="sm"
                      className="w-full justify-start text-xs h-8"
                      onClick={() => setOpcaoSelecionada(opcao)}
                    >
                      {opcaoSelecionada === opcao && <CheckCircle className="h-3.5 w-3.5 mr-2" />}
                      {opcao.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">DETALHES ADICIONAIS (OPCIONAL):</label>
                <Textarea
                  value={textoAdicional}
                  onChange={(e) => setTextoAdicional(e.target.value)}
                  placeholder="Informações complementares..."
                  className="min-h-[60px] uppercase"
                />
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleEnviarFeedback}
                disabled={loading || !opcaoSelecionada}
              >
                <CheckCircle className="h-4 w-4" />
                RESOLVER E NOTIFICAR GESTOR
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            FECHAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
