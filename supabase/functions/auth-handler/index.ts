import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ====== RATE LIMITING EM MEMÃƒÆ’Ã¢â‚¬Å“RIA ======
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

  // Se estÃƒÆ’Ã‚Â¡ bloqueado e o bloqueio nÃƒÆ’Ã‚Â£o expirou
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

// Legacy SHA-256 (sÃƒÆ’Ã‚Â³ para verificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o de hashes antigos)
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
      const valid = bcrypt.compareSync(password, hash);
      return { valid, needsMigration: false };
    } catch (e) {
      console.error("Bcrypt compare error:", e);
      return { valid: false, needsMigration: false };
    }
  }
  // SHA-256 hash (64 hex chars) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â needs migration to bcrypt
  if (hash.length === 64) {
    const computed = await hashSHA256(password);
    return { valid: computed === hash, needsMigration: true };
  }
  // Plain text ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â needs migration
  return { valid: password === hash, needsMigration: true };
}

// Verifica se o caller ÃƒÆ’Ã‚Â© um admin ativo
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

async function verifyAdminBySession(supabase: any, sessionToken: string): Promise<boolean> {
  if (!sessionToken) return null;

  const { data: sessao, error } = await supabase
    .from("sessoes_login")
    .select("user_role_id")
    .eq("token", sessionToken)
    .single();

  if (error || !sessao?.user_role_id) return false;
  return await verifyAdminById(supabase, sessao.user_role_id);
}

async function verifyAdminCompat(supabase: any, sessionToken?: string, adminId?: string): Promise<boolean> {
  if (sessionToken) return await verifyAdminBySession(supabase, sessionToken);
  if (adminId) return await verifyAdminById(supabase, adminId);
  return false;
}

async function getFuncionariosWriterBySession(supabase: any, sessionToken: string): Promise<any | null> {
  if (!sessionToken) return false;

  const { data: sessao, error: sessaoError } = await supabase
    .from("sessoes_login")
    .select("user_role_id")
    .eq("token", sessionToken)
    .single();

  if (sessaoError || !sessao?.user_role_id) return null;

  const { data: user, error: userError } = await supabase
    .from("user_roles")
    .select("id, ativo, acesso_admin, pode_editar_funcionarios, pode_editar_faltas")
    .eq("id", sessao.user_role_id)
    .eq("ativo", true)
    .single();

  if (userError || !user) return null;
  return user;
}

async function verifyFuncionariosWriterBySession(supabase: any, sessionToken: string): Promise<boolean> {
  const user = await getFuncionariosWriterBySession(supabase, sessionToken);
  return user?.acesso_admin === true || user?.pode_editar_funcionarios === true;
}

function isFaltasSumidoUpdate(payload: any, operation: string) {
  if (operation !== "update" || !payload || Array.isArray(payload)) return false;
  const allowed = new Set(["sumido_desde", "situacao_id"]);
  const keys = Object.keys(payload);
  const sumidoSituacaoId = "e7fcde8e-b701-43c5-a738-efae70ba53fd";
  if (payload.situacao_id !== undefined && payload.situacao_id !== sumidoSituacaoId) return false;
  return keys.length > 0 && keys.every((key) => allowed.has(key));
}

function applyFuncionariosFilters(query: any, filters: any) {
  const eqFilters = filters?.eq || {};
  for (const [column, value] of Object.entries(eqFilters)) {
    query = query.eq(column, value);
  }

  const inFilters = filters?.in || {};
  for (const [column, value] of Object.entries(inFilters)) {
    query = query.in(column, value as any[]);
  }

  const ilikeFilters = filters?.ilike || {};
  for (const [column, value] of Object.entries(ilikeFilters)) {
    query = query.ilike(column, value);
  }

  return query;
}

function hasFuncionariosFilters(filters: any) {
  return Boolean(
    Object.keys(filters?.eq || {}).length ||
    Object.keys(filters?.in || {}).length ||
    Object.keys(filters?.ilike || {}).length
  );
}

async function getUserCredentialPassword(supabase: any, userId: string): Promise<string> {
  const { data: credential, error } = await supabase
    .from("user_credentials")
    .select("senha")
    .eq("user_role_id", userId)
    .maybeSingle();

  if (error) throw error;
  return credential?.senha || "";
}

