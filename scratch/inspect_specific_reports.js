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

async function inspectSpecific() {
    const reportNumbers = [1747, 1746, 1745, 1743, 1742];
    console.log("Fetching details for reports:", reportNumbers);
    
    const { data: reports, error } = await supabase
        .from('inspection_reports')
        .select('id, report_number, status, order_type, created_at, completed_at, selected_services, branch_id')
        .in('report_number', reportNumbers);

    if (error) {
        console.error(error);
        return;
    }

    reports.forEach(o => {
        const services = Array.isArray(o.selected_services) ? o.selected_services[0] : o.selected_services;
        const pricing = services?.pricing || {};
        console.log(`\n--- Report #${o.report_number} ---`);
        console.log(`Status: ${o.status}`);
        console.log(`Completed At: ${o.completed_at}`);
        console.log(`Branch ID: ${o.branch_id}`);
        console.log(`Pricing accounted: ${pricing.accounted}`);
        console.log(`Pricing accountedAt: ${pricing.accountedAt}`);
        console.log(`Full Pricing block:`, JSON.stringify(pricing, null, 2));
    });
}

inspectSpecific();
