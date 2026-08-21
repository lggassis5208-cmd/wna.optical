const url = 'https://ftyqmvfzcjhzsujojlgs.supabase.co';
const key = 'sb_publishable_oYqamfXEhvDnxLqygJeD6A_sqKIas-q';

async function check() {
  console.log("Checking caixas...");
  const caixas = await fetch(`${url}/rest/v1/caixas?select=*&limit=5`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  }).then(r => r.json());
  console.log('Caixas:', caixas);

  console.log("\nChecking movimentos_caixa...");
  const movs = await fetch(`${url}/rest/v1/movimentos_caixa?select=*&limit=5`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  }).then(r => r.json());
  console.log('Movimentos:', movs);
}

check();
