import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UsuarioLocal {
  id: string;
  nome: string;
  setoresIds: string[];
  acesso_admin: boolean;
  pode_visualizar_funcionarios: boolean;
  pode_editar_funcionarios: boolean;
  pode_visualizar_previsao: boolean;
  pode_editar_previsao: boolean;
  pode_visualizar_coberturas: boolean;
  pode_editar_coberturas: boolean;
  pode_visualizar_faltas: boolean;
  pode_editar_faltas: boolean;
  pode_visualizar_demissoes: boolean;
  pode_editar_demissoes: boolean;
  pode_visualizar_homologacoes: boolean;
  pode_editar_homologacoes: boolean;
  pode_visualizar_divergencias: boolean;
  pode_criar_divergencias: boolean;
  pode_visualizar_troca_turno: boolean;
  pode_editar_troca_turno: boolean;
  pode_visualizar_armarios: boolean;
  pode_editar_armarios: boolean;
  pode_exportar_excel: boolean;
  pode_visualizar_integracoes: boolean;
  pode_editar_integracoes: boolean;
  recebe_notificacoes: boolean;
  tempo_inatividade: number;
  fake_quadro_ativo?: boolean;
  fake_quadro_config?: any;
  session_token?: string;
}

interface UserContextType {
  usuarioAtual: UsuarioLocal;
  setUsuarioAtual: (usuario: UsuarioLocal | null) => void;
  isAdmin: boolean;
  isVisualizacao: boolean;
  canEditDemissoes: boolean;
  canEditFuncionarios: boolean;
  canEditHomologacoes: boolean;
  canExportExcel: boolean;
  canViewIntegracoes: boolean;
  canEditIntegracoes: boolean;
  canEditFaltas: (setorId?: string) => boolean;
  podeAcessarSetor: (setorId: string) => boolean;
  // Controle de modo RH (logado)
  isRHMode: boolean;
  entrarModoRH: (senha: string) => boolean;
  sairModoRH: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Usuário de visualização (padrão - sem login)
const VISUALIZACAO_USER: UsuarioLocal = {
  id: 'visualizacao',
  nome: 'VISUALIZAÇÃO',
  setoresIds: [],
  acesso_admin: false,
  pode_visualizar_funcionarios: true,
  pode_editar_funcionarios: false,
  pode_visualizar_previsao: true,
  pode_editar_previsao: false,
  pode_visualizar_coberturas: true,
  pode_editar_coberturas: false,
  pode_visualizar_faltas: true,
  pode_editar_faltas: false,
  pode_visualizar_demissoes: false,
  pode_editar_demissoes: false,
  pode_visualizar_homologacoes: false,
  pode_editar_homologacoes: false,
  pode_visualizar_divergencias: false,
  pode_criar_divergencias: false,
  pode_visualizar_troca_turno: false,
  pode_editar_troca_turno: false,
  pode_visualizar_armarios: false,
  pode_editar_armarios: false,
  pode_exportar_excel: false,
  pode_visualizar_integracoes: false,
  pode_editar_integracoes: false,
  recebe_notificacoes: false,
  tempo_inatividade: 4,
};

const SESSION_EXPIRY_KEY = 'usuario_sessao_expira';
const SESSION_MAX_HOURS = 12; // Sessão expira após 12 horas
const APP_VERSION = '2.8'; // Incrementar quando a estrutura do UsuarioLocal mudar
const ACESSO_ATUAL_KEY = 'acesso_usuario_atual_id';

// Valida que o objeto tem os campos mínimos obrigatórios
function isValidUsuarioLocal(obj: any): obj is UsuarioLocal {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.nome === 'string' &&
    Array.isArray(obj.setoresIds)
  );
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioLocal | null>(() => {
    try {
      const stored = localStorage.getItem('usuario_logado');
      if (!stored) return null;
      
      // Verificar versão do app - se mudou, limpar sessão
      const storedVersion = localStorage.getItem('app_version');
      if (storedVersion !== APP_VERSION) {
        localStorage.removeItem('usuario_logado');
        localStorage.removeItem(SESSION_EXPIRY_KEY);
        localStorage.setItem('app_version', APP_VERSION);
        return null;
      }
      
      // Verificar expiração da sessão
      const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
      if (expiry && Date.now() > Number(expiry)) {
        localStorage.removeItem('usuario_logado');
        localStorage.removeItem(SESSION_EXPIRY_KEY);
        return null;
      }
      
      const parsed = JSON.parse(stored);
      
      // Validar estrutura do objeto
      if (!isValidUsuarioLocal(parsed)) {
        console.warn('[UserContext] Dados de sessão corrompidos, limpando...');
        localStorage.removeItem('usuario_logado');
        localStorage.removeItem(SESSION_EXPIRY_KEY);
        return null;
      }
      
      console.log('[UserContext] Sessão restaurada para:', parsed.nome, '| admin:', parsed.acesso_admin, '| setores:', parsed.setoresIds?.length);
      return parsed;
    } catch (e) {
      console.error('[UserContext] Erro ao restaurar sessão:', e);
      localStorage.removeItem('usuario_logado');
      localStorage.removeItem(SESSION_EXPIRY_KEY);
      return null;
    }
  });

