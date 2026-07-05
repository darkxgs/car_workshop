import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
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

async function testJsonbFilter() {
    const todayStr = new Date().toISOString().split('T')[0]; // e.g. '2026-07-05'
    console.log("Filtering by date:", todayStr);
    
    const { data, error } = await supabase
        .from('inspection_reports')
        .select('id, report_number, selected_services')
        .eq('status', 'تم الانتهاء')
        .gte('selected_services->0->pricing->>accountedAt', `${todayStr}T00:00:00`)
        .lte('selected_services->0->pricing->>accountedAt', `${todayStr}T23:59:59.999Z`);
        
    if (error) {
        console.error("Error filtering JSONB:", error);
    } else {
        console.log(`Successfully fetched ${data.length} reports.`);
        if (data.length > 0) {
            console.log("First report report_number:", data[0].report_number);
            console.log("Pricing accountedAt:", data[0].selected_services?.[0]?.pricing?.accountedAt);
        }
    }
}

testJsonbFilter();
