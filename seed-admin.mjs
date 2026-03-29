import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim();
    }
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE config");
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function seedAdmin() {
    const email = 'admin@autoworkshop.com';
    const password = 'admin'; // Testing password

    console.log(`Creating auth user: ${email}...`);
    
    // Check if user exists
    const { data: existingUserObj, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = existingUserObj?.users.find(u => u.email === email);
    
    if (!authUser) {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: 'الإدارة العليا' }
        });
        
        if (error) {
            console.error("Error creating user:", error);
            process.exit(1);
        }
        authUser = data.user;
        console.log("Created Auth user with ID:", authUser.id);
    } else {
        console.log("Auth user already exists with ID:", authUser.id);
        // Force update password to be absolutely sure
        await supabaseAdmin.auth.admin.updateUserById(authUser.id, { password: password });
    }

    console.log(`Checking public.employees...`);
    
    const { data: employeeData } = await supabaseAdmin
        .from('employees')
        .select('*')
        .eq('auth_id', authUser.id)
        .single();
        
    if (!employeeData) {
        const { error: insertError } = await supabaseAdmin
            .from('employees')
            .insert({
                auth_id: authUser.id,
                name: 'الإدارة العليا',
                role: 'Admin',
                phone: '000000000'
            });
            
        if (insertError) {
            console.error("Error inserting employee:", insertError);
            process.exit(1);
        }
        console.log("Created Employee Record as Admin!");
    } else {
        // Ensure role is Admin
        await supabaseAdmin.from('employees').update({ role: 'Admin' }).eq('id', employeeData.id);
        console.log("Employee Record already exists, forced role to Admin.");
    }
    
    console.log("Seed complete. You can now login with: admin@autoworkshop.com / admin");
}

seedAdmin();
