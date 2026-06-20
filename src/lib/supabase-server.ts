import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database, UserRole } from "./types";

// Roles allowed to manage other user accounts.
const ADMIN_ROLES: UserRole[] = ["Owner", "Admin"];

/**
 * Cookie-based Supabase client for use in Server Components, Server Actions and
 * Route Handlers. It reads the caller's session from the request cookies, so it
 * is subject to RLS and represents the *actual logged-in user* — never use the
 * anon client to make trust decisions without first validating with getUser().
 */
export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // setAll can be called from a Server Component, where writing
                        // cookies is not allowed. Safe to ignore — the session refresh
                        // will be persisted on the next request that can write cookies.
                    }
                },
            },
        }
    );
}

/** Build a service-role admin client (bypasses RLS). Server-only. */
function createSupabaseAdminClient(): SupabaseClient<Database> | null {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return null;

    return createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export type AdminGuardResult =
    | { ok: true; supabaseAdmin: SupabaseClient<Database>; userId: string; role: UserRole }
    | { ok: false; error: string };

/**
 * Authorization gate for privileged server actions.
 *
 * 1. Identifies the caller from their session cookie. `getUser()` validates the
 *    JWT against the Supabase auth server, so it cannot be spoofed by a forged
 *    cookie.
 * 2. Looks the caller up in the `employees` table and confirms their role is
 *    permitted to manage accounts.
 *
 * Returns the elevated (service-role) client only when both checks pass, so the
 * caller physically cannot reach the privileged client otherwise.
 */
export async function requireAdmin(): Promise<AdminGuardResult> {
    const supabaseAdmin = createSupabaseAdminClient();
    if (!supabaseAdmin) {
        return { ok: false, error: "Missing Supabase Service Role configuration." };
    }

    const serverClient = await createSupabaseServerClient();
    const {
        data: { user },
        error: userError,
    } = await serverClient.auth.getUser();

    if (userError || !user) {
        return { ok: false, error: "Unauthorized: no active session." };
    }

    const { data: employee, error: roleError } = await supabaseAdmin
        .from("employees")
        .select("role")
        .eq("auth_id", user.id)
        .limit(1)
        .maybeSingle();

    if (roleError) {
        return { ok: false, error: roleError.message };
    }
    if (!employee || !ADMIN_ROLES.includes(employee.role)) {
        return { ok: false, error: "Forbidden: admin privileges required." };
    }

    return { ok: true, supabaseAdmin, userId: user.id, role: employee.role };
}
