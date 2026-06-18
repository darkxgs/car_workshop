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
    console.log("Checking database reports by branch and date...");
    const { data: reports, error } = await supabase
        .from('inspection_reports')
        .select('created_at, branches(id, name)');
        
    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    const branchData = {};
    reports.forEach(r => {
        const branchName = r.branches?.name || "No Branch";
        const day = r.created_at.split('T')[0];
        
        if (!branchData[branchName]) {
            branchData[branchName] = {};
        }
        branchData[branchName][day] = (branchData[branchName][day] || 0) + 1;
    });

    console.log("Reports by Branch and Day:");
    console.log(JSON.stringify(branchData, null, 2));
}

run();
