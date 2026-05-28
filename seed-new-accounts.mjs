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

async function seedNewAccounts() {
    console.log("🚀 Starting user seeding for Abbas and Mujtaba accounts...");

    // 1. Clear any existing auth users to prevent duplicates
    console.log("Fetching existing auth users to avoid duplicates...");
    const { data: authUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
    if (!listErr && authUsers && authUsers.users) {
        for (const u of authUsers.users) {
            if (u.email === 'abbas@workshop.local' || u.email === 'mujtaba@workshop.local') {
                console.log(`Deleting old duplicate user: ${u.email}...`);
                await supabaseAdmin.auth.admin.deleteUser(u.id);
            }
        }
    }

    // 2. Seed "عباس طالب" (abbas)
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
        role: 'Owner',
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

    // 3. Seed "مجتبى المحاسب" (mujtaba)
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

    console.log("\n⭐️ USER SEEDING COMPLETED SUCCESSFULLY! ⭐️");
}

seedNewAccounts();