  const usuarioAtual = usuarioLogado || VISUALIZACAO_USER;
  const isRHMode = usuarioLogado !== null;

  const finalizarAcessoAtual = useCallback(async () => {
    const acessoId = localStorage.getItem(ACESSO_ATUAL_KEY);
    if (!acessoId) return;

    localStorage.removeItem(ACESSO_ATUAL_KEY);
    const agora = new Date().toISOString();
    const { error } = await (supabase as any)
      .from('acessos_usuarios')
      .update({ logout_em: agora, ultima_atividade_em: agora })
      .eq('id', acessoId)
      .is('logout_em', null);

    if (error) console.warn('[UserContext] Erro ao finalizar acesso:', error);
  }, []);

  const registrarNovoAcesso = useCallback(async (usuario: UsuarioLocal) => {
    if (!usuario?.id || usuario.id === 'visualizacao') return;

    await finalizarAcessoAtual();
    const { data, error } = await (supabase as any)
      .from('acessos_usuarios')
      .insert({
        user_role_id: usuario.id,
        origem: 'web',
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[UserContext] Erro ao registrar acesso:', error);
      return;
    }

    if (data?.id) localStorage.setItem(ACESSO_ATUAL_KEY, data.id);
  }, [finalizarAcessoAtual]);

  const setUsuarioAtual = useCallback((usuario: UsuarioLocal | null) => {
    if (usuario) {
      const now = Date.now();
      // IMPORTANTE: Setar localStorage ANTES do state para evitar race condition com useInactivityLogout
      localStorage.setItem('usuario_logado', JSON.stringify(usuario));
      localStorage.setItem('app_version', APP_VERSION);
      const expiry = now + SESSION_MAX_HOURS * 60 * 60 * 1000;
      localStorage.setItem(SESSION_EXPIRY_KEY, String(expiry));
      localStorage.setItem('ultima_atividade_ts', String(now));
      localStorage.setItem('login_timestamp', String(now));
      console.log('[UserContext] Login:', usuario.nome, '| timestamp:', now);
      setUsuarioLogado(usuario);
      void registrarNovoAcesso(usuario);
    } else {
      setUsuarioLogado(null);
      localStorage.removeItem('usuario_logado');
      localStorage.removeItem(SESSION_EXPIRY_KEY);
      localStorage.removeItem('ultima_atividade_ts');
      localStorage.removeItem('login_timestamp');
      void finalizarAcessoAtual();
    }
  }, [finalizarAcessoAtual, registrarNovoAcesso]);

  // Mantido para compatibilidade com código legado
  const entrarModoRH = useCallback((_senha: string): boolean => {
    // Este método foi substituído pelo login com usuário
    // Agora o login é feito via setUsuarioAtual
    return false;
  }, []);

  const sairModoRH = useCallback(() => {
    console.log('[UserContext] sairModoRH chamado - limpando sessão');
    const sessionToken = usuarioLogado?.session_token;
    if (sessionToken) {
      void supabase.functions.invoke('auth-handler', {
        body: { action: 'logout', session_token: sessionToken },
      });
    }
    setUsuarioLogado(null);
    localStorage.removeItem('usuario_logado');
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    localStorage.removeItem('ultima_atividade_ts');
    localStorage.removeItem('force_logout_checked_at');
    localStorage.removeItem('login_timestamp');
    void finalizarAcessoAtual();
  }, [finalizarAcessoAtual, usuarioLogado?.session_token]);

  useEffect(() => {
    if (!usuarioLogado?.id || usuarioLogado.id === 'visualizacao') return;

    const atualizarAtividade = async () => {
      const acessoId = localStorage.getItem(ACESSO_ATUAL_KEY);
      if (!acessoId) return;

      const { error } = await (supabase as any)
        .from('acessos_usuarios')
        .update({ ultima_atividade_em: new Date().toISOString() })
        .eq('id', acessoId);

      if (error) console.warn('[UserContext] Erro ao atualizar atividade:', error);
    };

    void atualizarAtividade();
    const interval = window.setInterval(() => void atualizarAtividade(), 5 * 60 * 1000);
    window.addEventListener('focus', atualizarAtividade);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', atualizarAtividade);
    };
  }, [usuarioLogado?.id]);

