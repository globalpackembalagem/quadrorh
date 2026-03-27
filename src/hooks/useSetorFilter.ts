import { useMemo, useCallback } from 'react';
import { useUsuario } from '@/contexts/UserContext';

/**
 * Hook centralizado para filtrar dados por setores do gestor logado.
 * Admins e usuários em modo visualização veem tudo.
 * Gestores veem apenas funcionários dos seus setoresIds.
 */
export function useSetorFilter() {
  const { usuarioAtual, isAdmin } = useUsuario();
  const isRHMode = usuarioAtual.id !== 'visualizacao';
  const setoresIds = usuarioAtual.setoresIds || [];
  const isGestor = isRHMode && !isAdmin && setoresIds.length > 0;

  /**
   * Filtra um array de objetos que possuem setor_id diretamente.
   * Admins veem tudo. Gestores veem apenas seus setores.
   */
  const filtrarPorSetor = useCallback(<T extends { setor_id: string }>(items: T[]): T[] => {
    if (!isGestor) return items;
    return items.filter(item => setoresIds.includes(item.setor_id));
  }, [isGestor, setoresIds]);

  /**
   * Filtra funcionários aninhados em outros objetos (ex: demissões).
   * Recebe uma função getter que extrai o setor_id do item.
   */
  const filtrarPorSetorCustom = useCallback(<T>(items: T[], getSetorId: (item: T) => string | null | undefined): T[] => {
    if (!isGestor) return items;
    return items.filter(item => {
      const setorId = getSetorId(item);
      if (!setorId) return false;
      return setoresIds.includes(setorId);
    });
  }, [isGestor, setoresIds]);

  return {
    filtrarPorSetor,
    filtrarPorSetorCustom,
    isGestor,
    setoresIds,
  };
}
