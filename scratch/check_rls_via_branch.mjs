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

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
    // 1. Get a branch to use as temporary storage
    const { data: branches, error: bErr } = await supabase.from('branches').select('id, address').limit(1);
    if (bErr || !branches || branches.length === 0) {
        console.error("Error fetching branches:", bErr);
        return;
    }
    const branch = branches[0];
    const originalAddress = branch.address;
    console.log(`Using branch: ${branch.id} (original address: "${originalAddress}")`);

    // 2. Run SQL to serialize RLS/policies and store in branch address
    const sql = `
        DO $$
        DECLARE
            policies_json json;
            rls_json json;
            combined_json json;
        BEGIN
            -- Get policies
            SELECT json_agg(t) INTO policies_json FROM (
                SELECT tablename, policyname, roles, cmd, qual 
                FROM pg_policies 
                WHERE tablename IN ('branches', 'employees')
            ) t;

            -- Get RLS status
            SELECT json_agg(r) INTO rls_json FROM (
                SELECT relname as tablename, relrowsecurity as rls_enabled 
                FROM pg_class 
                WHERE relname IN ('branches', 'employees')
            ) r;

            -- Combine
            combined_json := json_build_object('policies', policies_json, 'rls', rls_json);

            -- Store in branch address
            UPDATE public.branches 
            SET address = combined_json::text 
            WHERE id = '${branch.id}';
        END $$;
    `;

    const { error: sqlErr } = await supabase.rpc('exec_sql', { sql });
    if (sqlErr) {
        console.error("Error executing SQL:", sqlErr);
        return;
    }

    // 3. Fetch branch using supabase client to get the serialized data
    const { data: updatedBranch, error: fetchErr } = await supabase
        .from('branches')
        .select('address')
        .eq('id', branch.id)
        .single();

    if (fetchErr) {
        console.error("Error fetching updated branch:", fetchErr);
    } else {
        try {
            const result = JSON.parse(updatedBranch.address);
            console.log("\n=== POLICIES ===");
            console.table(result.policies || []);
            
            console.log("\n=== RLS STATUS (true = RLS enabled) ===");
            console.table(result.rls || []);
        } catch (e) {
            console.error("Error parsing JSON:", e, updatedBranch.address);
        }
    }

    // 4. Restore original branch address
    console.log("\nRestoring original branch address...");
    const { error: restoreErr } = await supabase
        .from('branches')
        .update({ address: originalAddress })
        .eq('id', branch.id);

    if (restoreErr) {
        console.error("Error restoring branch address:", restoreErr);
    } else {
        console.log("Restored successfully.");
    }
}

main();
