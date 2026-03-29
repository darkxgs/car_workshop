"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { UserRole } from "@/lib/types";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    employeeRole: UserRole | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    employeeRole: null,
    loading: true,
    signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [employeeRole, setEmployeeRole] = useState<UserRole | null>(null);
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
                .select("role")
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

    const handleSession = async (session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
            const role = await fetchRole(session.user.id);
            setEmployeeRole(role);
        } else {
            setEmployeeRole(null);
        }
    };

    const redirect = (session: Session | null) => {
        const current = pathnameRef.current;
        if (!session && current !== "/login") {
            router.push("/login");
        } else if (session && current === "/login") {
            router.push("/");
        }
    };

    useEffect(() => {
        let isMounted = true;

        // Show retry button after 10s if still loading
        const timeoutId = setTimeout(() => {
            if (isMounted && !initialized.current) {
                setTimedOut(true);
            }
        }, 10000);

        const init = async () => {
            try {
                setDebugMsg("طلب جلسة Supabase...");
                const { data: { session }, error } = await supabase.auth.getSession();
                
                if (error) {
                    setDebugError(`getSession error: ${error.message}`);
                }

                if (!isMounted) return;
                
                setDebugMsg("معالجة الجلسة...");
                await handleSession(session);
                
                setDebugMsg("توجيه المسار...");
                redirect(session);
            } catch (err: any) {
                const errMsg = `Auth init exception: ${err?.message || String(err)}`;
                console.error(errMsg);
                setDebugError(errMsg);
            } finally {
                if (isMounted) {
                    setDebugMsg("اكتمل التحميل");
                    initialized.current = true;
                    clearTimeout(timeoutId);
                    setLoading(false);
                    setTimedOut(false);
                }
            }
        };

        init();

        // Secondary: listen for sign-in / sign-out events AFTER initial load
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Skip INITIAL_SESSION — already handled by getSession() above
                if (event === "INITIAL_SESSION") return;
                
                if (!isMounted) return;

                // When returning to a tab, Supabase silently refreshes the token.
                // We DO NOT want to re-fetch the user's role and hit a network deadlock.
                // Just silently update the session object and exit.
                if (event === "TOKEN_REFRESHED") {
                    setSession(session);
                    return;
                }

                await handleSession(session);
                redirect(session);
            }
        );

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
                <div className="flex flex-col items-center justify-center gap-5 max-w-lg w-full bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
                    {debugError ? (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                                <RefreshCw className="text-rose-400" size={28} />
                            </div>
                            <div className="text-center">
                                <p className="text-rose-500 font-bold mb-2">حدث خطأ أثناء الاتصال</p>
                                <div className="bg-black/50 border border-slate-800 p-4 rounded-xl text-left text-xs text-slate-300 font-mono mb-6 overflow-auto max-h-40 break-words">
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
                                <p className="text-white font-bold mb-1">استغرق التحميل وقتاً طويلاً</p>
                                <p className="text-slate-400 text-sm mb-4">النظام عالق في المرحلة التالية:</p>
                                <div className="bg-black/50 border border-slate-800 py-2 px-4 rounded-lg text-emerald-400 font-mono text-sm mb-6 inline-block">
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
                                <p className="text-white font-bold">جاري تشغيل النظام...</p>
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
        <AuthContext.Provider value={{ user, session, employeeRole, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
