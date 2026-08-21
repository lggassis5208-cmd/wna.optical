const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('c:/Users/Lucas/Documents/GitHub/wna.optical/.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const url = envVars.VITE_SUPABASE_URL;
const key = envVars.VITE_SUPABASE_ANON_KEY;

console.log('--- DIAGNÓSTICO DE SINCRONIZAÇÃO SUPABASE ---');
console.log('URL configurada:', url);

const supabase = createClient(url, key);

async function testSync() {
  const tables = [
    'tenants',
    'clientes',
    'vendas',
    'crm_funis',
    'crm_etapas',
    'crm_leads',
    'crm_lead_eventos',
    'crm_tarefas',
    'crm_followup_fila',
    'lista_supressao'
  ];

  const report = {};

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(3);
      if (error) {
        report[table] = { status: 'ERRO / NÃO CRIADA NO POSTGRES', code: error.code, message: error.message };
      } else {
        report[table] = { status: 'SINCRONIZADO E OPERACIONAL (OK)', registros_encontrados: data.length, amostra: data[0] ? Object.keys(data[0]) : [] };
      }
    } catch (err) {
      report[table] = { status: 'EXCEÇÃO DE CONEXÃO', message: err.message };
    }
  }

  console.log('\nRELATÓRIO DE TABELAS DO BANCO:');
  console.log(JSON.stringify(report, null, 2));
}

testSync();
