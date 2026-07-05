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

async function inspectPrices() {
    const dateStr = '2026-07-04';
    console.log(`Fetching closed orders for date ${dateStr}...`);
    
    const { data: closed, error } = await supabase
        .from('inspection_reports')
        .select('id, report_number, total_price, selected_services')
        .eq('status', 'تم الانتهاء')
        .gte('selected_services->0->pricing->>accountedAt', `${dateStr}T00:00:00`)
        .lte('selected_services->0->pricing->>accountedAt', `${dateStr}T23:59:59.999Z`);

    if (error) {
        console.error("Error fetching reports:", error);
        return;
    }

    console.log(`Found ${closed.length} closed reports.`);
    console.log("Details of reports with discount > 0:");
    
    let withDiscountCount = 0;
    for (const o of closed) {
        const p = (Array.isArray(o.selected_services) ? o.selected_services[0] : o.selected_services)?.pricing || {};
        const grand = parseFloat(p.grandTotal || o.total_price || 0);
        const discount = parseFloat(p.discount || 0);
        const received = parseFloat(p.amountReceived || 0);
        
        if (discount > 0) {
            withDiscountCount++;
            console.log(`Report #${o.report_number}: grandTotal=${grand}, discount=${discount}, amountReceived=${received}, total_price_in_db=${o.total_price}`);
        }
    }
    console.log(`Total reports with discount: ${withDiscountCount}`);
}

inspectPrices();
