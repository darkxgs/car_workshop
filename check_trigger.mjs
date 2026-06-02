import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    if (!line || line.trim().startsWith('#')) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function test() {
    const { data, error } = await supabase.rpc('exec_sql', { sql: `
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers;
    ` });
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}
test();
