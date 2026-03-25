import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, ComponentType, useState, useEffect } from "react";
import { TopNavLayout } from "@/components/layout/TopNavLayout";
import { RHSidebarLayout } from "@/components/layout/RHSidebarLayout";
import { UserProvider, useUsuario } from "@/contexts/UserContext";
import { montarUsuarioLocal } from "@/lib/montarUsuarioLocal";
import { Construction, Wrench } from 'lucide-react';
import logoGlobalpack from '@/assets/logo-globalpack-new.png';
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// 🔧 MODO MANUTENÇÃO - Mude para false quando quiser reativar
const MODO_MANUTENCAO = false;
// ============================================================
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useLoginNotification } from "@/hooks/useLoginNotification";
import { useSetoresUsuario } from "@/hooks/useSetoresUsuario";
import { RotaProtegida } from "@/components/auth/RotaProtegida";
import { PageLoadingSkeleton } from "@/components/layout/PageLoadingSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useForceLogout } from "@/hooks/useForceLogout";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";

// Retry wrapper para imports dinâmicos (evita erro de cache stale)
function lazyRetry(factory: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() =>
    factory().catch(() => {
      // Limpa caches do browser e força reload com assets novos
      if ('caches' in window) {
        caches.keys().then(names => names.forEach(n => caches.delete(n)));
      }
      // Evita loop infinito: marca que já tentou reload
      const key = 'chunk_reload_' + window.location.pathname;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      return factory();
    })
  );
}

// Lazy loading: cada página só carrega quando acessada
const GateAcesso = lazyRetry(() => import("./pages/GateAcesso"));
const Home = lazyRetry(() => import("./pages/Home"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const Funcionarios = lazyRetry(() => import("./pages/Funcionarios"));
const PrevisaoAdmissao = lazyRetry(() => import("./pages/PrevisaoAdmissao"));
const CoberturasTreinamentos = lazyRetry(() => import("./pages/CoberturasTreinamentos"));
const ControleFaltas = lazyRetry(() => import("./pages/ControleFaltas"));
const IntegracaoFaltas = lazyRetry(() => import("./pages/IntegracaoFaltas"));
const Demissoes = lazyRetry(() => import("./pages/Demissoes"));
const CartaDesligamento = lazyRetry(() => import("./pages/CartaDesligamento"));
const Homologacoes = lazyRetry(() => import("./pages/Homologacoes"));
const Divergencias = lazyRetry(() => import("./pages/Divergencias"));
const Sopro = lazyRetry(() => import("./pages/Sopro"));
const QuadroGeral = lazyRetry(() => import("./pages/QuadroGeral"));
const Decoracao = lazyRetry(() => import("./pages/Decoracao"));

const Setores = lazyRetry(() => import("./pages/admin/Setores"));
const Situacoes = lazyRetry(() => import("./pages/admin/Situacoes"));
const Periodos = lazyRetry(() => import("./pages/admin/Periodos"));
const Usuarios = lazyRetry(() => import("./pages/admin/Usuarios"));
const Backup = lazyRetry(() => import("./pages/admin/Backup"));
const TiposDesligamento = lazyRetry(() => import("./pages/admin/TiposDesligamento"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));
const TrocaTurno = lazyRetry(() => import("./pages/TrocaTurno"));
const ConferenciaGestor = lazyRetry(() => import("./pages/ConferenciaGestor"));
const Notificacoes = lazyRetry(() => import("./pages/admin/Notificacoes"));
const CompararPlanilhas = lazyRetry(() => import("./pages/admin/CompararPlanilhas"));
const Simulacao = lazyRetry(() => import("./pages/admin/Simulacao"));
const ManualGestor = lazyRetry(() => import("./pages/ManualGestor"));
const ExperienciaGeral = lazyRetry(() => import("./pages/ExperienciaGeral"));
const Auditoria = lazyRetry(() => import("./pages/admin/Auditoria"));
const HistoricoAcesso = lazyRetry(() => import("./pages/admin/HistoricoAcesso"));
const ReferenciaComponentes = lazyRetry(() => import("./pages/admin/ReferenciaComponentes"));
const MockupGate = lazyRetry(() => import("./pages/MockupGate"));
const ArmariosFemininos = lazyRetry(() => import("./pages/ArmariosFemininos"));
const ManualArmarios = lazyRetry(() => import("./pages/ManualArmarios"));

const HistoricoMovimentacaoPage = lazyRetry(() => import("./pages/HistoricoMovimentacao"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 60s - realtime cuida das atualizações
      gcTime: 10 * 60 * 1000,     // 10min de cache após não ser usado
      refetchOnWindowFocus: false, // evita refetch desnecessário ao trocar abas
      retry: 1,                    // apenas 1 retry em caso de erro
    },
  },
});

