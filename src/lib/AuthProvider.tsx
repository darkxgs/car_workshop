"use client";

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { UserRole } from "@/lib/types";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    employeeRole: UserRole | null;
    employeeName: string | null;
    employeeBranchId: string | null;
    employeeId: string | null;
    permissionDashboard: boolean | null;
    permissionReception: boolean | null;
    permissionWorkOrders: boolean | null;
    permissionCustomers: boolean | null;
    permissionReports: boolean | null;
    permissionEmployees: boolean | null;
    loading: boolean;
    signOut: () => Promise<void>;
    setEmployeeBranchId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    employeeRole: null,
    employeeName: null,
    employeeBranchId: null,
    employeeId: null,
    permissionDashboard: null,
    permissionReception: null,
    permissionWorkOrders: null,
    permissionCustomers: null,
    permissionReports: null,
    permissionEmployees: null,
    loading: true,
    signOut: async () => {},
    setEmployeeBranchId: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [employeeRole, setEmployeeRole] = useState<UserRole | null>(null);
    const [employeeName, setEmployeeName] = useState<string | null>(null);
    const [employeeBranchId, setRawBranchId] = useState<string | null>(null);
    const [employeeId, setEmployeeId] = useState<string | null>(null);

    const setEmployeeBranchId = (id: string | null) => {
        setRawBranchId(id);
        if (typeof window !== "undefined") {
            if (id === null || id === undefined) {
                localStorage.removeItem("sticky_employee_branch_id");
            } else {
                localStorage.setItem("sticky_employee_branch_id", id);
            }
        }
    };
    const [permissionDashboard, setPermissionDashboard] = useState<boolean | null>(null);
    const [permissionReception, setPermissionReception] = useState<boolean | null>(null);
    const [permissionWorkOrders, setPermissionWorkOrders] = useState<boolean | null>(null);
    const [permissionCustomers, setPermissionCustomers] = useState<boolean | null>(null);
    const [permissionReports, setPermissionReports] = useState<boolean | null>(null);
    const [permissionEmployees, setPermissionEmployees] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [timedOut, setTimedOut] = useState(false);
    const [debugMsg, setDebugMsg] = useState("بدأ التحقق...");
    const [debugError, setDebugError] = useState<string | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const pathnameRef = useRef(pathname);
    const initialized = useRef(false);
    pathnameRef.current = pathname;

    const fetchRole = async (userId: string): Promise<UserRole | null> => {
        try {
            setDebugMsg(`جلب صلاحيات المستخدم: ${userId}`);
            
            // Protect against Supabase indefinite hangs (token refresh deadlock)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const { data, error } = await supabase
                .from("employees")
                .select("id, role, name, branch_id, permission_dashboard, permission_reception, permission_work_orders, permission_customers, permission_reports, permission_employees")
                .eq("auth_id", userId)
                .limit(1)
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);

            if (error) {
                const errMsg = `fetchRole error: ${error.message} (${error.code})`;
                console.error(errMsg);
                setDebugError(errMsg);
                return null;
            }

            if (!data || data.length === 0) {
                setDebugError(`fetchRole: no employee record for auth_id: ${userId}`);
                return null;
            }

            setDebugMsg(`تم تحديد الصلاحية: ${data[0].role}`);
            
            // Set name manually inside fetch since we have the data
            setEmployeeName(data[0].name);
            const userRole = data[0].role as UserRole;
            let finalBranchId = data[0].branch_id;
            
            if (userRole === 'Owner' || userRole === 'Admin') {
                if (typeof window !== 'undefined') {
                    const sticky = localStorage.getItem("sticky_employee_branch_id");
                    if (sticky !== null) {
                        finalBranchId = sticky === "" ? "" : sticky;
                    }
                }
            }
            setRawBranchId(finalBranchId);
            setEmployeeId(data[0].id);
            
            setPermissionDashboard(data[0].permission_dashboard);
            setPermissionReception(data[0].permission_reception);
            setPermissionWorkOrders(data[0].permission_work_orders);
            setPermissionCustomers(data[0].permission_customers);
            setPermissionReports(data[0].permission_reports);
            setPermissionEmployees(data[0].permission_employees);

            return data[0].role as UserRole;
        } catch (e: any) {
            if (e.name === 'AbortError') {
                const errMsg = "fetchRole timeout: فشل الاتصال بقاعدة البيانات (انتهى وقت الطلب). جرب مسح ملفات تعريف الارتباط أو تحديث الصفحة.";
                console.error(errMsg);
                setDebugError(errMsg);
                return null;
            }
            const errMsg = `fetchRole exception: ${e.message || String(e)}`;
            console.error(errMsg);
            setDebugError(errMsg);
            return null;
        }
    };

    const redirect = useCallback((activeSession: Session | null) => {
        const current = pathnameRef.current;
        if (!activeSession && current !== "/login") {
            router.push("/login");
        } else if (activeSession && current === "/login") {
            router.push("/");
        }
    }, [router]);

    // 1. First effect: Initialize fetch & listen to purely synchronous Auth changes
    useEffect(() => {
        let isMounted = true;

        // Transient failures (Web-Locks contention or the customFetch 10s timeout on slow
        // networks) must not hard-crash the app with the fatal screen — retry, then degrade
        // to the login page instead.
        const isTransientAuthError = (e: any) => {
            const m = (e?.message || String(e) || "").toLowerCase();
            return m.includes("lock") || m.includes("stole") || m.includes("timeout") ||
                m.includes("freeze") || m.includes("acquire") || m.includes("network") || m.includes("fetch");
        };

        const init = async () => {
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    setDebugMsg(attempt === 0 ? "طلب جلسة Supabase..." : `إعادة محاولة الاتصال (${attempt})...`);
                    const { data: { session }, error } = await supabase.auth.getSession();

                    if (error) {
                        if (error.message?.includes("Refresh Token") || error.message?.includes("not found") || error.status === 400) {
                            console.warn("Outdated session detected. Resetting local auth state and clearing cookies.");
                            try {
                                await supabase.auth.signOut({ scope: 'local' });
                            } catch {}
                            localStorage.clear();
                            sessionStorage.clear();
                            if (typeof document !== "undefined") {
                                document.cookie.split(";").forEach(c => {
                                    const name = c.trim().split("=")[0];
                                    if (name.includes("auth-token") || name.startsWith("sb-")) {
                                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
                                    }
                                });
                            }
                            if (isMounted) {
                                setSession(null);
                                setUser(null);
                                setLoading(false);
                                router.push("/login");
                            }
                            return;
                        }
                        // Any other getSession error is non-fatal: log and continue with whatever we have.
                        console.warn("getSession error:", error.message);
                    }

                    if (isMounted) {
                        setSession(session);
                        setUser(session?.user ?? null);
                        if (!session?.user) setLoading(false);
                    }
                    return; // success
                } catch (err: any) {
                    console.error(`Auth init attempt ${attempt + 1} failed:`, err?.message || err);
                    if (isTransientAuthError(err) && attempt < 2) {
                        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                        continue; // retry
                    }
                    if (isMounted) {
                        if (isTransientAuthError(err)) {
                            // Degrade gracefully instead of the fatal screen: treat as signed
                            // out and send to login; a reload picks up the session cleanly.
                            setSession(null);
                            setUser(null);
                            setLoading(false);
                            redirect(null);
                        } else {
                            setDebugError(`Auth init exception: ${err?.message || String(err)}`);
                        }
                    }
                    return;
                }
            }
        };

        init();

        // ONLY DO SYNCHRONOUS STATE UPDATES HERE!
        // Calling Supabase DB inside onAuthStateChange causes an infinite deadlock!
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, newSession) => {
                if (!isMounted) return;
                setSession(newSession);
                setUser(newSession?.user ?? null);
                if (!newSession?.user) {
                    setEmployeeRole(null);
                    setEmployeeName(null);
                    setRawBranchId(null);
                    setEmployeeId(null);
                    setPermissionDashboard(null);
                    setPermissionReception(null);
                    setPermissionWorkOrders(null);
                    setPermissionCustomers(null);
                    setPermissionReports(null);
                    setPermissionEmployees(null);
                    setLoading(false);
                    redirect(null);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 2. Second effect: Reacts to User ID changes to safely fetch Role without deadlocking Auth
    useEffect(() => {
        let isMounted = true;
        
        const loadRole = async () => {
            if (!user) return;
            try {
                setDebugMsg("جلب صلاحيات المستخدم...");
                const role = await fetchRole(user.id);
                if (isMounted) {
                    setEmployeeRole(role);
                    setLoading(false);
                    redirect(session);
                }
            } catch (err) {
                console.error(err);
                if (isMounted) setLoading(false);
            }
        };

        loadRole();

        return () => {
            isMounted = false;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]); // Only re-run if the actual user ID changes

    // 3. Watchdog fallback
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (loading && !debugError) {
                setTimedOut(true);
            }
        }, 12000);
        return () => clearTimeout(timeoutId);
    }, [loading, debugError]);

    const signOut = async () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem("sticky_employee_branch_id");
        }
        await supabase.auth.signOut();
    };

    const handleEmergencyReset = async () => {
        try {
            // Force clear corrupted state that causes hangs after tab minimize
            await supabase.auth.signOut({ scope: 'local' });
            localStorage.clear();
            sessionStorage.clear();
            if (typeof document !== "undefined") {
                document.cookie.split(";").forEach(c => {
                    const name = c.trim().split("=")[0];
                    if (name.includes("auth-token") || name.startsWith("sb-")) {
                        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
                    }
                });
            }
        } catch (e) {
            console.error("Emergency clear failed", e);
        } finally {
            window.location.reload();
        }
    };

    if (loading || debugError) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center p-4">
                <div className="flex flex-col items-center justify-center gap-5 max-w-lg w-full bg-card/50 p-8 rounded-3xl border border-border">
                    {debugError ? (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                                <RefreshCw className="text-rose-400" size={28} />
                            </div>
                            <div className="text-center">
                                <p className="text-rose-500 font-bold mb-2">حدث خطأ أثناء الاتصال</p>
                                <div className="bg-muted/80 border border-border p-4 rounded-xl text-left text-xs text-muted-foreground font-mono mb-6 overflow-auto max-h-40 break-words">
                                    {debugError}
                                </div>
                                <button
                                    onClick={handleEmergencyReset}
                                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 mx-auto"
                                >
                                    <RefreshCw size={16} />
                                    تحديث الصفحة (ومسح الذاكرة)
                                </button>
                            </div>
                        </>
                    ) : timedOut ? (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                                <RefreshCw className="text-orange-400" size={28} />
                            </div>
                            <div className="text-center">
                                <p className="text-foreground font-bold mb-1">استغرق التحميل وقتاً طويلاً</p>
                                <p className="text-muted-foreground text-sm mb-4">النظام عالق في المرحلة التالية:</p>
                                <div className="bg-muted/80 border border-border py-2 px-4 rounded-lg text-emerald-400 font-mono text-sm mb-6 inline-block">
                                    {debugMsg}
                                </div>
                                <button
                                    onClick={handleEmergencyReset}
                                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 mx-auto"
                                >
                                    <RefreshCw size={16} />
                                    تحديث الصفحة (ومسح الذاكرة)
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Loader2 className="animate-spin text-emerald-500 w-12 h-12" />
                            <div className="text-center space-y-2">
                                <p className="text-foreground font-bold">جاري تشغيل النظام...</p>
                                <p className="text-emerald-500 text-sm font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                    {debugMsg}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{
            user, session, employeeRole, employeeName, employeeBranchId, employeeId,
            permissionDashboard, permissionReception, permissionWorkOrders,
            permissionCustomers, permissionReports, permissionEmployees,
            loading, signOut, setEmployeeBranchId
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
