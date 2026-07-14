import { supabase } from "@/integrations/supabase/client";

const normalizarNome = (valor?: string | null) =>
  (valor || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

export async function notificarMovimentacaoLider(params: {
  titulo: string;
  mensagem: string;
  referenciaId?: string | null;
}) {
  const { data: usuarios } = await supabase
    .from("user_roles")
    .select("id,nome,recebe_notificacoes")
    .eq("ativo", true);

  const destinatarios = (usuarios || []).filter((usuario: any) => {
    const nome = normalizarNome(usuario.nome);
    return usuario.recebe_notificacoes !== false && (nome === "LUCIANO" || nome === "REAL PARCERIA");
  });

  if (destinatarios.length === 0) return;

  const notificacoes = destinatarios.map((usuario: any) => ({
    user_role_id: usuario.id,
    tipo: "transferencia_realizada",
    titulo: params.titulo,
    mensagem: params.mensagem,
    referencia_id: params.referenciaId || null,
  }));

  const { error } = await supabase.from("notificacoes").insert(notificacoes);
  if (error) throw error;
}
