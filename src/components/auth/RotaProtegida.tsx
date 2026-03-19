import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUsuario } from '@/contexts/UserContext';

interface RotaProtegidaProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireRH?: boolean;
  requireFaltas?: boolean;
  requireFuncionarios?: boolean;
  requirePrevisao?: boolean;
  requireCoberturas?: boolean;
  requireDemissoes?: boolean;
  requireHomologacoes?: boolean;
  requireDivergencias?: boolean;
  requireTrocaTurno?: boolean;
  requireArmarios?: boolean;
  requireAgencia?: boolean;
  allowVisualizacao?: boolean;
}

export function RotaProtegida({ 
  children, 
  requireAdmin = false,
  requireRH = false,
  requireFaltas = false,
  requireFuncionarios = false,
  requirePrevisao = false,
  requireCoberturas = false,
  requireDemissoes = false,
  requireHomologacoes = false,
  requireDivergencias = false,
  requireTrocaTurno = false,
  requireArmarios = false,
  requireAgencia = false,
  allowVisualizacao = false
}: RotaProtegidaProps) {
  const location = useLocation();
  const { isAdmin, isVisualizacao, isRHMode, canEditFaltas, canEditFuncionarios, userRole } = useAuth();
  const { usuarioAtual } = useUsuario();

  // Verificação básica: usuário deve estar identificado no sistema
  if (!usuarioAtual?.id || !usuarioAtual?.nome) {
    return <Navigate to="/" replace />;
  }

  // REAL PARCERIA: pode acessar /previsao-admissao e /faltas (somente visualização)
  if (userRole?.nome?.toUpperCase() === 'REAL PARCERIA') {
    if (location.pathname === '/previsao-admissao' || location.pathname.startsWith('/faltas')) {
      return <>{children}</>;
    }
    return <Navigate to="/previsao-admissao" replace />;
  }

  // Se permite visualização, deixa passar
  if (allowVisualizacao) {
    return <>{children}</>;
  }

  // Se é visualização e não permite, redireciona para dashboard
  if (isVisualizacao) {
    return <Navigate to="/home" replace />;
  }

  // Admin tem acesso total
  if (isAdmin) {
    return <>{children}</>;
  }

  // Se requer admin e não é admin
  if (requireAdmin) {
    return <Navigate to="/home" replace />;
  }

  // Se requer permissão de RH genérico (para rotas que não têm flag específica)
  if (requireRH) {
    // Gestores com permissão de faltas podem acessar /funcionarios para editar turmas
    const isGestor = canEditFaltas() && !isAdmin;
    if (isGestor && location.pathname === '/funcionarios') {
      return <>{children}</>;
    }
    // RH: precisa ter pelo menos alguma permissão de edição
    if (!usuarioAtual.pode_editar_funcionarios && !usuarioAtual.pode_editar_demissoes && !usuarioAtual.pode_editar_homologacoes) {
      return <Navigate to="/home" replace />;
    }
  }

  // ── Permissões granulares por módulo ──

  if (requireFuncionarios) {
    if (!usuarioAtual.pode_visualizar_funcionarios && !usuarioAtual.pode_editar_funcionarios) {
      return <Navigate to="/home" replace />;
    }
  }

  if (requirePrevisao) {
    if (!usuarioAtual.pode_visualizar_previsao && !usuarioAtual.pode_editar_previsao) {
      return <Navigate to="/home" replace />;
    }
  }

  if (requireCoberturas) {
    if (!usuarioAtual.pode_visualizar_coberturas && !usuarioAtual.pode_editar_coberturas) {
      return <Navigate to="/home" replace />;
    }
  }

  if (requireFaltas) {
    if (!usuarioAtual.pode_visualizar_faltas && !usuarioAtual.pode_editar_faltas) {
      return <Navigate to="/home" replace />;
    }
  }

  if (requireDemissoes) {
    if (!usuarioAtual.pode_visualizar_demissoes && !usuarioAtual.pode_editar_demissoes) {
      return <Navigate to="/home" replace />;
    }
  }

  if (requireHomologacoes) {
    if (!usuarioAtual.pode_visualizar_homologacoes && !usuarioAtual.pode_editar_homologacoes) {
      return <Navigate to="/home" replace />;
    }
  }

  if (requireDivergencias) {
    if (!usuarioAtual.pode_visualizar_divergencias && !usuarioAtual.pode_criar_divergencias) {
      return <Navigate to="/home" replace />;
    }
  }

  if (requireTrocaTurno) {
    if (!usuarioAtual.pode_visualizar_troca_turno && !usuarioAtual.pode_editar_troca_turno) {
      return <Navigate to="/home" replace />;
    }
  }

  if (requireArmarios) {
    if (!usuarioAtual.pode_visualizar_armarios && !usuarioAtual.pode_editar_armarios) {
      return <Navigate to="/home" replace />;
    }
  }

  if (requireAgencia) {
    // Agência: precisa ser RH (ter alguma permissão de edição)
    if (!usuarioAtual.pode_editar_funcionarios && !usuarioAtual.pode_editar_demissoes) {
      return <Navigate to="/home" replace />;
    }
  }

  return <>{children}</>;
}
