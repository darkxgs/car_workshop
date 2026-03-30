import type { Metadata } from "next";
import "./globals.css";
import ClientBody from "./ClientBody";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
    title: "نظام هندسة السيارات",
    description: "نظام متكامل لإدارة واستقبال وصيانة السيارات",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ar" dir="rtl">
            <body suppressHydrationWarning className="antialiased font-ibm">
                <ClientBody>{children}</ClientBody>
                <Analytics />
                <SpeedInsights />
            </body>
        </html>
    );
}
