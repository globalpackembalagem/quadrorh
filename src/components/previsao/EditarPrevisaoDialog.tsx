import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { Funcionario } from '@/types/database';
import { useSetoresAtivos } from '@/hooks/useSetores';
import { useUpdateFuncionario } from '@/hooks/useFuncionarios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EditarPrevisaoDialogProps {
  funcionario: Funcionario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarPrevisaoDialog({ funcionario, open, onOpenChange }: EditarPrevisaoDialogProps) {
  const { data: setores = [] } = useSetoresAtivos();
  const updateFuncionario = useUpdateFuncionario();

  const [formData, setFormData] = useState({
    nome_completo: '',
    empresa: 'GLOBALPACK' as 'GLOBALPACK' | 'G+P',
    matricula: '',
    setor_id: '',
    turma: '',
    cargo: '',
    data_admissao: null as Date | null,
    sexo: 'masculino' as 'masculino' | 'feminino',
  });

  useEffect(() => {
    if (funcionario) {
      setFormData({
        nome_completo: funcionario.nome_completo || '',
        empresa: (funcionario.empresa as 'GLOBALPACK' | 'G+P') || 'GLOBALPACK',
        matricula: funcionario.matricula || '',
        setor_id: funcionario.setor_id || '',
        turma: funcionario.turma || '',
        cargo: funcionario.cargo || '',
        // data_admissao é YYYY-MM-DD; parseISO evita dia "voltar" por fuso.
        data_admissao: funcionario.data_admissao ? parseISO(funcionario.data_admissao) : null,
        sexo: funcionario.sexo || 'masculino',
      });
    }
  }, [funcionario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!funcionario) return;

    if (!formData.nome_completo.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (!formData.setor_id) {
      toast.error('Setor é obrigatório');
      return;
    }

    try {
      await updateFuncionario.mutateAsync({
        id: funcionario.id,
        nome_completo: formData.nome_completo.trim(),
        empresa: formData.empresa,
        matricula: formData.matricula || null,
        setor_id: formData.setor_id,
        turma: formData.turma?.trim() || null,
        cargo: formData.cargo || null,
        data_admissao: formData.data_admissao ? format(formData.data_admissao, 'yyyy-MM-dd') : null,
        sexo: formData.sexo,
      });

      onOpenChange(false);
    } catch (err) {
      // Mantém o diálogo aberto para o usuário tentar novamente.
      const message = err instanceof Error ? err.message : 'Erro ao salvar';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Previsão de Admissão</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              value={formData.nome_completo}
              onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
              placeholder="Nome do candidato"
            />
          </div>

          {/* Empresa e Matrícula */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                value={formData.empresa}
                onValueChange={(v) => setFormData({ ...formData, empresa: v as 'GLOBALPACK' | 'G+P' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBALPACK">GLOBALPACK</SelectItem>
                  <SelectItem value="G+P">G+P</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="matricula">Matrícula</Label>
              <Input
                id="matricula"
                value={formData.matricula}
                onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                placeholder="Matrícula"
              />
            </div>
          </div>

          {/* Setor e Turma */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Setor *</Label>
              <Select
                value={formData.setor_id}
                onValueChange={(v) => setFormData({ ...formData, setor_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {setores.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>
                      {setor.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select
                value={formData.turma || '__vazio__'}
                onValueChange={(v) => setFormData({ ...formData, turma: v === '__vazio__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem turma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__vazio__">&nbsp;</SelectItem>
                  <SelectItem value="T1">T1</SelectItem>
                  <SelectItem value="T2">T2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cargo e Sexo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Cargo"
              />
            </div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select
                value={formData.sexo}
                onValueChange={(v) => setFormData({ ...formData, sexo: v as 'masculino' | 'feminino' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Prevista */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Data Prevista de Admissão</Label>
              {formData.data_admissao && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, data_admissao: null })}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.data_admissao && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.data_admissao
                    ? format(formData.data_admissao, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'Sem data prevista'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.data_admissao || undefined}
                  onSelect={(date) => setFormData({ ...formData, data_admissao: date || null })}
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateFuncionario.isPending}>
              {updateFuncionario.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
