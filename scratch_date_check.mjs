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
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Checking database records for inspection_reports...");
    const { count, error: countErr } = await supabase
        .from('inspection_reports')
        .select('*', { count: 'exact', head: true });
        
    if (countErr) {
        console.error("Error getting count:", countErr);
        return;
    }
    console.log(`Total reports in database: ${count}`);

    const { data: dates, error: datesErr } = await supabase
        .from('inspection_reports')
        .select('created_at')
        .order('created_at', { ascending: true });
        
    if (datesErr) {
        console.error("Error getting dates:", datesErr);
        return;
    }

    if (dates && dates.length > 0) {
        console.log(`Oldest report date: ${dates[0].created_at}`);
        console.log(`Newest report date: ${dates[dates.length - 1].created_at}`);
        
        const grouped = {};
        dates.forEach(d => {
            const day = d.created_at.split('T')[0];
            grouped[day] = (grouped[day] || 0) + 1;
        });
        console.log("Reports count by day:");
        console.log(JSON.stringify(grouped, null, 2));
    } else {
        console.log("No reports found.");
    }
}

run();
