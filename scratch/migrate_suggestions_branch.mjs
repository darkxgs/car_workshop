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

async function migrate() {
    const migrationSql = `
    -- 1. Add branch_id column to suggestion_lists
    ALTER TABLE public.suggestion_lists ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

    -- 2. Populate suggestions for each branch if they do not exist
    DO $$
    DECLARE
        br RECORD;
    BEGIN
        FOR br IN SELECT id FROM public.branches LOOP
            -- Seed default/existing lists to this branch
            INSERT INTO public.suggestion_lists (key, label, items, branch_id)
            SELECT key, label, items, br.id
            FROM public.suggestion_lists
            WHERE branch_id IS NULL
            ON CONFLICT (key) DO NOTHING;
        END LOOP;
    END $$;

    -- 3. Delete any legacy row where branch_id is still NULL
    DELETE FROM public.suggestion_lists WHERE branch_id IS NULL;

    -- 4. Drop the old primary key constraint and make a composite primary key on (branch_id, key)
    ALTER TABLE public.suggestion_lists DROP CONSTRAINT IF EXISTS suggestion_lists_pkey;
    ALTER TABLE public.suggestion_lists ADD CONSTRAINT suggestion_lists_pkey PRIMARY KEY (branch_id, key);
    `;

    console.log("Running suggestions branch migration in database...");
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: migrationSql });
    if (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
    console.log("Suggestions branch migration completed successfully!");
}

migrate();
