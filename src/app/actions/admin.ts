"use server";

import { UserRole } from "@/lib/types";
import { requireAdmin, requireUserManager } from "@/lib/supabase-server";

// Roles a non-admin user-manager may neither grant nor touch.
const PRIVILEGED_ROLES: UserRole[] = ["Owner", "Admin"];

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
    // SECURITY: server actions are public POST endpoints — verify the caller may
    // manage users before touching the service-role client (which bypasses RLS).
    const guard = await requireUserManager();
    if (!guard.ok) return { success: false, error: guard.error };
    const { supabaseAdmin, isAdmin } = guard;

    // A user-manager who isn't Owner/Admin cannot mint an Owner/Admin account,
    // which would otherwise turn the permission flag into a self-promotion path.
    if (!isAdmin && PRIVILEGED_ROLES.includes(formData.role)) {
        return { success: false, error: "لا يمكنك إنشاء حساب بصلاحية مالك أو مدير نظام." };
    }

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
    } catch (e: unknown) {
        console.error("Critical Exception:", e);
        return { success: false, error: e instanceof Error ? e.message : "An unexpected error occurred." };
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
    const guard = await requireUserManager();
    if (!guard.ok) return { success: false, error: guard.error };
    const { supabaseAdmin, isAdmin } = guard;

    if (!isAdmin) {
        // Non-admin managers may not edit an Owner/Admin account (that would let
        // them reset the owner's password) nor promote anyone into those roles.
        const { data: target } = await supabaseAdmin
            .from("employees")
            .select("role")
            .eq("auth_id", authId)
            .maybeSingle();

        if (target && PRIVILEGED_ROLES.includes(target.role)) {
            return { success: false, error: "لا يمكنك تعديل حساب المالك أو مدير النظام." };
        }
        if (PRIVILEGED_ROLES.includes(formData.role)) {
            return { success: false, error: "لا يمكنك منح صلاحية مالك أو مدير نظام." };
        }
    }

    try {
        const cleanUsername = formData.username.trim().toLowerCase();
        const dummyEmail = `${cleanUsername}@workshop.local`;

        // 1. Update Auth User if password is provided
        const updatePayload: {
            email: string;
            user_metadata: { name: string };
            password?: string;
        } = {
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
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : "An unexpected error occurred." };
    }
}

// Admin Server Action to delete an employee
export async function deleteEmployeeAccount(authId: string) {
    const guard = await requireUserManager();
    if (!guard.ok) return { success: false, error: guard.error };
    const { supabaseAdmin, userId, isAdmin } = guard;

    // Guard against an admin deleting their own account and locking themselves out.
    if (authId === userId) {
        return { success: false, error: "لا يمكنك حذف حسابك الشخصي." };
    }

    if (!isAdmin) {
        const { data: target } = await supabaseAdmin
            .from("employees")
            .select("role")
            .eq("auth_id", authId)
            .maybeSingle();

        if (target && PRIVILEGED_ROLES.includes(target.role)) {
            return { success: false, error: "لا يمكنك حذف حساب المالك أو مدير النظام." };
        }
    }

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
    } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : "An unexpected error occurred." };
    }
}

// Admin Server Action to fetch auth user emails
export async function getAuthEmails() {
    const guard = await requireAdmin();
    if (!guard.ok) return { success: false, data: [] };
    const { supabaseAdmin } = guard;

    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) return { success: false, data: [] };

        return {
            success: true,
            data: users.map(u => ({ id: u.id, email: u.email }))
        };
    } catch {
        return { success: false, data: [] };
    }
}

// Admin Server Action to list app users (employees joined with their auth email).
// Replaces the previously-missing `/api/users` route handler.
export async function listAppUsers() {
    const guard = await requireUserManager();
    if (!guard.ok) return { success: false, error: guard.error, users: [] };
    const { supabaseAdmin } = guard;

    try {
        const { data: employees, error: empError } = await supabaseAdmin
            .from("employees")
            .select("id, auth_id, name, role")
            .order("name", { ascending: true });

        if (empError) return { success: false, error: empError.message, users: [] };

        const { data: { users: authUsers }, error: authError } =
            await supabaseAdmin.auth.admin.listUsers();
        if (authError) return { success: false, error: authError.message, users: [] };

        const emailByAuthId = new Map(authUsers.map(u => [u.id, u.email ?? ""]));

        const users = (employees ?? [])
            .filter(e => e.auth_id)
            .map(e => ({
                id: e.auth_id as string,
                employee_id: e.id,
                name: e.name,
                role: e.role,
                email: emailByAuthId.get(e.auth_id as string) ?? "",
            }));

        return { success: true, users };
    } catch (e: unknown) {
        return {
            success: false,
            error: e instanceof Error ? e.message : "An unexpected error occurred.",
            users: [],
        };
    }
}
