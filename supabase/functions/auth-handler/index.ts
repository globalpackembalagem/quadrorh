import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hashSync, compareSync } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

        // Buscar usuário por nome (case-insensitive)
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

        // Check if password is hashed (bcrypt hashes start with $2)
        let isValid = false;
        if (storedPassword.startsWith("$2")) {
          isValid = compareSync(senha, storedPassword);
        } else {
          // Plain text comparison (legacy) - then hash it
          isValid = senha === storedPassword;
          if (isValid) {
            // Migrate to hashed password
            const hashed = hashSync(senha);
            await supabase
              .from("user_roles")
              .update({ senha: hashed })
              .eq("id", user.id);
          }
        }

        if (!isValid) {
          return jsonResponse({ error: "Senha incorreta" });
        }

        // Return user data without password
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

        // Fetch current password
        const { data: user, error } = await supabase
          .from("user_roles")
          .select("senha")
          .eq("id", user_id)
          .single();

        if (error || !user) {
          return jsonResponse({ error: "Usuário não encontrado" }, 404);
        }

        const storedPassword = user.senha || "";
        let isValid = false;
        if (storedPassword.startsWith("$2")) {
          isValid = compareSync(senha_atual, storedPassword);
        } else {
          isValid = senha_atual === storedPassword;
        }

        if (!isValid) {
          return jsonResponse({ error: "Senha atual incorreta" });
        }

        // Hash and update
        const hashed = hashSync(nova_senha);
        const { error: updateError } = await supabase
          .from("user_roles")
          .update({ senha: hashed })
          .eq("id", user_id);

        if (updateError) throw updateError;
        return jsonResponse({ success: true });
      }

      case "admin_reset_password": {
        const { user_id, nova_senha } = params;
        if (!user_id || !nova_senha) {
          return jsonResponse({ error: "Dados incompletos" }, 400);
        }

        if (nova_senha.length < 4) {
          return jsonResponse({ error: "A senha deve ter pelo menos 4 caracteres" }, 400);
        }

        const hashed = hashSync(nova_senha);
        const { error } = await supabase
          .from("user_roles")
          .update({ senha: hashed })
          .eq("id", user_id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case "hash_all_passwords": {
        // One-time migration: hash all plain text passwords
        const { data: users, error } = await supabase
          .from("user_roles")
          .select("id, senha");

        if (error) throw error;

        let count = 0;
        for (const user of users || []) {
          if (user.senha && !user.senha.startsWith("$2")) {
            const hashed = hashSync(user.senha);
            await supabase
              .from("user_roles")
              .update({ senha: hashed })
              .eq("id", user.id);
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
    return jsonResponse({ error: "Erro interno do servidor" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
