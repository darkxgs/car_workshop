const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReports() {
    const { data: branches } = await supabase.from('branches').select('id, name');
    console.log("Branches:", branches);

    const { data: reports, error } = await supabase.from('inspection_reports').select('id, report_number, branch_id');
    if (error) console.error("Error:", error);
    
    const branchMap = {};
    branches.forEach(b => branchMap[b.id] = b.name);
    
    const reportsByBranch = {};
    reports.forEach(r => {
        const branchName = r.branch_id ? branchMap[r.branch_id] : 'NULL';
        if (!reportsByBranch[branchName]) reportsByBranch[branchName] = 0;
        reportsByBranch[branchName]++;
    });
    
    console.log("Reports by Branch:", reportsByBranch);
}

checkReports();
