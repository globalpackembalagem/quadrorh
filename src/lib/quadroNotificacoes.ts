import { supabase } from '@/integrations/supabase/client';

const LABELS_QUADRO: Record<string, string> = {
  aux_maquina: 'AUXILIARES EM MAQUINA',
  reserva_refeicao: 'RESERVA REFEICAO',
  reserva_faltas: 'RESERVA FALTAS',
  reserva_ferias: 'RESERVA FERIAS',
  apoio_topografia: 'APOIO TOPOGRAFIA',
  reserva_afastadas: 'RESERVA AFASTADAS',
  reserva_covid: 'RESERVA COVID',
  aux_maquina_industria: 'AUXILIARES EM MAQUINA INDUSTRIA',
  reserva_ferias_industria: 'RESERVA FERIAS INDUSTRIA',
  reserva_faltas_industria: 'RESERVA FALTAS INDUSTRIA',
  amarra_pallets: 'AMARRA PALLETS',
  revisao_frasco: 'REVISAO FRASCO',
  mod_sindicalista: 'MOD SINDICALISTA',
  controle_praga: 'CONTROLE PRAGA',
  aux_maquina_gp: 'AUXILIARES EM MAQUINA G+P',
  reserva_faltas_gp: 'RESERVA FALTAS G+P',
  reserva_ferias_gp: 'RESERVA FERIAS G+P',
  aumento_quadro: 'AUMENTO QUADRO',
};

type Params = {
  tabela: 'quadro_planejado' | 'quadro_decoracao';
  registroId: string;
  campo: string;
  valorAnterior: number;
  valorNovo: number;
  grupo?: string | null;
  turma?: string | null;
  usuarioNome?: string | null;
  dataInicio?: string | null;
};

function formatarDataBR(data?: string | null) {
  if (!data) return '-';
  const [ano, mes, dia] = data.split('-');
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

export async function criarNotificacaoAlteracaoQuadro(params: Params) {
  const area = params.grupo || 'DECORACAO';
  const turma = params.turma ? ` ${params.turma}` : '';
  const campoLabel = LABELS_QUADRO[params.campo] || params.campo.toUpperCase();
  const usuario = params.usuarioNome || 'SISTEMA';
  const dataInicio = params.dataInicio || new Date().toISOString().slice(0, 10);
  const mensagem = [
    `AREA: ${area}${turma}`,
    `CAMPO: ${campoLabel}`,
    `ANTES: ${params.valorAnterior}`,
    `DEPOIS: ${params.valorNovo}`,
    `A PARTIR DE: ${formatarDataBR(dataInicio)}`,
  ].join('\n');

  const { data: evento, error: eventoError } = await supabase
    .from('eventos_sistema')
    .insert({
      tipo: 'alteracao_quadro',
      descricao: mensagem,
      setor_nome: area,
      turma: params.turma || null,
      criado_por: usuario,
      dados_extra: {
        tabela: params.tabela,
        registro_id: params.registroId,
        campo: params.campo,
        valor_anterior: params.valorAnterior,
        valor_novo: params.valorNovo,
        data_inicio: dataInicio,
      },
      notificado: true,
      notificado_em: new Date().toISOString(),
      notificado_tipo: 'modal',
    })
    .select('id')
    .single();

  if (eventoError) throw eventoError;

  const { data: destinatarios, error: destinatariosError } = await supabase
    .from('user_roles')
    .select('id, recebe_notificacoes, tipos_notificacao')
    .eq('ativo', true);

  if (destinatariosError) throw destinatariosError;

  const notificacoes = (destinatarios || [])
    .filter((user: any) => user.recebe_notificacoes !== false)
    .filter((user: any) => Array.isArray(user.tipos_notificacao) && user.tipos_notificacao.includes('alteracao_quadro'))
    .map((user: any) => ({
      user_role_id: user.id,
      tipo: 'alteracao_quadro',
      titulo: 'ALTERACAO DO QUADRO',
      mensagem,
      referencia_id: evento.id,
    }));

  if (notificacoes.length > 0) {
    const { error: notificacoesError } = await supabase.from('notificacoes').insert(notificacoes);
    if (notificacoesError) throw notificacoesError;
  }
}
