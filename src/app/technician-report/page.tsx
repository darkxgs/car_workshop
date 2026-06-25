"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { Wrench, Loader2, Car, ClipboardCheck, Users, Printer, ChevronLeft, Search } from "lucide-react";

type ReportRow = {
    id: string;
    report_number: number;
    status: string;
    created_at: string;
    selected_services: any[] | null;
    vehicles: { make: string; model: string; plate_number: string | null } | { make: string; model: string; plate_number: string | null }[] | null;
};

type OrderItem = {
    id: string;
    report_number: number;
    date: string;
    status: string;
    vehicle: string;
    services: number;
};

type TechGroup = {
    name: string;
    cars: number;
    services: number;
    completed: number;
    orders: OrderItem[];
};

function monthStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
}

// Maintenance work a technician did on a report: services flagged "يحتاج تغيير" + custom/free services.
function countServices(payload: any): number {
    if (!payload) return 0;
    let n = 0;
    if (payload.services && typeof payload.services === "object") {
        n += Object.values(payload.services).filter((v: any) => v && v.status === "يحتاج تغيير").length;
    }
    if (Array.isArray(payload.customServices)) n += payload.customServices.length;
    if (Array.isArray(payload.freeServices)) n += payload.freeServices.length;
    return n;
}

// A car may be worked by more than one technician, written as one field joined by
// + - / , ، & or "و" (e.g. "عباس عجل+حسن"). Split it so each technician is credited
// individually instead of creating a shared/combined profile.
function splitTechnicians(raw: any): string[] {
    if (!raw) return [];
    const parts = String(raw)
        .split(/\s*[+\-/،,&]\s*|\s+و\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
    return Array.from(new Set(parts)); // de-dupe within the same car
}

export default function TechnicianReportPage() {
    const { employeeRole, employeeBranchId, permissionReports, loading: authLoading } = useAuth();
    const isAuthorized = employeeRole === "Owner" || employeeRole === "Admin" || employeeRole === "Supervisor" || !!permissionReports;

    const [month, setMonth] = useState<string>(monthStr());
    const [rows, setRows] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTech, setSelectedTech] = useState<string | null>(null);
    const [techSearch, setTechSearch] = useState("");

    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");
    const branchName = branches.find((b) => b.id === selectedBranchId)?.name || "";

    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from("branches").select("id, name");
            if (data && data.length > 0) {
                setBranches(data);
                setSelectedBranchId(employeeBranchId || data[0].id);
            }
        };
        fetchBranches();
    }, [employeeBranchId]);

    useEffect(() => {
        if (authLoading || !isAuthorized) return;
        if (branches.length > 0 && !selectedBranchId) return;
        setSelectedTech(null);

        const fetchRows = async () => {
            setLoading(true);
            const [y, m] = month.split("-").map(Number);
            const monthStart = new Date(y, m - 1, 1);
            const monthEnd = new Date(y, m, 1);

            let query = supabase
                .from("inspection_reports")
                .select("id, report_number, status, created_at, selected_services, vehicles (make, model, plate_number)")
                .neq("order_type", "sale")
                .gte("created_at", monthStart.toISOString())
                .lt("created_at", monthEnd.toISOString())
                .order("created_at", { ascending: false });

            if (selectedBranchId) query = query.eq("branch_id", selectedBranchId);
            else if (employeeBranchId) query = query.eq("branch_id", employeeBranchId);

            const { data } = await query;
            setRows((data as any) || []);
            setLoading(false);
        };
        fetchRows();
    }, [month, selectedBranchId, employeeBranchId, authLoading, isAuthorized, branches.length]);

    const { groups, totalCars, totalServices } = useMemo(() => {
        const map = new Map<string, TechGroup>();
        let totalCars = 0;
        let totalServices = 0;
        for (const r of rows) {
            const payload = Array.isArray(r.selected_services) ? r.selected_services[0] : r.selected_services;
            const v = Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles;
            const sc = countServices(payload);
            // Totals are per actual car (a shared car is still one car / its services counted once).
            totalCars += 1;
            totalServices += sc;

            const techs = splitTechnicians(payload?.technicianName);
            const names = techs.length ? techs : ["غير محدد"];
            const order: OrderItem = {
                id: r.id,
                report_number: r.report_number,
                date: new Date(r.created_at).toLocaleDateString("ar-EG", { day: "2-digit", month: "2-digit" }),
                status: r.status,
                vehicle: v ? `${v.make || ""} ${v.model || ""}${v.plate_number ? ` (${v.plate_number})` : ""}`.trim() : "—",
                services: sc,
            };
            // Credit the car + its services to every technician who worked on it.
            for (const name of names) {
                let g = map.get(name);
                if (!g) {
                    g = { name, cars: 0, services: 0, completed: 0, orders: [] };
                    map.set(name, g);
                }
                g.cars += 1;
                g.services += sc;
                if (r.status === "تم الانتهاء") g.completed += 1;
                g.orders.push(order);
            }
        }
        const groups = Array.from(map.values()).sort((a, b) => b.cars - a.cars);
        return { groups, totalCars, totalServices };
    }, [rows]);

    const profile = selectedTech ? groups.find((g) => g.name === selectedTech) || null : null;
    const visibleGroups = useMemo(() => {
        const q = techSearch.trim().toLowerCase();
        return q ? groups.filter((g) => g.name.toLowerCase().includes(q)) : groups;
    }, [groups, techSearch]);

    if (authLoading) {
        return <div className="min-h-screen bg-[#08080d] flex items-center justify-center"><Loader2 className="animate-spin text-rose-500 w-12 h-12" /></div>;
    }
    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center p-4 text-center font-ibm" dir="rtl">
                <div className="glass-card p-8 rounded-3xl border border-rose-500/20 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-rose-500 mb-2">غير مصرح بالوصول</h2>
                    <p className="text-muted-foreground">ليس لديك صلاحية لعرض تقارير الفنيين.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in print:hidden">

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-border">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <Wrench className="text-rose-500" size={30} />
                            تقرير أداء الفنيين الشهري
                        </h1>
                        <p className="text-muted-foreground">اختر فنياً لعرض بروفايله الكامل — كل أوامر العمل والخدمات اللي اشتغلهن خلال الشهر</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {branches.length > 1 && (employeeRole === "Owner" || employeeRole === "Admin" || !employeeBranchId) && (
                            <select value={selectedBranchId} onChange={(e) => setSelectedBranchId(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-rose-500/50 cursor-pointer">
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                        <input type="month" value={month} onChange={(e) => setMonth(e.target.value || monthStr())} className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-rose-500/50" />
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center"><Loader2 className="animate-spin text-rose-500 w-10 h-10 mx-auto" /></div>
                ) : profile ? (
                    /* ---------- PROFILE VIEW ---------- */
                    <div className="space-y-6">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <button onClick={() => setSelectedTech(null)} className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-xl border border-border transition-all text-sm font-bold">
                                <ChevronLeft size={16} /> رجوع لقائمة الفنيين
                            </button>
                            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-rose-500/20">
                                <Printer size={16} /> طباعة البروفايل
                            </button>
                        </div>

                        <div className="glass-card p-6 rounded-3xl border border-border flex flex-col sm:flex-row sm:items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 text-2xl font-black">
                                {profile.name === "غير محدد" ? "؟" : profile.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-foreground">{profile.name === "غير محدد" ? "غير محدد (كروت بدون اسم فني)" : profile.name}</h2>
                                <p className="text-muted-foreground text-sm">{branchName} • {monthLabel(month)}</p>
                            </div>
                            <div className="flex gap-6">
                                <div className="text-center"><p className="text-3xl font-black text-blue-400">{profile.cars.toLocaleString()}</p><p className="text-xs text-muted-foreground">سيارة</p></div>
                                <div className="text-center"><p className="text-3xl font-black text-emerald-400">{profile.services.toLocaleString()}</p><p className="text-xs text-muted-foreground">خدمة</p></div>
                                <div className="text-center"><p className="text-3xl font-black text-foreground">{profile.completed.toLocaleString()}</p><p className="text-xs text-muted-foreground">منجزة</p></div>
                            </div>
                        </div>

                        <div className="glass-card rounded-3xl border border-border/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-muted/40 text-muted-foreground text-xs font-bold border-b border-border/50">
                                            <th className="p-4">رقم الكرت</th>
                                            <th className="p-4">التاريخ</th>
                                            <th className="p-4">المركبة</th>
                                            <th className="p-4">الحالة</th>
                                            <th className="p-4 text-center">عدد الخدمات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30 text-sm">
                                        {profile.orders.map((o) => (
                                            <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="p-4 font-mono font-bold text-rose-400">#{o.report_number}</td>
                                                <td className="p-4 text-muted-foreground font-mono">{o.date}</td>
                                                <td className="p-4 font-bold text-foreground">{o.vehicle}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${o.status === "تم الانتهاء" ? "bg-emerald-500/10 text-emerald-400" : o.status === "قيد العمل" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>{o.status}</span>
                                                </td>
                                                <td className="p-4 text-center font-bold text-emerald-400">{o.services.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ---------- LIST VIEW ---------- */
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="glass-card p-5 rounded-2xl border border-border flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0"><Users size={24} /></div>
                                <div><p className="text-2xl font-black text-foreground">{groups.filter((g) => g.name !== "غير محدد").length}</p><p className="text-sm text-muted-foreground">عدد الفنيين</p></div>
                            </div>
                            <div className="glass-card p-5 rounded-2xl border border-border flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><Car size={24} /></div>
                                <div><p className="text-2xl font-black text-foreground">{totalCars.toLocaleString()}</p><p className="text-sm text-muted-foreground">إجمالي السيارات</p></div>
                            </div>
                            <div className="glass-card p-5 rounded-2xl border border-border flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0"><ClipboardCheck size={24} /></div>
                                <div><p className="text-2xl font-black text-foreground">{totalServices.toLocaleString()}</p><p className="text-sm text-muted-foreground">إجمالي الخدمات</p></div>
                            </div>
                        </div>

                        <div className="relative">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={18} />
                            <input type="text" value={techSearch} onChange={(e) => setTechSearch(e.target.value)} placeholder="بحث عن فني بالاسم..." className="input-field w-full" style={{ paddingRight: "3rem" }} />
                        </div>

                        {visibleGroups.length === 0 ? (
                            <div className="glass-card p-20 text-center text-muted-foreground space-y-4 rounded-3xl border border-border/50">
                                <Wrench size={48} className="mx-auto text-muted-foreground/50" />
                                <p>{groups.length === 0 ? "لا توجد أوامر عمل في هذا الشهر." : "لا يوجد فني مطابق للبحث."}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {visibleGroups.map((g) => (
                                    <button key={g.name} onClick={() => setSelectedTech(g.name)} className="glass-card p-5 rounded-2xl border border-border hover:border-rose-500/40 transition-all text-right group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg font-black ${g.name === "غير محدد" ? "bg-amber-500/10 text-amber-400" : "bg-rose-500/10 text-rose-400"}`}>
                                                {g.name === "غير محدد" ? "؟" : g.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-foreground truncate group-hover:text-rose-400 transition-colors">{g.name === "غير محدد" ? "غير محدد" : g.name}</h3>
                                                {g.name === "غير محدد" && <p className="text-[10px] text-amber-400">كروت بدون اسم فني</p>}
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">السيارات: <span className="font-black text-blue-400">{g.cars.toLocaleString()}</span></span>
                                            <span className="text-muted-foreground">الخدمات: <span className="font-black text-emerald-400">{g.services.toLocaleString()}</span></span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ---------- PRINT LAYOUT (only on print) ---------- */}
            {profile && (
                <div className="hidden print:block text-black bg-white p-8" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                    <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-black">هندسة السيارات</h1>
                            <p className="text-sm">تقرير أداء فني — {branchName}</p>
                        </div>
                        <div className="text-left text-sm">
                            <p>الشهر: {monthLabel(month)}</p>
                            <p>تاريخ الطباعة: {new Date().toLocaleDateString("ar-EG")}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black">الفني: {profile.name === "غير محدد" ? "غير محدد" : profile.name}</h2>
                        <div className="flex gap-8 text-sm font-bold">
                            <span>السيارات: {profile.cars}</span>
                            <span>الخدمات: {profile.services}</span>
                            <span>المنجزة: {profile.completed}</span>
                        </div>
                    </div>

                    <table className="w-full text-right border-collapse text-sm">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="p-2 border border-gray-400">رقم الكرت</th>
                                <th className="p-2 border border-gray-400">التاريخ</th>
                                <th className="p-2 border border-gray-400">المركبة</th>
                                <th className="p-2 border border-gray-400">الحالة</th>
                                <th className="p-2 border border-gray-400">عدد الخدمات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profile.orders.map((o) => (
                                <tr key={o.id}>
                                    <td className="p-2 border border-gray-400 font-mono">#{o.report_number}</td>
                                    <td className="p-2 border border-gray-400">{o.date}</td>
                                    <td className="p-2 border border-gray-400">{o.vehicle}</td>
                                    <td className="p-2 border border-gray-400">{o.status}</td>
                                    <td className="p-2 border border-gray-400 text-center">{o.services}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
