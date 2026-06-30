import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Bell, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

interface UsuarioNotificacao {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
}

interface CobrarFaltasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enviadoPor: string;
}

export function CobrarFaltasDialog({ open, onOpenChange, enviadoPor }: CobrarFaltasDialogProps) {
  const [dataFalta, setDataFalta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mensagem, setMensagem] = useState('');
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios-cobranca-faltas'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, nome, perfil, ativo')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return (data || []) as UsuarioNotificacao[];
    },
  });

  const usuariosOrdenados = useMemo(() => {
    return usuarios.filter((u) => u.nome).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [usuarios]);

  const toggleUsuario = (id: string) => {
    setUsuariosSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selecionarTodos = () => {
    if (usuariosSelecionados.size === usuariosOrdenados.length) {
      setUsuariosSelecionados(new Set());
    } else {
      setUsuariosSelecionados(new Set(usuariosOrdenados.map((u) => u.id)));
    }
  };

  const enviarCobranca = async () => {
    if (!dataFalta) {
      toast.error('Selecione a data.');
      return;
    }
    if (usuariosSelecionados.size === 0) {
      toast.error('Selecione pelo menos um usuário.');
      return;
    }

    const dataBR = format(new Date(`${dataFalta}T00:00:00`), 'dd/MM/yyyy');
    const textoFinal = mensagem.trim() || `Favor preencher o controle de faltas do dia ${dataBR}.`;

    setEnviando(true);
    try {
      const notificacoes = Array.from(usuariosSelecionados).map((userRoleId) => ({
        user_role_id: userRoleId,
        tipo: 'cobranca_faltas',
        titulo: `Preencher faltas - ${dataBR}`,
        mensagem: `${textoFinal}\n\nEnviado por: ${enviadoPor}`,
        referencia_id: `cobranca-faltas-${dataFalta}-${userRoleId}-${Date.now()}`,
      }));

      const { error } = await supabase.from('notificacoes').insert(notificacoes);
      if (error) throw error;

      toast.success(`Cobrança enviada para ${usuariosSelecionados.size} usuário(s).`);
      setUsuariosSelecionados(new Set());
      setMensagem('');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao enviar cobrança de faltas:', error);
      const erro = error as { message?: string; details?: string; code?: string };
      toast.error([erro?.message, erro?.details, erro?.code ? `Código: ${erro.code}` : null].filter(Boolean).join(' | ') || 'Erro ao enviar cobrança.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Cobrar preenchimento de faltas
          </DialogTitle>
          <DialogDescription>
            Selecione a data e os usuários que devem receber a notificação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data que precisa ser preenchida</Label>
            <Input type="date" value={dataFalta} onChange={(e) => setDataFalta(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Favor preencher o controle de faltas do dia selecionado."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Quem vai receber</Label>
              <Button type="button" variant="ghost" size="sm" onClick={selecionarTodos} disabled={isLoading || usuariosOrdenados.length === 0}>
                {usuariosSelecionados.size === usuariosOrdenados.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>
            <ScrollArea className="h-56 rounded-md border p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando usuários...
                </div>
              ) : (
                <div className="space-y-1">
                  {usuariosOrdenados.map((usuario) => (
                    <label key={usuario.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                      <Checkbox checked={usuariosSelecionados.has(usuario.id)} onCheckedChange={() => toggleUsuario(usuario.id)} />
                      <span className="font-medium">{usuario.nome}</span>
                      <span className="text-xs text-muted-foreground">{usuario.perfil}</span>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={enviarCobranca} disabled={enviando || usuariosSelecionados.size === 0}>
            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar ({usuariosSelecionados.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
