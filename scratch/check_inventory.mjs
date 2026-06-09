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

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function run() {
    const { data: branches, error: bErr } = await supabase.from('branches').select('id, name');
    if (bErr) {
        console.error("Error fetching branches:", bErr);
        return;
    }
    console.log("Branches:", branches);

    for (const b of branches) {
        const { count, error } = await supabase
            .from('inventory')
            .select('*', { count: 'exact', head: true })
            .eq('branch_id', b.id);
        
        if (error) {
            console.error(`Error for branch ${b.name}:`, error);
        } else {
            console.log(`Branch ${b.name} (${b.id}) has ${count} inventory items`);
        }
    }
}

run();
