import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook que busca funcionários admitidos nos últimos 2 dias
 * em situação TREINAMENTO ou ATIVO, agrupados por turma.
 */
export function useAdmissaoRecente(grupo?: 'SOPRO' | 'DECORAÇÃO') {
  return useQuery({
    queryKey: ['admissao-recente', grupo],
    queryFn: async () => {
      const hoje = new Date();
      const doisDiasAtras = new Date(hoje);
      doisDiasAtras.setDate(doisDiasAtras.getDate() - 2);
      const dataLimite = doisDiasAtras.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, data_admissao, turma, setor:setores(nome, grupo), situacao:situacoes(nome)')
        .gte('data_admissao', dataLimite)
        .order('data_admissao', { ascending: false });

      if (error) throw error;

      // Filtrar por situação e grupo
      return (data || []).filter((f: any) => {
        const situacaoNome = f.situacao?.nome?.toUpperCase() || '';
        const isTreinamentoOuAtivo = situacaoNome.includes('TREINAMENTO') || situacaoNome === 'ATIVO';
        if (!isTreinamentoOuAtivo) return false;

        if (grupo) {
          const grupoSetor = f.setor?.grupo?.toUpperCase() || '';
          const setorNome = f.setor?.nome?.toUpperCase() || '';
          if (grupo === 'SOPRO') return grupoSetor.includes('SOPRO') || setorNome.includes('SOPRO');
          if (grupo === 'DECORAÇÃO') return grupoSetor.includes('DECORAÇÃO') || grupoSetor.includes('DECORACAO') || setorNome.includes('DECORAÇÃO') || setorNome.includes('DECORACAO');
        }
        return true;
      });
    },
    staleTime: 1000 * 60 * 5,
  });
}

/** Agrupa os recentes por turma key (A, B, C, DIA-T1, etc) */
export function agruparRecentesPorTurma(
  recentes: any[],
  grupo: 'SOPRO' | 'DECORAÇÃO'
): Record<string, { count: number; nomes: string[]; situacao: string }> {
  const result: Record<string, { count: number; nomes: string[]; situacao: string }> = {};

  recentes.forEach((f: any) => {
    let turmaKey: string | null = null;

    if (grupo === 'SOPRO') {
      const grupoSetor = f.setor?.grupo?.toUpperCase() || '';
      const match = grupoSetor.match(/SOPRO\s+([ABC])/);
      if (match) turmaKey = match[1];
    } else {
      const turmaFunc = f.turma?.toUpperCase();
      const setorNome = f.setor?.nome?.toUpperCase() || '';
      const isDia = setorNome.includes('DIA');
      const isNoite = setorNome.includes('NOITE');
      if (turmaFunc === 'T1' || turmaFunc === '1') turmaKey = isDia ? 'DIA-T1' : isNoite ? 'NOITE-T1' : null;
      if (turmaFunc === 'T2' || turmaFunc === '2') turmaKey = isDia ? 'DIA-T2' : isNoite ? 'NOITE-T2' : null;
    }

    if (!turmaKey) return;
    if (!result[turmaKey]) result[turmaKey] = { count: 0, nomes: [], situacao: f.situacao?.nome || 'ATIVO' };
    result[turmaKey].count++;
    result[turmaKey].nomes.push(f.nome_completo);
  });

  return result;
}
