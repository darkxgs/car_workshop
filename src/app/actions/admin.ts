"use server";

import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@/lib/types";

// Admin Server Action to securely instantiate employees
export async function createEmployeeAccount(formData: {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    password?: string;
}) {
    // Requires Service Role Key because normal anon keys cannot create users on behalf of someone else.
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
        console.log("Starting Auth Creation for:", formData.email);
        // 1. Create Auth User
        const passwordToUse = formData.password || "workshop123";
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: formData.email,
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
                role: formData.role,
                phone: formData.phone
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
        phone: string;
        role: UserRole;
        password?: string;
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
        // 1. Update Auth User if password is provided
        if (formData.password && formData.password.trim().length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authId, {
                password: formData.password,
                user_metadata: { name: formData.name }
            });
            if (authError) return { success: false, error: authError.message };
        } else {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authId, {
                user_metadata: { name: formData.name }
            });
            if (authError) return { success: false, error: authError.message };
        }

        // 2. Update Employee Record
        const { error: dbError } = await supabaseAdmin
            .from('employees')
            .update({
                name: formData.name,
                role: formData.role,
                phone: formData.phone
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
