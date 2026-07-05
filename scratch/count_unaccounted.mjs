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

async function countUnaccounted() {
    const { data, error } = await supabase
        .from('inspection_reports')
        .select('id, report_number, status, order_type, selected_services, total_price')
        .eq('status', 'تم الانتهاء');
        
    if (error) {
        console.error("Error:", error);
        return;
    }
    
    let totalFinished = data.length;
    let unaccounted = 0;
    let unaccountedSales = 0;
    let unaccountedNormal = 0;
    
    data.forEach(o => {
        const p = (Array.isArray(o.selected_services) ? o.selected_services[0] : o.selected_services)?.pricing;
        const accounted = p?.accounted === true;
        if (!accounted) {
            unaccounted++;
            if (o.order_type === 'sale') {
                unaccountedSales++;
            } else {
                unaccountedNormal++;
            }
        }
    });
    
    console.log(`Total finished reports: ${totalFinished}`);
    console.log(`Unaccounted reports: ${unaccounted}`);
    console.log(`  - Normal reports: ${unaccountedNormal}`);
    console.log(`  - Sales: ${unaccountedSales}`);
}

countUnaccounted();
