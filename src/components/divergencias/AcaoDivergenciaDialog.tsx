import { useState, useEffect } from 'react';
import { Divergencia, useAguardarDivergencia, useResolveDivergencia, useDeleteDivergencia } from '@/hooks/useDivergencias';
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
import { Clock, Trash2, Send } from 'lucide-react';

interface AcaoDivergenciaDialogProps {
  divergencia: Divergencia | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AcaoDivergenciaDialog({ 
  divergencia, 
  open, 
  onOpenChange 
}: AcaoDivergenciaDialogProps) {
  const { usuarioAtual, isAdmin, canEditDemissoes } = useUsuario();
  const aguardarDivergencia = useAguardarDivergencia();
  const resolveDivergencia = useResolveDivergencia();
  const deleteDivergencia = useDeleteDivergencia();
  
  const [loading, setLoading] = useState(false);
  const [descricao, setDescricao] = useState('');

  // Pré-definir descrição baseado na matrícula
  useEffect(() => {
    if (divergencia?.funcionario?.matricula) {
      const mat = divergencia.funcionario.matricula.toUpperCase();
      if (mat.startsWith('TEMP')) {
        setDescricao('Agência Real Parceria está verificando');
      } else {
        setDescricao('RH está entrando em contato com Funcionário');
      }
    } else {
      setDescricao('RH está entrando em contato com Funcionário');
    }
  }, [divergencia]);

  if (!divergencia) return null;

  const funcionario = divergencia.funcionario;
  const podeEditar = isAdmin || canEditDemissoes;
  const criouDivergencia = divergencia.criado_por === usuarioAtual?.nome;

  // Criar evento na Central de Notificações
  const criarEventoCentral = async (descricao: string, mensagem: string) => {
    try {
      await inserirEventoSemDuplicata({
        tipo: 'divergencia_retorno',
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

  // Ação: Marcar como AGUARDANDO e notificar gestor
  const handleAguardar = async () => {
    if (!descricao.trim()) {
      toast.error('INFORME A DESCRIÇÃO DA AÇÃO');
      return;
    }
    setLoading(true);
    try {
      await aguardarDivergencia.mutateAsync({
        id: divergencia.id,
        descricao_acao: descricao.trim(),
      });

      await criarEventoCentral(
        `⏳ DIVERGÊNCIA EM ANÁLISE — ${funcionario?.nome_completo?.toUpperCase() || 'FUNCIONÁRIO'}`,
        `${descricao.trim().toUpperCase()} | Funcionário: ${funcionario?.nome_completo?.toUpperCase()} | Setor: ${funcionario?.setor?.nome?.toUpperCase() || 'N/A'}`
      );

      toast.success('DIVERGÊNCIA MARCADA COMO AGUARDANDO! GESTOR NOTIFICADO.');
      onOpenChange(false);
    } catch (error) {
      toast.error('ERRO AO ATUALIZAR DIVERGÊNCIA');
    } finally {
      setLoading(false);
    }
  };

  // Ação: Excluir divergência
  const handleExcluir = async () => {
    setLoading(true);
    try {
      await deleteDivergencia.mutateAsync(divergencia.id);
      toast.success('DIVERGÊNCIA EXCLUÍDA!');
      onOpenChange(false);
    } catch (error) {
      toast.error('ERRO AO EXCLUIR DIVERGÊNCIA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            AÇÃO NA DIVERGÊNCIA
          </DialogTitle>
          <DialogDescription>
            INFORME O QUE ESTÁ SENDO FEITO E NOTIFIQUE O GESTOR
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Divergência */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">MATRÍCULA:</span>
              <span className="font-mono text-xs font-bold">{funcionario?.matricula?.toUpperCase() || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">FUNCIONÁRIO:</span>
              <span className="font-semibold">{funcionario?.nome_completo?.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">SETOR:</span>
              <span>{funcionario?.setor?.nome?.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">TIPO:</span>
              <Badge variant="outline">{divergencia.tipo_divergencia}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">GESTOR:</span>
              <span className="font-semibold">{divergencia.criado_por?.toUpperCase()}</span>
            </div>
            {divergencia.observacoes && (
              <div className="pt-2 border-t">
                <span className="text-sm text-muted-foreground">OBSERVAÇÕES:</span>
                <p className="text-sm mt-1">{divergencia.observacoes.toUpperCase()}</p>
              </div>
            )}
          </div>

          {/* Descrição da ação */}
          {podeEditar && (
            <div className="space-y-2">
              <label className="text-sm font-semibold">DESCRIÇÃO DA AÇÃO (SERÁ ENVIADA AO GESTOR):</label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o que está sendo feito..."
                className="min-h-[80px] uppercase"
              />
            </div>
          )}

          {/* Botões de Ação */}
          <div className="space-y-2">
            {podeEditar && (
              <Button
                className="w-full justify-start gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleAguardar}
                disabled={loading}
              >
                <Send className="h-4 w-4" />
                ENVIAR PARA AGUARDANDO E NOTIFICAR GESTOR
              </Button>
            )}

            {(isAdmin || criouDivergencia) && (
              <Button
                className="w-full justify-start gap-2"
                variant="destructive"
                onClick={handleExcluir}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4" />
                EXCLUIR DIVERGÊNCIA
              </Button>
            )}
          </div>
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
