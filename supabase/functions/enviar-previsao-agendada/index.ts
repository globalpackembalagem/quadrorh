import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Horário atual no Brasil (UTC-3)
    const now = new Date()
    const brTime = new Date(now.getTime() - 3 * 60 * 60 * 1000)
    const horaAtual = brTime.getHours()
    const minutoAtual = brTime.getMinutes()
    const dataHoje = brTime.toISOString().split('T')[0]

    console.log(`[enviar-previsao-agendada] Hora BR: ${horaAtual}:${String(minutoAtual).padStart(2, '0')}, Data: ${dataHoje}`)

    // Buscar horários ativos
    const { data: horarios, error: hErr } = await supabase
      .from('previsao_horarios_notificacao')
      .select('*')
      .eq('ativo', true)

    if (hErr) throw hErr
    if (!horarios || horarios.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum horário configurado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Buscar situação PREVISÃO
    const { data: situacoes } = await supabase
      .from('situacoes')
      .select('id, nome')
      .ilike('nome', '%PREVIS%')

    const situacaoPrevisaoId = situacoes?.[0]?.id
    if (!situacaoPrevisaoId) {
      return new Response(JSON.stringify({ message: 'Situação PREVISÃO não encontrada' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let totalEventosCriados = 0

    for (const horario of horarios) {
      if (horario.ultimo_envio === dataHoje) continue

      const [hConfig, mConfig] = horario.horario.split(':').map(Number)
      const minutosConfig = hConfig * 60 + mConfig
      const minutosAtual = horaAtual * 60 + minutoAtual
      const diff = minutosAtual - minutosConfig

      if (diff < 0 || diff > 5) continue

      console.log(`[enviar-previsao-agendada] Processando ${horario.setor_grupo} (${horario.horario})`)

      // Buscar funcionários com situação PREVISÃO
      const { data: funcionarios } = await supabase
        .from('funcionarios')
        .select('id, nome_completo, setor_id, turma, setor:setores!setor_id(nome, grupo)')
        .eq('situacao_id', situacaoPrevisaoId)

      if (!funcionarios || funcionarios.length === 0) continue

      // Filtrar por grupo de setor
      const grupoNorm = horario.setor_grupo.toUpperCase().trim()
      const funcsFiltrados = funcionarios.filter((f: any) => {
        const setorNome = (f.setor?.nome || '').toUpperCase()
        const turma = (f.turma || '').toUpperCase()

        if (grupoNorm.includes('SOPRO A') && setorNome.includes('SOPRO') && turma.includes('A')) return true
        if (grupoNorm.includes('SOPRO B') && setorNome.includes('SOPRO') && turma.includes('B')) return true
        if (grupoNorm.includes('SOPRO C') && setorNome.includes('SOPRO') && turma.includes('C')) return true
        if (grupoNorm.includes('DECORAÇÃO DIA') && setorNome.includes('DECO') && (turma.includes('DIA') || turma.includes('T1') || turma.includes('1'))) return true
        if (grupoNorm.includes('DECORAÇÃO NOITE') && setorNome.includes('DECO') && (turma.includes('NOITE') || turma.includes('T2') || turma.includes('2'))) return true

        return setorNome.includes(grupoNorm) || `${setorNome} ${turma}`.includes(grupoNorm)
      })

      if (funcsFiltrados.length === 0) continue

      // APENAS criar eventos na central — NÃO enviar notificações diretamente
      // O admin revisa e envia manualmente pela Central de Notificações
      for (const func of funcsFiltrados) {
        // Verificar duplicata: não criar se já existe evento pendente para mesmo funcionário + tipo
        const { data: existente } = await supabase
          .from('eventos_sistema')
          .select('id')
          .eq('tipo', 'previsao_admissao')
          .eq('funcionario_nome', func.nome_completo)
          .eq('notificado', false)
          .limit(1)

        if (existente && existente.length > 0) {
          console.log(`[enviar-previsao-agendada] Evento duplicado ignorado: ${func.nome_completo}`)
          continue
        }

        await supabase
          .from('eventos_sistema')
          .insert({
            tipo: 'previsao_admissao',
            descricao: `PREVISÃO DE ADMISSÃO — ${func.nome_completo}`,
            funcionario_id: func.id,
            funcionario_nome: func.nome_completo,
            setor_id: func.setor_id,
            setor_nome: horario.setor_grupo,
            turma: func.turma,
            criado_por: 'SISTEMA (AUTOMÁTICO)',
            notificado: false,  // PENDENTE — admin envia pela Central
            dados_extra: { 
              envio_automatico: true, 
              funcionario_id: func.id,
              aguardando_confirmacao: true 
            },
          })

        totalEventosCriados++
        console.log(`[enviar-previsao-agendada] Evento criado na central: ${func.nome_completo}`)
      }

      // Atualizar último envio
      await supabase
        .from('previsao_horarios_notificacao')
        .update({ ultimo_envio: dataHoje })
        .eq('id', horario.id)
    }

    return new Response(
      JSON.stringify({ success: true, totalEventosCriados }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[enviar-previsao-agendada] Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
