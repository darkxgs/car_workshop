import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

import { Client } from 'pg';

const envPath = path.resolve('.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    if (!line || line.trim().startsWith('#')) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function runMigration() {
    console.log("Starting DB migration...");
    
    // 1. Add "القطاع" branch if it doesn't exist
    const { data: existingBranches } = await supabase.from('branches').select('id, name').eq('name', 'القطاع');
    if (!existingBranches || existingBranches.length === 0) {
        const { error: bErr } = await supabase.from('branches').insert([{ name: 'القطاع', address: 'القطاع' }]);
        if (bErr) console.error("Failed to insert branch القطاع:", bErr);
        else console.log("Successfully added branch القطاع.");
    } else {
        console.log("Branch القطاع already exists.");
    }

    console.log("Please run `supabase/update_inventory.sql` in the Supabase SQL Editor to add `notes` and `warehouse_notes`.");
}

runMigration();
