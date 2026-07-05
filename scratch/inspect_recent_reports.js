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

async function inspectRecent() {
    console.log("Fetching branches...");
    const { data: branches, error: bErr } = await supabase.from('branches').select('id, name');
    if (bErr) {
        console.error(bErr);
        return;
    }
    console.log("Branches in DB:", branches);

    const sectorBranch = branches.find(b => b.name.includes("قطاع") || b.name.includes("القطاع"));
    console.log("Sector Branch:", sectorBranch);

    console.log("Fetching recent reports (last 20)...");
    const { data: reports, error: rErr } = await supabase
        .from('inspection_reports')
        .select('id, report_number, status, order_type, created_at, completed_at, branch_id, branches(name)')
        .order('created_at', { ascending: false })
        .limit(20);

    if (rErr) {
        console.error(rErr);
        return;
    }

    console.log("=== Recent 20 Inspection Reports ===");
    reports.forEach(o => {
        console.log(`Report #${o.report_number} | Branch: ${o.branches?.name || 'No Branch'} (ID: ${o.branch_id}) | Status: ${o.status} | Created: ${o.created_at} | Completed: ${o.completed_at}`);
    });
}

inspectRecent();
