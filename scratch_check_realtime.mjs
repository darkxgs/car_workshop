import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: "select * from pg_publication_tables where pubname = 'supabase_realtime';"
  });
  if (error) {
    console.error("RPC exec_sql error:", error);
    return;
  }
  console.log("Realtime publication tables:");
  console.log(data);
}
run();
