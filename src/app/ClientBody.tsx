"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/lib/AuthProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { CurrencyProvider } from "@/lib/CurrencyProvider";
import { usePathname } from "next/navigation";
import GlobalRealtimeProvider from "@/components/GlobalRealtimeProvider";

export default function ClientBody({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";
    const isPrintPage = pathname.startsWith("/print/");

    useEffect(() => {
        document.body.className = "antialiased";
    }, []);

    // Print pages: completely clean white shell — no sidebar, no dark mode, no providers
    if (isPrintPage) {
        return (
            <div style={{ background: "white", minHeight: "100vh" }}>
                {children}
            </div>
        );
    }

    return (
        <LanguageProvider>
            <CurrencyProvider>
                <AuthProvider>
                    <GlobalRealtimeProvider />
                    <div className={`min-h-screen pattern-bg font-ibm text-foreground print:bg-white print:text-black ${isLoginPage ? "flex flex-col items-center justify-center p-4 bg-background" : ""}`}>
                        {!isLoginPage && <Sidebar />}
                        <main className={isLoginPage ? "w-full max-w-md" : "min-h-screen transition-all duration-300 lg:pr-64 pt-16 lg:pt-0 print:pr-0 print:pt-0"}>
                            {children}
                        </main>
                    </div>
                </AuthProvider>
            </CurrencyProvider>
        </LanguageProvider>
    );
}
