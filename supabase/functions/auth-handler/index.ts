import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith("$2")) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (e) {
      console.error("Bcrypt compare error:", e);
      return false;
    }
  }
  if (hash.length === 64) {
    const computed = await hashPassword(password);
    return computed === hash;
  }
  return password === hash;
}

// Verifica se o caller é um admin ativo
async function verifyAdminById(supabase: any, adminId: string): Promise<boolean> {
  if (!adminId) return false;
  
  const { data: admin, error } = await supabase
    .from("user_roles")
    .select("id, acesso_admin, ativo")
    .eq("id", adminId)
    .eq("ativo", true)
    .eq("acesso_admin", true)
    .single();

  if (error || !admin) return false;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, ...params } = await req.json();

    switch (action) {
      case "login": {
        const { nome, senha } = params;
        if (!nome || !senha) {
          return jsonResponse({ error: "Nome e senha são obrigatórios" }, 400);
        }

        const { data: users, error } = await supabase
          .from("user_roles")
          .select(`
            id, nome, senha, setor_id, acesso_admin,
            pode_visualizar_funcionarios, pode_editar_funcionarios,
            pode_visualizar_previsao, pode_editar_previsao,
            pode_visualizar_coberturas, pode_editar_coberturas,
            pode_visualizar_faltas, pode_editar_faltas,
            pode_visualizar_demissoes, pode_editar_demissoes,
            pode_visualizar_homologacoes, pode_editar_homologacoes,
            pode_visualizar_divergencias, pode_criar_divergencias,
            pode_visualizar_troca_turno, pode_editar_troca_turno,
            pode_visualizar_armarios, pode_editar_armarios,
            pode_exportar_excel, recebe_notificacoes, tempo_inatividade,
            ativo, user_roles_setores(setor_id)
          `)
          .eq("ativo", true)
          .ilike("nome", nome.trim());

        if (error) throw error;

        if (!users || users.length === 0) {
          return jsonResponse({ error: "Usuário não encontrado" });
        }

        const user = users[0];
        const storedPassword = user.senha || "";

        const isValid = await verifyPassword(senha, storedPassword);

        if (!isValid) {
          return jsonResponse({ error: "Senha incorreta" });
        }

        // Se senha está em texto simples, migrar para SHA-256
        if (!storedPassword.startsWith("$2") && storedPassword.length !== 64) {
          const hashed = await hashPassword(senha);
          await supabase
            .from("user_roles")
            .update({ senha: hashed })
            .eq("id", user.id);
        }

        const { senha: _, ...userData } = user;
        return jsonResponse({ success: true, user: userData });
      }

      case "change_password": {
        const { user_id, senha_atual, nova_senha } = params;
        if (!user_id || !senha_atual || !nova_senha) {
          return jsonResponse({ error: "Dados incompletos" }, 400);
        }

        if (nova_senha.length < 4) {
          return jsonResponse({ error: "A nova senha deve ter pelo menos 4 caracteres" }, 400);
        }

        const { data: user, error } = await supabase
          .from("user_roles")
          .select("senha")
          .eq("id", user_id)
          .single();

        if (error || !user) {
          return jsonResponse({ error: "Usuário não encontrado" }, 404);
        }

        const storedPassword = user.senha || "";
        const isValid = await verifyPassword(senha_atual, storedPassword);

        if (!isValid) {
          return jsonResponse({ error: "Senha atual incorreta" });
        }

        const hashed = await hashPassword(nova_senha);
        const { error: updateError } = await supabase
          .from("user_roles")
          .update({ senha: hashed })
          .eq("id", user_id);

        if (updateError) throw updateError;
        return jsonResponse({ success: true });
      }

      case "admin_reset_password": {
        const { user_id, nova_senha, admin_id } = params;
        
        // ===== VERIFICAÇÃO DE AUTORIZAÇÃO =====
        if (!admin_id) {
          return jsonResponse({ error: "Identificação do administrador é obrigatória" }, 403);
        }

        const isAdmin = await verifyAdminById(supabase, admin_id);
        if (!isAdmin) {
          return jsonResponse({ error: "Acesso negado. Apenas administradores podem redefinir senhas." }, 403);
        }
        // ========================================

        if (!user_id || !nova_senha) {
          return jsonResponse({ error: "Dados incompletos" }, 400);
        }

        if (nova_senha.length < 4) {
          return jsonResponse({ error: "A senha deve ter pelo menos 4 caracteres" }, 400);
        }

        const hashed = await hashPassword(nova_senha);
        const { error } = await supabase
          .from("user_roles")
          .update({ senha: hashed })
          .eq("id", user_id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case "hash_all_passwords": {
        const { admin_id } = params;
        
        // ===== VERIFICAÇÃO DE AUTORIZAÇÃO =====
        if (!admin_id) {
          return jsonResponse({ error: "Identificação do administrador é obrigatória" }, 403);
        }

        const isAdmin = await verifyAdminById(supabase, admin_id);
        if (!isAdmin) {
          return jsonResponse({ error: "Acesso negado. Apenas administradores podem executar esta ação." }, 403);
        }
        // ========================================

        const { data: users, error } = await supabase
          .from("user_roles")
          .select("id, senha");

        if (error) throw error;

        let count = 0;
        for (const user of users || []) {
          const pwd = user.senha || "";
          const skip = pwd.startsWith("$2") || pwd.length === 64 || pwd === "temp_placeholder" || pwd === "";
          if (!skip) {
            const hashed = await hashPassword(pwd);
            await supabase.from("user_roles").update({ senha: hashed }).eq("id", user.id);
            count++;
          }
        }

        return jsonResponse({ success: true, hashed_count: count });
      }

      default:
        return jsonResponse({ error: "Ação inválida" }, 400);
    }
  } catch (err) {
    console.error("Auth handler error:", err);
    return jsonResponse({ error: "Erro interno: " + String(err) }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
