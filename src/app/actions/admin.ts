"use server";

import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@/lib/types";

// Admin Server Action to securely instantiate employees with usernames and permissions
export async function createEmployeeAccount(formData: {
    name: string;
    username: string;
    phone: string;
    role: UserRole;
    password?: string;
    branch_id?: string | null;
    permission_dashboard?: boolean;
    permission_reception?: boolean;
    permission_work_orders?: boolean;
    permission_customers?: boolean;
    permission_reports?: boolean;
    permission_employees?: boolean;
}) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return { success: false, error: "Missing Supabase Service Role configuration." };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    try {
        const cleanUsername = formData.username.trim().toLowerCase();
        const dummyEmail = `${cleanUsername}@workshop.local`;
        console.log("Starting Auth Creation for username:", cleanUsername, "email:", dummyEmail);

        // 1. Create Auth User
        const passwordToUse = formData.password || "workshop123";
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: dummyEmail,
            password: passwordToUse,
            email_confirm: true,
            user_metadata: { name: formData.name }
        });

        if (authError) {
            console.error("Auth Error:", authError);
            return { success: false, error: authError.message };
        }

        const authUser = authData.user;
        console.log("Auth User created successfully:", authUser.id);

        // 2. Create Employee Record
        const { error: dbError } = await supabaseAdmin
            .from('employees')
            .insert({
                auth_id: authUser.id,
                name: formData.name,
                username: cleanUsername,
                role: formData.role,
                phone: formData.phone,
                branch_id: formData.branch_id || null,
                permission_dashboard: formData.permission_dashboard ?? true,
                permission_reception: formData.permission_reception ?? true,
                permission_work_orders: formData.permission_work_orders ?? true,
                permission_customers: formData.permission_customers ?? true,
                permission_reports: formData.permission_reports ?? true,
                permission_employees: formData.permission_employees ?? false
            });

        if (dbError) {
            console.error("Database Insert Error:", dbError);
            // Rollback auth user creation if DB insert fails
            await supabaseAdmin.auth.admin.deleteUser(authUser.id);
            return { success: false, error: dbError.message };
        }

        console.log("Employee Record Created Successfully.");
        return { success: true };
    } catch (e: any) {
        console.error("Critical Exception:", e);
        return { success: false, error: e.message || "An unexpected error occurred." };
    }
}

// Admin Server Action to update an employee
export async function updateEmployeeAccount(
    authId: string,
    formData: {
        name: string;
        username: string;
        phone: string;
        role: UserRole;
        password?: string;
        branch_id?: string | null;
        permission_dashboard?: boolean;
        permission_reception?: boolean;
        permission_work_orders?: boolean;
        permission_customers?: boolean;
        permission_reports?: boolean;
        permission_employees?: boolean;
    }
) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return { success: false, error: "Missing Supabase Service Role configuration." };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const cleanUsername = formData.username.trim().toLowerCase();
        const dummyEmail = `${cleanUsername}@workshop.local`;

        // 1. Update Auth User if password is provided
        const updatePayload: any = {
            email: dummyEmail,
            user_metadata: { name: formData.name }
        };
        if (formData.password && formData.password.trim().length > 0) {
            updatePayload.password = formData.password;
        }

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authId, updatePayload);
        if (authError) return { success: false, error: authError.message };

        // 2. Update Employee Record
        const { error: dbError } = await supabaseAdmin
            .from('employees')
            .update({
                name: formData.name,
                username: cleanUsername,
                role: formData.role,
                phone: formData.phone,
                branch_id: formData.branch_id || null,
                permission_dashboard: formData.permission_dashboard ?? true,
                permission_reception: formData.permission_reception ?? true,
                permission_work_orders: formData.permission_work_orders ?? true,
                permission_customers: formData.permission_customers ?? true,
                permission_reports: formData.permission_reports ?? true,
                permission_employees: formData.permission_employees ?? false
            })
            .eq('auth_id', authId);

        if (dbError) return { success: false, error: dbError.message };

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "An unexpected error occurred." };
    }
}

// Admin Server Action to delete an employee
export async function deleteEmployeeAccount(authId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return { success: false, error: "Missing Supabase Service Role configuration." };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        // 1. Delete Employee Record
        const { error: dbError } = await supabaseAdmin
            .from('employees')
            .delete()
            .eq('auth_id', authId);

        if (dbError) return { success: false, error: dbError.message };

        // 2. Delete Auth User
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authId);
        
        if (authError) return { success: false, error: authError.message };

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || "An unexpected error occurred." };
    }
}

// Admin Server Action to fetch auth user emails
export async function getAuthEmails() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return { success: false, data: [] };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) return { success: false, data: [] };
        
        return { 
            success: true, 
            data: users.map(u => ({ id: u.id, email: u.email })) 
        };
    } catch (e: any) {
        return { success: false, data: [] };
    }
}
