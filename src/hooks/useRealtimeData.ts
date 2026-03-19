import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook global para subscribir a tabelas do sistema.
 * Usa CANAIS AGRUPADOS POR DOMÍNIO (ao invés de 1 canal gigante com 40+ tabelas).
 * Isso melhora a estabilidade e permite reconexão granular.
 */

interface CanalConfig {
  nome: string;
  tabelas: Record<string, string[]>;
}

const CANAIS: CanalConfig[] = [
  {
    nome: 'rt-funcionarios',
    tabelas: {
      funcionarios: ['funcionarios', 'funcionarios_faltas', 'armarios-funcionarias-todas', 'armarios-mapa-visual', 'dashboard-data'],
      setores: ['setores'],
      situacoes: ['situacoes'],
    },
  },
  {
    nome: 'rt-ponto-faltas',
    tabelas: {
      registros_ponto: ['registros_ponto', 'registros_faltas', 'registros-ponto'],
      periodos_ponto: ['periodos_ponto', 'periodos_faltas'],
      divergencias_ponto: ['divergencias_ponto'],
      liberacoes_faltas: ['liberacoes_faltas'],
      historico_faltas: ['historico_faltas'],
    },
  },
  {
    nome: 'rt-quadro',
    tabelas: {
      quadro_planejado: ['quadro-planejado'],
      quadro_decoracao: ['quadro-decoracao'],
      divergencias_quadro: ['divergencias'],
      historico_quadro: ['historico_quadro'],
    },
  },
  {
    nome: 'rt-demissoes',
    tabelas: {
      demissoes: ['demissoes'],
      periodos_demissao: ['periodos_demissao', 'periodos-demissao'],
      tipos_desligamento: ['tipos_desligamento'],
    },
  },
  {
    nome: 'rt-notificacoes',
    tabelas: {
      eventos_sistema: ['eventos_sistema', 'eventos-sistema', 'historico-notificacoes-enviadas'],
      avisos_movimentacao: ['avisos_movimentacao'],
      notificacoes: ['notificacoes'],
      notificacoes_vistas: ['notificacoes-vistas'],
      comunicados: ['comunicados'],
      comunicados_categorias: ['comunicados'],
    },
  },
  {
    nome: 'rt-experiencia-previsao',
    tabelas: {
      experiencia_decisoes: ['experiencia_decisoes', 'experiencia-decisoes'],
      previsao_documentos: ['previsao_documentos'],
      previsao_documentos_historico: ['previsao_documentos'],
      previsao_horarios_notificacao: ['previsao-horarios-notificacao'],
    },
  },
  {
    nome: 'rt-armarios',
    tabelas: {
      armarios_femininos: ['armarios-funcionarias-todas', 'armarios-mapa-visual', 'armarios-config'],
      armarios_config: ['armarios-config'],
    },
  },
  {
    nome: 'rt-admin',
    tabelas: {
      historico_auditoria: ['historico_auditoria', 'auditoria_completa'],
      historico_acesso: ['historico_acesso', 'historico-acesso'],
      user_roles: ['user_roles', 'usuarios-ativos-reenvio'],
      user_roles_setores: ['user_roles'],
      sistema_config: ['sistema_config'],
      force_logout: ['force_logout'],
    },
  },
  {
    nome: 'rt-prestadores',
    tabelas: {
      meal_records: ['meal-records'],
      meal_types: ['meal-types'],
      fretado_imports: ['fretado-imports'],
      fretado_trips: ['fretado-imports'],
      fretado_itinerarios: ['fretado-itinerarios'],
      fretado_valores_extras: ['fretado-valores-extras'],
      prestadores_funcionarios: ['prestadores-employees'],
      prestadores_usuarios: ['prestadores-usuarios'],
      valor_historico: ['valor-historico'],
      rateio_meses_fechados: ['rateio-meses'],
    },
  },
  {
    nome: 'rt-outros',
    tabelas: {
      trocas_turno: ['trocas_turno'],
      integracoes_agencia: ['integracoes_agencia'],
    },
  },
];

export function useRealtimeData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    console.log('[Realtime] Iniciando canais agrupados por domínio...');

    const channels = CANAIS.map(({ nome, tabelas }) => {
      let channel = supabase.channel(nome);

      Object.entries(tabelas).forEach(([tabela, queryKeys]) => {
        channel = channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tabela },
          (payload) => {
            console.log(`[Realtime:${nome}] ${tabela} → ${payload.eventType}`);
            queryKeys.forEach(key => {
              queryClient.invalidateQueries({ queryKey: [key] });
            });
          }
        );
      });

      channel.subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.log(`[Realtime] ${nome}: ${status}`);
        }
      });

      return channel;
    });

    return () => {
      console.log('[Realtime] Desconectando canais...');
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [queryClient]);
}
