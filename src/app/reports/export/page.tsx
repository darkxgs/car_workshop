"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download, RefreshCw, FileSpreadsheet, Search, Calendar, X } from "lucide-react";
import * as XLSX from "xlsx";

interface ReportRow {
    id: string;
    seq: number;
    report_number: number | null;
    created_at: string;
    client_name: string;
    client_phone: string;
    car_make: string;
    car_model: string;
    service_type: string;
    oil_type: string;
    oil_viscosity: string;
    oil_liters: string;
    extra_services: string;
    booklet: string;
    total_price: number;
    status: string;
}

const SERVICE_LABELS: Record<string, string> = {
    engineOil: "زيت المحرك", oilFilter: "فلتر زيت المحرك", airFilter: "فلتر الهواء",
    acFilter: "فلتر التبريد", brakeFluid: "زيت المكابح", coolant: "ماء الراديتر",
    battery: "البطارية", engineBelts: "قايش المحرك", brakePads: "دسكات السيارة",
    sparkPlugs: "شمعات الاحتراق", gearboxHydraulic: "هايدروليك الكير",
    wipers: "الماسحات", additives: "المضافات والمحسنات", maintenanceUnits: "حدات الصيانة",
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
    pending:     { label: "قيد الانتظار", cls: "bg-amber-900/30 text-amber-300 border-amber-800/40" },
    in_progress: { label: "قيد العمل",    cls: "bg-blue-900/30 text-blue-300 border-blue-800/40" },
    completed:   { label: "مكتمل",        cls: "bg-emerald-900/30 text-emerald-300 border-emerald-800/40" },
    cancelled:   { label: "ملغي",         cls: "bg-rose-900/30 text-rose-300 border-rose-800/40" },
};

