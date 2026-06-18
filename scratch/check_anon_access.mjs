import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
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

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_ANON_KEY = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    console.log("Querying as anonymous browser-like client...");
    const { data, error } = await supabase
        .from('inspection_reports')
        .select('created_at, branch_id');
        
    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    console.log(`Successfully fetched ${data.length} records.`);
    if (data.length > 0) {
        const grouped = {};
        data.forEach(r => {
            const day = r.created_at.split('T')[0];
            grouped[day] = (grouped[day] || 0) + 1;
        });
        console.log("Grouped by day:", grouped);
    }
}

run();
