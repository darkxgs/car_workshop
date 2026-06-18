import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read env variables manually since .env is in parent directory
const envContent = fs.readFileSync('d:/Programming/Muhemn Work/auto-workshop/.env', 'utf8');
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
  const { data, error } = await supabase
    .from('suggestion_lists')
    .select('branch_id, key, items');
  if (error) {
    console.error(error);
    return;
  }
  console.log('--- SUGGESTION LISTS ---');
  for (const row of data) {
    if (['technicianNames', 'supervisorNames', 'bayNumbers'].includes(row.key)) {
      console.log(`Branch: ${row.branch_id} | Key: ${row.key}`);
      console.log(JSON.stringify(row.items, null, 2));
      console.log('---------------------------');
    }
  }
}
run();
