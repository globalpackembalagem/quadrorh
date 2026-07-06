import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "fotos-funcionarios";
const attempts = new Map<string, { count: number; firstAttempt: number; lockedUntil: number }>();
const uploads = new Map<string, { count: number; firstUpload: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_UPLOADS_PER_HOUR = 60;
const UPLOAD_WINDOW_MS = 60 * 60 * 1000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const allowedOrigins = new Set([
  "https://quadrorh-kohl.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://quadrorh-kohl.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function jsonResponse(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record) return true;
  if (record.lockedUntil > now) return false;
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(ip);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordFailedAttempt(ip: string) {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 });
    return;
  }
  record.count++;
  if (record.count >= MAX_ATTEMPTS) record.lockedUntil = now + WINDOW_MS;
}

function validateCode(codigo: string | undefined, ip: string) {
  if (!checkRateLimit(ip)) return { ok: false, status: 429, error: "Muitas tentativas. Aguarde 15 minutos." };
  const expected = Deno.env.get("FOTO_ACESSO_CODIGO");
  if (!expected || codigo !== expected) {
    recordFailedAttempt(ip);
    return { ok: false, status: 403, error: "Codigo invalido" };
  }
  attempts.delete(ip);
  return { ok: true };
}

function checkUploadLimit(ip: string) {
  const now = Date.now();
  const record = uploads.get(ip);
  if (!record || now - record.firstUpload > UPLOAD_WINDOW_MS) {
    uploads.set(ip, { count: 1, firstUpload: now });
    return true;
  }
  if (record.count >= MAX_UPLOADS_PER_HOUR) return false;
  record.count++;
  return true;
}

function decodeBase64Image(input: string) {
  const clean = input.includes(",") ? input.split(",").pop() || "" : input;
  return Uint8Array.from(atob(clean), (char) => char.charCodeAt(0));
}

async function ensureBucket(supabase: any) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (error && !String(error.message || "").toLowerCase().includes("already exists")) throw error;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersFor(req) });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const { action, codigo, ...params } = await req.json();

    const auth = validateCode(codigo, ip);
    if (!auth.ok) return jsonResponse(req, { error: auth.error }, auth.status);

    if (action === "buscar_funcionario") {
      const termo = String(params.termo || "").trim();
      if (termo.length < 3) return jsonResponse(req, { error: "Digite pelo menos 3 caracteres" }, 400);

      const { data: situacoesAtivas, error: sitError } = await supabase
        .from("situacoes")
        .select("id")
        .eq("ativa", true)
        .ilike("nome", "ATIVO");
      if (sitError) throw sitError;
      const situacoesIds = (situacoesAtivas || []).map((s: any) => s.id);
      if (!situacoesIds.length) return jsonResponse(req, { success: true, data: [] });

      const safeTerm = termo.replace(/[%_,]/g, "");
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id,nome_completo,matricula,setor_id,tem_foto,telefone_whatsapp,usa_fretado,linha_fretado,setor:setores(nome)")
        .in("situacao_id", situacoesIds)
        .or(`nome_completo.ilike.%${safeTerm}%,matricula.eq.${termo}`)
        .order("nome_completo")
        .limit(20);
      if (error) throw error;

      return jsonResponse(req, { success: true, data });
    }

    if (action === "atualizar_funcionario_foto") {
      const funcionarioId = params.funcionario_id;
      if (!funcionarioId) return jsonResponse(req, { error: "Funcionario obrigatorio" }, 400);

      const updateData: Record<string, unknown> = {};

      if (params.imagem_base64) {
        if (!checkUploadLimit(ip)) return jsonResponse(req, { error: "Limite de envios atingido. Tente novamente mais tarde." }, 429);
        await ensureBucket(supabase);
        const bytes = decodeBase64Image(String(params.imagem_base64));
        if (bytes.byteLength > MAX_IMAGE_BYTES) {
          return jsonResponse(req, { error: "Imagem muito grande. Use uma foto menor." }, 413);
        }
        const storagePath = `${funcionarioId}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, bytes, { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw uploadError;

        updateData.tem_foto = true;
        updateData.foto_storage_path = storagePath;
        updateData.foto_arquivo_nome = storagePath;
        updateData.foto_verificada_em = new Date().toISOString();
      }

      if (params.telefone_whatsapp !== undefined) updateData.telefone_whatsapp = params.telefone_whatsapp || null;
      if (params.usa_fretado !== undefined) updateData.usa_fretado = Boolean(params.usa_fretado);
      if (params.linha_fretado !== undefined) updateData.linha_fretado = params.linha_fretado || null;

      if (!Object.keys(updateData).length) return jsonResponse(req, { error: "Nada para atualizar" }, 400);

      const { data, error } = await supabase
        .from("funcionarios")
        .update(updateData)
        .eq("id", funcionarioId)
        .select("id,nome_completo,matricula,tem_foto,telefone_whatsapp,usa_fretado,linha_fretado,foto_storage_path,foto_arquivo_nome,foto_verificada_em")
        .single();
      if (error) throw error;

      return jsonResponse(req, { success: true, data });
    }

    return jsonResponse(req, { error: "Acao invalida" }, 400);
  } catch (error) {
    console.error("Fotos handler error:", error);
    return jsonResponse(req, { error: "Erro interno do servidor" }, 500);
  }
});
