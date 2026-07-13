import React, { ReactNode, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock,
  Settings,
  Building2,
  FileText,
  UserMinus,
  AlertTriangle,
  Wind,
  Palette,
  UserPlus,
  CalendarCheck,
  UserCog,
  Database,
  UserCheck,
  ShieldCheck,
  Eye,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  ListChecks,
  Menu,
  DoorOpen,
  X,
  Home,
  RefreshCw,
  BookOpen,
  Megaphone,
  Key,
  Lightbulb,
  Pin,
  PinOff,
  History,
  ExternalLink,
  Shield,
  Heart,
  MessageCircle,
  Activity,
  ImageDown,
} from 'lucide-react';
import { SessionTimer } from '@/components/layout/SessionTimer';
import { ThemeSelectorButton } from '@/components/layout/ThemeSelectorButton';
import { cn } from '@/lib/utils';
import { BotaoAcessoRH } from '@/components/auth/BotaoAcessoRH';
import { useAuth } from '@/hooks/useAuth';
import { useFuncionariosRealtime } from '@/hooks/useFuncionarios';
import { UsuarioLocal, useUsuario } from '@/contexts/UserContext';
import logoGlobalpack from '@/assets/logo-globalpack-new.png';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSetoresUsuario } from '@/hooks/useSetoresUsuario';
// AvisoMovimentacaoModal removido - tudo vai pela Central de Notificações
import { CentralAvisosModal } from '@/components/notificacoes/CentralAvisosModal';
import { AlterarMinhaSenhaDialog } from '@/components/auth/AlterarMinhaSenhaDialog';
import { GuiaInterativoGestor } from '@/components/manual/GuiaInterativoGestor';
import { ForceUpdateModal } from '@/components/admin/ForceUpdateModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RHSidebarLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: NavItem[];
  viewOnly?: boolean;
  disabled?: boolean;
  restricted?: boolean;
  external?: boolean;
}

// Navegação base - será filtrada por permissões
const allRHNavigation: NavItem[] = [
  { name: 'QUADRO DE FUNCIONÁRIOS', href: '/', icon: LayoutDashboard },
  { name: 'HISTORICO DO QUADRO', href: '/historico-quadro', icon: History },
  
  { name: 'FUNCIONÁRIOS', href: '/funcionarios', icon: Users },
  { name: 'PREVISÃO ADMISSÃO', href: '/previsao-admissao', icon: UserPlus },
  { 
    name: 'CONTROLE DE FALTAS', 
    href: '/faltas', 
    icon: Clock,
    subItems: [
      { name: 'POR FUNCIONÁRIOS', href: '/faltas', icon: ClipboardList },
      { name: 'ALERTAS 3+', href: '/faltas/alertas', icon: AlertTriangle },
      { name: 'INTEGRAÇÃO', href: '/faltas/integracao', icon: ListChecks },
    ]
  },
  { 
    name: 'DEMISSÕES', 
    href: '/demissoes', 
    icon: UserMinus,
    subItems: [
      { name: 'CONTROLE', href: '/demissoes', icon: UserMinus },
      { name: 'CARTA DE DESLIGAMENTO', href: '/carta-desligamento', icon: FileText },
    ]
  },
  { name: 'HOMOLOGAÇÕES', href: '/homologacoes', icon: CalendarCheck },
  { name: 'DIVERGÊNCIAS', href: '/divergencias', icon: AlertTriangle },
  { name: 'TROCA DE TURNO', href: '/troca-turno', icon: RefreshCw },
  { name: 'ARMÁRIOS FEMININO', href: '/armarios-femininos', icon: DoorOpen },
  
];

// Itens exclusivos admin no menu principal (fora de Configuração)
const adminMainItems: NavItem[] = [
  { name: 'NOTIFICAÇÕES', href: '/admin/notificacoes', icon: Megaphone },
  { name: 'CAPTURA DE FOTOS', href: '/captura-fotos?rhfoto=1', icon: ExternalLink, external: true },
  { name: 'CONTROLE DE FOTOS', href: '/admin/controle-fotos', icon: ImageDown },
];

