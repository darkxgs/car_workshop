"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
    Activity, Clock, CheckCircle2, Play, CircleDashed,
    Car, Search, Trash2, X, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type StatusType = 'تم الاستلام' | 'قيد العمل' | 'تم الانتهاء';

interface StatusReport {
    id: string;
    report_number: number;
    status: StatusType;
    created_at: string;
    completed_at: string | null;
    vehicles: {
        make: string;
        model: string;
        plate_number: string;
        clients: {
            name: string;
            phone: string;
        };
    };
}

export default function StatusPage() {
    const { t } = useLanguage();
    const [reports, setReports] = useState<StatusReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inspection_reports')
                .select(`
                    id,
                    report_number,
                    status,
                    created_at,
                    completed_at,
                    vehicles (
                        make,
                        model,
                        plate_number,
                        clients (
                            name,
                            phone
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(data as unknown as StatusReport[]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const updateStatus = async (id: string, newStatus: StatusType) => {
        try {
            const updatePayload: { status: StatusType; completed_at?: string | null } = { status: newStatus };
            if (newStatus === 'تم الانتهاء') {
                updatePayload.completed_at = new Date().toISOString();
            }
            const { error } = await supabase
                .from('inspection_reports')
                .update(updatePayload)
                .eq('id', id);
            if (error) throw error;
            setReports(prev => prev.map(r =>
                r.id === id ? { ...r, status: newStatus, completed_at: updatePayload.completed_at || r.completed_at } : r
            ));
        } catch (err) {
            console.error(err);
        }
    };

    const deleteReport = async (id: string) => {
        setDeletingId(id);
        try {
            // Delete child report_services first
            await supabase.from('report_services').delete().eq('report_id', id);
            // Delete the report
            const { error } = await supabase.from('inspection_reports').delete().eq('id', id);
            if (error) throw error;
            setReports(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء الحذف");
        } finally {
            setDeletingId(null);
            setConfirmDeleteId(null);
        }
    };

    const calculateTime = (start: string, end: string | null) => {
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : new Date();
        const hrs = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
        if (hrs < 1) return "أقل من ساعة";
        return hrs > 24 ? `${Math.floor(hrs / 24)} يوم` : `${hrs} ساعة`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ar-SA', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const filteredReports = reports.filter(r =>
        r.report_number.toString().includes(searchTerm) ||
        r.vehicles?.clients?.name?.includes(searchTerm) ||
        r.vehicles?.plate_number?.includes(searchTerm) ||
        r.vehicles?.make?.includes(searchTerm)
    );

    const counts = {
        all: reports.length,
        received: reports.filter(r => r.status === 'تم الاستلام').length,
        inProgress: reports.filter(r => r.status === 'قيد العمل').length,
        done: reports.filter(r => r.status === 'تم الانتهاء').length,
    };

    const isRTL = t.common.dashboard === "لوحة التحكم";

    return (
        <div className="min-h-screen p-6 md:p-8 pb-24 animate-fade-in" dir={isRTL ? "rtl" : "ltr"}>

            {/* ── Header ─────────────────────────────────── */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-[0_0_15px_rgba(225,29,72,0.3)] flex items-center justify-center">
                        <Activity className="text-rose-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-white leading-tight">
                            متابعة حالة السيارات
                        </h1>
                        <p className="text-slate-400 text-sm mt-0.5">
                            تتبع تقدم العمل على السيارات في الورشة وتحديث الحالات
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Stats row ──────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "إجمالي التقارير", count: counts.all, color: "text-slate-300", bg: "bg-black/60 border-slate-800/80" },
                    { label: "تم الاستلام", count: counts.received, color: "text-slate-400", bg: "bg-[#0a0a0a] border-slate-800/80" },
                    { label: "قيد العمل", count: counts.inProgress, color: "text-indigo-400", bg: "bg-indigo-950/20 border-indigo-500/20" },
                    { label: "تم الانتهاء", count: counts.done, color: "text-emerald-400", bg: "bg-emerald-950/20 border-emerald-500/20" },
                ].map(({ label, count, color, bg }) => (
                    <div key={label} className={`rounded-2xl border p-4 flex flex-col gap-1 ${bg}`}>
                        <span className="text-xs text-slate-500 font-medium">{label}</span>
                        <span className={`text-3xl font-display font-bold ${color}`}>{count}</span>
                    </div>
                ))}
            </div>

            {/* ── Search ─────────────────────────────────── */}
            <div className="mb-6">
                <div className="relative max-w-sm">
                    <Search
                        className="absolute top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                        style={{ [isRTL ? 'right' : 'left']: '1rem' }}
                        size={18}
                    />
                    <input
                        type="text"
                        placeholder="البحث برقم البوليصة، العميل، اللوحة..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field w-full"
                        style={{ paddingRight: isRTL ? '3rem' : '1rem', paddingLeft: isRTL ? '1rem' : '3rem' }}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="absolute top-1/2 -translate-y-1/2 left-3 text-slate-500 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Cards ──────────────────────────────────── */}
            {loading ? (
                <div className="flex items-center justify-center py-32">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
                        <Car size={36} className="text-slate-600" />
                    </div>
                    <h3 className="text-white text-lg font-bold mb-1">لا توجد نتائج</h3>
                    <p className="text-slate-500 text-sm">لم يتم استقبال سيارات أو لا يوجد ما يطابق بحثك</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredReports.map(report => {
                        const isReceived  = report.status === 'تم الاستلام';
                        const isInProgress = report.status === 'قيد العمل';
                        const isDone      = report.status === 'تم الانتهاء';

                        const accentBorder = isInProgress ? 'border-l-indigo-500' : isDone ? 'border-l-emerald-500' : 'border-l-slate-600';
                        const StatusIcon   = isInProgress ? Play : isDone ? CheckCircle2 : CircleDashed;
                        const iconColor    = isInProgress ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30'
                                           : isDone       ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                                           : 'text-slate-400 bg-slate-800 border-slate-700';

                        return (
                            <div
                                key={report.id}
                                className={`relative rounded-2xl border border-rose-900/20 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(225,29,72,0.15)]`}
                                style={{ background: 'rgba(10,10,10,0.85)' }}
                            >
                                {/* Colored left border accent */}
                                <div className={`absolute top-0 bottom-0 w-1 ${accentBorder.replace('border-l-', 'bg-')}`} />

                                {/* Card body */}
                                <div className="pr-5 pl-5 pt-5 pb-4 flex flex-col gap-4 flex-1">

                                    {/* Top row: badge, icon, delete */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                                                <StatusIcon size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-0.5">
                                                    بوليصة #{report.report_number}
                                                </p>
                                                <h3 className="text-base font-bold text-white leading-snug truncate">
                                                    {report.vehicles?.make} {report.vehicles?.model}
                                                </h3>
                                            </div>
                                        </div>
                                        {/* Delete button */}
                                        <button
                                            onClick={() => setConfirmDeleteId(report.id)}
                                            className="w-8 h-8 flex-shrink-0 rounded-lg bg-rose-500/0 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 flex items-center justify-center text-slate-600 hover:text-rose-400 transition-all"
                                            title="حذف التقرير"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>

                                    {/* Info grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-black/60 rounded-xl p-3 border border-slate-800/40">
                                            <p className="text-xs text-slate-500 mb-1">العميل</p>
                                            <p className="text-sm font-bold text-slate-200 truncate">{report.vehicles?.clients?.name}</p>
                                        </div>
                                        <div className="bg-black/60 rounded-xl p-3 border border-slate-800/40">
                                            <p className="text-xs text-slate-500 mb-1">رقم اللوحة</p>
                                            <p className="text-sm font-bold text-slate-200" dir="ltr">{report.vehicles?.plate_number}</p>
                                        </div>
                                        <div className="bg-black/60 rounded-xl p-3 border border-slate-800/40">
                                            <p className="text-xs text-slate-500 mb-1">تاريخ الاستقبال</p>
                                            <p className="text-sm font-bold text-slate-300">{formatDate(report.created_at)}</p>
                                        </div>
                                        <div className="bg-black/60 rounded-xl p-3 border border-slate-800/40 flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-slate-500 mb-1">مدة الإنجاز</p>
                                                <p className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                                                    <Clock size={13} className="flex-shrink-0" />
                                                    {calculateTime(report.created_at, report.completed_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status switcher */}
                                    <div className="flex gap-2 p-1.5 mt-2 rounded-xl bg-[#050505] border border-rose-900/30">
                                        {(['تم الاستلام', 'قيد العمل', 'تم الانتهاء'] as StatusType[]).map((s) => {
                                            const isActive = report.status === s;
                                            const activeClass =
                                                s === 'تم الاستلام' ? 'bg-slate-700 text-white shadow-inner' :
                                                s === 'قيد العمل'   ? 'bg-indigo-600 text-white shadow-inner shadow-indigo-900/50' :
                                                'bg-emerald-600 text-white shadow-inner shadow-emerald-900/50';
                                            return (
                                                <button
                                                    key={s}
                                                    onClick={() => updateStatus(report.id, s)}
                                                    className={`flex-1 py-2 rounded-lg transition-all text-[11px] sm:text-sm font-bold whitespace-nowrap ${
                                                        isActive
                                                            ? activeClass
                                                            : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
                                                    }`}
                                                >
                                                    {s}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Delete Confirmation Modal ───────────────── */}
            {confirmDeleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div
                        className="w-full max-w-sm rounded-2xl border border-rose-900/40 p-6 shadow-[0_0_40px_rgba(225,29,72,0.15)] animate-slide-up"
                        style={{ background: 'rgba(10,10,10,0.97)' }}
                    >
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 mx-auto mb-4">
                            <AlertTriangle className="text-rose-400" size={28} />
                        </div>
                        <h3 className="text-xl font-bold text-white text-center mb-2">تأكيد الحذف</h3>
                        <p className="text-slate-400 text-sm text-center mb-6">
                            هل أنت متأكد من حذف هذا التقرير؟ لا يمكن التراجع عن هذا الإجراء.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors border border-slate-700"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={() => deleteReport(confirmDeleteId)}
                                disabled={deletingId === confirmDeleteId}
                                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors disabled:opacity-50 shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2"
                            >
                                {deletingId === confirmDeleteId ? (
                                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Trash2 size={16} />
                                )}
                                حذف
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
