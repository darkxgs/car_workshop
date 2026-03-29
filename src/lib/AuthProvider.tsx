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
    const router = useRouter();
    const pathname = usePathname();
    const pathnameRef = useRef(pathname);
    const initialized = useRef(false);
    pathnameRef.current = pathname;

    const fetchRole = async (userId: string): Promise<UserRole | null> => {
        try {
            const { data } = await supabase
                .from("employees")
                .select("role")
                .eq("auth_id", userId)
                .maybeSingle();
            return (data?.role as UserRole) ?? null;
        } catch {
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
                // Primary: getSession is reliable in all environments
                const { data: { session } } = await supabase.auth.getSession();
                if (!isMounted) return;
                await handleSession(session);
                redirect(session);
            } catch (err) {
                console.error("Auth init error:", err);
            } finally {
                if (isMounted) {
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center">
                <div className="flex flex-col items-center gap-5">
                    {timedOut ? (
                        <>
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                                <RefreshCw className="text-rose-400" size={28} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-bold mb-1">استغرق التحميل وقتاً طويلاً</p>
                                <p className="text-slate-500 text-sm mb-4">تحقق من اتصالك بالإنترنت ثم أعد المحاولة</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors flex items-center gap-2 mx-auto"
                                >
                                    <RefreshCw size={16} />
                                    إعادة المحاولة
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Loader2 className="animate-spin text-rose-500 w-10 h-10" />
                            <p className="text-slate-500 text-sm font-medium">جاري التحقق من الهوية...</p>
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