const adminNavigation = [
  { name: 'SETORES', href: '/admin/setores', icon: Building2 },
  { name: 'SITUAÇÕES', href: '/admin/situacoes', icon: FileText },
  { name: 'TIPOS DESLIGAMENTO', href: '/admin/tipos-desligamento', icon: UserMinus },
  { name: 'PERÍODOS', href: '/admin/periodos', icon: Clock },
  { name: 'USUÁRIOS', href: '/admin/usuarios', icon: UserCog },
  { name: 'ACESSOS USUÁRIOS', href: '/admin/acessos-usuarios', icon: Activity },
  { name: 'BACKUP', href: '/admin/backup', icon: Database },
  { name: 'REFERÊNCIA', href: '/admin/referencia', icon: Lightbulb },
  { name: 'MANUAL DO GESTOR', href: '/manual', icon: BookOpen },
];

// Item do manual - acessível para todos os logados
const manualNavItem = { name: 'MANUAL DO GESTOR', href: '/manual', icon: BookOpen };

// Função para filtrar navegação por perfil e permissões granulares
function getNavigationForUser(
  isAdmin: boolean, 
  isRHMode: boolean, 
  isVisualizacao: boolean, 
  canEditFaltas: boolean, 
  userName?: string,
  perms?: UsuarioLocal
): NavItem[] {
  const userNameNormalizado = userName
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  const podeVerHistoricoQuadro = ['LUCIANO', 'MAURICIO'].includes(userNameNormalizado || '');

  // REAL PARCERIA: acesso pontual, sempre em modo visualização
  if (userName?.toUpperCase() === 'REAL PARCERIA') {
    return [
      { name: 'QUADRO DE FUNCIONÁRIOS', href: '/home', icon: LayoutDashboard },
      { name: 'FUNCIONÁRIOS', href: '/funcionarios', icon: Users, viewOnly: true },
      { name: 'PREVISÃO ADMISSÃO', href: '/previsao-admissao', icon: UserPlus, viewOnly: true },
      { 
        name: 'CONTROLE DE FALTAS', 
        href: '/faltas', 
        icon: Clock,
        viewOnly: true,
        subItems: [
          { name: 'MÉTRICAS SETOR/DIA', href: '/faltas', icon: ClipboardList },
          { name: 'ALERTAS 3+', href: '/faltas/alertas', icon: AlertTriangle, viewOnly: true },
        ]
      },
    ];
  }


  // Visualização: Dashboard + Controle de Faltas (apenas visualização)
  if (isVisualizacao) {
    return [
      { name: 'QUADRO DE FUNCIONÁRIOS', href: '/', icon: LayoutDashboard },
      { 
        name: 'CONTROLE DE FALTAS', 
        href: '/faltas', 
        icon: Clock,
        viewOnly: true,
        subItems: [
          { name: 'POR FUNCIONÁRIOS', href: '/faltas', icon: ClipboardList },
        ]
      },
    ];
  }
  
  // Admin: tudo
  if (isAdmin) {
    return podeVerHistoricoQuadro
      ? allRHNavigation
      : allRHNavigation.filter((item) => item.href !== '/historico-quadro');
  }
  
  // Gestor de setor: menu baseado nas permissões granulares
  if (canEditFaltas) {
    const gestorItems: NavItem[] = [
      { name: 'QUADRO DE FUNCIONÁRIOS', href: '/', icon: LayoutDashboard },
      
    ];

    if (podeVerHistoricoQuadro) {
      gestorItems.push({ name: 'HISTÓRICO DO QUADRO', href: '/historico-quadro', icon: History });
    }

    if (!perms || perms.pode_visualizar_funcionarios) {
      gestorItems.push({ name: 'FUNCIONÁRIOS', href: '/funcionarios', icon: Users, viewOnly: !perms?.pode_editar_funcionarios });
    }

    gestorItems.push({ 
      name: 'CONTROLE DE FALTAS', 
      href: '/faltas', 
      icon: Clock,
      subItems: [
        { name: 'POR FUNCIONÁRIOS', href: '/faltas', icon: ClipboardList },
      ]
    });

    if (!perms || perms.pode_visualizar_troca_turno) {
      gestorItems.push({ name: 'TROCA DE TURNO', href: '/troca-turno', icon: RefreshCw, viewOnly: !perms?.pode_editar_troca_turno });
    }

    // Divergências - inativo para gestores
    gestorItems.push({ name: 'DIVERGÊNCIAS', href: '/divergencias', icon: AlertTriangle, disabled: true });

    // Armários Femininos - para gestoras com permissão
    if (perms?.pode_visualizar_armarios || perms?.pode_editar_armarios) {
      gestorItems.push({ name: 'ARMÁRIOS FEMININO', href: '/armarios-femininos', icon: DoorOpen, viewOnly: !perms?.pode_editar_armarios });
    }

    return gestorItems;
  }
  
  // RH padrão: filtrar por permissões granulares
  const items: NavItem[] = [
    { name: 'QUADRO DE FUNCIONÁRIOS', href: '/', icon: LayoutDashboard },
    ...(podeVerHistoricoQuadro ? [{ name: 'HISTÓRICO DO QUADRO', href: '/historico-quadro', icon: History }] : []),
  ];


  // Funcionários
  if (!perms || perms.pode_visualizar_funcionarios) {
    items.push({ name: 'FUNCIONÁRIOS', href: '/funcionarios', icon: Users, viewOnly: perms && !perms.pode_editar_funcionarios });
  }

  // Previsão Admissão
  if (!perms || perms.pode_visualizar_previsao) {
    items.push({ name: 'PREVISÃO ADMISSÃO', href: '/previsao-admissao', icon: UserPlus, viewOnly: perms && !perms.pode_editar_previsao });
  }

  // Controle de Faltas
  if (perms?.pode_visualizar_faltas) {
    items.push({ 
      name: 'CONTROLE DE FALTAS', 
      href: '/faltas', 
      icon: Clock,
      viewOnly: !perms.pode_editar_faltas,
      subItems: [
        { name: 'POR FUNCIONÁRIOS', href: '/faltas', icon: ClipboardList },
        { name: 'ALERTAS 3+', href: '/faltas/alertas', icon: AlertTriangle, viewOnly: true },
        { name: 'ALERTAS 3+', href: '/faltas/alertas', icon: AlertTriangle },
        ...(perms.pode_editar_faltas ? [{ name: 'INTEGRAÇÃO', href: '/faltas/integracao', icon: ListChecks }] : []),
      ]
    });
  }

  // Demissões
  if (!perms || perms.pode_visualizar_demissoes) {
    items.push({ 
      name: 'DEMISSÕES', 
      href: '/demissoes', 
      icon: UserMinus,
      viewOnly: perms && !perms.pode_editar_demissoes,
      subItems: [
        { name: 'CONTROLE', href: '/demissoes', icon: UserMinus },
        { name: 'CARTA DE DESLIGAMENTO', href: '/carta-desligamento', icon: FileText },
      ]
    });
  }

  // Homologações
  if (!perms || perms.pode_visualizar_homologacoes) {
    items.push({ name: 'HOMOLOGAÇÕES', href: '/homologacoes', icon: CalendarCheck, viewOnly: perms && !perms.pode_editar_homologacoes });
  }

  // Divergências
  if (!perms || perms.pode_visualizar_divergencias) {
    items.push({ name: 'DIVERGÊNCIAS', href: '/divergencias', icon: AlertTriangle, viewOnly: perms && !perms.pode_criar_divergencias });
  }

  // Troca de Turno
  if (!perms || perms.pode_visualizar_troca_turno) {
    items.push({ name: 'TROCA DE TURNO', href: '/troca-turno', icon: RefreshCw, viewOnly: perms && !perms.pode_editar_troca_turno });
  }

  // Armários Femininos - RH sempre vê, ou por permissão granular
  if (!perms || perms.pode_visualizar_armarios || perms.pode_editar_armarios) {
    items.push({ name: 'ARMÁRIOS FEMININO', href: '/armarios-femininos', icon: DoorOpen, viewOnly: perms && !perms.pode_editar_armarios });
  }


  return items;
}

