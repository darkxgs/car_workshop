"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
    UserPlus, Car, Save, Phone, Hash, AlertCircle, Loader2,
    CheckCircle2, ArrowLeft, ArrowRight, FileText, Printer, Play, CheckSquare, Edit2, Wrench, X, Trash2
} from "lucide-react";
import { showConfirm, showSuccess, showError } from "@/lib/alerts";
import { PrintableInspectionReport } from "@/components/PrintableInspectionReport";
import StandardReception from "./components/StandardReception";
import SectorReception from "./components/SectorReception";

function ReceptionContainer() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { employeeBranchId, employeeRole, permissionReception, loading: authLoading } = useAuth();
    const editId = searchParams.get('edit');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // ---------- Branches ----------
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

    // ---------- Print Preview States ----------
    const [previewReportId, setPreviewReportId] = useState<string | null>(null);
    const [previewMode, setPreviewMode] = useState<'full' | 'short'>('full');
    const [previewReport, setPreviewReport] = useState<any>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    useEffect(() => {
        if (editId) {
            setIsWizardOpen(true);
        } else {
            setIsWizardOpen(false);
        }
    }, [editId]);

    // Fetch branches on mount
    useEffect(() => {
        let branchQuery = supabase.from('branches').select('id, name');
        if (employeeBranchId) {
            branchQuery = branchQuery.eq('id', employeeBranchId);
        }
        branchQuery.then(({ data, error }) => {
            if (!error && data) {
                setBranches(data);
                // Pre-select branch if only one is available or employeeBranchId is set
                if (data.length === 1 || employeeBranchId) {
                    setSelectedBranchId(employeeBranchId || data[0].id);
                } else if (data.length > 0 && !selectedBranchId) {
                    setSelectedBranchId(data[0].id);
                }
            }
        });
    }, [employeeBranchId]);

    // Fetch orders
    useEffect(() => {
        if (isWizardOpen) return;
        const fetchOrders = async () => {
            setLoading(true);
            let query = supabase
                .from('inspection_reports')
                .select(`id, report_number, status, created_at, total_price, vehicles (make, model, plate_number, clients (name, phone))`)
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (employeeBranchId) {
                query = query.eq('branch_id', employeeBranchId);
            }
            
            const { data } = await query;
            if (data) setOrders(data);
            setLoading(false);
        };
        fetchOrders();
    }, [isWizardOpen, employeeBranchId]);

    // Fetch preview details
    useEffect(() => {
        if (!previewReportId) {
            setPreviewReport(null);
            return;
        }
        const fetchPreview = async () => {
            setPreviewLoading(true);
            const { data } = await supabase
                .from("inspection_reports")
                .select(`
                    id, report_number, status, created_at, completed_at, odometer_reading,
                    estimated_duration, elapsed_time, start_time, selected_services, notes, branch_id,
                    branches(id, name),
                    vehicles (make, model, plate_number, engine_size, clients (name, phone)),
                    receptionist:receptionist_id(name)
                `)
                .eq("id", previewReportId)
                .single();
            if (data) {
                setPreviewReport(data);
            }
            setPreviewLoading(false);
        };
        fetchPreview();
    }, [previewReportId]);

    const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
        const confirm = await showConfirm(
            "حذف أمر العمل",
            `هل أنت متأكد من حذف أمر العمل رقم #${orderNumber}؟ لا يمكن التراجع عن هذا الإجراء.`
        );
        if (!confirm) return;

        try {
            const { error } = await supabase.from('inspection_reports').delete().eq('id', orderId);
            if (error) throw error;
            showSuccess("تم الحذف", `تم حذف أمر العمل #${orderNumber} بنجاح.`);
            setOrders(prev => prev.filter(o => o.id !== orderId));
        } catch (err: any) {
            console.error(err);
            showError("خطأ في الحذف", err.message || "تعذر حذف أمر العمل.");
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500 w-12 h-12" />
            </div>
        );
    }

    if (employeeRole !== 'Owner' && !permissionReception) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center p-4 text-center font-ibm" dir="rtl">
                <div className="glass-card p-8 rounded-3xl border border-rose-500/20 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-rose-500 mb-2">غير مصرح بالوصول</h2>
                    <p className="text-muted-foreground mb-6">ليس لديك صلاحية للوصول إلى نظام الاستقبال وأوامر العمل.</p>
                </div>
            </div>
        );
    }

    const selectedBranch = branches.find(b => b.id === selectedBranchId);
    const isSectorBranch = selectedBranch?.name === 'القطاع' || selectedBranch?.name === 'فرع القطاع';

    if (isWizardOpen) {
        return isSectorBranch ? (
            <SectorReception
                branches={branches}
                selectedBranchId={selectedBranchId}
                setSelectedBranchId={setSelectedBranchId}
                onClose={() => {
                    setIsWizardOpen(false);
                    router.replace('/reception');
                }}
            />
        ) : (
            <StandardReception
                branches={branches}
                selectedBranchId={selectedBranchId}
                setSelectedBranchId={setSelectedBranchId}
                onClose={() => {
                    setIsWizardOpen(false);
                    router.replace('/reception');
                }}
            />
        );
    }

    return (
        <div className="min-h-screen bg-[#08080d] p-4 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground">الاستقبال وأوامر العمل</h1>
                        <p className="text-muted-foreground text-sm mt-1">إدارة كروت فحص المركبات وتسجيل دخول السيارات للورشة</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Branch Selector on Dashboard */}
                        {branches.length > 1 && (employeeRole === 'Owner' || employeeRole === 'Admin') && (
                            <select
                                value={selectedBranchId}
                                onChange={e => setSelectedBranchId(e.target.value)}
                                className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-rose-500/50 cursor-pointer"
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        )}
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className="px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2 text-sm"
                        >
                            <UserPlus size={18} /> إنشاء كرت فحص جديد
                        </button>
                    </div>
                </div>

                {/* Orders table */}
                <div className="glass-card rounded-3xl border border-border/50 overflow-hidden">
                    <div className="p-6 border-b border-border/50 bg-card/30 flex justify-between items-center">
                        <h2 className="font-bold text-lg text-foreground">آخر 50 أمر عمل</h2>
                    </div>
                    
                    {loading ? (
                        <div className="p-20 text-center">
                            <Loader2 className="animate-spin text-rose-500 w-10 h-10 mx-auto" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="p-20 text-center text-muted-foreground space-y-4">
                            <Car size={48} className="mx-auto text-muted-foreground/50" />
                            <p>لا توجد أوامر عمل مسجلة حالياً.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-muted/40 text-muted-foreground text-xs font-bold border-b border-border/50">
                                        <th className="p-4">رقم الكرت</th>
                                        <th className="p-4">العميل</th>
                                        <th className="p-4">رقم الهاتف</th>
                                        <th className="p-4">المركبة</th>
                                        <th className="p-4">لوحة السيارة</th>
                                        <th className="p-4">الحالة</th>
                                        <th className="p-4">التاريخ</th>
                                        <th className="p-4 text-center">الإجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30 text-sm">
                                    {orders.map((o) => {
                                        const vehicle = Array.isArray(o.vehicles) ? o.vehicles[0] : o.vehicles;
                                        const client = vehicle ? (Array.isArray(vehicle.clients) ? vehicle.clients[0] : vehicle.clients) : null;
                                        const date = new Date(o.created_at).toLocaleDateString('ar-EG', {
                                            year: 'numeric', month: 'short', day: 'numeric'
                                        });

                                        return (
                                            <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="p-4 font-mono font-bold text-rose-400">#{o.report_number}</td>
                                                <td className="p-4 font-bold">{client?.name || 'عميل نقدي'}</td>
                                                <td className="p-4 text-muted-foreground font-mono">{client?.phone || '-'}</td>
                                                <td className="p-4 font-bold">{vehicle?.make} {vehicle?.model}</td>
                                                <td className="p-4 font-mono text-xs">{vehicle?.plate_number || 'بدون لوحة'}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                        o.status === 'تم الانتهاء' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                        o.status === 'قيد العمل' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                    }`}>
                                                        {o.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-muted-foreground text-xs font-mono">{date}</td>
                                                <td className="p-4 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => { setPreviewReportId(o.id); setPreviewMode('full'); }}
                                                            className="p-2 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                                                            title="معاينة وطباعة شاملة"
                                                        >
                                                            <Printer size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => { setPreviewReportId(o.id); setPreviewMode('short'); }}
                                                            className="p-2 bg-amber-600/10 text-amber-400 border border-amber-500/20 rounded-xl hover:bg-amber-600 hover:text-white transition-all"
                                                            title="معاينة وطباعة مختصرة للفني"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (o.branch_id) setSelectedBranchId(o.branch_id);
                                                                router.push(`/reception?edit=${o.id}`);
                                                            }}
                                                            className="p-2 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                                                            title="تعديل أمر العمل"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteOrder(o.id, o.report_number)}
                                                            className="p-2 bg-rose-600/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                                                            title="حذف أمر العمل"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
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

            {previewReportId && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm"
                        onClick={() => setPreviewReportId(null)}
                    />
                    {/* Center wrapper */}
                    <div
                        className="fixed inset-0 z-[9999] font-ibm"
                        style={{ display: 'grid', alignItems: 'start', justifyItems: 'center', padding: '16px', paddingTop: '24px' }}
                    >
                        <div
                            className="bg-[#0c101d] border border-cyan-900/30 rounded-3xl shadow-[0_0_60px_rgba(6,182,212,0.15)] animate-scale-in flex flex-col overflow-hidden w-full"
                            style={{ maxHeight: '90vh', maxWidth: '900px' }}
                            dir="rtl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-border/40 px-6 py-4 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-foreground">🔍 معاينة التقرير والفاتورة</h3>
                                    {previewReport && (
                                        <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg px-2.5 py-1 font-mono">
                                            #{previewReport.report_number}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex bg-muted rounded-xl p-1 border border-border/40">
                                        <button
                                            onClick={() => setPreviewMode('full')}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${previewMode === 'full' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            تقرير شامل (للعميل)
                                        </button>
                                        <button
                                            onClick={() => setPreviewMode('short')}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${previewMode === 'short' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            تقرير مختصر (للفني)
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => window.open(`/print/${previewReportId}?mode=${previewMode}`, '_blank')}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-600/20 text-xs"
                                    >
                                        <Printer size={16} /> إرسال للطباعة 🖨️
                                    </button>
                                    <button
                                        onClick={() => setPreviewReportId(null)}
                                        className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl transition-all border border-border/40"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable preview */}
                            <div className="flex-1 overflow-auto bg-neutral-950/60 p-4 flex justify-center items-start min-h-0">
                                {previewLoading ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-20">
                                        <Loader2 className="animate-spin text-cyan-500 w-10 h-10" />
                                        <p className="text-sm text-muted-foreground">جاري تحميل تفاصيل الفاتورة...</p>
                                    </div>
                                ) : previewReport ? (
                                    <div
                                        className="bg-white rounded-2xl shadow-2xl print-preview-doc"
                                        style={{ zoom: '0.68', minWidth: '800px' }}
                                    >
                                        <PrintableInspectionReport report={previewReport} mode={previewMode} />
                                    </div>
                                ) : (
                                    <div className="text-center text-muted-foreground py-10">حدث خطأ أثناء تحميل التقرير.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function ReceptionPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center"><Loader2 className="animate-spin text-rose-500 w-10 h-10 mx-auto" /></div>}>
            <ReceptionContainer />
        </Suspense>
    );
}
