import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env', 'utf-8')
const getVal = (key) => env.match(new RegExp(`${key}="(.*)"`))?.[1]
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('VITE_SUPABASE_PUBLISHABLE_KEY'))

async function checkVisibility() {
   // Testar se consigo ver Setores
   const { data: s } = await supabase.from('setores').select('id').limit(1)
   console.log('Setores:', s?.length)
   
   // Testar Faltas
   const { data: f } = await supabase.from('historico_faltas').select('id').limit(1)
   console.log('Faltas:', f?.length)
   
   // Testar registros de ponto
   const { data: p } = await supabase.from('registros_ponto').select('id').limit(1)
   console.log('Ponto:', p?.length)
}
checkVisibility()
