import { useState, useEffect, forwardRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserRole {
  id: string;
  nome: string;
}

interface AlterarSenhaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AlterarSenhaDialog = forwardRef<HTMLDivElement, AlterarSenhaDialogProps>(
  function AlterarSenhaDialog({ open, onOpenChange }, ref) {
  const [usuarios, setUsuarios] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string>('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  useEffect(() => {
    if (open) {
      fetchUsuarios();
    }
  }, [open]);

  const fetchUsuarios = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, nome')
        .order('nome');

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!usuarioId) {
      toast.error('Selecione um usuário');
      return;
    }

    if (novaSenha.length < 4) {
      toast.error('A senha deve ter pelo menos 4 caracteres');
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
          action: 'admin_reset_password',
          user_id: usuarioId,
          nova_senha: novaSenha,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setIsSaving(false);
        return;
      }

      const usuario = usuarios.find(u => u.id === usuarioId);
      toast.success(`Senha de ${usuario?.nome} alterada com sucesso!`);
      handleClose();
    } catch (error) {
      console.error('Erro ao salvar senha:', error);
      toast.error('Erro ao salvar senha');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setUsuarioId('');
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
            Alterar Senha de Usuário
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Usuário</Label>
              <Select value={usuarioId} onValueChange={setUsuarioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o usuário" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((usuario) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Confirmar Senha</Label>
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
        )}
      </DialogContent>
    </Dialog>
  );
});
