import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
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

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runSQL() {
    const sql = `
    CREATE TABLE IF NOT EXISTS public.inventory_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
        inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
        item_code TEXT,
        item_name TEXT,
        transaction_type TEXT NOT NULL,
        quantity_changed INT NOT NULL,
        quantity_before INT NOT NULL,
        quantity_after INT NOT NULL,
        user_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow all authenticated users to select inventory_transactions" ON public.inventory_transactions;
    CREATE POLICY "Allow all authenticated users to select inventory_transactions"
    ON public.inventory_transactions FOR SELECT
    TO authenticated
    USING (true);

    DROP POLICY IF EXISTS "Allow all authenticated users to insert inventory_transactions" ON public.inventory_transactions;
    CREATE POLICY "Allow all authenticated users to insert inventory_transactions"
    ON public.inventory_transactions FOR INSERT
    TO authenticated
    WITH CHECK (true);
    `;

    console.log("Executing SQL...");
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql });
    if (error) {
        console.error("Error creating table:", error);
    } else {
        console.log("Table inventory_transactions created and configured successfully!");
    }
}

runSQL();
