import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function run() {
    // Fetch materials list of الصناعية
    const { data: indMaterials } = await supabase
        .from('suggestion_lists')
        .select('items')
        .eq('branch_id', 'a9d32e9b-57ba-4d58-aced-8fe797113ea7')
        .eq('key', 'materials')
        .single();

    // Fetch some inventory items of القطاع
    const { data: secInventory } = await supabase
        .from('inventory')
        .select('name, sell_price')
        .eq('branch_id', '62d96405-eab3-4f45-b337-f131f8f42540')
        .limit(5);

    console.log("الصناعية Materials sample:", indMaterials?.items?.slice(0, 5));
    console.log("القطاع Inventory sample:", secInventory);
}

run();
