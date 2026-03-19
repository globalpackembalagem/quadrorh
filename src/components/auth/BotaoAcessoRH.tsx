import { useState } from 'react';
import { Lock, LogOut, User, Loader2, Key, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { UsuarioLocal } from '@/contexts/UserContext';
import { AlterarMinhaSenhaDialog } from './AlterarMinhaSenhaDialog';

export function BotaoAcessoRH() {
  const { isRHMode, sairModoRH, setUsuarioAtual } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [alterarSenhaOpen, setAlterarSenhaOpen] = useState(false);

  const registrarAcesso = async (userId: string, userName: string) => {
    const navegador = navigator.userAgent.substring(0, 200);
    const dispositivo = /Mobi|Android/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP';
    await supabase.from('historico_acesso').insert({
      user_role_id: userId,
      nome_usuario: userName,
      navegador,
      dispositivo,
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const montarUsuarioLocal = (user: any): UsuarioLocal => {
    const setoresIds: string[] = [];
    if (user.setor_id) setoresIds.push(user.setor_id);
    (user.user_roles_setores || []).forEach((s: { setor_id: string }) => {
      if (!setoresIds.includes(s.setor_id)) setoresIds.push(s.setor_id);
    });
    return {
      id: user.id,
      nome: user.nome,
      setoresIds,
      acesso_admin: user.acesso_admin,
      pode_visualizar_funcionarios: user.pode_visualizar_funcionarios,
      pode_editar_funcionarios: user.pode_editar_funcionarios,
      pode_visualizar_previsao: user.pode_visualizar_previsao ?? user.pode_visualizar_funcionarios,
      pode_editar_previsao: user.pode_editar_previsao ?? user.pode_editar_funcionarios,
      pode_visualizar_coberturas: user.pode_visualizar_coberturas ?? user.pode_visualizar_funcionarios,
      pode_editar_coberturas: user.pode_editar_coberturas ?? user.pode_editar_funcionarios,
      pode_visualizar_faltas: user.pode_visualizar_faltas ?? user.pode_editar_faltas,
      pode_editar_faltas: user.pode_editar_faltas,
      pode_visualizar_demissoes: user.pode_visualizar_demissoes ?? user.pode_editar_demissoes,
      pode_editar_demissoes: user.pode_editar_demissoes,
      pode_visualizar_homologacoes: user.pode_visualizar_homologacoes ?? user.pode_editar_homologacoes,
      pode_editar_homologacoes: user.pode_editar_homologacoes,
      pode_visualizar_divergencias: user.pode_visualizar_divergencias ?? user.pode_criar_divergencias,
      pode_criar_divergencias: user.pode_criar_divergencias,
      pode_visualizar_troca_turno: user.pode_visualizar_troca_turno ?? true,
      pode_editar_troca_turno: user.pode_editar_troca_turno ?? true,
      pode_visualizar_armarios: user.pode_visualizar_armarios ?? false,
      pode_editar_armarios: user.pode_editar_armarios ?? false,
      pode_exportar_excel: user.pode_exportar_excel,
      recebe_notificacoes: user.recebe_notificacoes ?? true,
      tempo_inatividade: user.tempo_inatividade ?? 4,
    };
  };

  const handleEntrar = async () => {
    if (!nome.trim()) { setErro('Digite seu nome'); return; }
    if (!senha) { setErro('Digite sua senha'); return; }

    setIsLoading(true);
    setErro('');

    try {
      const { data, error } = await supabase.functions.invoke('auth-handler', {
        body: { action: 'login', nome: nome.trim(), senha },
      });

      if (error) throw error;
      if (data.error) { setErro(data.error); setIsLoading(false); return; }

      const usuarioLocal = montarUsuarioLocal(data.user);
      setUsuarioAtual(usuarioLocal);
      await registrarAcesso(data.user.id, data.user.nome);
      toast.success(`Bem-vindo, ${data.user.nome}!`);
      handleCloseDialog();
    } catch (error) {
      console.error('Erro no login:', error);
      setErro('Erro ao conectar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFechar = () => navigate('/home');
  const handleSair = () => { sairModoRH(); navigate('/'); toast.info('Você saiu.'); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && nome.trim() && senha) handleEntrar();
  };
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setNome('');
    setSenha('');
    setErro('');
  };

  if (isRHMode) {
    return (
      <div className="space-y-2">
        <Button variant="outline" size="sm" onClick={() => setAlterarSenhaOpen(true)} className="w-full gap-2">
          <Key className="h-4 w-4" />
          ALTERAR SENHA
        </Button>
        <Button variant="destructive" size="sm" onClick={handleSair} className="w-full gap-2">
          <LogOut className="h-4 w-4" />
          SAIR
        </Button>
        <AlterarMinhaSenhaDialog open={alterarSenhaOpen} onOpenChange={setAlterarSenhaOpen} />
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="w-full gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
      >
        <Lock className="h-4 w-4" />
        LOGIN
      </Button>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-primary" />
              Acesso ao Sistema
            </DialogTitle>
            <DialogDescription>
              Entre com seu nome e senha para acessar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome-login" className="flex items-center gap-2 font-medium">
                <User className="h-4 w-4" />
                Nome
              </Label>
              <Input
                id="nome-login"
                type="text"
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => { setNome(e.target.value); setErro(''); }}
                onKeyDown={handleKeyDown}
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha-login" className="flex items-center gap-2 font-medium">
                <Lock className="h-4 w-4" />
                Senha
              </Label>
              <Input
                id="senha-login"
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => { setSenha(e.target.value); setErro(''); }}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />
            </div>

            {erro && (
              <p className="text-sm text-destructive font-medium text-center bg-destructive/10 py-2 px-3 rounded-md">
                {erro}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              onClick={handleEntrar}
              disabled={!nome.trim() || !senha || isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
