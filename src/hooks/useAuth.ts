import { useUsuario, UsuarioLocal } from '@/contexts/UserContext';

export type PerfilUsuario = 'admin' | 'rh_demissoes' | 'rh_completo' | 'gestor_setor' | 'visualizacao';

export interface UserRole {
  id: string;
  user_id: string;
  perfil: PerfilUsuario;
  nome: string;
  setor_id: string | null;
  ativo: boolean;
  setores_ids: string[];
}

export function useAuth() {
  const {
    usuarioAtual,
    setUsuarioAtual,
    isAdmin,
    isVisualizacao,
    canEditDemissoes,
    canEditFuncionarios,
    canEditHomologacoes,
    canExportExcel,
    canEditFaltas,
    podeAcessarSetor,
    isRHMode,
    entrarModoRH,
    sairModoRH,
  } = useUsuario();

  return {
    user: null,
    session: null,
    userRole: {
      id: usuarioAtual.id,
      user_id: usuarioAtual.id,
      perfil: (isRHMode ? 'admin' : 'visualizacao') as PerfilUsuario,
      nome: usuarioAtual.nome,
      setor_id: null,
      ativo: true,
      setores_ids: usuarioAtual.setoresIds,
    },
    loading: false,
    signOut: sairModoRH,
    isAdmin,
    isVisualizacao,
    canEditDemissoes,
    canEditFuncionarios,
    canEditFaltas,
    isGestorDeSetor: podeAcessarSetor,
    canCreateDivergencias: isRHMode,
    canEditHomologacoes,
    canExportExcel,
    isAuthenticated: isRHMode,
    // Métodos para controle de acesso
    isRHMode,
    entrarModoRH,
    sairModoRH,
    setUsuarioAtual,
  };
}
