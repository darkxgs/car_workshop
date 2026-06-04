import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Simple env loader
let envText = '';
if (fs.existsSync('.env.local')) {
    envText = fs.readFileSync('.env.local', 'utf8');
} else if (fs.existsSync('.env')) {
    envText = fs.readFileSync('.env', 'utf8');
}

const env = {};
envText.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > -1) {
        const key = line.substring(0, idx).trim();
        const val = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        env[key] = val;
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in env files.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('suggestion_lists')
        .select('branch_id, key, label, items');

    if (error) {
        console.error("Error fetching suggestion lists:", error);
        return;
    }

    console.log(`Fetched ${data.length} suggestion lists total.`);
    
    // Group branches and list their materials lists
    const branchesRes = await supabase.from('branches').select('id, name');
    const branchMap = {};
    branchesRes.data?.forEach(b => {
        branchMap[b.id] = b.name;
    });

    const materialsRows = data.filter(d => d.key === 'materials');
    console.log("=== MATERIALS LISTS ===");
    materialsRows.forEach(row => {
        console.log(`Branch: ${branchMap[row.branch_id] || row.branch_id} (${row.branch_id})`);
        console.log(`  Items Count: ${row.items?.length || 0}`);
        if (row.items && row.items.length > 0) {
            console.log(`  Sample (first 3):`, row.items.slice(0, 3));
        }
    });
}

main();
