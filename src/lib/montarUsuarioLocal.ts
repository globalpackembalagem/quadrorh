import type { UsuarioLocal } from '@/contexts/UserContext';

export function montarUsuarioLocal(user: any): UsuarioLocal {
  const setoresIds: string[] = [];
  if (user.setor_id) setoresIds.push(user.setor_id);
  (user.user_roles_setores || []).forEach((s: { setor_id: string }) => {
    if (!setoresIds.includes(s.setor_id)) setoresIds.push(s.setor_id);
  });
  return {
    id: user.id,
    nome: user.nome,
    setoresIds,
    acesso_admin: user.acesso_admin,
    pode_visualizar_funcionarios: user.pode_visualizar_funcionarios,
    pode_editar_funcionarios: user.pode_editar_funcionarios,
    pode_visualizar_previsao: user.pode_visualizar_previsao ?? user.pode_visualizar_funcionarios,
    pode_editar_previsao: user.pode_editar_previsao ?? user.pode_editar_funcionarios,
    pode_visualizar_coberturas: user.pode_visualizar_coberturas ?? user.pode_visualizar_funcionarios,
    pode_editar_coberturas: user.pode_editar_coberturas ?? user.pode_editar_funcionarios,
    pode_visualizar_faltas: user.pode_visualizar_faltas ?? user.pode_editar_faltas,
    pode_editar_faltas: user.pode_editar_faltas,
    pode_visualizar_demissoes: user.pode_visualizar_demissoes ?? user.pode_editar_demissoes,
    pode_editar_demissoes: user.pode_editar_demissoes,
    pode_visualizar_homologacoes: user.pode_visualizar_homologacoes ?? user.pode_editar_homologacoes,
    pode_editar_homologacoes: user.pode_editar_homologacoes,
    pode_visualizar_divergencias: user.pode_visualizar_divergencias ?? user.pode_criar_divergencias,
    pode_criar_divergencias: user.pode_criar_divergencias,
    pode_visualizar_troca_turno: user.pode_visualizar_troca_turno ?? true,
    pode_editar_troca_turno: user.pode_editar_troca_turno ?? true,
    pode_visualizar_armarios: user.pode_visualizar_armarios ?? false,
    pode_editar_armarios: user.pode_editar_armarios ?? false,
    pode_exportar_excel: user.pode_exportar_excel,
    recebe_notificacoes: user.recebe_notificacoes ?? true,
    tempo_inatividade: user.tempo_inatividade ?? 4,
  };
}
