import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const hoje = new Date().toISOString().split("T")[0];

    // Buscar trocas pendentes com data_programada <= hoje
    const { data: trocas, error: fetchErr } = await supabase
      .from("trocas_turno")
      .select("id, funcionario_id, setor_destino_id, turma_destino, data_programada")
      .eq("efetivada", false)
      .in("status", ["pendente_gestores", "pendente_rh"])
      .not("data_programada", "is", null)
      .lte("data_programada", hoje);

    if (fetchErr) throw fetchErr;

    if (!trocas || trocas.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhuma troca para processar", processadas: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processadas = 0;

    for (const troca of trocas) {
      // Efetivar a troca
      const { error: tErr } = await supabase
        .from("trocas_turno")
        .update({
          status: "aprovado",
          efetivada: true,
          data_efetivada: hoje,
        })
        .eq("id", troca.id);

      if (tErr) {
        console.error(`Erro ao efetivar troca ${troca.id}:`, tErr);
        continue;
      }

      // Atualizar funcionário
      const updateFunc: Record<string, unknown> = {
        setor_id: troca.setor_destino_id,
      };
      if (troca.turma_destino) {
        updateFunc.turma = troca.turma_destino;
      }

      const { error: fErr } = await supabase
        .from("funcionarios")
        .update(updateFunc)
        .eq("id", troca.funcionario_id);

      if (fErr) {
        console.error(`Erro ao atualizar funcionário ${troca.funcionario_id}:`, fErr);
        continue;
      }

      processadas++;
    }

    return new Response(
      JSON.stringify({ message: `${processadas} troca(s) efetivada(s)`, processadas }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no processamento:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
