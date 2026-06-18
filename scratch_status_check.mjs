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
    console.log("Checking database record statuses...");
    const { data: reports, error } = await supabase
        .from('inspection_reports')
        .select('status, created_at');
        
    if (error) {
        console.error("Error fetching statuses:", error);
        return;
    }

    const statuses = {};
    reports.forEach(r => {
        statuses[r.status] = (statuses[r.status] || 0) + 1;
    });
    console.log("Statuses in DB:", statuses);

    // Filter by 'تم الانتهاء'
    const completed = reports.filter(r => r.status === 'تم الانتهاء');
    console.log(`Total completed (تم الانتهاء) reports: ${completed.length}`);

    if (completed.length > 0) {
        const grouped = {};
        completed.forEach(c => {
            const day = c.created_at.split('T')[0];
            grouped[day] = (grouped[day] || 0) + 1;
        });
        console.log("Completed reports count by day:");
        console.log(JSON.stringify(grouped, null, 2));
    }
}

run();
