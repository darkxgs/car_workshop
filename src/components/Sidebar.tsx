"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
    LayoutDashboard,
    Car,
    Wrench,
    PackageOpen,
    FileText,
    Settings,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    Building2,
    LogOut,
    Activity,
    Database,
    Wallet,
    Users,
    ClipboardList,
    Hammer,
    Clock,
    History,
    Truck,
    ShoppingCart,
    TrendingUp,
    CreditCard,
    UserCircle,
    CalendarDays,
    ShieldCheck,
    PieChart,
    Bell,
    FolderOpen,
    FileSpreadsheet,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const LOGO_BG = "bg-gradient-to-br from-rose-500 via-red-500 to-rose-700";
const ACCENT_BTN = "bg-rose-600 hover:bg-rose-500 text-white";

export function Sidebar() {
    const pathname = usePathname();
    const { signOut, employeeRole } = useAuth();
    const { t } = useLanguage();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // TODO: Update translations in dictionaries.ts, for now using hardcoded fallback or safe common keys
    // categorized navItems mimicking an ERP system like Odoo
    type NavCategory = {
        title: string;
        items: { href: string; label: string; icon: React.ReactNode; roles?: string[] }[];
    };
    
    const navCategories: NavCategory[] = [
        {
            title: "العمليات (Operations)",
            items: [
                { href: "/", label: t.common.dashboard || "لوحة التحكم", icon: <LayoutDashboard size={20} /> },
                { href: "/reception", label: "الاستقبال وأوامر العمل", icon: <ClipboardList size={20} /> },
                // { href: "/services", label: "الفحص والصيانة", icon: <Hammer size={20} />, roles: ["Owner", "Admin", "Supervisor"] },
                { href: "/work-orders", label: "ساحة الورشة (العمل الحي)", icon: <Wrench size={20} /> },
                // { href: "/status", label: "متابعة وإنجاز العمل", icon: <Activity size={20} /> }
            ]
        },
        {
            title: "العملاء والمركبات (CRM)",
            items: [
                { href: "/customers", label: "سجل العملاء والمركبات", icon: <Users size={20} /> },
            ]
        },
        {
            title: "التقارير والتصدير",
            items: [
                { href: "/reports", label: "الفواتير والتقارير (PDF)", icon: <FileText size={20} />, roles: ["Owner", "Admin", "Supervisor"] },
            ]
        },
        /* -- مخفية مؤقتاً لتبسيط النظام بناءً على طلب العميل --
        {
            title: "المالية والتحليلات (Finance & Analytics)",
            items: [
                { href: "/reports", label: "الفواتير (PDF)", icon: <FileText size={20} />, roles: ["Owner", "Admin", "Supervisor"] },
                { href: "/financial-reports", label: "السجلات والدفاتر (CSV)", icon: <FileText size={20} />, roles: ["Owner", "Admin", "Supervisor"] },
                { href: "/accounting", label: "النظام المحاسبي", icon: <Wallet size={20} />, roles: ["Owner", "Admin"] },
                { href: "/analytics", label: "تحليلات الأداء الحيّة", icon: <PieChart size={20} /> },
            ]
        },
        {
            title: "الموارد البشرية والإدارة (HR & Admin)",
            items: [
                { href: "/employees", label: "طاقم العمل", icon: <UserCircle size={20} />, roles: ["Owner", "Admin"] },
                { href: "/payroll", label: "مسير الرواتب", icon: <CalendarDays size={20} />, roles: ["Owner", "Admin"] },
                { href: "/alerts", label: "مركز التنبيهات والأحداث", icon: <Bell size={20} /> },
                { href: "/documents", label: "أرشيف المستندات والوثائق", icon: <FolderOpen size={20} /> },
            ]
        },
        {
            title: "النظام (System)",
            items: [
                { href: "/settings", label: t.common.settings || "الإعدادات", icon: <Settings size={20} />, roles: ["Owner", "Admin"] },
            ]
        }
        */
    ];

    const authorizedCategories = navCategories.map(category => ({
        ...category,
        items: category.items.filter(item => {
            if (!item.roles) return true;
            if (!employeeRole) return false;
            return item.roles.includes(employeeRole);
        })
    })).filter(category => category.items.length > 0);

    const sidebarBg = "bg-card/95 backdrop-blur-xl border-l border-border";

    return (
        <>
            {/* ── Mobile Header ── */}
            <header className={`print:hidden lg:hidden fixed top-0 right-0 left-0 h-16 ${sidebarBg} border-b border-border z-50 flex items-center justify-between px-4`}>
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${LOGO_BG} flex items-center justify-center shadow-lg shadow-rose-500/20`}>
                        <Building2 className="text-white" size={18} />
                    </div>
                    <div>
                        <span className="font-display font-bold text-sm text-foreground">هندسة السيارات</span>
                    </div>
                </div>
                <button
                    onClick={() => setIsMobileOpen(!isMobileOpen)}
                    className="p-2 hover:bg-slate-800/40 rounded-lg transition-colors text-muted-foreground"
                >
                    {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
            </header>

            {/* ── Mobile Overlay ── */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-card/80 backdrop-blur-sm z-40"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* ── Mobile Drawer ── */}
            <aside
                className={`print:hidden lg:hidden fixed top-16 right-0 h-[calc(100vh-4rem)] ${sidebarBg} z-40 transition-transform duration-300 ease-in-out w-72 flex flex-col ${
                    isMobileOpen ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <nav className="flex-1 p-3 mt-2 overflow-y-auto overflow-x-hidden">
                    {authorizedCategories.map((category, idx) => (
                        <div key={idx} className="mb-6 last:mb-0">
                            <h3 className="px-3 mb-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                {category.title}
                            </h3>
                            <div className="space-y-1">
                                {category.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMobileOpen(false)}
                                            className={`sidebar-item ${isActive ? "active" : ""}`}
                                        >
                                            <span className={isActive ? "text-rose-400" : "text-muted-foreground"}>
                                                {item.icon}
                                            </span>
                                            <span className={`font-medium text-sm ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                                                {item.label}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
                <div className="p-3 border-t border-border space-y-2">
                    <ThemeToggle />
                    <button
                        onClick={() => signOut()}
                        className="sidebar-item w-full text-rose-500 hover:bg-rose-500/10 justify-start"
                    >
                        <LogOut size={20} />
                        <span className="font-medium text-sm ml-2">{t.common.logout}</span>
                    </button>
                </div>
            </aside>

            {/* ── Desktop Sidebar ── */}
            <aside
                className={`print:hidden hidden lg:flex flex-col fixed top-0 right-0 h-screen ${sidebarBg} z-40 transition-all duration-300 ${
                    isCollapsed ? "w-[72px]" : "w-64"
                }`}
            >
                {/* Logo */}
                <div className="h-[70px] flex items-center border-b border-border px-4 shrink-0">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-10 h-10 rounded-xl ${LOGO_BG} flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20`}>
                            <Building2 className="text-white" size={20} />
                        </div>
                        {!isCollapsed && (
                            <div className="overflow-hidden">
                                <h1 className="font-display font-bold text-foreground whitespace-nowrap text-sm leading-tight">هندسة السيارات</h1>
                                <p className="text-[10px] text-rose-400 whitespace-nowrap">إدارة الورشة المتكامل</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`absolute -left-3 top-[54px] w-6 h-6 ${ACCENT_BTN} rounded-full flex items-center justify-center shadow-md shadow-rose-500/30 transition-all`}
                >
                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                </button>

                {/* Nav */}
                <nav className="flex-1 p-3 mt-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {authorizedCategories.map((category, idx) => (
                        <div key={idx} className={`${isCollapsed ? "mb-2" : "mb-6"} last:mb-0`}>
                            {!isCollapsed ? (
                                <h3 className="px-3 mb-2 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                    {category.title}
                                </h3>
                            ) : (
                                idx !== 0 && <div className="h-px bg-muted/50 my-2 mx-2" />
                            )}
                            <div className="space-y-1">
                                {category.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            title={isCollapsed ? item.label : undefined}
                                            className={`sidebar-item ${isActive ? "active" : ""} ${isCollapsed ? "justify-center px-2" : ""}`}
                                        >
                                            <span className={isActive ? "text-rose-400" : "text-muted-foreground"}>
                                                {item.icon}
                                            </span>
                                            {!isCollapsed && (
                                                <span className={`font-medium text-sm ${isActive ? "text-foreground" : "text-muted-foreground"} whitespace-nowrap`}>
                                                    {item.label}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-3 shrink-0 border-t border-border space-y-2">
                    {!isCollapsed && <ThemeToggle />}
                    <button
                        onClick={() => signOut()}
                        title={isCollapsed ? t.common.logout : undefined}
                        className={`sidebar-item w-full text-rose-500 hover:bg-rose-500/10 ${isCollapsed ? "justify-center px-2" : "justify-start"}`}
                    >
                        <LogOut size={20} />
                        {!isCollapsed && <span className="font-medium text-sm ml-2">{t.common.logout}</span>}
                    </button>
                </div>
            </aside>
        </>
    );
}
