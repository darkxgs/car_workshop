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

async function testAuditQueries() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    console.log("Fetching pending orders...");
    const { data: pending, error: err1 } = await supabase
        .from('inspection_reports')
        .select('id, report_number, order_type')
        .eq('status', 'تم الانتهاء')
        .neq('order_type', 'sale') // we ignore sales from pending in UI if they are closed
        .not('selected_services->0->pricing->>accounted', 'eq', 'true')
        .limit(100);
        
    if (err1) {
        console.error("Pending query error:", err1);
    } else {
        console.log(`Pending orders count: ${pending.length}`);
    }
    
    console.log("Fetching closed orders for date:", todayStr);
    const { data: closed, error: err2 } = await supabase
        .from('inspection_reports')
        .select('id, report_number, selected_services')
        .eq('status', 'تم الانتهاء')
        .gte('selected_services->0->pricing->>accountedAt', `${todayStr}T00:00:00`)
        .lte('selected_services->0->pricing->>accountedAt', `${todayStr}T23:59:59.999Z`);
        
    if (err2) {
        console.error("Closed query error:", err2);
    } else {
        console.log(`Closed orders count for today: ${closed.length}`);
    }
}

testAuditQueries();
