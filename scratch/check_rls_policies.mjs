import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env variables
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase credentials in env files.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
    console.log("Creating temporary policies table...");
    
    // Create temp table with policy info
    const createSql = `
        DROP TABLE IF EXISTS public.temp_policies_check;
        CREATE TABLE public.temp_policies_check AS 
        SELECT tablename, policyname, roles, cmd, qual 
        FROM pg_policies 
        WHERE tablename IN ('vehicles', 'clients', 'inspection_reports');
    `;
    
    const { error: err1 } = await supabase.rpc('exec_sql', { sql: createSql });
    if (err1) {
        console.error("Error creating temp table:", err1);
        return;
    }
    
    // Query it
    const { data: policies, error: err2 } = await supabase
        .from('temp_policies_check')
        .select('*');
        
    if (err2) {
        console.error("Error querying temp table:", err2);
    } else {
        console.log("\n=== POLICIES ON THE TABLES ===");
        console.table(policies);
    }
    
    // Create temp table with RLS status
    const rlsSql = `
        DROP TABLE IF EXISTS public.temp_rls_check;
        CREATE TABLE public.temp_rls_check AS 
        SELECT relname as tablename, relrowsecurity as rls_enabled 
        FROM pg_class 
        WHERE relname IN ('vehicles', 'clients', 'inspection_reports');
    `;
    
    const { error: err3 } = await supabase.rpc('exec_sql', { sql: rlsSql });
    if (err3) {
        console.error("Error creating RLS temp table:", err3);
        return;
    }
    
    // Query RLS status
    const { data: rlsStatus, error: err4 } = await supabase
        .from('temp_rls_check')
        .select('*');
        
    if (err4) {
        console.error("Error querying RLS temp table:", err4);
    } else {
        console.log("\n=== RLS STATUS (true = RLS enabled) ===");
        console.table(rlsStatus);
    }
    
    // Clean up
    console.log("\nCleaning up temporary tables...");
    await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS public.temp_policies_check; DROP TABLE IF EXISTS public.temp_rls_check;' });
    console.log("Done.");
}

main();