async function saveUserCredentialPassword(supabase: any, userId: string, hashedPassword: string): Promise<void> {
  const { data: existing, error: findError } = await supabase
    .from("user_credentials")
    .select("user_role_id")
    .eq("user_role_id", userId)
    .maybeSingle();

  if (findError) throw findError;

  const result = existing
    ? await supabase
        .from("user_credentials")
        .update({ senha: hashedPassword })
        .eq("user_role_id", userId)
    : await supabase
        .from("user_credentials")
        .insert({ user_role_id: userId, senha: hashedPassword });

  if (result.error) throw result.error;
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
          return jsonResponse({ error: "Nome e senha sÃƒÆ’Ã‚Â£o obrigatÃƒÆ’Ã‚Â³rios" }, 400);
        }

        const { data: users, error } = await supabase
          .from("user_roles")
          .select(`
            id, nome, setor_id, acesso_admin,
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
          await logAccessAttempt(supabase, nome.trim(), null, false, clientIP);
          // Mensagem genÃƒÆ’Ã‚Â©rica para nÃƒÆ’Ã‚Â£o revelar se o usuÃƒÆ’Ã‚Â¡rio existe
          return jsonResponse({ error: "Credenciais invÃƒÆ’Ã‚Â¡lidas" });
        }

        const user = users[0];
        const storedPassword = await getUserCredentialPassword(supabase, user.id);

        const { valid: isValid, needsMigration } = await verifyPassword(senha, storedPassword);

        if (!isValid) {
          await logAccessAttempt(supabase, nome.trim(), user.id, false, clientIP);
          return jsonResponse({ error: "Credenciais invalidas" });
        }

        // Migrar hash para bcrypt se necessario
        if (needsMigration) {
          try {
            const bcryptHash = await hashPasswordBcrypt(senha);
            await saveUserCredentialPassword(supabase, user.id, bcryptHash);
            console.log(`[Security] Password migrated to bcrypt for user ${user.nome}`);
          } catch (e) {
            console.error("Bcrypt migration error:", e);
          }
        }

        await logAccessAttempt(supabase, user.nome, user.id, true, clientIP);

        const { data: sessao, error: sessaoError } = await supabase
          .from("sessoes_login")
          .insert({ user_role_id: user.id })
          .select("token")
          .single();
        if (sessaoError) throw sessaoError;

        return jsonResponse({ success: true, user, session_token: sessao.token });
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
          .select("id")
          .eq("id", user_id)
          .single();

        if (error || !user) {
          return jsonResponse({ error: "UsuÃƒÆ’Ã‚Â¡rio nÃƒÆ’Ã‚Â£o encontrado" }, 404);
        }

        const storedPassword = await getUserCredentialPassword(supabase, user_id);
        const { valid: isValid } = await verifyPassword(senha_atual, storedPassword);

        if (!isValid) {
          return jsonResponse({ error: "Senha atual incorreta" });
        }

        // Sempre salvar como bcrypt
        const hashed = await hashPasswordBcrypt(nova_senha);
        await saveUserCredentialPassword(supabase, user_id, hashed);
        return jsonResponse({ success: true });
      }

      case "logout": {
        const { session_token } = params;
        if (!session_token) return jsonResponse({ success: true });

        const { error } = await supabase
          .from("sessoes_login")
          .delete()
          .eq("token", session_token);

        if (error) throw error;
        return jsonResponse({ success: true });
      }

      case "funcionarios_write": {
        const { session_token, operation, payload, filters = {} } = params;
        const allowedOperations = ["insert", "update", "upsert", "delete"];

        if (!session_token) return jsonResponse({ error: "Sessao obrigatoria" }, 403);
        if (!allowedOperations.includes(operation)) return jsonResponse({ error: "Operacao invalida" }, 400);

        const writer = await getFuncionariosWriterBySession(supabase, session_token);
        const canWrite = writer?.acesso_admin === true || writer?.pode_editar_funcionarios === true;
        const canFaltasSumido = writer?.pode_editar_faltas === true && hasFuncionariosFilters(filters) && isFaltasSumidoUpdate(payload, operation);
        if (!canWrite && !canFaltasSumido) return jsonResponse({ error: "Acesso negado" }, 403);

        let query = supabase.from("funcionarios");
        if (operation === "insert") query = query.insert(payload);
        if (operation === "update") query = applyFuncionariosFilters(query.update(payload), filters);
        if (operation === "upsert") query = query.upsert(payload);
        if (operation === "delete") {
          if (!hasFuncionariosFilters(filters)) {
            return jsonResponse({ error: "Delete exige filtro" }, 400);
          }
          const deleteQuery = applyFuncionariosFilters(query.delete({ count: "exact" }), filters);
          const { count, error } = await deleteQuery;
          if (error) throw error;
          if (!count || count < 1) {
            return jsonResponse({ error: "Nenhum funcionario encontrado para excluir" }, 404);
          }
          return jsonResponse({ success: true, count });
        }

        if (operation !== "delete") {
          query = query.select(filters?.select || "*");
          if (filters?.single) query = query.single();
        }

        const { data, error } = await query;
        if (error) throw error;
        return jsonResponse({ success: true, data });
      }

      case "admin_reset_password": {
        const { user_id, nova_senha, session_token, admin_id } = params;
        
        if (!session_token && !admin_id) {
          return jsonResponse({ error: "IdentificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do administrador ÃƒÆ’Ã‚Â© obrigatÃƒÆ’Ã‚Â³ria" }, 403);
        }

        const isAdmin = await verifyAdminCompat(supabase, session_token, admin_id);
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
        await saveUserCredentialPassword(supabase, user_id, hashed);
        return jsonResponse({ success: true });
      }

      case "admin_create_user": {
        const { session_token, admin_id, nome, email, setoresIds = [], permissoes = {}, tiposNotificacao = [] } = params;

        if (!session_token && !admin_id) return jsonResponse({ error: "Sessao obrigatoria" }, 403);
        const isAdmin = await verifyAdminCompat(supabase, session_token, admin_id);
        if (!isAdmin) return jsonResponse({ error: "Acesso negado" }, 403);
        if (!nome) return jsonResponse({ error: "Nome obrigatorio" }, 400);

        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: crypto.randomUUID(),
            nome,
            email: email || null,
            setor_id: setoresIds[0] || null,
            tempo_inatividade: params.tempoInatividade ?? params.tempo_inatividade ?? 5,
            tipos_notificacao: tiposNotificacao,
            ...permissoes,
          })
          .select()
          .single();

        if (roleError) throw roleError;

        if (setoresIds.length > 0) {
          const { error: setoresError } = await supabase
            .from("user_roles_setores")
            .insert(setoresIds.map((setorId: string) => ({ user_role_id: roleData.id, setor_id: setorId })));
          if (setoresError) throw setoresError;
        }

        return jsonResponse({ success: true, user: roleData });
      }

      case "admin_update_user": {
        const { session_token, admin_id, user_id, nome, email, setoresIds, permissoes = {}, ativo, tempoInatividade, tiposNotificacao } = params;

        if (!session_token && !admin_id) return jsonResponse({ error: "Sessao obrigatoria" }, 403);
        const isAdmin = await verifyAdminCompat(supabase, session_token, admin_id);
        if (!isAdmin) return jsonResponse({ error: "Acesso negado" }, 403);
        if (!user_id) return jsonResponse({ error: "Usuario obrigatorio" }, 400);

        const updateData: Record<string, unknown> = { ...permissoes };
        if (nome !== undefined) updateData.nome = nome;
        if (email !== undefined) updateData.email = email || null;
        if (ativo !== undefined) updateData.ativo = ativo;
        if (tempoInatividade !== undefined) updateData.tempo_inatividade = tempoInatividade;
        if (tiposNotificacao !== undefined) updateData.tipos_notificacao = tiposNotificacao;
        if (Array.isArray(setoresIds)) updateData.setor_id = setoresIds[0] || null;

        const { data: userData, error: updateError } = await supabase
          .from("user_roles")
          .update(updateData)
          .eq("id", user_id)
          .select()
          .single();

        if (updateError) throw updateError;

        if (Array.isArray(setoresIds)) {
          const { error: deleteSetoresError } = await supabase
            .from("user_roles_setores")
            .delete()
            .eq("user_role_id", user_id);
          if (deleteSetoresError) throw deleteSetoresError;

          if (setoresIds.length > 0) {
            const { error: insertSetoresError } = await supabase
              .from("user_roles_setores")
              .insert(setoresIds.map((setorId: string) => ({ user_role_id: user_id, setor_id: setorId })));
            if (insertSetoresError) throw insertSetoresError;
          }
        }

        return jsonResponse({ success: true, user: userData });
      }

      case "admin_delete_user": {
        const { session_token, admin_id, user_id } = params;

        if (!session_token && !admin_id) return jsonResponse({ error: "Sessao obrigatoria" }, 403);
        const isAdmin = await verifyAdminCompat(supabase, session_token, admin_id);
        if (!isAdmin) return jsonResponse({ error: "Acesso negado" }, 403);
        if (!user_id) return jsonResponse({ error: "Usuario obrigatorio" }, 400);

        await supabase.from("user_roles_setores").delete().eq("user_role_id", user_id);
        const { error } = await supabase.from("user_roles").delete().eq("id", user_id);
        if (error) throw error;

        return jsonResponse({ success: true });
      }

      case "admin_update_user_extra": {
        const { session_token, admin_id, user_id, campos = {} } = params;
        const allowed = ["fake_quadro_ativo", "fake_quadro_config", "tipos_notificacao", "recebe_notificacoes"];

        if (!session_token && !admin_id) return jsonResponse({ error: "Sessao obrigatoria" }, 403);
        const isAdmin = await verifyAdminCompat(supabase, session_token, admin_id);
        if (!isAdmin) return jsonResponse({ error: "Acesso negado" }, 403);
        if (!user_id) return jsonResponse({ error: "Usuario obrigatorio" }, 400);

        const updateData: Record<string, unknown> = {};
        for (const key of allowed) {
          if (Object.prototype.hasOwnProperty.call(campos, key)) {
            updateData[key] = campos[key];
          }
        }

        if (Object.keys(updateData).length === 0) {
          return jsonResponse({ error: "Nenhum campo permitido informado" }, 400);
        }

        const { data: userData, error } = await supabase
          .from("user_roles")
          .update(updateData)
          .eq("id", user_id)
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ success: true, user: userData });
      }

      case "admin_foto_download_url": {
        const { session_token, admin_id, path } = params;

        if (!session_token && !admin_id) return jsonResponse({ error: "Sessao obrigatoria" }, 403);
        const isAdmin = await verifyAdminCompat(supabase, session_token, admin_id);
        if (!isAdmin) return jsonResponse({ error: "Acesso negado" }, 403);
        if (!path || typeof path !== "string") return jsonResponse({ error: "Caminho da foto obrigatorio" }, 400);

        const { data, error } = await supabase.storage
          .from("fotos-funcionarios")
          .createSignedUrl(path, 60);

        if (error) throw error;
        return jsonResponse({ success: true, url: data?.signedUrl });
      }

      case "hash_all_passwords": {
        const { session_token, admin_id } = params;
        
        if (!session_token && !admin_id) {
          return jsonResponse({ error: "IdentificaÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o do administrador ÃƒÆ’Ã‚Â© obrigatÃƒÆ’Ã‚Â³ria" }, 403);
        }

        const isAdmin = await verifyAdminCompat(supabase, session_token, admin_id);
        if (!isAdmin) {
          return jsonResponse({ error: "Acesso negado. Apenas administradores podem executar esta aÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o." }, 403);
        }

        const { data: credentials, error } = await supabase
          .from("user_credentials")
          .select("user_role_id, senha, user_roles(nome)");

        if (error) throw error;

        let count = 0;
        for (const credential of credentials || []) {
          const user = { id: credential.user_role_id, nome: credential.user_roles?.nome };
          const pwd = credential.senha || "";
          // Apenas migrar para bcrypt senhas que nÃƒÆ’Ã‚Â£o sÃƒÆ’Ã‚Â£o bcrypt
          if (!pwd.startsWith("$2") && pwd !== "temp_placeholder" && pwd !== "") {
            try {
              // Para SHA-256 hashes, nÃƒÆ’Ã‚Â£o podemos re-hash (perdemos a senha original)
              // Apenas marcamos para reset ou mantemos como estÃƒÆ’Ã‚Â¡
              if (pwd.length !== 64) {
                // Plain text ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â pode converter
                const bcryptHash = await hashPasswordBcrypt(pwd);
                await saveUserCredentialPassword(supabase, user.id, bcryptHash);
                count++;
              }
            } catch (e) {
              console.error(`Error hashing password for ${user.nome || user.id}:`, e);
            }
          }
        }

        return jsonResponse({ success: true, hashed_count: count });
      }

      default:
        return jsonResponse({ error: "AÃƒÆ’Ã‚Â§ÃƒÆ’Ã‚Â£o invÃƒÆ’Ã‚Â¡lida" }, 400);
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
