const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
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

async function inspectSector() {
    // 1. Fetch all branches
    const { data: branches, error: bErr } = await supabase.from('branches').select('id, name');
    if (bErr) {
        console.error("Error fetching branches:", bErr);
        return;
    }
    console.log("Branches:", branches);
    
    const sectorBranch = branches.find(b => b.name.includes("القطاع"));
    if (!sectorBranch) {
        console.error("Sector branch not found!");
        return;
    }
    
    console.log(`Sector Branch ID: ${sectorBranch.id}`);
    
    // 2. Fetch all reports created or completed on July 4th or 5th
    const { data: reports, error: rErr } = await supabase
        .from('inspection_reports')
        .select('id, report_number, status, order_type, created_at, completed_at, total_price, branch_id')
        .gte('created_at', '2026-07-04T00:00:00Z')
        .lte('created_at', '2026-07-05T23:59:59.999Z')
        .order('created_at', { ascending: false });
        
    if (rErr) {
        console.error("Error fetching reports:", rErr);
        return;
    }
    
    console.log(`\nFound ${reports.length} reports total in the DB for July 4th and 5th.`);
    
    const sectorReports = reports.filter(r => r.branch_id === sectorBranch.id);
    console.log(`\nSector branch reports (${sectorReports.length}):`);
    sectorReports.forEach(r => {
        console.log(`Report #${r.report_number}: status=${r.status}, type=${r.order_type}, created_at=${r.created_at}, completed_at=${r.completed_at}, total_price=${r.total_price}`);
    });
}

inspectSector();
