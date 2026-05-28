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
    console.log("🚀 Starting database wipe and seeding via Supabase API...");

    // 1. Wipe operational tables via DELETE
    console.log("Wiping report_services...");
    const { error: err1 } = await supabaseAdmin.from('report_services').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err1) console.error("Warning/Error wiping report_services:", err1.message);

    console.log("Wiping used_parts...");
    const { error: err2 } = await supabaseAdmin.from('used_parts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err2) console.error("Warning/Error wiping used_parts:", err2.message);

    console.log("Wiping inspection_reports...");
    const { error: err3 } = await supabaseAdmin.from('inspection_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err3) console.error("Warning/Error wiping inspection_reports:", err3.message);

    console.log("Wiping vehicles...");
    const { error: err4 } = await supabaseAdmin.from('vehicles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err4) console.error("Warning/Error wiping vehicles:", err4.message);

    console.log("Wiping clients...");
    const { error: err5 } = await supabaseAdmin.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err5) console.error("Warning/Error wiping clients:", err5.message);

    console.log("Wiping employees...");
    const { error: err6 } = await supabaseAdmin.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (err6) console.error("Warning/Error wiping employees:", err6.message);

    // 2. Clear all old Auth Users
    console.log("Fetching and deleting all users in auth.users...");
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

    // 3. Seed user "عباس طالب" (abbas)
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
        console.error("❌ Failed to create auth user abbas:", abbasAuthErr.message);
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
        console.error("❌ Failed to insert employee record for abbas:", abbasEmpErr.message);
        // Rollback auth
        await supabaseAdmin.auth.admin.deleteUser(abbasAuth.user.id);
        process.exit(1);
    }
    console.log("✅ Created عباس طالب account successfully!");

    // 4. Seed user "مجتبى المحاسب" (mujtaba)
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
        console.error("❌ Failed to create auth user mujtaba:", mujtabaAuthErr.message);
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
        console.error("❌ Failed to insert employee record for mujtaba:", mujtabaEmpErr.message);
        // Rollback auth
        await supabaseAdmin.auth.admin.deleteUser(mujtabaAuth.user.id);
        process.exit(1);
    }
    console.log("✅ Created مجتبى المحاسب account successfully!");

    console.log("\n⭐️ DATABASE WIPE, MIGRATION, AND SEEDING COMPLETED SUCCESSFULLY! ⭐️");
}

runWipeAndSetup();
