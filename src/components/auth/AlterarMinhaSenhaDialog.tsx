import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AlterarMinhaSenhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlterarMinhaSenhaDialog({ open, onOpenChange }: AlterarMinhaSenhaDialogProps) {
  const { userRole } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const handleSave = async () => {
    if (!userRole?.id) return;

    if (!senhaAtual) {
      toast.error('Informe sua senha atual');
      return;
    }

    if (novaSenha.length < 4) {
      toast.error('A nova senha deve ter pelo menos 4 caracteres');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('auth-handler', {
        body: {
          action: 'change_password',
          user_id: userRole.id,
          senha_atual: senhaAtual,
          nova_senha: novaSenha,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setIsSaving(false);
        return;
      }

      toast.success('Senha alterada com sucesso!');
      handleClose();
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmarSenha('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Alterar Minha Senha
          </DialogTitle>
          <DialogDescription>Informe sua senha atual e defina uma nova senha.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Senha Atual</Label>
            <Input
              type="password"
              placeholder="Digite sua senha atual"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input
              type="password"
              placeholder="Digite a nova senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Confirmar Nova Senha</Label>
            <Input
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
