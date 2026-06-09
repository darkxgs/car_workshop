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

async function run() {
    const { data, error } = await supabase.from('inventory').select('id, branch_id, name, item_code, category').limit(10);
    if (error) {
        console.error("Error fetching inventory:", error);
    } else {
        console.log("Sample inventory items (first 10):", data);
        const { count } = await supabase.from('inventory').select('*', { count: 'exact', head: true });
        console.log("Total inventory rows in DB:", count);
    }
}

run();
