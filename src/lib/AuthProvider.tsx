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
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    employeeRole: null,
    employeeName: null,
    loading: true,
    signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [employeeRole, setEmployeeRole] = useState<UserRole | null>(null);
    const [employeeName, setEmployeeName] = useState<string | null>(null);
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
                .select("role, name")
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

        const init = async () => {
            try {
                setDebugMsg("طلب جلسة Supabase...");
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    setDebugError(`getSession error: ${error.message}`);
                }

                if (isMounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    if (!session?.user) setLoading(false);
                }
            } catch (err: any) {
                const errMsg = `Auth init exception: ${err?.message || String(err)}`;
                console.error(errMsg);
                if (isMounted) setDebugError(errMsg);
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
        await supabase.auth.signOut();
    };

    const handleEmergencyReset = async () => {
        try {
            // Force clear corrupted state that causes hangs after tab minimize
            await supabase.auth.signOut({ scope: 'local' });
            localStorage.clear();
            sessionStorage.clear();
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
        <AuthContext.Provider value={{ user, session, employeeRole, employeeName, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
