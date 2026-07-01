import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let envText = '';
if (fs.existsSync('.env.local')) envText = fs.readFileSync('.env.local', 'utf8');
else if (fs.existsSync('.env')) envText = fs.readFileSync('.env', 'utf8');

const env = {};
envText.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > -1) {
        const key = line.substring(0, idx).trim();
        const val = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        env[key] = val;
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const sql = fs.readFileSync('supabase/migrations/20260624_order_type.sql', 'utf8');

async function main() {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) { console.error('APPLY ERROR:', error); process.exit(1); }

    // Verify: column exists and defaults to 'maintenance'
    const { data, error: selErr } = await supabase
        .from('inspection_reports')
        .select('id, order_type')
        .limit(3);
    if (selErr) { console.error('VERIFY ERROR:', selErr); process.exit(1); }
    console.log('OK order_type applied. Sample:', JSON.stringify(data));
}

main();
