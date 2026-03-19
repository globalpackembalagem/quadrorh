import { ReactNode, useState, useMemo, useEffect } from 'react';
import { SessionTimer } from '@/components/layout/SessionTimer';
import { ThemeSelectorButton } from '@/components/layout/ThemeSelectorButton';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock,
  Settings,
  Building2,
  FileText,
  Menu,
  X,
  ChevronDown,
  UserMinus,
  AlertTriangle,
  UserPlus,
  CalendarCheck,
  UserCog,
  Database,
  UserCheck,
  Eye,
  Megaphone,
  RefreshCw,
  LogOut,
  Key,
  LayoutList,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react';
// NotificacaoBadge removed - using direct link to Central de Notificações
// AvisoMovimentacaoModal removido - tudo vai pela Central de Notificações
import { CentralAvisosModal } from '@/components/notificacoes/CentralAvisosModal';
import { AlterarMinhaSenhaDialog } from '@/components/auth/AlterarMinhaSenhaDialog';
import { BotaoAcessoRH } from '@/components/auth/BotaoAcessoRH';
import { GuiaInterativoGestor } from '@/components/manual/GuiaInterativoGestor';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';
import { useForceLogout } from '@/hooks/useForceLogout';
import logoGlobalpack from '@/assets/logo-globalpack-new.png';


interface TopNavLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  viewOnly?: boolean;
}

const adminNavigation = [
  { name: 'SIMULAÇÃO', href: '/admin/simulacao', icon: LayoutList },
  { name: 'NOTIFICAÇÕES', href: '/admin/notificacoes', icon: Megaphone },
  { name: 'SETORES', href: '/admin/setores', icon: Building2 },
  { name: 'SITUAÇÕES', href: '/admin/situacoes', icon: FileText },
  { name: 'PERÍODOS', href: '/admin/periodos', icon: Clock },
  { name: 'USUÁRIOS', href: '/admin/usuarios', icon: UserCog },
  { name: 'BACKUP', href: '/admin/backup', icon: Database },
  { name: 'HISTÓRICO DE ACESSO', href: '/admin/historico-acesso', icon: Eye },
];

