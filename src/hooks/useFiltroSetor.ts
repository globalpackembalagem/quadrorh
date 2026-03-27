import { useUsuario } from '@/contexts/UserContext';

export function useFiltroSetor() {
  const { usuarioAtual, isRHMode } = useUsuario();
  const setoresIds = usuarioAtual.setoresIds || [];
  const isGestor = isRHMode && !usuarioAtual.acesso_admin && usuarioAtual.pode_editar_faltas;

  return {
    setoresIds,
    aplicarFiltroSetor: isGestor,
  };
}