export default function ExportPage() {
    const supabase = createClient();
    const [rows, setRows]       = useState<ReportRow[]>([]);
    const [filtered, setFiltered] = useState<ReportRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch]   = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo]   = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("inspection_reports")
            .select(`id, report_number, created_at, total_price, status, selected_services,
                     vehicles(make, model, clients(name, phone))`)
            .order("created_at", { ascending: false });

        if (error) { console.error(error); setLoading(false); return; }

        const mapped: ReportRow[] = (data || []).map((r: any, idx: number) => {
            const vehicle = Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles;
            const client  = vehicle ? (Array.isArray(vehicle.clients) ? vehicle.clients[0] : vehicle.clients) : null;

            const payload    = Array.isArray(r.selected_services) ? r.selected_services[0] : r.selected_services;
            const services   = payload?.services  || {};
            const customs    = payload?.customServices || [];
            const bookletObj = payload?.booklet   || {};

            const oilSvc  = services.engineOil || {};
            const oilType = oilSvc.details?.brand     || "";
            const oilVisc = oilSvc.details?.viscosity || "";
            const oilLiters = oilSvc.details?.liters  || "";

            const needChange = Object.entries(services as Record<string, any>)
                .filter(([, v]) => v?.status === "يحتاج تغيير")
                .map(([k]) => SERVICE_LABELS[k] || k);

            const customLabels = customs.filter((c: any) => c.label).map((c: any) => c.label);
            const bookletStr   = bookletObj.type
                ? `${bookletObj.type}${bookletObj.changes ? ` (${bookletObj.changes})` : ""}`
                : "";

            return {
                id: r.id, seq: idx + 1,
                report_number: r.report_number,
                created_at: r.created_at,
                client_name:  client?.name  || "—",
                client_phone: client?.phone || "—",
                car_make:  vehicle?.make  || "—",
                car_model: vehicle?.model || "—",
                service_type: needChange.join("، ") || "فحص",
                oil_type: oilType, oil_viscosity: oilVisc, oil_liters: oilLiters,
                extra_services: customLabels.join("، "),
                booklet: bookletStr,
                total_price: r.total_price || 0,
                status: r.status || "",
            };
        });

        setRows(mapped);
        setFiltered(mapped);
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        let result = rows;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(r =>
                r.client_name.toLowerCase().includes(q) ||
                r.client_phone.includes(q) ||
                r.car_make.toLowerCase().includes(q) ||
                r.car_model.toLowerCase().includes(q)
            );
        }
        if (dateFrom) result = result.filter(r => new Date(r.created_at) >= new Date(dateFrom));
        if (dateTo)   result = result.filter(r => new Date(r.created_at) <= new Date(dateTo + "T23:59:59"));
        if (statusFilter) result = result.filter(r => r.status === statusFilter);
        // re-number
        setFiltered(result.map((r, i) => ({ ...r, seq: i + 1 })));
    }, [search, dateFrom, dateTo, statusFilter, rows]);

    const clearFilters = () => { setSearch(""); setDateFrom(""); setDateTo(""); setStatusFilter(""); };
    const hasFilters   = search || dateFrom || dateTo || statusFilter;

    const exportExcel = () => {
        const wsData = [
            ["#", "اسم الزبون", "رقم الهاتف", "السيارة", "الموديل", "التاريخ",
             "نوع الخدمة", "نوع الزيت", "درجة اللزوجة", "عدد اللترات",
             "الخدمات الإضافية", "دفتر الزيت", "السعر (د.ع)", "الحالة"],
            ...filtered.map(r => [
                r.seq, r.client_name, r.client_phone, r.car_make, r.car_model,
                new Date(r.created_at).toLocaleDateString("ar-IQ"),
                r.service_type, r.oil_type, r.oil_viscosity, r.oil_liters,
                r.extra_services, r.booklet, r.total_price,
                STATUS_MAP[r.status]?.label || r.status,
            ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws["!cols"] = [
            {wch:5},{wch:22},{wch:16},{wch:14},{wch:14},{wch:14},
            {wch:28},{wch:18},{wch:14},{wch:10},{wch:28},{wch:14},{wch:12},{wch:12},
        ];
        // RTL sheet
        if (!ws["!opts"]) ws["!opts"] = {};
        (ws as any)["!opts"].RTL = true;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "تقارير الصيانة");
        XLSX.writeFile(wb, `workshop_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const totalRevenue = filtered.reduce((s, r) => s + r.total_price, 0);

    return (
        <div className="min-h-screen bg-background p-6 rtl" dir="rtl">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <FileSpreadsheet className="text-rose-400" size={32} />
                        تصدير بيانات الصيانة
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {filtered.length} سجل معروض · إجمالي الإيرادات:{" "}
                        <span className="text-emerald-400 font-bold">{totalRevenue.toLocaleString("ar-IQ")} د.ع</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchData}
                        className="p-2.5 rounded-xl border border-border hover:border-rose-500/40 text-muted-foreground hover:text-foreground transition-all"
                        title="تحديث">
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={exportExcel} disabled={filtered.length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/30">
                        <Download size={18} /> تصدير Excel
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 rounded-2xl border border-rose-900/20 mb-6">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <input type="text" placeholder="بحث بالاسم أو الهاتف أو السيارة..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="input-field pr-9 text-sm" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-muted-foreground shrink-0" />
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="input-field w-36 text-sm" title="من تاريخ" />
                        <span className="text-muted-foreground">—</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="input-field w-36 text-sm" title="إلى تاريخ" />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                        className="input-field w-40 text-sm">
                        <option value="">كل الحالات</option>
                        {Object.entries(STATUS_MAP).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                    {hasFilters && (
                        <button onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-xl hover:border-rose-500/40 transition-all">
                            <X size={14} /> مسح
                        </button>
                    )}
                </div>
            </div>

            {/* Summary badges */}
            <div className="flex flex-wrap gap-3 mb-5">
                {Object.entries(STATUS_MAP).map(([k, v]) => {
                    const count = filtered.filter(r => r.status === k).length;
                    return (
                        <button key={k} onClick={() => setStatusFilter(statusFilter === k ? "" : k)}
                            className={`px-4 py-1.5 rounded-full border text-xs font-bold transition-all ${statusFilter === k ? v.cls + " ring-1 ring-white/20" : "border-border text-muted-foreground hover:border-rose-500/40"}`}>
                            {v.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="glass-card rounded-2xl border border-rose-900/20 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <RefreshCw className="animate-spin text-rose-400" size={36} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">لا توجد بيانات مطابقة</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-rose-950/40 border-b border-rose-900/40">
                                    {["#", "اسم الزبون", "رقم الهاتف", "السيارة", "الموديل", "التاريخ",
                                      "نوع الخدمة", "نوع الزيت", "اللزوجة", "لترات",
                                      "الخدمات الإضافية", "دفتر الزيت", "السعر", "الحالة"]
                                        .map(h => (
                                            <th key={h} className="px-3 py-3 text-right text-xs font-bold text-rose-300 whitespace-nowrap">{h}</th>
                                        ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, i) => {
                                    const st = STATUS_MAP[r.status];
                                    return (
                                        <tr key={r.id} className={`border-b border-border/40 hover:bg-muted/20 transition-colors ${i % 2 === 1 ? "bg-muted/5" : ""}`}>
                                            <td className="px-3 py-2.5 font-mono text-muted-foreground text-xs">{r.seq}</td>
                                            <td className="px-3 py-2.5 font-bold text-foreground whitespace-nowrap">{r.client_name}</td>
                                            <td className="px-3 py-2.5 font-mono text-muted-foreground text-xs" dir="ltr">{r.client_phone}</td>
                                            <td className="px-3 py-2.5 text-foreground">{r.car_make}</td>
                                            <td className="px-3 py-2.5 text-muted-foreground">{r.car_model}</td>
                                            <td className="px-3 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                                                {new Date(r.created_at).toLocaleDateString("ar-IQ")}
                                            </td>
                                            <td className="px-3 py-2.5 max-w-[160px]">
                                                <span className="block truncate text-foreground" title={r.service_type}>{r.service_type || "—"}</span>
                                            </td>
                                            <td className="px-3 py-2.5 text-foreground whitespace-nowrap">{r.oil_type || "—"}</td>
                                            <td className="px-3 py-2.5 text-muted-foreground">{r.oil_viscosity || "—"}</td>
                                            <td className="px-3 py-2.5 text-muted-foreground text-center">{r.oil_liters || "—"}</td>
                                            <td className="px-3 py-2.5 max-w-[150px]">
                                                <span className="block truncate text-muted-foreground" title={r.extra_services}>{r.extra_services || "—"}</span>
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                {r.booklet
                                                    ? <span className="px-2 py-0.5 text-xs rounded-full bg-amber-900/30 text-amber-300 border border-amber-800/40">{r.booklet}</span>
                                                    : <span className="text-muted-foreground">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5 font-bold text-emerald-400 whitespace-nowrap text-left" dir="ltr">
                                                {r.total_price.toLocaleString()} د.ع
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {st
                                                    ? <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${st.cls}`}>{st.label}</span>
                                                    : <span className="text-muted-foreground text-xs">{r.status}</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