export function TopNavLayout({ children }: TopNavLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alterarSenhaOpen, setAlterarSenhaOpen] = useState(false);
  const [guiaOpen, setGuiaOpen] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const { isAdmin, isVisualizacao, canEditFaltas, canEditFuncionarios, canEditDemissoes, canEditHomologacoes, isRHMode, sairModoRH } = useAuth();
  const { usuarioAtual } = useUsuario();
  const { theme } = useTheme();
  const { forceLogoutAll } = useForceLogout();

  // Monta o menu dinamicamente com base nas permissões do usuário logado
  const rhNavigation: NavItem[] = isRHMode ? [
    { name: 'QUADRO DE FUNCIONÁRIOS', href: '/', icon: LayoutDashboard },
    // Funcionários
    ...(usuarioAtual.pode_visualizar_funcionarios || usuarioAtual.pode_editar_funcionarios ? [
      { name: 'FUNCIONÁRIOS', href: '/funcionarios', icon: Users, viewOnly: !usuarioAtual.pode_editar_funcionarios },
    ] : []),
    // Previsão de Admissão (apenas admin/RH, não gestores)
    ...(isAdmin && (usuarioAtual.pode_visualizar_previsao || usuarioAtual.pode_editar_previsao) ? [
      { name: 'PREVISÃO ADMISSÃO', href: '/previsao-admissao', icon: UserPlus, viewOnly: !usuarioAtual.pode_editar_previsao },
    ] : []),
    // Cobertura Férias / Treinamento
    ...(usuarioAtual.pode_visualizar_coberturas || usuarioAtual.pode_editar_coberturas ? [
      { name: 'COB. FÉRIAS / TREINAMENTO', href: '/coberturas-treinamentos', icon: UserCheck, viewOnly: !usuarioAtual.pode_editar_coberturas },
    ] : []),
    // Controle de Faltas
    ...(usuarioAtual.pode_visualizar_faltas || usuarioAtual.pode_editar_faltas ? [
      { name: 'CONTROLE DE FALTAS', href: '/faltas', icon: Clock, viewOnly: !usuarioAtual.pode_editar_faltas },
    ] : []),
    // Demissões
    ...(usuarioAtual.pode_visualizar_demissoes || usuarioAtual.pode_editar_demissoes ? [
      { name: 'DEMISSÕES', href: '/demissoes', icon: UserMinus, viewOnly: !usuarioAtual.pode_editar_demissoes },
    ] : []),
    // Homologações
    ...(usuarioAtual.pode_visualizar_homologacoes || usuarioAtual.pode_editar_homologacoes ? [
      { name: 'HOMOLOGAÇÕES', href: '/homologacoes', icon: CalendarCheck, viewOnly: !usuarioAtual.pode_editar_homologacoes },
    ] : []),
    // Divergências
    ...(usuarioAtual.pode_visualizar_divergencias || usuarioAtual.pode_criar_divergencias ? [
      { name: 'DIVERGÊNCIAS', href: '/divergencias', icon: AlertTriangle, viewOnly: !usuarioAtual.pode_criar_divergencias },
    ] : []),
    // Troca de Turno
    ...(usuarioAtual.pode_visualizar_troca_turno || usuarioAtual.pode_editar_troca_turno ? [
      { name: 'TROCA DE TURNO', href: '/troca-turno', icon: RefreshCw, viewOnly: !usuarioAtual.pode_editar_troca_turno },
    ] : []),
  ] : [];

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const isAdminActive = location.pathname.startsWith('/admin');
  const isRhActive = rhNavigation.some(item => isActive(item.href)) || isAdminActive;

  const handleLogout = () => {
    sairModoRH();
    navigate('/');
  };

  const handleForceLogoutAll = async () => {
    if (!confirm('Tem certeza que deseja deslogar TODOS os usuários?')) return;
    try {
      await forceLogoutAll(usuarioAtual.nome);
    } catch {
      // erro já tratado no hook
    }
  };

  const isLoggedIn = isRHMode;

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center">
          {/* Logo */}
          <Link to="/home" className="mr-4 flex items-center space-x-3">
            <img src={logoGlobalpack} alt="GlobalPack" className="h-10 w-auto rounded" />
          </Link>
          {isLoggedIn && (isAdmin || usuarioAtual.acesso_admin) && (
            <Link
              to="/home"
              className={cn(
                'mr-8 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-colors',
                location.pathname === '/'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline-block">QUADRO FUNCIONÁRIOS</span>
            </Link>
          )}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 flex-1">
            {/* RH Dropdown - apenas para logados */}
            {isLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isRhActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Users className="h-4 w-4" />
                    {isAdmin ? 'RH' : 'LOGIN'}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {rhNavigation.map((item) => (
                    <DropdownMenuItem key={item.name} asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          'flex items-center gap-2 justify-between',
                          isActive(item.href) && 'bg-accent'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {item.name}
                        </div>
                        {item.viewOnly && (
                          <Eye className="h-3 w-3 text-muted-foreground" />
                        )}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  {/* Admin Section - só para admin, toggle */}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setAdminExpanded(prev => !prev);
                        }}
                        className="text-xs text-muted-foreground cursor-pointer"
                      >
                        <Settings className="h-3 w-3 mr-2" />
                        ADMINISTRAÇÃO
                        <ChevronDown className={cn("h-3 w-3 ml-auto transition-transform", adminExpanded && "rotate-180")} />
                      </DropdownMenuItem>
                      {adminExpanded && adminNavigation.map((item) => (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link
                            to={item.href}
                            className={cn(
                              'flex items-center gap-2 pl-6',
                              isActive(item.href) && 'bg-accent'
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>

          {/* Right side: Notifications + Logout */}
          <div className="hidden md:flex items-center ml-auto gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/notificacoes')}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Megaphone className="h-4 w-4" />
              NOTIFICAÇÕES
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/manual')}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <BookOpen className="h-4 w-4" />
              MANUAL
            </Button>
            {isLoggedIn ? (
              <>
                <SessionTimer />
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleForceLogoutAll}
                    className="gap-2 text-muted-foreground hover:text-destructive"
                    title="Deslogar todos os usuários"
                  >
                    <Users className="h-4 w-4" />
                    DESLOGAR TODOS
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  SAIR
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-xs">VISITANTE</Badge>
                <BotaoAcessoRH />
              </>
            )}
            <ThemeSelectorButton />
          </div>

          {/* Mobile: LOGIN for visitors, MENU for logged in */}
          <div className="md:hidden ml-auto flex items-center gap-2">
            <ThemeSelectorButton />
            {isLoggedIn ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                LOGIN
              </Button>
            ) : (
              <>
                <Badge variant="outline" className="text-xs">VISITANTE</Badge>
                <BotaoAcessoRH />
              </>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card">
            <nav className="container py-4 space-y-2">
              {/* RH Section - oculto para visualização */}
              {!isVisualizacao && (
                <div>
                  <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isAdmin ? 'RH' : 'LOGIN'}
                  </p>
                  {rhNavigation.map((item) => (
                     <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors justify-between',
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </div>
                      {item.viewOnly && (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {/* Admin Section - só para admin */}
              {isAdmin && (
                <div className="pt-2 border-t">
                  <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Administração
                  </p>
                  {adminNavigation.map((item) => (
                     <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Botão Sair no mobile */}
              {isLoggedIn && (
                <div className="pt-2 border-t space-y-1">
                   <button
                    onClick={() => setAlterarSenhaOpen(true)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent w-full"
                  >
                    <Key className="h-5 w-5" />
                    ALTERAR MINHA SENHA
                  </button>
                   <button
                    onClick={() => { handleLogout(); }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 w-full"
                  >
                    <LogOut className="h-5 w-5" />
                    SAIR DO SISTEMA
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container py-6">{children}</div>
      </main>

      <AlterarMinhaSenhaDialog open={alterarSenhaOpen} onOpenChange={setAlterarSenhaOpen} />
      {/* Modal unificado de avisos */}
      <CentralAvisosModal />
      <GuiaInterativoGestor open={guiaOpen} onOpenChange={setGuiaOpen} />
    </div>
  );
}
