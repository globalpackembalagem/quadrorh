import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env', 'utf-8')
const getVal = (key) => env.match(new RegExp(`${key}="(.*)"`))?.[1]
const supabase = createClient(getVal('VITE_SUPABASE_URL'), getVal('VITE_SUPABASE_PUBLISHABLE_KEY'))

async function checkGestor() {
  const { data: users } = await supabase.from('user_roles')
    .select('nome, acesso_admin, pode_visualizar_funcionarios, user_roles_setores(setor_id)')
    .neq('nome', 'LUCIANO')
    
  console.log('Permissões da Equipe:', JSON.stringify(users, null, 2))
}

checkGestor()
