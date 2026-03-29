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
    pathnameRef.current = pathname;

    const fetchRole = async (userId: string): Promise<void> => {
        try {
            const { data } = await supabase
                .from("employees")
                .select("role")
                .eq("auth_id", userId)
                .maybeSingle(); // maybeSingle won't throw if 0 rows returned
            if (data?.role) {
                setEmployeeRole(data.role as UserRole);
            }
        } catch (e) {
            console.error("Failed to fetch employee role:", e);
        }
    };

    useEffect(() => {
        let isMounted = true;

        // ⏱️ Timeout: show retry button after 10s (don't auto-reload — that causes loops)
        const timeoutId = setTimeout(() => {
            if (isMounted) setTimedOut(true);
        }, 10000);

        // Use onAuthStateChange as the single source of truth.
        // It fires INITIAL_SESSION immediately on mount, so we don't need getSession().
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;

                if (event === "INITIAL_SESSION") {
                    setSession(session);
                    setUser(session?.user ?? null);

                    if (session?.user) {
                        await fetchRole(session.user.id);
                    }

                    clearTimeout(timeoutId);
                    setTimedOut(false);
                    setLoading(false);

                    const current = pathnameRef.current;
                    if (!session && current !== "/login") {
                        router.push("/login");
                    } else if (session && current === "/login") {
                        router.push("/");
                    }

                } else if (event === "SIGNED_IN") {
                    setSession(session);
                    setUser(session?.user ?? null);
                    if (session?.user) await fetchRole(session.user.id);
                    if (pathnameRef.current === "/login") router.push("/");

                } else if (event === "SIGNED_OUT") {
                    setSession(null);
                    setUser(null);
                    setEmployeeRole(null);
                    if (pathnameRef.current !== "/login") router.push("/login");

                } else if (event === "TOKEN_REFRESHED" && session) {
                    setSession(session);
                }
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
