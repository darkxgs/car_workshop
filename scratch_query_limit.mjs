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
    console.log("Running the exact query from exportExcel in Customers page...");
    const { data, error } = await supabase
        .from("inspection_reports")
        .select(`id, report_number, created_at, total_price, status, selected_services, odometer_reading,
                 receptionist:receptionist_id(name),
                 vehicles(make, model, plate_number, clients(name, phone)), branches(name)`)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Query Error:", error);
        return;
    }

    console.log(`Total reports fetched by query: ${data.length}`);
    if (data.length > 0) {
        console.log(`Oldest fetched report date: ${data[data.length - 1].created_at}`);
        console.log(`Newest fetched report date: ${data[0].created_at}`);
        
        const grouped = {};
        data.forEach(r => {
            const day = r.created_at.split('T')[0];
            grouped[day] = (grouped[day] || 0) + 1;
        });
        console.log("Fetched reports count by day:");
        console.log(JSON.stringify(grouped, null, 2));
    }
}

run();
