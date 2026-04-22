import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ====== RATE LIMITING EM MEMÓRIA ======
const loginAttempts = new Map<string, { count: number; firstAttempt: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const LOCKOUT_MS = 30 * 60 * 1000; // 30 minutos de bloqueio

function checkRateLimit(key: string): { allowed: boolean; remainingAttempts: number; lockedUntilSec?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Se está bloqueado e o bloqueio não expirou
  if (record.lockedUntil > now) {
    return { 
      allowed: false, 
      remainingAttempts: 0, 
      lockedUntilSec: Math.ceil((record.lockedUntil - now) / 1000) 
    };
  }

  // Se a janela expirou, resetar
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(key);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const remaining = MAX_ATTEMPTS - record.count;
  return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining) };
}

function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttempt: now, lockedUntil: 0 });
    return;
  }

  record.count++;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
  }
}

function clearAttempts(key: string): void {
  loginAttempts.delete(key);
}

// ====== HASHING SEGURO COM BCRYPT ======
async function hashPasswordBcrypt(password: string): Promise<string> {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

// Legacy SHA-256 (só para verificação de hashes antigos)
async function hashSHA256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password: string, hash: string): Promise<{ valid: boolean; needsMigration: boolean }> {
  // Bcrypt hash
  if (hash.startsWith("$2")) {
    try {
      const valid = await bcrypt.compare(password, hash);
      return { valid, needsMigration: false };
    } catch (e) {
      console.error("Bcrypt compare error:", e);
      return { valid: false, needsMigration: false };
    }
  }
  // SHA-256 hash (64 hex chars) — needs migration to bcrypt
  if (hash.length === 64) {
    const computed = await hashSHA256(password);
    return { valid: computed === hash, needsMigration: true };
  }
  // Plain text — needs migration
  return { valid: password === hash, needsMigration: true };
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

// Registrar tentativa de acesso
async function logAccessAttempt(supabase: any, nome: string, userId: string | null, sucesso: boolean, ip: string) {
  try {
    if (sucesso && userId) {
      await supabase.from("historico_acesso").insert({
        user_role_id: userId,
        nome_usuario: nome,
        ip: ip || null,
        navegador: 'Edge Function',
        dispositivo: null,
      });
    }
    // Para falhas, registrar no evento do sistema
    if (!sucesso) {
      await supabase.from("eventos_sistema").insert({
        tipo: 'seguranca',
        descricao: `Tentativa de login falhada para "${nome}"`,
        dados_extra: { ip, timestamp: new Date().toISOString() },
      });
    }
  } catch (e) {
    console.error("Error logging access:", e);
  }
}

const MIN_PASSWORD_LENGTH = 6;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const { action, ...params } = await req.json();

    switch (action) {
      case "login": {
        const { nome, senha } = params;
        if (!nome || !senha) {
          return jsonResponse({ error: "Nome e senha são obrigatórios" }, 400);
        }

        // ===== RATE LIMITING =====
        const rateLimitKey = `login:${nome.trim().toUpperCase()}`;
        const rateCheck = checkRateLimit(rateLimitKey);
        
        if (!rateCheck.allowed) {
          const minutos = Math.ceil((rateCheck.lockedUntilSec || 0) / 60);
          return jsonResponse({ 
            error: `Conta temporariamente bloqueada. Tente novamente em ${minutos} minutos.` 
          }, 429);
        }
        // =========================

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
          recordFailedAttempt(rateLimitKey);
          await logAccessAttempt(supabase, nome.trim(), null, false, clientIP);
          // Mensagem genérica para não revelar se o usuário existe
          return jsonResponse({ error: "Credenciais inválidas" });
        }

        const user = users[0];
        const storedPassword = user.senha || "";

        const { valid: isValid, needsMigration } = await verifyPassword(senha, storedPassword);

        if (!isValid) {
          recordFailedAttempt(rateLimitKey);
          await logAccessAttempt(supabase, nome.trim(), user.id, false, clientIP);
          
          const remaining = MAX_ATTEMPTS - (loginAttempts.get(rateLimitKey)?.count || 0);
          const msg = remaining > 0 
            ? `Credenciais inválidas. ${remaining} tentativa(s) restante(s).`
            : `Conta bloqueada por excesso de tentativas. Tente em 30 minutos.`;
          return jsonResponse({ error: msg });
        }

        // Login bem-sucedido — limpar tentativas
        clearAttempts(rateLimitKey);

        // Migrar hash para bcrypt se necessário
        if (needsMigration) {
          try {
            const bcryptHash = await hashPasswordBcrypt(senha);
            await supabase
              .from("user_roles")
              .update({ senha: bcryptHash })
              .eq("id", user.id);
            console.log(`[Security] Password migrated to bcrypt for user ${user.nome}`);
          } catch (e) {
            console.error("Bcrypt migration error:", e);
          }
        }

        await logAccessAttempt(supabase, user.nome, user.id, true, clientIP);

        const { senha: _, ...userData } = user;
        return jsonResponse({ success: true, user: userData });
      }

      case "change_password": {
        const { user_id, senha_atual, nova_senha } = params;
        if (!user_id || !senha_atual || !nova_senha) {
          return jsonResponse({ error: "Dados incompletos" }, 400);
        }

        if (nova_senha.length < MIN_PASSWORD_LENGTH) {
          return jsonResponse({ error: `A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres` }, 400);
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
        const { valid: isValid } = await verifyPassword(senha_atual, storedPassword);

        if (!isValid) {
          return jsonResponse({ error: "Senha atual incorreta" });
        }

        // Sempre salvar como bcrypt
        const hashed = await hashPasswordBcrypt(nova_senha);
        const { error: updateError } = await supabase
          .from("user_roles")
          .update({ senha: hashed })
          .eq("id", user_id);

        if (updateError) throw updateError;
        return jsonResponse({ success: true });
      }

      case "admin_reset_password": {
        const { user_id, nova_senha, admin_id } = params;
        
        if (!admin_id) {
          return jsonResponse({ error: "Identificação do administrador é obrigatória" }, 403);
        }

        const isAdmin = await verifyAdminById(supabase, admin_id);
        if (!isAdmin) {
          return jsonResponse({ error: "Acesso negado. Apenas administradores podem redefinir senhas." }, 403);
        }

        if (!user_id || !nova_senha) {
          return jsonResponse({ error: "Dados incompletos" }, 400);
        }

        if (nova_senha.length < MIN_PASSWORD_LENGTH) {
          return jsonResponse({ error: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres` }, 400);
        }

        const hashed = await hashPasswordBcrypt(nova_senha);
        const { error } = await supabase
          .from("user_roles")
          .update({ senha: hashed })
          .eq("id", user_id);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case "hash_all_passwords": {
        const { admin_id } = params;
        
        if (!admin_id) {
          return jsonResponse({ error: "Identificação do administrador é obrigatória" }, 403);
        }

        const isAdmin = await verifyAdminById(supabase, admin_id);
        if (!isAdmin) {
          return jsonResponse({ error: "Acesso negado. Apenas administradores podem executar esta ação." }, 403);
        }

        const { data: users, error } = await supabase
          .from("user_roles")
          .select("id, senha, nome");

        if (error) throw error;

        let count = 0;
        for (const user of users || []) {
          const pwd = user.senha || "";
          // Apenas migrar para bcrypt senhas que não são bcrypt
          if (!pwd.startsWith("$2") && pwd !== "temp_placeholder" && pwd !== "") {
            try {
              const hashed = await hashPasswordBcrypt(pwd.length === 64 ? pwd : pwd);
              // Para SHA-256 hashes, não podemos re-hash (perdemos a senha original)
              // Apenas marcamos para reset ou mantemos como está
              if (pwd.length !== 64) {
                // Plain text — pode converter
                const bcryptHash = await hashPasswordBcrypt(pwd);
                await supabase.from("user_roles").update({ senha: bcryptHash }).eq("id", user.id);
                count++;
              }
            } catch (e) {
              console.error(`Error hashing password for ${user.nome}:`, e);
            }
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
