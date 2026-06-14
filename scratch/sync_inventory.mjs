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

async function syncInventory() {
    const secBranchId = '62d96405-eab3-4f45-b337-f131f8f42540';

    // 1. Get materials from Sector's suggestion_lists
    const { data: suggestions, error: err1 } = await supabase.from('suggestion_lists')
        .select('*')
        .eq('branch_id', secBranchId)
        .eq('key', 'materials')
        .single();

    if (err1 || !suggestions) {
        console.error("Error fetching materials:", err1);
        return;
    }

    const items = suggestions.items || [];
    console.log(`Found ${items.length} items in Sector's materials suggestion list.`);

    // 2. Clear existing Sector inventory to avoid duplicates (optional, but user wants exactly these 1142)
    const { error: delErr } = await supabase.from('inventory').delete().eq('branch_id', secBranchId);
    if (delErr) {
         console.error("Error deleting old inventory:", delErr);
    } else {
         console.log("Cleared old Sector inventory.");
    }

    // 3. Prepare inventory records
    // Item format: { name: string, price: string, serial?: string }
    const inventoryRecords = items.map(item => ({
        branch_id: secBranchId,
        item_code: item.serial || `SKU-${Math.floor(Math.random()*100000)}`,
        name: item.name,
        category: 'مواد عامة', // generic category
        quantity: 0,
        purchase_price: 0,
        sell_price: parseFloat(item.price) || 0
    }));

    // 4. Insert in batches
    for (let i = 0; i < inventoryRecords.length; i += 100) {
        const batch = inventoryRecords.slice(i, i + 100);
        const { error: insErr } = await supabase.from('inventory').insert(batch);
        if (insErr) {
            console.error("Error inserting batch:", insErr);
            return;
        }
        console.log(`Inserted batch ${i/100 + 1}`);
    }

    console.log("Successfully synced Sector inventory with the 1142 materials!");
}

syncInventory();
