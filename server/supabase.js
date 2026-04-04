const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  const missing = [
    !SUPABASE_URL ? 'SUPABASE_URL' : null,
    !SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
  ].filter(Boolean).join(', ');
  throw new Error(`Variáveis obrigatórias ausentes no ambiente: ${missing}. Remova segredos hardcoded e defina as envs antes de iniciar o TrafficDash.`);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function ensureSchema() {
  const { error } = await supabase.from('traffic_users').select('id').limit(1);
  if (error) {
    throw new Error('Schema do TrafficDash não existe no Supabase ainda. Execute traffic-dash/supabase-schema.sql no SQL Editor do projeto Supabase antes de subir o serviço.');
  }
}

module.exports = { supabase, ensureSchema };
