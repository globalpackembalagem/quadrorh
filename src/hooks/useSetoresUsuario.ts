import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUsuario } from '@/contexts/UserContext';

/**
 * Hook centralizado para lógica de setores do usuário logado.
 * Elimina duplicação em App.tsx, Dashboard.tsx e RHSidebarLayout.tsx.
 */
export function useSetoresUsuario() {
  const { usuarioAtual, isRHMode } = useUsuario();
  const isAdmin = usuarioAtual.acesso_admin;
  const isVisualizacao = !isRHMode;
  const setoresIds = usuarioAtual.setoresIds || [];
  const [setoresNomes, setSetoresNomes] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchSetores = async () => {
      const { data } = await supabase
        .from('setores')
        .select('id, nome')
        .eq('ativo', true);
      if (data) {
        const map = new Map<string, string>();
        data.forEach(s => map.set(s.id, s.nome.toUpperCase()));
        setSetoresNomes(map);
      }
    };
    fetchSetores();
  }, []);

  const isGestorSetor = isRHMode && !isAdmin && setoresIds.length > 0 && usuarioAtual.pode_editar_faltas;

  const { temAcessoSopro, temAcessoDecoracao } = useMemo(() => {
    if (!isGestorSetor) return { temAcessoSopro: true, temAcessoDecoracao: true };
    let sopro = false;
    let deco = false;
    setoresIds.forEach((setorId: string) => {
      const nome = setoresNomes.get(setorId) || '';
      if (nome.includes('SOPRO')) sopro = true;
      if (nome.includes('DECORAÇÃO') || nome.includes('DECORACAO')) deco = true;
    });
    return { temAcessoSopro: sopro, temAcessoDecoracao: deco };
  }, [isGestorSetor, setoresIds, setoresNomes]);

  const destinoGestor = useMemo(() => {
    if (!isGestorSetor || setoresNomes.size === 0) return null;
    return '/quadro-geral';
  }, [isGestorSetor, setoresNomes]);

  return {
    setoresNomes,
    setoresIds,
    isGestorSetor,
    isAdmin,
    isVisualizacao,
    temAcessoSopro,
    temAcessoDecoracao,
    destinoGestor,
  };
}
