"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/lib/AuthProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { CurrencyProvider } from "@/lib/CurrencyProvider";
import { usePathname } from "next/navigation";

export default function ClientBody({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    useEffect(() => {
        document.body.className = "antialiased";
    }, []);

    return (
        <LanguageProvider>
            <CurrencyProvider>
                <AuthProvider>
                    <div className={`min-h-screen pattern-bg font-ibm text-emerald-50 ${isLoginPage ? "flex flex-col items-center justify-center p-4 bg-[#050505]" : ""}`}>
                        {!isLoginPage && <Sidebar />}
                        <main className={isLoginPage ? "w-full max-w-md" : "min-h-screen transition-all duration-300 lg:pr-64 pt-16 lg:pt-0"}>
                            {children}
                        </main>
                    </div>
                </AuthProvider>
            </CurrencyProvider>
        </LanguageProvider>
    );
}
