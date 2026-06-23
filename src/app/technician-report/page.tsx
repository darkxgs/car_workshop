"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { Wrench, Loader2, Car, ClipboardCheck, Users, Printer, CalendarDays } from "lucide-react";

type ReportRow = {
    id: string;
    report_number: number;
    status: string;
    created_at: string;
    selected_services: any[] | null;
    vehicles: { make: string; model: string; plate_number: string | null } | { make: string; model: string; plate_number: string | null }[] | null;
};

type TechGroup = {
    name: string;
    cars: number;
    services: number;
    completed: number;
    vehicles: string[];
};

function todayStr() {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Count the maintenance work a technician actually did on a report:
// services flagged "يحتاج تغيير" + any custom/free services added.
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

export default function TechnicianReportPage() {
    const { employeeRole, employeeBranchId, permissionReports, loading: authLoading } = useAuth();
    const isAuthorized = employeeRole === "Owner" || employeeRole === "Admin" || employeeRole === "Supervisor" || !!permissionReports;

    const [date, setDate] = useState<string>(todayStr());
    const [rows, setRows] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(true);

    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

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

        const fetchRows = async () => {
            setLoading(true);
            // Local-day window on created_at (when the card was received).
            const dayStart = new Date(`${date}T00:00:00`);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            let query = supabase
                .from("inspection_reports")
                .select("id, report_number, status, created_at, selected_services, vehicles (make, model, plate_number)")
                .neq("order_type", "sale")
                .gte("created_at", dayStart.toISOString())
                .lt("created_at", dayEnd.toISOString())
                .order("created_at", { ascending: false });

            if (selectedBranchId) query = query.eq("branch_id", selectedBranchId);
            else if (employeeBranchId) query = query.eq("branch_id", employeeBranchId);

            const { data } = await query;
            setRows((data as any) || []);
            setLoading(false);
        };
        fetchRows();
    }, [date, selectedBranchId, employeeBranchId, authLoading, isAuthorized, branches.length]);

    const { groups, totalCars, totalServices } = useMemo(() => {
        const map = new Map<string, TechGroup>();
        for (const r of rows) {
            const payload = Array.isArray(r.selected_services) ? r.selected_services[0] : r.selected_services;
            const tech = ((payload?.technicianName as string) || "").trim() || "غير محدد";
            let g = map.get(tech);
            if (!g) {
                g = { name: tech, cars: 0, services: 0, completed: 0, vehicles: [] };
                map.set(tech, g);
            }
            g.cars += 1;
            g.services += countServices(payload);
            if (r.status === "تم الانتهاء") g.completed += 1;
            const v = Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles;
            if (v) g.vehicles.push(`${v.make || ""} ${v.model || ""}${v.plate_number ? ` (${v.plate_number})` : ""}`.trim());
        }
        const groups = Array.from(map.values()).sort((a, b) => b.cars - a.cars);
        const totalCars = groups.reduce((s, g) => s + g.cars, 0);
        const totalServices = groups.reduce((s, g) => s + g.services, 0);
        return { groups, totalCars, totalServices };
    }, [rows]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center">
                <Loader2 className="animate-spin text-rose-500 w-12 h-12" />
            </div>
        );
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
            <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-border print:border-black">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <Wrench className="text-rose-500" size={30} />
                            تقرير الفنيين اليومي
                        </h1>
                        <p className="text-muted-foreground">منو اشتغل وكم سيارة وكم خدمة — حسب تاريخ استلام الكرت</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 print:hidden">
                        {branches.length > 1 && (employeeRole === "Owner" || employeeRole === "Admin" || !employeeBranchId) && (
                            <select
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-rose-500/50 cursor-pointer"
                            >
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        )}
                        <div className="relative flex items-center">
                            <CalendarDays className="absolute right-3 text-muted-foreground pointer-events-none" size={16} />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value || todayStr())}
                                className="bg-card border border-border rounded-xl pr-9 pl-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-rose-500/50"
                            />
                        </div>
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all flex items-center gap-2 text-sm border border-border"
                        >
                            <Printer size={16} /> طباعة
                        </button>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="glass-card p-5 rounded-2xl border border-border flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0"><Users size={24} /></div>
                        <div>
                            <p className="text-2xl font-black text-foreground">{groups.filter(g => g.name !== "غير محدد").length}</p>
                            <p className="text-sm text-muted-foreground">عدد الفنيين</p>
                        </div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl border border-border flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0"><Car size={24} /></div>
                        <div>
                            <p className="text-2xl font-black text-foreground">{totalCars.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">إجمالي السيارات</p>
                        </div>
                    </div>
                    <div className="glass-card p-5 rounded-2xl border border-border flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0"><ClipboardCheck size={24} /></div>
                        <div>
                            <p className="text-2xl font-black text-foreground">{totalServices.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">إجمالي الخدمات</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="glass-card rounded-3xl border border-border/50 overflow-hidden">
                    {loading ? (
                        <div className="p-20 text-center"><Loader2 className="animate-spin text-rose-500 w-10 h-10 mx-auto" /></div>
                    ) : groups.length === 0 ? (
                        <div className="p-20 text-center text-muted-foreground space-y-4">
                            <Wrench size={48} className="mx-auto text-muted-foreground/50" />
                            <p>لا توجد أوامر عمل في هذا اليوم.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-muted/40 text-muted-foreground text-xs font-bold border-b border-border/50">
                                        <th className="p-4">الفني</th>
                                        <th className="p-4 text-center">عدد السيارات</th>
                                        <th className="p-4 text-center">عدد الخدمات</th>
                                        <th className="p-4 text-center">المنجزة</th>
                                        <th className="p-4">السيارات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30 text-sm">
                                    {groups.map((g) => (
                                        <tr key={g.name} className="hover:bg-muted/20 transition-colors">
                                            <td className="p-4 font-bold text-foreground">
                                                {g.name === "غير محدد"
                                                    ? <span className="text-amber-400">غير محدد <span className="text-[10px] font-normal">(لم يُكتب اسم الفني)</span></span>
                                                    : g.name}
                                            </td>
                                            <td className="p-4 text-center font-black text-blue-400 text-lg">{g.cars.toLocaleString()}</td>
                                            <td className="p-4 text-center font-bold text-emerald-400">{g.services.toLocaleString()}</td>
                                            <td className="p-4 text-center text-muted-foreground">{g.completed.toLocaleString()} / {g.cars.toLocaleString()}</td>
                                            <td className="p-4 text-muted-foreground text-xs max-w-md">{g.vehicles.join("، ")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
