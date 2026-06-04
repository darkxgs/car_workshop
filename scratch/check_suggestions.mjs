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
    const { data, error } = await supabase
        .from('suggestion_lists')
        .select('*')
        .eq('branch_id', 'a9d32e9b-57ba-4d58-aced-8fe797113ea7');

    if (error) {
        console.error("Error fetching suggestions:", error);
    } else {
        console.log("Suggestions for Industrial branch:", data.map(d => ({ key: d.key, itemsCount: d.items?.length })));
    }
}

run();
