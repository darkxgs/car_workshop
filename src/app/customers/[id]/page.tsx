"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    Phone, Car, ArrowRight, Calendar, Clock,
    Wrench, Hash, AlertTriangle, CheckCircle2, ClipboardList,
    TrendingUp, Activity, FileText
} from "lucide-react";
import Link from "next/link";

type Vehicle = {
    id: string;
    make: string;
    model: string;
    plate_number: string;
    engine_size: string | null;
    created_at: string;
};

type InspectionReport = {
    id: string;
    report_number: number;
    status: string;
    total_price: number;
    odometer_reading: number;
    created_at: string;
    completed_at: string | null;
    vehicles: { make: string; model: string; plate_number: string } | null;
};

type ClientProfile = {
    id: string;
    name: string;
    phone: string;
    created_at: string;
    vehicles: Vehicle[];
};

const statusConfig: Record<string, { label: string; cls: string }> = {
    "تم الاستلام":  { label: "تم الاستلام",  cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    "قيد العمل":    { label: "قيد العمل",    cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    "تم الانتهاء":  { label: "تم الانتهاء",  cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
};

const isAccounted = (o: any) => {
    if (o.order_type === 'sale') return true;
    const p = (Array.isArray(o.selected_services) ? o.selected_services[0] : o.selected_services)?.pricing;
    return p?.accounted === true;
};

export default function CustomerProfilePage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [client, setClient] = useState<ClientProfile | null>(null);
    const [reports, setReports] = useState<InspectionReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const channel = supabase.channel(`customer_profile_realtime_${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inspection_reports' }, () => {
                setRefreshTrigger(t => t + 1);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [id]);

    useEffect(() => {
        if (id) fetchProfile();
    }, [id, refreshTrigger]);

    const fetchProfile = async () => {
        setLoading(true);

        // Fetch client with vehicles
        const { data: clientData, error: clientErr } = await supabase
            .from("clients")
            .select(`id, name, phone, created_at, vehicles (id, make, model, plate_number, engine_size, created_at)`)
            .eq("id", id)
            .single();

        if (clientErr || !clientData) {
            setLoading(false);
            return;
        }
        setClient(clientData as any);

        // Fetch all inspection reports for all vehicles of this client
        const vehicleIds = (clientData as any).vehicles?.map((v: Vehicle) => v.id) ?? [];
        if (vehicleIds.length > 0) {
            const { data: reportsData } = await supabase
                .from("inspection_reports")
                .select(`id, report_number, status, order_type, total_price, odometer_reading, selected_services, created_at, completed_at, vehicles (make, model, plate_number)`)
                .in("vehicle_id", vehicleIds)
                .order("created_at", { ascending: false })
                .limit(50);

            if (reportsData) setReports(reportsData as any);
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" dir="rtl">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                    <p>جاري تحميل ملف العميل...</p>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6" dir="rtl">
                <div className="text-center">
                    <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
                    <h2 className="text-xl font-bold text-foreground mb-2">العميل غير موجود</h2>
                    <p className="text-muted-foreground mb-6">لم يتم العثور على بيانات هذا العميل.</p>
                    <Link href="/customers" className="px-6 py-2.5 bg-rose-600 text-white rounded-xl font-bold">
                        العودة للعملاء
                    </Link>
                </div>
            </div>
        );
    }

    // — Computed stats —
    const totalVisits = reports.length;
    const totalSpent = reports.reduce((s, r) => s + (r.total_price || 0), 0);
    const completedReports = reports.filter(r => r.status === "تم الانتهاء").length;
    const lastVisit = reports[0]?.created_at ?? null;
    const daysSinceLastVisit = lastVisit
        ? Math.floor((Date.now() - new Date(lastVisit).getTime()) / 86400000)
        : null;

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-[1300px] mx-auto space-y-8 animate-fade-in">

                {/* ─── Back Button ─── */}
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                        <ArrowRight size={16} />
                        العودة إلى قائمة العملاء
                    </button>
                </div>

                {/* ─── Hero Card ─── */}
                <div className="glass-card rounded-3xl border border-border p-8 relative overflow-hidden">
                    {/* Decorative gradient */}
                    <div className="absolute inset-0 pointer-events-none opacity-30"
                        style={{ background: "radial-gradient(ellipse at top right, rgba(244,63,94,0.15) 0%, transparent 60%)" }} />

                    <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-600 to-red-900 flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-rose-500/20 shrink-0 border-2 border-rose-500/30">
                            {client.name.charAt(0)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl font-display font-bold text-foreground mb-1">{client.name}</h1>
                            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Phone size={14} className="text-rose-400" />
                                    <span dir="ltr">{client.phone}</span>
                                </div>

                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Calendar size={14} className="text-emerald-400" />
                                    <span>عميل منذ: {new Date(client.created_at).toLocaleDateString("ar-SA")}</span>
                                </div>
                            </div>
                        </div>

                        {/* Last Visit Badge */}
                        {daysSinceLastVisit !== null && (
                            <div className={`shrink-0 text-center px-5 py-3 rounded-2xl border ${
                                daysSinceLastVisit <= 30
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                                    : daysSinceLastVisit <= 90
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                                    : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                            }`}>
                                <Clock size={20} className="mx-auto mb-1" />
                                <p className="text-xs font-medium opacity-70">آخر زيارة</p>
                                <p className="text-2xl font-black font-mono">{daysSinceLastVisit}</p>
                                <p className="text-xs font-medium">يوم مضى</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Stats Row ─── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: ClipboardList, label: "إجمالي الزيارات", value: totalVisits, color: "text-blue-400", bg: "bg-blue-500/10" },
                        { icon: CheckCircle2, label: "عمليات مكتملة", value: completedReports, color: "text-emerald-400", bg: "bg-emerald-500/10" },
                        { icon: Car, label: "المركبات المسجلة", value: client.vehicles?.length ?? 0, color: "text-purple-400", bg: "bg-purple-500/10" },
                        { icon: TrendingUp, label: "إجمالي المدفوعات", value: `${totalSpent.toLocaleString()} د.ع`, color: "text-rose-400", bg: "bg-rose-500/10" },
                    ].map((stat, i) => (
                        <div key={i} className="glass-card p-5 rounded-2xl border border-border flex items-center gap-4">
                            <div className={`p-3 ${stat.bg} rounded-xl shrink-0`}>
                                <stat.icon size={20} className={stat.color} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs truncate">{stat.label}</p>
                                <p className="text-foreground font-bold text-xl">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ─── Vehicles Panel ─── */}
                    <div className="lg:col-span-1 glass-card rounded-2xl border border-border overflow-hidden">
                        <div className="p-5 border-b border-border flex items-center gap-3">
                            <Car size={20} className="text-blue-400" />
                            <h2 className="font-bold text-foreground text-lg">المركبات المسجلة</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {client.vehicles && client.vehicles.length > 0 ? (
                                client.vehicles.map((v) => (
                                    <div key={v.id} className="p-4 bg-card border border-border rounded-xl hover:border-blue-500/30 transition-colors">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                <Car size={16} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-foreground text-sm">{v.make} {v.model}</p>
                                                {v.engine_size && (
                                                    <p className="text-xs text-muted-foreground">{v.engine_size}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Hash size={12} className="text-muted-foreground" />
                                            <span className="text-xs font-mono bg-muted border border-border px-2 py-0.5 rounded text-foreground">
                                                {v.plate_number}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-8 text-sm">
                                    <Car size={32} className="mx-auto mb-2 opacity-30" />
                                    لا توجد مركبات مسجلة
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Inspection History ─── */}
                    <div className="lg:col-span-2 glass-card rounded-2xl border border-border overflow-hidden">
                        <div className="p-5 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Activity size={20} className="text-rose-400" />
                                <h2 className="font-bold text-foreground text-lg">سجل الزيارات والصيانة</h2>
                            </div>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
                                {reports.length} زيارة
                            </span>
                        </div>

                        <div className="divide-y divide-border overflow-y-auto max-h-[480px] custom-scrollbar">
                            {reports.length > 0 ? (
                                reports.map((report) => {
                                    const accounted = isAccounted(report);
                                     const st = report.status === "تم الانتهاء"
                                         ? (accounted 
                                             ? { label: "تم الانتهاء", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" }
                                             : { label: "في انتظار المحاسبة", cls: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" }
                                           )
                                         : report.status === "قيد العمل"
                                             ? { label: "قيد العمل", cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" }
                                             : { label: "انتظار", cls: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
                                    return (
                                        <div key={report.id} className="p-5 hover:bg-muted/20 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                                            {/* Report Number */}
                                            <div className="shrink-0 w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                                                <span className="text-rose-500 font-black font-mono text-sm">#{report.report_number}</span>
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    {report.vehicles && (
                                                        <span className="font-bold text-foreground text-sm">
                                                            {report.vehicles.make} {report.vehicles.model}
                                                        </span>
                                                    )}
                                                    {report.vehicles?.plate_number && (
                                                        <span className="text-[10px] font-mono bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground">
                                                            {report.vehicles.plate_number}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={11} />
                                                        {new Date(report.created_at).toLocaleDateString("ar-SA")}
                                                    </span>
                                                    {report.odometer_reading > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Wrench size={11} />
                                                            عداد: {report.odometer_reading.toLocaleString()} كم
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right side: status + price + link */}
                                            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1.5 shrink-0">
                                                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border ${st.cls}`}>
                                                    {st.label}
                                                </span>
                                                {report.total_price > 0 && (
                                                    <span className="text-xs font-mono font-bold text-foreground">
                                                        {report.total_price.toLocaleString()} د.ع
                                                    </span>
                                                )}
                                                <Link
                                                    href={`/work-orders/${report.id}`}
                                                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                                                >
                                                    <FileText size={11} />
                                                    عرض التقرير
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center text-muted-foreground py-16">
                                    <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">لا توجد زيارات مسجلة بعد</p>
                                    <p className="text-xs mt-1 opacity-60">ستظهر هنا كل زيارات ومحطات الصيانة لهذا العميل</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
