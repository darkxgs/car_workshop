import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('d:/Programming/Muhemn Work/auto-workshop/.env'), 'utf8');
const envLines = envContent.split('\n');
for (const line of envLines) {
    if (line.includes('=')) {
        const [key, ...rest] = line.split('=');
        process.env[key.trim()] = rest.join('=').trim().replace(/"/g, '');
    }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function copySuggestions() {
    const indBranchId = 'a9d32e9b-57ba-4d58-aced-8fe797113ea7';
    const secBranchId = '62d96405-eab3-4f45-b337-f131f8f42540';
    const key = 'materials';

    // Get materials from Industrial
    const { data: indData, error: err1 } = await supabase.from('suggestion_lists')
        .select('*')
        .eq('branch_id', indBranchId)
        .eq('key', key)
        .single();

    if (err1 || !indData) {
        console.error("Error fetching indData:", err1);
        return;
    }

    console.log(`Found ${indData.items.length} items in Industrial materials.`);

    // Upsert to Sector
    const { data: secData, error: err2 } = await supabase.from('suggestion_lists')
        .upsert({
            branch_id: secBranchId,
            key: key,
            label: indData.label,
            items: indData.items,
            updated_at: new Date().toISOString()
        }, { onConflict: 'branch_id, key' });

    if (err2) {
        console.error("Error upserting secData:", err2);
    } else {
        console.log("Successfully copied materials to Sector!");
    }
}

copySuggestions();