// Layout unificado - todas as rotas autenticadas usam RHSidebarLayout

// Wrapper de segurança para páginas - evita tela branca
function SafePage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoadingSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// Componente que ativa realtime e decide qual layout usar
function LayoutRouter() {
  const location = useLocation();
  const { userRole, isRHMode, isAdmin, isVisualizacao, canEditFaltas } = useAuth();
  const { setoresNomes, destinoGestor, isGestorSetor } = useSetoresUsuario();

  // Ativa subscriptions realtime para todas as tabelas
  useRealtimeData();
  useInactivityLogout();
  useLoginNotification();
  useForceLogout();

  // Rota de Gate (/) - sem sidebar
  if (location.pathname === '/') {
    if (isRHMode) {
      console.log('[Router] Logado em / → redirecionando para /home');
      return <Navigate to="/home" replace />;
    }
    return (
      <SafePage>
        <Routes>
          <Route path="/" element={<GateAcesso />} />
        </Routes>
      </SafePage>
    );
  }

  // Usuário não logado → redireciona para o Gate de login
  if (!isRHMode) {
    console.log('[Router] Não logado em', location.pathname, '→ redirecionando para /');
    return <Navigate to="/" replace />;
  }

  // REAL PARCERIA: redirecionar para previsão se tentar acessar home
  const isRealParceria = isRHMode && userRole?.nome?.toUpperCase() === 'REAL PARCERIA';
  if (isRealParceria && location.pathname === '/home') {
    return <Navigate to="/previsao-admissao" replace />;
  }

  // Gestores agora também veem /home como todos os outros usuários

  // TODAS as rotas autenticadas usam o mesmo layout com sidebar
  return (
    <ErrorBoundary>
      <RHSidebarLayout>
        <SafePage>
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/experiencia-geral" element={<RotaProtegida requireFaltas><ExperienciaGeral /></RotaProtegida>} />
            
            <Route path="/funcionarios" element={<RotaProtegida requireFuncionarios><Funcionarios /></RotaProtegida>} />
            <Route path="/demissoes" element={<RotaProtegida requireDemissoes><Demissoes /></RotaProtegida>} />
            <Route path="/carta-desligamento" element={<RotaProtegida requireDemissoes><CartaDesligamento /></RotaProtegida>} />
            <Route path="/homologacoes" element={<RotaProtegida requireHomologacoes><Homologacoes /></RotaProtegida>} />
            
            <Route path="/previsao-admissao" element={<RotaProtegida requirePrevisao><PrevisaoAdmissao /></RotaProtegida>} />
            <Route path="/divergencias" element={<RotaProtegida requireDivergencias><Divergencias /></RotaProtegida>} />
            
            <Route path="/troca-turno" element={<RotaProtegida requireTrocaTurno><TrocaTurno /></RotaProtegida>} />
            
            <Route path="/coberturas-treinamentos" element={<RotaProtegida requireCoberturas><CoberturasTreinamentos /></RotaProtegida>} />
            
            <Route path="/faltas" element={<RotaProtegida allowVisualizacao><ControleFaltas /></RotaProtegida>} />
            <Route path="/faltas/integracao" element={<RotaProtegida requireFaltas><IntegracaoFaltas /></RotaProtegida>} />
            <Route path="/controle-faltas" element={<Navigate to="/faltas" replace />} />
            
            
            <Route path="/sopro" element={<Sopro />} />
            <Route path="/decoracao" element={<Decoracao />} />
            <Route path="/quadro-geral" element={<QuadroGeral />} />
            
            <Route path="/admin/setores" element={<RotaProtegida requireAdmin><Setores /></RotaProtegida>} />
            <Route path="/admin/situacoes" element={<RotaProtegida requireAdmin><Situacoes /></RotaProtegida>} />
            <Route path="/admin/periodos" element={<RotaProtegida requireAdmin><Periodos /></RotaProtegida>} />
            <Route path="/admin/usuarios" element={<RotaProtegida requireAdmin><Usuarios /></RotaProtegida>} />
            <Route path="/admin/backup" element={<RotaProtegida requireAdmin><Backup /></RotaProtegida>} />
            <Route path="/admin/tipos-desligamento" element={<RotaProtegida requireAdmin><TiposDesligamento /></RotaProtegida>} />
            
            <Route path="/admin/conferencia" element={<RotaProtegida requireAdmin><ConferenciaGestor /></RotaProtegida>} />
            <Route path="/admin/notificacoes" element={<RotaProtegida requireAdmin><Notificacoes /></RotaProtegida>} />
            <Route path="/admin/comparar" element={<RotaProtegida requireAdmin><CompararPlanilhas /></RotaProtegida>} />
            <Route path="/admin/simulacao" element={<RotaProtegida requireAdmin><Simulacao /></RotaProtegida>} />
            <Route path="/admin/auditoria" element={<RotaProtegida requireAdmin><Auditoria /></RotaProtegida>} />
            <Route path="/admin/historico-acesso" element={<RotaProtegida requireAdmin><HistoricoAcesso /></RotaProtegida>} />
            <Route path="/admin/referencia" element={<RotaProtegida requireAdmin><ReferenciaComponentes /></RotaProtegida>} />
            <Route path="/armarios-femininos" element={<RotaProtegida requireArmarios><ArmariosFemininos /></RotaProtegida>} />
            <Route path="/armarios-femininos/manual" element={<RotaProtegida requireArmarios><ManualArmarios /></RotaProtegida>} />
            
            
            <Route path="/historico-movimentacao" element={<HistoricoMovimentacaoPage />} />
            <Route path="/manual" element={<ManualGestor />} />
            <Route path="/mockup" element={<MockupGate />} />
            
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SafePage>
      </RHSidebarLayout>
    </ErrorBoundary>
  );
}

