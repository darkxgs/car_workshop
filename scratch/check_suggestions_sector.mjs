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
    const { data, error } = await supabase
        .from('suggestion_lists')
        .select('key, items')
        .eq('branch_id', '62d96405-eab3-4f45-b337-f131f8f42540');

    if (error) {
        console.error("Error fetching suggestions:", error);
    } else {
        console.log("Suggestions for Sector branch:", data.map(d => ({ key: d.key, count: d.items?.length })));
    }
}

run();
