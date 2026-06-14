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

async function copyParts() {
    const { data: branches, error: err } = await supabase.from('branches').select('id, name');
    console.log("Branches:", branches);

    const indBranch = branches.find(b => b.name === 'الصناعية' || b.name === 'فرع الصناعية');
    const secBranch = branches.find(b => b.name === 'القطاع' || b.name === 'فرع القطاع');

    if (!indBranch || !secBranch) {
        console.error("Could not find branches");
        return;
    }

    console.log("Industrial:", indBranch.id);
    console.log("Sector:", secBranch.id);

    // Fetch all parts from Industrial branch
    let allParts = [];
    let page = 0;
    while(true) {
        const { data: parts, error } = await supabase.from('inventory').select('*').eq('branch_id', indBranch.id).range(page*1000, (page+1)*1000 - 1);
        if (error) {
            console.error("Error fetching parts:", error);
            return;
        }
        if (!parts || parts.length === 0) break;
        allParts.push(...parts);
        page++;
    }

    console.log(`Fetched ${allParts.length} parts from Industrial branch.`);

    // Before copying, let's delete existing parts in Sector branch just in case, or NOT? 
    // The user said "add them for the sector now". It's better not to delete unless told. But wait, if they have fake ones? I will just add them.
    // Actually wait, let's just insert them.

    const newParts = allParts.map(p => {
        const { id, created_at, updated_at, ...rest } = p;
        return {
            ...rest,
            branch_id: secBranch.id
        };
    });

    console.log(`Ready to insert ${newParts.length} parts into Sector branch.`);

    // Insert in batches of 100
    for(let i=0; i<newParts.length; i+=100) {
        const batch = newParts.slice(i, i+100);
        const { error } = await supabase.from('inventory').insert(batch);
        if (error) {
            console.error("Error inserting batch:", error);
            return;
        }
        console.log(`Inserted batch ${i/100 + 1}`);
    }

    console.log("Done!");
}

copyParts();