  // Verificar se pode acessar um setor específico
  const podeAcessarSetor = useCallback((setorId: string) => {
    if (!usuarioLogado) return true; // Visualização pode ver todos
    const isLuciano = usuarioLogado.nome?.toUpperCase() === 'LUCIANO';
    if (usuarioLogado.acesso_admin || isLuciano) return true;
    if (usuarioLogado.setoresIds.length === 0) return true;
    return usuarioLogado.setoresIds.includes(setorId);
  }, [usuarioLogado]);

  // Verificar se pode editar faltas de um setor
  const canEditFaltas = useCallback((setorId?: string) => {
    if (!usuarioLogado) return false;
    const isLuciano = usuarioLogado.nome?.toUpperCase() === 'LUCIANO';
    if (usuarioLogado.acesso_admin || isLuciano) return true;
    if (!usuarioLogado.pode_editar_faltas) return false;
    if (!setorId) return true;
    if (usuarioLogado.setoresIds.length === 0) return true;
    return usuarioLogado.setoresIds.includes(setorId);
  }, [usuarioLogado]);

  const isLuciano = usuarioLogado?.nome?.toUpperCase() === 'LUCIANO';

  return (
    <UserContext.Provider
      value={{
        usuarioAtual,
        setUsuarioAtual,
        isAdmin: (usuarioLogado?.acesso_admin || isLuciano) ?? false,
        isVisualizacao: !isRHMode,
        canEditDemissoes: (usuarioLogado?.pode_editar_demissoes || isLuciano) ?? false,
        canEditFuncionarios: (usuarioLogado?.pode_editar_funcionarios || isLuciano) ?? false,
        canEditHomologacoes: (usuarioLogado?.pode_editar_homologacoes || isLuciano) ?? false,
        canExportExcel: (usuarioLogado?.pode_exportar_excel || isLuciano) ?? false,
        canViewIntegracoes: usuarioAtual.pode_visualizar_integracoes || isLuciano,
        canEditIntegracoes: (usuarioLogado?.pode_editar_integracoes || isLuciano) ?? false,
        canEditFaltas,
        podeAcessarSetor,
        isRHMode,
        entrarModoRH,
        sairModoRH,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUsuario() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsuario must be used within a UserProvider');
  }
  return context;
}
