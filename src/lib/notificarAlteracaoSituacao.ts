import { supabase } from '@/integrations/supabase/client';

function normalizarNome(nome?: string | null) {
  return (nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export async function notificarAlteracaoSituacaoFuncionario(params: {
  funcionarioId: string;
  funcionarioNome: string;
  matricula?: string | null;
  setorNome?: string | null;
  turma?: string | null;
  situacaoAnterior?: string | null;
  situacaoNova?: string | null;
  usuarioNome?: string | null;
}) {
  const situacaoAnterior = params.situacaoAnterior || '-';
  const situacaoNova = params.situacaoNova || '-';
  if (normalizarNome(situacaoAnterior) === normalizarNome(situacaoNova)) return;

  const mensagem = [
    `FUNCIONARIO: ${(params.funcionarioNome || '-').toUpperCase()}`,
    `MATRICULA: ${params.matricula || '-'}`,
    `SETOR: ${(params.setorNome || '-').toUpperCase()}${params.turma ? ` / ${params.turma}` : ''}`,
    `SITUACAO ANTERIOR: ${situacaoAnterior.toUpperCase()}`,
    `SITUACAO NOVA: ${situacaoNova.toUpperCase()}`,
  ].join('\n');

  const { data: evento, error: eventoError } = await supabase
    .from('eventos_sistema')
    .insert({
      tipo: 'alteracao_situacao_funcionario',
      descricao: `Alteracao de situacao: ${params.funcionarioNome}`,
      funcionario_id: params.funcionarioId,
      funcionario_nome: params.funcionarioNome,
      setor_nome: params.setorNome || null,
      turma: params.turma || null,
      criado_por: params.usuarioNome || 'SISTEMA',
      dados_extra: {
        situacao_anterior: situacaoAnterior,
        situacao_nova: situacaoNova,
      },
    })
    .select('id')
    .single();
  if (eventoError) throw eventoError;

  const { data: usuarios, error: usuariosError } = await supabase
    .from('user_roles')
    .select('id, recebe_notificacoes, tipos_notificacao')
    .eq('ativo', true);
  if (usuariosError) throw usuariosError;

  const notificacoes = (usuarios || [])
    .filter((usuario: any) => {
      if (usuario.recebe_notificacoes === false) return false;
      const tipos = Array.isArray(usuario.tipos_notificacao) ? usuario.tipos_notificacao : [];
      return tipos.length === 0 || tipos.includes('alteracao_situacao_funcionario') || tipos.includes('evento_sistema_modal');
    })
    .map((usuario: any) => ({
      user_role_id: usuario.id,
      tipo: 'alteracao_situacao_funcionario',
      titulo: 'ALTERACAO DE SITUACAO',
      mensagem,
      referencia_id: evento.id,
    }));

  if (notificacoes.length > 0) {
    const { error: notificacoesError } = await supabase.from('notificacoes').insert(notificacoes);
    if (notificacoesError) throw notificacoesError;
  }
}
