import { useState, forwardRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

// Senha para exportação (usuários sem setor específico)
const SENHA_EXPORT = 'soproabc';

interface SenhaExportDialogProps {
  children: React.ReactNode;
  onConfirm: () => void;
  title?: string;
}

export const SenhaExportDialog = forwardRef<HTMLDivElement, SenhaExportDialogProps>(
  function SenhaExportDialog({ children, onConfirm, title = 'Exportar Excel' }, ref) {
  const [open, setOpen] = useState(false);
  const [senha, setSenha] = useState('');
  const [tentativas, setTentativas] = useState(0);

  const handleConfirm = () => {
    if (senha === SENHA_EXPORT) {
      toast.success('Senha correta! Gerando arquivo...');
      onConfirm();
      setOpen(false);
      setSenha('');
      setTentativas(0);
    } else {
      setTentativas(t => t + 1);
      toast.error('Senha incorreta');
      if (tentativas >= 2) {
        toast.error('Muitas tentativas incorretas');
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSenha('');
      setTentativas(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Digite a senha para exportar os dados:
          </p>

          <div className="space-y-2">
            <Label htmlFor="senha-export" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Senha
            </Label>
            <Input
              id="senha-export"
              type="password"
              placeholder="Digite a senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!senha} className="flex-1">
              <Lock className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
