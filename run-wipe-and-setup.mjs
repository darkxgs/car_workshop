import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE config inside .env file");
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runWipeAndSetup() {
    console.log("🚀 Starting database schema alteration and migration...");

    // 1. Run Schema alterations via exec_sql
    const migrationSql = `
        -- 1. Add username and permission columns to employees
        ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
        ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_dashboard BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_reception BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_work_orders BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_customers BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_reports BOOLEAN DEFAULT TRUE;
        ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS permission_employees BOOLEAN DEFAULT FALSE;
    `;

    console.log("Applying table schema alterations...");
    const { data: schemaRes, error: schemaErr } = await supabaseAdmin.rpc('exec_sql', { sql: migrationSql });
    if (schemaErr) {
        console.error("❌ Failed to alter schema:", schemaErr);
        process.exit(1);
    }
    console.log("✅ Schema alterations applied successfully!");

    // 2. Wipe operational data
    console.log("Wiping operational tables (inspection_reports, clients, vehicles, report_services, used_parts)...");
    const wipeSql = `
        -- Truncate and reset sequences
        TRUNCATE TABLE public.report_services RESTART IDENTITY CASCADE;
        TRUNCATE TABLE public.used_parts RESTART IDENTITY CASCADE;
        TRUNCATE TABLE public.inspection_reports RESTART IDENTITY CASCADE;
        TRUNCATE TABLE public.vehicles RESTART IDENTITY CASCADE;
        TRUNCATE TABLE public.clients RESTART IDENTITY CASCADE;

        -- Clean up existing employees to prepare for fresh seed
        DELETE FROM public.employees;
    `;
    const { error: wipeErr } = await supabaseAdmin.rpc('exec_sql', { sql: wipeSql });
    if (wipeErr) {
        console.error("❌ Failed to wipe operational data:", wipeErr);
        process.exit(1);
    }
    console.log("✅ Operational tables truncated and reset!");

    // 3. Clear all old Auth Users
    console.log("Fetching and deleting all old users in auth.users...");
    const { data: authUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listErr) {
        console.error("❌ Failed to list users:", listErr);
    } else if (authUsers && authUsers.users) {
        for (const u of authUsers.users) {
            console.log(`Deleting auth user: ${u.email} (${u.id})...`);
            await supabaseAdmin.auth.admin.deleteUser(u.id);
        }
        console.log("✅ All old auth users deleted!");
    }

    // 4. Seed user "عباس طالب" (abbas)
    console.log("Seeding عباس طالب (abbas)...");
    const abbasEmail = "abbas@workshop.local";
    const abbasPass = "abbas123";
    const { data: abbasAuth, error: abbasAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: abbasEmail,
        password: abbasPass,
        email_confirm: true,
        user_metadata: { name: 'عباس طالب' }
    });

    if (abbasAuthErr) {
        console.error("❌ Failed to create auth user abbas:", abbasAuthErr);
        process.exit(1);
    }

    const { error: abbasEmpErr } = await supabaseAdmin.from('employees').insert({
        auth_id: abbasAuth.user.id,
        name: 'عباس طالب',
        username: 'abbas',
        role: 'Owner', // Owner role has bypass
        phone: '07700000000',
        permission_dashboard: true,
        permission_reception: true,
        permission_work_orders: true,
        permission_customers: true,
        permission_reports: true,
        permission_employees: true
    });

    if (abbasEmpErr) {
        console.error("❌ Failed to insert employee record for abbas:", abbasEmpErr);
        // Rollback auth
        await supabaseAdmin.auth.admin.deleteUser(abbasAuth.user.id);
        process.exit(1);
    }
    console.log("✅ Created عباس طالب account successfully!");

    // 5. Seed user "مجتبى المحاسب" (mujtaba)
    console.log("Seeding مجتبى المحاسب (mujtaba)...");
    const mujtabaEmail = "mujtaba@workshop.local";
    const mujtabaPass = "mujtaba123";
    const { data: mujtabaAuth, error: mujtabaAuthErr } = await supabaseAdmin.auth.admin.createUser({
        email: mujtabaEmail,
        password: mujtabaPass,
        email_confirm: true,
        user_metadata: { name: 'مجتبى المحاسب' }
    });

    if (mujtabaAuthErr) {
        console.error("❌ Failed to create auth user mujtaba:", mujtabaAuthErr);
        process.exit(1);
    }

    const { error: mujtabaEmpErr } = await supabaseAdmin.from('employees').insert({
        auth_id: mujtabaAuth.user.id,
        name: 'مجتبى المحاسب',
        username: 'mujtaba',
        role: 'Receptionist',
        phone: '07700000001',
        permission_dashboard: true,
        permission_reception: false,
        permission_work_orders: false,
        permission_customers: false,
        permission_reports: true,
        permission_employees: false
    });

    if (mujtabaEmpErr) {
        console.error("❌ Failed to insert employee record for mujtaba:", mujtabaEmpErr);
        // Rollback auth
        await supabaseAdmin.auth.admin.deleteUser(mujtabaAuth.user.id);
        process.exit(1);
    }
    console.log("✅ Created مجتبى المحاسب account successfully!");

    console.log("\n⭐️ DATABASE WIPE, MIGRATION, AND SEEDING COMPLETED SUCCESSFULLY! ⭐️");
}

runWipeAndSetup();
