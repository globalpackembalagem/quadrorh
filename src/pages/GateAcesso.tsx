import { useState, useEffect } from 'react';
import { Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUsuario } from '@/contexts/UserContext';
import { montarUsuarioLocal } from '@/lib/montarUsuarioLocal';
import { useQuery } from '@tanstack/react-query';
import logoGlobalpack from '@/assets/logo-globalpack-new.png';

type Fase = 'nome' | 'verificando' | 'senha' | 'entrando';

export default function GateAcesso() {
  const navigate = useNavigate();
  const { setUsuarioAtual, isRHMode } = useUsuario();
  const [nome, setNome] = useState('');
  const [fase, setFase] = useState<Fase>('nome');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [nomeUsuarioEncontrado, setNomeUsuarioEncontrado] = useState('');

  // Verificar se o sistema está bloqueado ou expirado
  const { data: sistemaConfig } = useQuery({
    queryKey: ['sistema_config_gate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sistema_config')
        .select('*')
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
    refetchInterval: 30000,
  });

  const sistemaBloqueado = sistemaConfig?.sistema_bloqueado === true;
  const sistemaExpirado = sistemaConfig?.data_validade
    ? new Date(sistemaConfig.data_validade + 'T23:59:59') < new Date()
    : false;
  const sistemaIndisponivel = sistemaBloqueado || sistemaExpirado;

  // Se já está logado, redireciona
  useEffect(() => {
    if (isRHMode) {
      navigate('/home', { replace: true });
    }
  }, [isRHMode, navigate]);

  const registrarAcessoVisitante = async (nomeVisitante: string) => {
    const navegador = navigator.userAgent.substring(0, 200);
    const dispositivo = /Mobi|Android/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP';
    await supabase.from('historico_acesso').insert({
      user_role_id: 'visualizacao',
      nome_usuario: nomeVisitante.toUpperCase(),
      navegador,
      dispositivo,
    });
  };

  const registrarAcessoUsuario = async (userId: string, userName: string) => {
    const navegador = navigator.userAgent.substring(0, 200);
    const dispositivo = /Mobi|Android/i.test(navigator.userAgent) ? 'MOBILE' : 'DESKTOP';
    await supabase.from('historico_acesso').insert({
      user_role_id: userId,
      nome_usuario: userName,
      navegador,
      dispositivo,
    });
  };

  // montarUsuarioLocal is now imported from @/lib/montarUsuarioLocal

  const handleContinuar = async () => {
    if (!nome.trim()) return;
    setErro('');
    setFase('verificando');

    try {
      // Verificar se o nome existe na tabela user_roles
      const { data: usuarios, error } = await supabase
        .from('user_roles')
        .select('id, nome')
        .eq('ativo', true)
        .ilike('nome', nome.trim());

      if (error) throw error;

      if (usuarios && usuarios.length > 0) {
        // É um usuário cadastrado → pedir senha
        setNomeUsuarioEncontrado(usuarios[0].nome);
        setFase('senha');
      } else {
        // Não é usuário cadastrado → bloquear acesso
        setErro('Usuário não encontrado. Entre em contato com MAURÍCIO ou LUCIANO do RH para solicitar acesso.');
        setFase('nome');
      }
    } catch (err) {
      console.error('Erro ao verificar usuário:', err);
      setErro('Erro ao conectar. Tente novamente.');
      setFase('nome');
    }
  };

  const handleLogin = async () => {
    if (!senha) { setErro('Digite sua senha'); return; }
    setFase('entrando');
    setErro('');

    try {
      const { data, error } = await supabase.functions.invoke('auth-handler', {
        body: { action: 'login', nome: nome.trim(), senha },
      });

      if (error) throw error;
      if (data.error) {
        setErro(data.error);
        setFase('senha');
        return;
      }

      // Se sistema indisponível, apenas LUCIANO pode entrar
      const nomeLogin = data.user.nome?.toUpperCase();
      if (sistemaIndisponivel && nomeLogin !== 'LUCIANO') {
        setErro('Sistema temporariamente indisponível. Apenas o administrador pode acessar.');
        setFase('senha');
        return;
      }

      const usuarioLocal = montarUsuarioLocal(data.user);
      setUsuarioAtual(usuarioLocal);
      await registrarAcessoUsuario(data.user.id, data.user.nome);
      toast.success(`Bem-vindo, ${data.user.nome}!`);
      navigate('/home', { replace: true });
    } catch (err) {
      console.error('Erro no login:', err);
      setErro('Erro ao conectar. Tente novamente.');
      setFase('senha');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (fase === 'nome') handleContinuar();
      if (fase === 'senha') handleLogin();
    }
  };

  const handleNomeChange = (value: string) => {
    setNome(value);
    setErro('');
    // Se mudar o nome depois de ter sido identificado, volta para fase nome
    if (fase === 'senha') {
      setFase('nome');
      setSenha('');
      setNomeUsuarioEncontrado('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        {/* Card principal */}
        <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
          {/* Aviso de sistema indisponível */}
          {sistemaIndisponivel && (
            <div className="bg-destructive/10 border-b border-destructive/30 px-6 py-3 flex items-center gap-2 text-sm text-destructive">
              <ShieldOff className="h-4 w-4 flex-shrink-0" />
              <span>
                {sistemaBloqueado
                  ? `Sistema bloqueado${sistemaConfig?.motivo_bloqueio ? `: ${sistemaConfig.motivo_bloqueio}` : ''}`
                  : 'Prazo de validade do sistema expirado'}
                {' — apenas o administrador pode acessar.'}
              </span>
            </div>
          )}
          {/* Header com logo */}
          <div className="bg-primary/5 border-b border-border/50 px-8 py-8 text-center">
            <img
              src={logoGlobalpack}
              alt="Globalpack"
              className="h-14 mx-auto mb-4 object-contain"
            />
            <h1 className="text-xl font-bold text-foreground">
              Quadro de Pessoal
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Identifique-se para continuar
            </p>
          </div>

          {/* Conteúdo */}
          <div className="p-8 space-y-6">
            {/* Campo nome - sempre visível */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Seu nome
              </label>
              <Input
                type="text"
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => handleNomeChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-12 text-base"
                autoFocus
                autoComplete="off"
                disabled={fase === 'entrando' || fase === 'verificando'}
              />
            </div>

            {/* Campo senha - aparece dinamicamente quando usuário identificado */}
            {fase === 'senha' && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Lock className="h-4 w-4" />
                  Usuário identificado — informe sua senha
                </div>
                <div className="relative">
                  <Input
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => { setSenha(e.target.value); setErro(''); }}
                    onKeyDown={handleKeyDown}
                    className="h-12 text-base pr-12"
                    autoFocus
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {mostrarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Erro */}
            {erro && (
              <p className="text-sm text-destructive font-medium text-center bg-destructive/10 py-2 px-3 rounded-md animate-in fade-in duration-200">
                {erro}
              </p>
            )}

            {/* Estado carregando */}
            {(fase === 'verificando' || fase === 'entrando') && (
              <div className="text-center py-2 animate-in fade-in duration-300">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {fase === 'verificando' ? 'Verificando...' : 'Entrando...'}
                </div>
              </div>
            )}

            {/* Botão */}
            {fase === 'nome' && (
              <Button
                className="w-full h-12 text-base font-semibold gap-2"
                onClick={handleContinuar}
                disabled={!nome.trim()}
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {fase === 'senha' && (
              <Button
                className="w-full h-12 text-base font-semibold gap-2"
                onClick={handleLogin}
                disabled={!senha}
              >
                <Lock className="h-4 w-4" />
                Entrar
              </Button>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Gestão de RH · Globalpack
        </p>
      </div>
    </div>
  );
}
