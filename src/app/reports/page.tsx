"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Printer, FileText, CheckCircle2, Search, Loader2, AlertTriangle, XCircle, Car, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { PrintableInspectionReport } from "@/components/PrintableInspectionReport";

type ReportServiceResult = {
    id: string;
    category: string;
    status: string;
    notes: string | null;
    service_price: number | null;
};

type UsedPartResult = {
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    inventory: {
        name: string;
        item_code: string;
    };
};

type JoinedReport = {
    id: string;
    report_number: number;
    odometer_reading: number;
    status: string;
    total_price: number;
    created_at: string;
    completed_at?: string;
    estimated_duration?: number;
    elapsed_time?: number;
    start_time?: string;
    selected_services?: any;
    notes?: string;
    vehicles: {
        make: string;
        model: string;
        plate_number: string;
        clients: {
            name: string;
            phone: string;
        };
    };
    receptionist?: { name: string };
};

export default function ReportsPage() {
    const { t } = useLanguage();
    const { employeeRole, employeeBranchId } = useAuth();

    const [reports, setReports] = useState<JoinedReport[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [reportServices, setReportServices] = useState<ReportServiceResult[]>([]);
    const [usedParts, setUsedParts] = useState<UsedPartResult[]>([]);

    const [loading, setLoading] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const PAGE_SIZE = 12;

    const selectedReport = reports.find(r => r.id === selectedReportId);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset pagination when search changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            try {
                const from = (page - 1) * PAGE_SIZE;
                const to = from + PAGE_SIZE - 1;

                let query = supabase
                    .from('inspection_reports')
                    .select(`
                        id,
                        report_number,
                        odometer_reading,
                        status,
                        total_price,
                        created_at,
                        completed_at,
                        estimated_duration,
                        elapsed_time,
                        start_time,
                        selected_services,
                        notes,
                        vehicles!inner(
                            make,
                            model,
                            plate_number,
                            clients(name, phone)
                        ),
                        receptionist:receptionist_id(name)
                    `, { count: 'exact' });

                if (debouncedSearch) {
                    const num = parseInt(debouncedSearch);
                    if (!isNaN(num) && debouncedSearch.trim().length < 8) {
                        query = query.eq('report_number', num);
                    } else {
                        const q = `%${debouncedSearch}%`;
                        const { data: cData } = await supabase.from('clients').select('id').or(`name.ilike.${q},phone.ilike.${q}`);
                        const cIds = cData?.map((c: any) => c.id) || [];
                        
                        let vQuery = supabase.from('vehicles').select('id');
                        if (cIds.length > 0) {
                            vQuery = vQuery.or(`make.ilike.${q},model.ilike.${q},plate_number.ilike.${q},client_id.in.(${cIds.join(',')})`);
                        } else {
                            vQuery = vQuery.or(`make.ilike.${q},model.ilike.${q},plate_number.ilike.${q}`);
                        }
                        
                        const { data: vData } = await vQuery;
                        const vIds = vData?.map((v: any) => v.id) || [];
                        
                        if (vIds.length > 0) {
                            query = query.in('vehicle_id', vIds);
                        } else {
                            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
                        }
                    }
                }

                if (employeeRole !== 'Owner' && employeeRole !== 'Admin' && employeeBranchId) {
                    query = query.eq('branch_id', employeeBranchId);
                }

                const { data, error, count } = await query
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (error) throw error;

                if (data) {
                    setReports(data as unknown as JoinedReport[]);
                    setTotalPages(count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1);
                    if (data.length > 0 && !selectedReportId) {
                        setSelectedReportId(data[0].id);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, [page, debouncedSearch]);

    useEffect(() => {
        if (!selectedReportId) return;
        const fetchDetails = async () => {
            setLoadingDetails(true);
            try {
                const { data, error } = await supabase
                    .from('report_services')
                    .select('*')
                    .eq('report_id', selectedReportId);

                if (error) throw error;
                if (data) setReportServices(data);

                const { data: partsData, error: partsErr } = await supabase
                    .from('used_parts')
                    .select('id, quantity, unit_price, total_price, inventory(name, item_code)')
                    .eq('report_id', selectedReportId);

                if (partsErr) throw partsErr;
                if (partsData) setUsedParts(partsData as unknown as UsedPartResult[]);

            } catch (err) {
                console.error(err);
            } finally {
                setLoadingDetails(false);
            }
        };
        fetchDetails();
    }, [selectedReportId]);

    if (employeeRole === "Receptionist") {
        return (
            <div className="p-8 flex items-center justify-center min-h-[50vh] animate-fade-in" dir="rtl">
                <div className="glass-card p-8 rounded-2xl border-border text-center max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/10 blur-[50px] rounded-full pointer-events-none" />
                    <AlertCircle className="mx-auto text-rose-500 mb-4 relative z-10" size={48} />
                    <h2 className="text-2xl font-bold text-foreground mb-2 relative z-10">غير مصرح لك</h2>
                    <p className="text-muted-foreground relative z-10">عذراً، الاطلاع على الفواتير والأرباح مخصص لمدراء النظام.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in pb-24 font-ibm" dir={t.common.dashboard === "لوحة التحكم" ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                        <FileText className="text-rose-500" size={32} />
                        التقارير والفواتير
                    </h1>
                    <p className="text-muted-foreground">
                        استعراض وطباعة تقارير الفحص الفني للعملاء (A4)
                    </p>
                </div>
                <button 
                    onClick={() => {
                        document.title = `Inspection_Report_${selectedReport?.report_number || ""}`;
                        window.print();
                    }}
                    disabled={!selectedReport}
                    className="btn-primary flex items-center gap-2 shadow-[0_0_20px_rgba(225,29,72,0.3)] disabled:opacity-50 print:hidden"
                >
                    <Printer size={18} />
                    طباعة التقرير (A4)
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Search & List */}
                <div className="xl:col-span-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" size={18} />
                        <input
                            type="text"
                            placeholder="البحث برقم البوليصة، العميل..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field w-full"
                            style={{ paddingRight: '3rem' }}
                        />
                    </div>

                    <div className="glass-card rounded-2xl overflow-hidden flex flex-col max-h-[700px] border border-rose-900/20 shadow-xl shadow-black">
                        <div className="p-4 bg-card border-b border-border">
                            <h3 className="font-bold text-muted-foreground">قائمة التقارير السابقة</h3>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-2 bg-background flex-1">
                            {loading && reports.length === 0 ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-rose-500 w-8 h-8" /></div>
                            ) : reports.length === 0 ? (
                                <p className="text-center text-muted-foreground p-8 font-bold">لا توجد تقارير مطابقة</p>
                            ) : (
                                reports.map(report => (
                                    <button
                                        key={report.id}
                                        onClick={() => setSelectedReportId(report.id)}
                                        className={`w-full text-right p-4 rounded-xl border transition-all flex flex-col gap-2 relative overflow-hidden ${
                                            selectedReportId === report.id
                                                ? "bg-gradient-to-l from-rose-950/40 to-[#0a0a0a] border-rose-500/50 shadow-[0_0_15px_rgba(225,29,72,0.15)]"
                                                : "bg-card border-border hover:bg-muted hover:border-slate-700"
                                        }`}
                                    >
                                        {selectedReportId === report.id && <div className="absolute top-0 bottom-0 right-0 w-1 bg-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.8)]" />}
                                        <div className="flex justify-between items-start w-full pr-2">
                                            <span className="text-xs font-bold text-foreground bg-background px-2 py-1 rounded-md border border-border">#{report.report_number}</span>
                                            <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full border truncate max-w-[100px] ${
                                                report.status === 'تم الانتهاء' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
                                                report.status === 'قيد العمل' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' :
                                                'bg-muted text-muted-foreground border-border'
                                            }`}>
                                                {report.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 pr-2">
                                            <Car size={16} className="text-muted-foreground shrink-0" />
                                            <span className="font-bold text-foreground text-sm truncate">{report.vehicles.make} - {report.vehicles.plate_number}</span>
                                        </div>
                                        <div className="flex justify-between items-center w-full mt-2 border-t border-border pt-2 text-xs text-muted-foreground pr-2">
                                            <span className="flex items-center gap-1 truncate"><Calendar size={12}/> {new Date(report.created_at).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1 font-mono text-emerald-400"><DollarSign size={12}/> {report.total_price} IQD</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Server-Side Pagination Controls */}
                        <div className="p-3 bg-card border-t border-border flex items-center justify-between shadow-inner shrink-0">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="px-3 py-1.5 bg-background border border-border text-muted-foreground rounded hover:bg-muted hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-bold"
                            >
                                السابق
                            </button>
                            <span className="text-xs text-muted-foreground font-bold bg-muted px-3 py-1 rounded-full border border-border">
                                {loading && reports.length > 0 ? <Loader2 className="animate-spin w-4 h-4 inline" /> : `صفحة ${page} من ${totalPages}`}
                            </span>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= totalPages || loading}
                                className="px-3 py-1.5 bg-background border border-border text-muted-foreground rounded hover:bg-muted hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-bold"
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                </div>

                {/* A4 Print Preview container*/}
                <div className="xl:col-span-8 overflow-x-auto bg-background p-4 md:p-8 rounded-3xl border border-rose-900/20 shadow-inner">
                    {!selectedReport ? (
                        <div className="h-full min-h-[500px] flex flex-col items-center justify-center text-muted-foreground relative">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/5 blur-[100px] rounded-full pointer-events-none" />
                            <FileText size={48} className="mb-4 text-slate-700 relative z-10" />
                            <p className="relative z-10 font-bold">قم باختيار تقرير من القائمة لعرضه وطباعته</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8">
                            {/* Cost Breakdown UI Block */}
                            <div className="bg-card rounded-2xl p-6 border border-border shadow-inner">
                                <h3 className="text-xl font-bold text-foreground mb-4 border-b border-border pb-2">تفاصيل الفاتورة - {selectedReport.total_price} IQD</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Labor Costs */}
                                    <div>
                                        <h4 className="text-muted-foreground font-bold mb-3 text-sm">أجور اليد والخدمات المنفذة</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                            {reportServices.filter(s => s.service_price && s.service_price > 0).length === 0 ? (
                                                <p className="text-xs text-slate-600">لا توجد أجور مسجلة.</p>
                                            ) : reportServices.filter(s => s.service_price && s.service_price > 0).map(s => (
                                                <div key={s.id} className="flex justify-between items-center text-sm border-b border-border pb-1">
                                                    <span className="text-muted-foreground">{s.category}</span>
                                                    <span className="text-rose-400 font-mono font-bold">{s.service_price} IQD</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Parts Costs */}
                                    <div>
                                        <h4 className="text-muted-foreground font-bold mb-3 text-sm">قطع المخزن المستخدمة</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                            {usedParts.length === 0 ? (
                                                <p className="text-xs text-slate-600">لم يتم صرف أي قطع لهذا التقرير.</p>
                                            ) : usedParts.map(p => (
                                                <div key={p.id} className="flex justify-between items-center text-sm border-b border-border pb-1">
                                                    <div className="flex flex-col">
                                                        <span className="text-muted-foreground">{p.inventory.name}</span>
                                                        <span className="text-xs text-slate-600">الكمية: {p.quantity} × {p.unit_price}</span>
                                                    </div>
                                                    <span className="text-emerald-400 font-mono font-bold">{p.total_price} IQD</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PDF Render Container (Normal View) */}
                            <div className="shadow-2xl mx-auto min-w-[794px] w-[210mm] bg-[#f8fafc] text-slate-900 rounded-lg overflow-hidden flex justify-center py-4 print:hidden">
                                <PrintableInspectionReport 
                                    report={selectedReport}
                                />
                            </div>

                            {/* Native Print Container (Hidden in browser, Absolute top layer in print) */}
                            <div className="hidden print:block fixed inset-0 bg-white w-full h-full z-[99999] m-0 p-0 overflow-visible">
                                <div className="flex flex-col items-center w-full">
                                    <PrintableInspectionReport 
                                        report={selectedReport}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