export function RHSidebarLayout({ children }: RHSidebarLayoutProps) {
  useFuncionariosRealtime();
  const location = useLocation();
  const { isRHMode, userRole, isAdmin, isVisualizacao, canEditFaltas } = useAuth();
  const { usuarioAtual } = useUsuario();
  const isGestorSetor = isRHMode && !isAdmin && canEditFaltas();
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(['CONTROLE DE FALTAS', 'DEMISSÕES']);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guiaOpen, setGuiaOpen] = useState(false);
  const [alterarSenhaOpen, setAlterarSenhaOpen] = useState(false);
  const [forcandoAtualizacao, setForcandoAtualizacao] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try { return localStorage.getItem('sidebar-pinned') === 'true'; } catch { return false; }
  });
  const isMobile = useIsMobile();

  // Navegação filtrada por perfil
  const rhNavigation = getNavigationForUser(isAdmin, isRHMode, isVisualizacao, canEditFaltas(), userRole?.nome, isRHMode ? usuarioAtual : undefined);
  const nomeUsuarioNormalizado = (userRole?.nome || usuarioAtual.nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  const canAccessFakeQuadro = isRHMode && nomeUsuarioNormalizado === 'LUCIANO';
  const canAccessSimuladorQuadro = isRHMode && ['LUCIANO', 'MAURICIO'].includes(nomeUsuarioNormalizado);

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const toggleSubmenu = (name: string) => {
    setOpenSubmenus(prev => 
      prev.includes(name) 
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const togglePin = () => {
    const next = !sidebarPinned;
    setSidebarPinned(next);
    try { localStorage.setItem('sidebar-pinned', String(next)); } catch {}
  };

  const forcarAtualizacao = async () => {
    if (!usuarioAtual?.nome) return;
    setForcandoAtualizacao(true);
    try {
      const { error } = await supabase.from('force_update').insert({
        triggered_by: usuarioAtual.nome,
      });
      if (error) throw error;
      toast.success('Atualizacao obrigatoria enviada para usuarios logados.');
    } catch (error) {
      toast.error('Erro ao enviar atualizacao obrigatoria.');
    } finally {
      setForcandoAtualizacao(false);
    }
  };

  const renderNavItem = (item: NavItem, closeMobileMenu?: () => void, depth: number = 0): React.ReactNode => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isSubActive = hasSubItems && item.subItems!.some(sub => 
      isActive(sub.href) || (sub.subItems && sub.subItems.some(s => isActive(s.href)))
    );
    const isOpen = openSubmenus.includes(item.name);

    const iconSize = depth === 0 ? 'h-5 w-5' : depth === 1 ? 'h-4 w-4' : 'h-3.5 w-3.5';
    const textSize = depth === 0 ? 'text-[13px]' : 'text-[12px]';
    const padding = depth === 0 ? 'px-4 py-3' : depth === 1 ? 'px-4 py-2.5' : 'px-4 py-2';
    const fontWeight = depth === 0 ? 'font-semibold' : 'font-medium';
    const letterSpacing = depth === 0 ? 'tracking-wide' : 'tracking-normal';

    // Colors: main items get primary icon tint, sub-items get muted/secondary
    const iconColor = depth === 0 ? 'text-sidebar-foreground/70' : depth === 1 ? 'text-sidebar-foreground/50' : 'text-sidebar-foreground/40';

    if (hasSubItems) {
      return (
        <Collapsible key={item.name} open={isOpen} onOpenChange={() => toggleSubmenu(item.name)}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-3.5 w-full rounded-xl transition-all duration-200',
                textSize, padding, fontWeight, letterSpacing,
                isSubActive
                  ? 'bg-sidebar-primary/10 text-sidebar-primary border border-sidebar-primary/20 shadow-sm'
                  : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon className={cn(iconSize, 'shrink-0 transition-transform duration-200', isSubActive ? 'text-sidebar-primary' : iconColor)} />
              <span className="truncate flex-1 text-left">{item.name}</span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-sidebar-foreground/20" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-sidebar-foreground/20" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className={cn(
            "mt-1 space-y-1",
            depth === 0 ? "ml-6 pl-4 border-l border-sidebar-primary/10" : "ml-5 pl-4 border-l border-sidebar-border/50"
          )}>
            {item.subItems!.map((subItem) => renderNavItem(subItem, closeMobileMenu, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    const isExternal = item.href.startsWith('http');

    if (isExternal) {
      return (
        <a
          key={item.name}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={closeMobileMenu}
          className={cn(
            'flex items-center gap-3.5 rounded-xl transition-all duration-200',
            textSize, padding, fontWeight, letterSpacing,
            'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          )}
        >
          <item.icon className={cn(iconSize, 'shrink-0', iconColor)} />
          <span className="truncate">{item.name}</span>
        </a>
      );
    }

    if (item.disabled) {
      return (
        <div
          key={item.name}
          className={cn(
            'flex items-center gap-3.5 rounded-xl opacity-40 cursor-not-allowed',
            textSize, padding, fontWeight, letterSpacing
          )}
        >
          <item.icon className={cn(iconSize, 'shrink-0', iconColor)} />
          <span className="truncate">{item.name}</span>
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={closeMobileMenu}
        className={cn(
          'flex items-center gap-3.5 rounded-xl transition-all duration-200',
          textSize, padding, fontWeight, letterSpacing,
          isActive(item.href)
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20 ring-1 ring-sidebar-primary/20'
            : depth === 0
              ? 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        )}
      >
        <item.icon className={cn(iconSize, 'shrink-0 transition-transform duration-200 group-hover:scale-110', isActive(item.href) ? 'text-sidebar-primary-foreground' : iconColor)} />
        <span className="truncate">{item.name}</span>
        {item.viewOnly && (
          <Eye className="h-3.5 w-3.5 ml-auto text-muted-foreground/50 shrink-0" />
        )}
      </Link>
    );
  };

  // Conteúdo do menu (compartilhado entre mobile e desktop drawer)
  const menuContent = (closeFn?: () => void) => (
    <div className="flex flex-col h-full">
      {/* Header do Sheet */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-sidebar-border bg-sidebar-accent/20">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1.5 rounded-lg shadow-sm">
            <img src={logoGlobalpack} alt="GlobalPack" className="h-6 w-auto" />
          </div>
          <span className="font-extrabold text-sidebar-foreground text-xs uppercase tracking-widest opacity-80">SISTEMA RH</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Botão Fixar/Soltar - só no desktop */}
          {!isMobile && (
            <button
              onClick={togglePin}
              className={cn(
                "p-2 rounded-xl transition-all duration-200",
                sidebarPinned
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                  : "text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
              title={sidebarPinned ? "Soltar menu (fechar ao clicar)" : "Fixar menu (manter aberto)"}
            >
              {sidebarPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Perfil / Modo Indicator - New improved design */}
      <div className="px-4 pt-5 pb-2">
        <div className={cn(
          "flex flex-col gap-1 p-3.5 rounded-2xl border transition-all duration-300",
          isRHMode 
            ? "bg-sidebar-primary/5 border-sidebar-primary/20" 
            : "bg-muted/10 border-sidebar-border/50"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
              isRHMode ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent text-sidebar-foreground"
            )}>
              {isRHMode ? <ShieldCheck className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-sidebar-foreground/50 leading-none mb-0.5">PERFIL</span>
              <span className="text-xs font-bold text-sidebar-foreground truncate tracking-tight">{isRHMode ? userRole.nome : 'VISITANTE'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-3 space-y-1">
          {rhNavigation.map(item => renderNavItem(item, closeFn))}
        </div>

        {/* Admin main items - fora de Configuração */}
        {isAdmin && (
          <div className="mt-4 px-3">
            <div className="space-y-1">
              <button
                type="button"
                onClick={forcarAtualizacao}
                disabled={forcandoAtualizacao}
                className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] font-semibold transition-all duration-200 w-full text-left text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:opacity-60"
	              >
	                <RefreshCw className="h-5 w-5 shrink-0 text-sidebar-primary/70" />
	                <span className="truncate">{forcandoAtualizacao ? 'ENVIANDO...' : 'FORCAR ATUALIZACAO'}</span>
	              </button>
	              {canAccessSimuladorQuadro && (
	                <Link
	                  to="/admin/simulacao"
	                  onClick={closeFn}
	                  className={cn(
	                    'flex items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] font-semibold transition-all duration-200 border',
	                    isActive('/admin/simulacao')
	                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
	                      : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20'
	                  )}
	                >
	                  <Activity className={cn("h-5 w-5 shrink-0", isActive('/admin/simulacao') ? "text-white" : "text-emerald-600")} />
	                  <span className="truncate">SIMULADOR DO QUADRO</span>
	                </Link>
	              )}
	              {adminMainItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  onClick={closeFn}
                  className={cn(
                    'flex items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] font-semibold transition-all duration-200',
                    isActive(item.href)
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20'
                      : 'text-sidebar-foreground/90 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive(item.href) ? "text-sidebar-primary-foreground" : "text-sidebar-primary/70")} />
                  <span className="truncate">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Admin Section - toggle */}
        {isAdmin && (
          <div className="mt-6 px-3">
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-3 w-full px-4 py-3 text-[11px] font-bold text-yellow-500 uppercase tracking-[0.15em] hover:text-yellow-400 transition-all duration-200 group">
                  <Settings className="h-4 w-4 group-hover:rotate-45 transition-transform duration-300 text-yellow-500" />
                  <span className="text-yellow-500">CONFIGURAÇÃO</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-auto transition-transform [[data-state=open]>&]:rotate-90 opacity-40 text-yellow-500" />
                </button>
              </CollapsibleTrigger>
	              <CollapsibleContent>
	                <div className="mt-2 space-y-1 ml-4 border-l border-sidebar-border/50 pl-2">
	                  {canAccessFakeQuadro && (
	                    <Link
	                      to="/admin/fake-quadro"
	                      onClick={closeFn}
	                      className={cn(
	                        'flex items-center gap-3 rounded-xl px-4 py-2.5 text-[12px] font-medium transition-all duration-200',
	                        isActive('/admin/fake-quadro')
	                          ? 'bg-sidebar-primary/10 text-sidebar-primary font-bold border border-sidebar-primary/20'
	                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
	                      )}
	                    >
	                      <ShieldCheck className={cn("h-4 w-4 shrink-0", isActive('/admin/fake-quadro') ? "text-sidebar-primary" : "text-sidebar-foreground/40")} />
	                      <span className="truncate">QUADRO FAKE</span>
	                    </Link>
	                  )}
	                  {adminNavigation.map((item) => (
	                    <Link
                      key={item.name}
                      to={item.href}
                      
                      onClick={closeFn}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-4 py-2.5 text-[12px] font-medium transition-all duration-200',
                        isActive(item.href)
                          ? 'bg-sidebar-primary/10 text-sidebar-primary font-bold border border-sidebar-primary/20'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      <item.icon className={cn("h-4 w-4 shrink-0", isActive(item.href) ? "text-sidebar-primary" : "text-sidebar-foreground/40")} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </CollapsibleContent>
          </Collapsible>
          </div>
        )}


        {/* Alterar Senha + Acesso RH */}
        <div className="mt-auto px-4 pb-6 space-y-2.5">
          <div className="h-px bg-sidebar-border/50 mb-4 mx-2" />
          {isRHMode && (
            <button
              onClick={() => { setAlterarSenhaOpen(true); closeFn?.(); }}
              className="flex items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] font-semibold text-sidebar-foreground/90 hover:bg-sidebar-primary/5 hover:text-sidebar-primary border border-transparent hover:border-sidebar-primary/10 transition-all duration-200"
            >
              <Key className="h-5 w-5 shrink-0 opacity-70" />
              ALTERAR MINHA SENHA
            </button>
          )}
          <div className="pt-2">
            <BotaoAcessoRH />
          </div>
        </div>
      </nav>
    </div>
  );

  const showPinnedSidebar = sidebarPinned && !isMobile;

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      {/* Top Header com botão de menu */}
      <header className="sticky top-0 z-50 h-14 flex items-center justify-between px-4 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex items-center gap-2">
          {/* Botão Menu - abre drawer à esquerda (só quando não fixo) */}
          {!showPinnedSidebar && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-foreground gap-1.5 px-2">
                  <Menu className="h-5 w-5" />
                  <span className="text-xs font-bold">MENU</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-0">
                {menuContent(() => setMobileMenuOpen(false))}
              </SheetContent>
            </Sheet>
          )}

          <Link to="/home" className="flex items-center gap-4 hover:opacity-90 transition-all group">
              <div className="rounded-md overflow-hidden border border-border bg-background/60">
                <img src={logoGlobalpack} alt="GlobalPack" className="h-8 w-auto" />
              </div>
            {!isMobile && (
              <div className="flex flex-col">
                <span className="font-extrabold text-foreground text-base tracking-tight leading-none">Quadro<span className="text-primary">RH</span></span>
                <span className="text-[10px] font-semibold text-muted-foreground tracking-[0.18em] mt-0.5">GLOBALPACK</span>
              </div>
            )}
          </Link>
          {isRHMode && (
            <div className="hidden lg:flex items-center gap-2 ml-10 pl-6 border-l border-border">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                <span className="text-muted-foreground">SESSAO:</span>
                <span className="ml-1 text-foreground">{userRole.nome}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ThemeSelectorButton />

          {/* Atalhos rápidos REAL PARCERIA */}
          {isRHMode && userRole?.nome?.toUpperCase() === 'REAL PARCERIA' && (
            <>
              <Link
                to="/previsao-admissao"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors',
                  location.pathname === '/previsao-admissao'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-sidebar-accent text-sidebar-foreground hover:bg-primary/20'
                )}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {!isMobile && 'PREVISÃO'}
              </Link>
              <Link
                to="/faltas"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors',
                  location.pathname.startsWith('/faltas')
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-sidebar-accent text-sidebar-foreground hover:bg-primary/20'
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                FALTAS
              </Link>
            </>
          )}

        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar fixa no desktop quando pinned */}
        {showPinnedSidebar && (
          <aside className="w-72 border-r bg-sidebar shrink-0 overflow-y-auto h-[calc(100vh-3.5rem)] sticky top-14">
            {menuContent()}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className={cn(isMobile ? "px-3 py-4" : "container py-6")}>{children}</div>
        </main>
      </div>

      {/* Modal unificado de avisos */}
      <CentralAvisosModal />
      <ForceUpdateModal />
      <AlterarMinhaSenhaDialog open={alterarSenhaOpen} onOpenChange={setAlterarSenhaOpen} />
      <GuiaInterativoGestor open={guiaOpen} onOpenChange={setGuiaOpen} />
    </div>
  );
}

