import { useState } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Funcionario, Setor } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { useRegistrarHistoricoFuncionario } from '@/hooks/useHistoricoFuncionarios';
import { useCriarTrocaTurno } from '@/hooks/useTrocasTurno';

interface TransferenciaDialogProps {
  funcionario: Funcionario;
  setores: Setor[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferenciaDialog({
  funcionario,
  setores,
  open,
  onOpenChange,
}: TransferenciaDialogProps) {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const registrarHistorico = useRegistrarHistoricoFuncionario();
  const criarTroca = useCriarTrocaTurno();
  const [setorDestinoId, setSetorDestinoId] = useState('');
  const [dataProgramada, setDataProgramada] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setoresDisponiveis = setores.filter(
    (s) => s.id !== funcionario.setor_id && s.ativo
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!setorDestinoId || !dataProgramada) {
      toast.error('Preencha o setor de destino e a data da transferência');
      return;
    }

    setIsLoading(true);

    try {
      const setorOrigem = setores.find(s => s.id === funcionario.setor_id);
      const setorDestino = setores.find(s => s.id === setorDestinoId);

      await criarTroca.mutateAsync({
        funcionario_id: funcionario.id,
        setor_origem_id: funcionario.setor_id,
        turma_origem: funcionario.turma,
        setor_destino_id: setorDestinoId,
        data_programada: dataProgramada,
        observacoes: observacoes || undefined,
        criado_por: userRole?.nome || 'Sistema',
        tipo: 'transferencia',
      });

      await registrarHistorico.mutateAsync({
        tabela: 'funcionarios',
        operacao: 'TRANSFERENCIA',
        registro_id: funcionario.id,
        dados_anteriores: {
          nome: funcionario.nome_completo,
          setor_origem: setorOrigem?.nome || funcionario.setor_id,
        },
        dados_novos: {
          nome: funcionario.nome_completo,
          setor_destino: setorDestino?.nome || setorDestinoId,
          data_programada: dataProgramada,
          observacoes: observacoes || null,
        },
      });

      toast.success('Transferência programada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });

      setSetorDestinoId('');
      setDataProgramada('');
      setObservacoes('');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao programar transferência:', error);
      toast.error('Erro ao programar transferência');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Programar Transferência
          </DialogTitle>
          <DialogDescription>
            Funcionário: <strong>{funcionario.nome_completo}</strong>
            <br />
            Setor atual: <strong>{funcionario.setor?.nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="setorDestino">Setor de Destino</Label>
            <Select value={setorDestinoId} onValueChange={setSetorDestinoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor de destino" />
              </SelectTrigger>
              <SelectContent>
                {setoresDisponiveis.map((setor) => (
                  <SelectItem key={setor.id} value={setor.id}>
                    {setor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataProgramada">Data da Transferência</Label>
            <Input
              id="dataProgramada"
              type="date"
              value={dataProgramada}
              onChange={(e) => setDataProgramada(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Motivo ou observações sobre a transferência (opcional)"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Confirmar Transferência'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