// Tela de manutenção com botão de login para teste
function TelaManutencaoComLogin() {
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const navigate = useNavigate();
  const { setUsuarioAtual, isRHMode } = useUsuario();
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Não redirecionar aqui - o ManutencaoRouter cuida disso

  const handleLogin = async () => {
    if (!nome.trim() || !senha) return;
    setCarregando(true);
    setErro('');
    try {
      const { data, error } = await supabase.functions.invoke('auth-handler', {
        body: { action: 'login', nome: nome.trim(), senha },
      });
      if (error) throw error;
      if (data.error) { setErro(data.error); setCarregando(false); return; }
      
      setUsuarioAtual(montarUsuarioLocal(data.user));
    } catch (err) {
      setErro('Erro ao conectar');
    }
    setCarregando(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-lg text-center">
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden p-10">
          <img src={logoGlobalpack} alt="Globalpack" className="h-14 mx-auto mb-8 object-contain opacity-90" />
          <div className="flex items-center justify-center gap-3 mb-6">
            <Construction className="h-10 w-10 text-amber-400 animate-pulse" />
            <Wrench className="h-8 w-8 text-amber-400/70" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Sistema em Manutenção</h1>
          <p className="text-slate-300 text-base mb-6 leading-relaxed">
            Estamos realizando melhorias no sistema.<br />
            Por favor, tente novamente em alguns minutos.
          </p>
          <div className="bg-slate-700/50 rounded-xl px-6 py-4 text-sm text-slate-400 mb-6">
            <p className="font-medium text-slate-300 mb-1">Previsão de retorno:</p>
            <p>Em breve — atualizações em andamento</p>
          </div>

          {!mostrarLogin ? (
            <button
              onClick={() => setMostrarLogin(true)}
              className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
            >
              Acesso administrativo
            </button>
          ) : (
            <div className="space-y-3 mt-4 animate-in fade-in duration-300">
              <input
                type="text"
                placeholder="Nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-amber-400 focus:outline-none text-sm"
                autoFocus
              />
              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white border border-slate-600 focus:border-amber-400 focus:outline-none text-sm"
              />
              {erro && <p className="text-red-400 text-sm">{erro}</p>}
              <button
                onClick={handleLogin}
                disabled={carregando || !nome.trim() || !senha}
                className="w-full px-4 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm disabled:opacity-50 transition-colors"
              >
                {carregando ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          )}

          <p className="text-xs text-slate-500 mt-8">Quadro de Pessoal · Globalpack</p>
        </div>
      </div>
    </div>
  );
}

// Router de manutenção: se logado → sistema normal, se não → tela manutenção
function ManutencaoRouter() {
  const { isRHMode } = useUsuario();
  
  // Se logado, renderiza o sistema normalmente
  if (isRHMode) {
    return <LayoutRouter />;
  }
  
  // Se não logado, mostra tela de manutenção
  return (
    <Routes>
      <Route path="*" element={<TelaManutencaoComLogin />} />
    </Routes>
  );
}

// App principal com providers
const App = () => {
  // 🔧 MODO MANUTENÇÃO - mostra tela de manutenção apenas para quem NÃO está logado
  // Quem fizer login pelo botão "Acesso administrativo" acessa o sistema normalmente
  if (MODO_MANUTENCAO) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <UserProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ManutencaoRouter />
              </BrowserRouter>
            </TooltipProvider>
          </UserProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UserProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <LayoutRouter />
            </BrowserRouter>
          </TooltipProvider>
        </UserProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
