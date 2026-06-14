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

async function check() {
    const { data: branches } = await supabase.from('branches').select('*');
    console.log("Branches:");
    console.dir(branches, { depth: null });
}

check();
