import { createClient } from '@supabase/supabase-js';

const url = 'https://ftyqmvfzcjhzsujojlgs.supabase.co';
const key = 'sb_publishable_oYqamfXEhvDnxLqygJeD6A_sqKIas-q';

const supabase = createClient(url, key);

async function check() {
  console.log("Checking caixas...");
  const { data: caixas, error: caixasErr } = await supabase.from('caixas').select('*').limit(5);
  console.log('Caixas Error:', caixasErr);
  console.log('Caixas Data Length:', caixas?.length);
  if(caixas?.length) console.log(caixas[0]);

  console.log("\nChecking movimentos_caixa...");
  const { data: movs, error: movsErr } = await supabase.from('movimentos_caixa').select('*').limit(5);
  console.log('Movs Error:', movsErr);
  console.log('Movs Data Length:', movs?.length);
  if(movs?.length) console.log(movs[0]);
}

check();
