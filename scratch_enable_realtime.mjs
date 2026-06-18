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
  console.log("Adding table inspection_reports to supabase_realtime...");
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: "alter publication supabase_realtime add table inspection_reports;"
  });
  if (error) {
    console.error("Error executing DDL:", error);
  } else {
    console.log("Result:", data);
  }
}
run();
