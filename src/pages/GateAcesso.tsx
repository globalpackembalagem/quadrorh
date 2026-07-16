import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Lock, Loader2 } from 'lucide-react';
import logoGlobalpack from '@/assets/logo-globalpack-new.png';
import { supabase } from '@/integrations/supabase/client';
import { useUsuario } from '@/contexts/UserContext';
import { montarUsuarioLocal } from '@/lib/montarUsuarioLocal';

export default function GateAcesso() {
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { setUsuarioAtual } = useUsuario();
  const navigate = useNavigate();

  const handleLogin = async () => {
    const nomeLimpo = nome.trim().substring(0, 100); // Limitar tamanho
    if (!nomeLimpo || !senha) return;
    if (senha.length > 128) {
      setErro('Senha inválida');
      return;
    }
    setErro('');
    setCarregando(true);

    try {
      const { data, error } = await supabase.functions.invoke('auth-handler', {
        body: { action: 'login', nome: nomeLimpo, senha },
      });
      if (error) throw error;
      if (data.error) {
        setErro(data.error);
        setCarregando(false);
        return;
      }

      setUsuarioAtual(montarUsuarioLocal(data.user, data.session_token));
      navigate(data.user?.nome?.toUpperCase() === 'FOTOS' ? '/captura-fotos?rhfoto=1' : '/home');
    } catch (error) {
      console.error('Erro no login:', error);
      setErro('Nome ou senha invalidos');
    }
    setCarregando(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
          {/* Header com logo */}
          <div className="bg-primary/5 border-b border-border/50 px-8 py-8 text-center">
            <img
              src={logoGlobalpack}
              alt="Globalpack"
              className="h-14 mx-auto mb-4 object-contain"
            />
            <h1 className="text-xl font-bold text-foreground uppercase tracking-widest">
              QUADRO DE PESSOAL
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Identifique-se para continuar
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Seu nome
              </label>
              <Input
                type="text"
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="h-12 text-base"
                autoFocus
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Lock className="h-4 w-4" />
                Senha
              </div>
              <div className="relative">
                <Input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="h-12 pr-11 text-base"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {erro && (
              <p className="text-sm text-destructive text-center">{erro}</p>
            )}

            <Button
              className="w-full h-12 text-base font-semibold gap-2"
              onClick={handleLogin}
              disabled={!nome.trim() || !senha || carregando}
            >
              {carregando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Gestão de RH · Globalpack
        </p>
      </div>
    </div>
  );
}
