import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus } from 'lucide-react';
import { useSetoresAtivos } from '@/hooks/useSetores';
import { useSituacoesAtivas } from '@/hooks/useSituacoes';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
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
  DialogTrigger,
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

const initialForm = {
  nome_completo: '',
  empresa: 'GLOBALPACK' as 'GLOBALPACK' | 'G+P',
  matricula: '',
  setor_id: '',
  turma: '',
  cargo: '',
  cpf: '',
  data_admissao: null as Date | null,
  sexo: 'masculino' as 'masculino' | 'feminino',
};

const somenteNumeros = (valor: string) => valor.replace(/\D/g, '');
const formatarCpf = (valor: string) => {
  const n = somenteNumeros(valor).slice(0, 11);
  return n.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export function NovaPrevisaoDialog() {
  const { data: setores = [] } = useSetoresAtivos();
  const { data: situacoes = [] } = useSituacoesAtivas();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  const situacaoPrevisao = situacoes.find(s =>
    s.nome.toUpperCase().includes('PREVIS�O') || s.nome.toUpperCase().includes('PREVISAO')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_completo.trim()) {
      toast.error('Nome � obrigat�rio');
      return;
    }
    if (!formData.setor_id) {
      toast.error('Setor � obrigat�rio');
      return;
    }
    if (somenteNumeros(formData.cpf).length !== 11) {
      toast.error('CPF e obrigatorio para previsao de admissao');
      return;
    }
    if (!situacaoPrevisao) {
      toast.error('Situa��o "PREVIS�O" n�o encontrada');
      return;
    }

    setSaving(true);
    try {
      const { data: inserted, error } = await supabase.from('funcionarios').insert({
        nome_completo: formData.nome_completo.trim(),
        sexo: formData.sexo,
        setor_id: formData.setor_id,
        situacao_id: situacaoPrevisao.id,
        empresa: formData.empresa,
        matricula: formData.matricula || null,
        turma: formData.turma || null,
        cargo: formData.cargo || null,
        cpf: formatarCpf(formData.cpf) || null,
        data_admissao: formData.data_admissao ? format(formData.data_admissao, 'yyyy-MM-dd') : null,
      }).select('id').single();

      if (error) throw error;

      toast.success('Previs�o adicionada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      setFormData(initialForm);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Previs�o
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Previs�o de Admiss�o</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="novo-nome">Nome Completo *</Label>
            <Input
              id="novo-nome"
              value={formData.nome_completo}
              onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
              placeholder="Nome do candidato"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="novo-cpf">CPF *</Label>
            <Input
              id="novo-cpf"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: formatarCpf(e.target.value) })}
              placeholder="000.000.000-00"
              inputMode="numeric"
              maxLength={14}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={formData.empresa} onValueChange={(v) => setFormData({ ...formData, empresa: v as 'GLOBALPACK' | 'G+P' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLOBALPACK">GLOBALPACK</SelectItem>
                  <SelectItem value="G+P">G+P</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="novo-matricula">Matr�cula</Label>
              <Input id="novo-matricula" value={formData.matricula} onChange={(e) => setFormData({ ...formData, matricula: e.target.value })} placeholder="Matr�cula" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Setor *</Label>
              <Select value={formData.setor_id} onValueChange={(v) => setFormData({ ...formData, setor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                <SelectContent>
                  {setores.map((setor) => (
                    <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select value={formData.turma} onValueChange={(v) => setFormData({ ...formData, turma: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="T1">T1</SelectItem>
                  <SelectItem value="T2">T2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="novo-cargo">Cargo</Label>
              <Input id="novo-cargo" value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} placeholder="Cargo" />
            </div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={formData.sexo} onValueChange={(v) => setFormData({ ...formData, sexo: v as 'masculino' | 'feminino' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data Prevista de Admiss�o</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !formData.data_admissao && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.data_admissao
                    ? format(formData.data_admissao, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'Selecione a data'}
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Adicionar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
