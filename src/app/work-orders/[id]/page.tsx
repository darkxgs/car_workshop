"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Clock, CheckCircle2, Play, AlertTriangle, Plus, Printer, Activity, Wrench, StopCircle, ArrowRight, Loader2, Eye, X } from "lucide-react";
import catalogRaw from '@/lib/data/servicesCatalog.json';
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import { PrintableInspectionReport } from "@/components/PrintableInspectionReport";
import { showSuccess, showError } from "@/lib/alerts";

type WorkOrder = {
    id: string;
    report_number: number;
    status: string;
    estimated_duration: number;
    elapsed_time: number;
    start_time: string | null;
    completed_at?: string | null;
    is_delayed: boolean;
    total_price: number;
    selected_services: any[];
    receptionist: { name: string } | null;
    branches?: { id: string; name: string } | null;
    vehicles: { make: string; model: string; plate_number: string; booklet_serial?: string | null; clients?: { name: string; phone: string } };
    bay_number: string | null;
    odometer_reading: number;
    technician_id: string | null;
    branch_id: string | null;
    notes: string | null;
};

type ReportServiceResult = {
    id: string;
    category: string;
    status: string;
    notes: string | null;
    service_price: number | null;
};

const PAPER_V2_SERVICE_DEFS: Record<string, { name: string; estimatedMinutes: number }> = {
    engineOil: { name: "زيت المحرك", estimatedMinutes: 30 },
    oilFilter: { name: "فلتر زيت المحرك", estimatedMinutes: 20 },
    airFilter: { name: "فلتر الهواء", estimatedMinutes: 20 },
    acFilter: { name: "فلتر التبريد", estimatedMinutes: 20 },
    brakeFluid: { name: "زيت المكابح", estimatedMinutes: 25 },
    coolant: { name: "ماء الراديتر", estimatedMinutes: 30 },
    battery: { name: "البطارية", estimatedMinutes: 20 },
    engineBelts: { name: "قايش المحرك", estimatedMinutes: 30 },
    brakePads: { name: "دسكات السيارة", estimatedMinutes: 30 },
    sparkPlugs: { name: "شمعات الاحتراق", estimatedMinutes: 30 },
    gearboxHydraulic: { name: "هايدروليك الكير", estimatedMinutes: 45 },
    gearboxFilter: { name: "فلتر الكير", estimatedMinutes: 30 },
    wipers: { name: "الماسحات", estimatedMinutes: 15 },
    additives: { name: "المضافات والمحسنات", estimatedMinutes: 10 },
    // Sector Branch new service keys mapping
    engineFlash: { name: "فلاش محرك", estimatedMinutes: 20 },
    engineCeramic: { name: "سيراميك محرك", estimatedMinutes: 15 },
    linerCleaner: { name: "منظف بطانة (جكجكة)", estimatedMinutes: 15 },
    oilLeakPreventer: { name: "مانع تسريب زيت", estimatedMinutes: 15 },
    smokePreventer: { name: "مانع دخان / نقص زيت", estimatedMinutes: 15 },
    gearboxFlash: { name: "فلاش كير", estimatedMinutes: 25 },
    gearboxOil: { name: "زيت كير", estimatedMinutes: 35 },
    gearboxCeramic: { name: "سيراميك كير", estimatedMinutes: 15 },
    gearboxAntiSlip: { name: "مانع انزلاق الكير", estimatedMinutes: 15 },
    acCleaner: { name: "منظف دورة التبريد", estimatedMinutes: 20 },
    injectorCleaner: { name: "منظف بخاخات", estimatedMinutes: 20 },
    fuelSystemCleaner: { name: "منظف نظام الوقود", estimatedMinutes: 20 },
    octaneBooster: { name: "أوكتان بنزين", estimatedMinutes: 10 },
    batteryFilter: { name: "فلتر البطارية", estimatedMinutes: 15 },
    windshieldFluid: { name: "سائل غسيل جام", estimatedMinutes: 10 },
    // legacy support
    transOil: { name: "زيت الفتيس (ناقل الحركة)", estimatedMinutes: 45 },
    brakeCable: { name: "تيل الفرامل", estimatedMinutes: 30 },
    shockAbsorbers: { name: "المساعدين", estimatedMinutes: 40 },
    hydraulics: { name: "الهيدروليك والمصمات", estimatedMinutes: 40 },
    workshopNotes: { name: "ملاحظة الصيانة", estimatedMinutes: 15 },
};

const PAPER_V2_FREE_SERVICES: Record<string, string> = {
    windshieldWater: "ماء المساحات",
    tirePressure: "ضغط الإطارات",
    engineClean: "تنظيف محرك بالبخار",
};

export default function WorkOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const { employeeRole, employeeBranchId, permissionWorkOrders, loading: authLoading } = useAuth();

    const [order, setOrder] = useState<WorkOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);
    const [liveSeconds, setLiveSeconds] = useState(0);
    const [isAddingSvc, setIsAddingSvc] = useState(false);
    const [inspectedServices, setInspectedServices] = useState<ReportServiceResult[]>([]);
    
    // Diagnostic Modal States
    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [diagName, setDiagName] = useState("");
    const [diagStatus, setDiagStatus] = useState("يحتاج صيانة");
    const [diagNotes, setDiagNotes] = useState("");
    
    // Print Preview States
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewMode, setPreviewMode] = useState<'full' | 'short'>('short');

    // Technician & Bay Details States
    const [techName, setTechName] = useState("");
    const [supervisorName, setSupervisorName] = useState("");
    const [bayNum, setBayNum] = useState("");
    const [odometer, setOdometer] = useState("");
    const [maintNotes, setMaintNotes] = useState("");
    const [isSavingDetails, setIsSavingDetails] = useState(false);

    // Add Dynamic Service States
    const [selectedCatalogId, setSelectedCatalogId] = useState("");
    const [dynamicSvcName, setDynamicSvcName] = useState("");
    const [dynamicSvcPrice, setDynamicSvcPrice] = useState("");
    const [dynamicSvcDuration, setDynamicSvcDuration] = useState("30");
    const [dynamicSvcDetails, setDynamicSvcDetails] = useState("");
    const [dynamicSvcCategory, setDynamicSvcCategory] = useState("إضافة لاحقة");

    // Suggestion lists (technicians, supervisors, bay numbers)
    const [suggLists, setSuggLists] = useState<Record<string, string[]>>({
        technicianNames: [], supervisorNames: [], bayNumbers: []
    });
    
    // Fetch
    useEffect(() => {
        if (authLoading) return;
        fetchOrder();
        
        // Subscription for live mid-air updates
        const channel = supabase.channel(`work_order_${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inspection_reports', filter: `id=eq.${id}` }, () => {
                fetchOrder();
            }).subscribe();
            
        return () => { supabase.removeChannel(channel); };
    }, [id, authLoading]);

    const fetchOrder = async () => {
        const { data } = await supabase
            .from('inspection_reports')
            .select(`id, report_number, status, estimated_duration, elapsed_time, start_time, completed_at, is_delayed, odometer_reading, total_price, bay_number, notes, selected_services, branch_id, branches(id, name), vehicles (make, model, plate_number, engine_size, booklet_serial, clients (name, phone)), receptionist:receptionist_id(name)`)
            .eq('id', id)
            .single();

        if (data) {
            if (employeeBranchId && employeeRole !== 'Owner' && data.branch_id && data.branch_id !== employeeBranchId) {
                setUnauthorized(true);
                setLoading(false);
                return;
            }
            setOrder(data as any as WorkOrder);
            
            // Initialize details states
            const firstSvc = data.selected_services?.[0];
            setTechName(firstSvc?.technicianName || "");
            setSupervisorName(firstSvc?.shiftSupervisor || "");
            setBayNum(data.bay_number || "");
            setOdometer(data.odometer_reading?.toString() || "");
            setMaintNotes(data.notes || "");

            // Fetch suggestions for this order's branch
            (supabase as any).from('suggestion_lists').select('key, items')
                .in('key', ['technicianNames', 'supervisorNames', 'bayNumbers'])
                .eq('branch_id', data.branch_id)
                .then(({ data: suggData }: { data: any[] | null }) => {
                    if (suggData) {
                        const m: Record<string, string[]> = {};
                        suggData.forEach(r => { m[r.key] = Array.isArray(r.items) ? r.items : []; });
                        setSuggLists(prev => ({ ...prev, ...m }));
                    }
                });
            
            let currentLiveSeconds = (data.elapsed_time || 0) * 60;
            if (data.status === 'قيد العمل' && data.start_time) {
                const startMs = new Date(data.start_time).getTime();
                currentLiveSeconds += Math.floor((Date.now() - startMs) / 1000);
            }
            setLiveSeconds(currentLiveSeconds);
            
            // Fetch inspected services (The actual health check)
            const { data: svcs } = await supabase.from('report_services').select('*').eq('report_id', id);
            if (svcs) setInspectedServices(svcs as any);
        }
        setLoading(false);
    };

    // Live Timer Engine
    useEffect(() => {
        if (!order || order.status !== 'قيد العمل' || !order.start_time) return;

        const interval = setInterval(() => {
            const startMs = new Date(order.start_time!).getTime();
            const nowMs = Date.now();
            setLiveSeconds((order.elapsed_time || 0) * 60 + Math.floor((nowMs - startMs) / 1000));
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, [order]);

    const handleSaveDetailsOnly = async () => {
        if (!order) return;
        setIsSavingDetails(true);
        try {
            const updatedServices = [...(order.selected_services || [])];
            if (updatedServices.length > 0) {
                updatedServices[0] = {
                    ...updatedServices[0],
                    technicianName: techName,
                    shiftSupervisor: supervisorName
                };
            } else {
                updatedServices.push({
                    is_paper_v2_format: true,
                    technicianName: techName,
                    shiftSupervisor: supervisorName,
                    services: {}
                });
            }

            const { error } = await supabase
                .from('inspection_reports')
                .update({
                    bay_number: bayNum || null,
                    notes: maintNotes || null,
                    odometer_reading: odometer ? parseInt(odometer) : 0,
                    selected_services: updatedServices
                })
                .eq('id', id);

            if (error) throw error;
            showSuccess("تم الحفظ", "تم تحديث تفاصيل الصيانة بنجاح!");
            fetchOrder();
        } catch (err) {
            console.error(err);
            showError("خطأ", "فشل حفظ التفاصيل");
        } finally {
            setIsSavingDetails(false);
        }
    };

    const handleStart = async () => {
        if (!order) return;
        if (!techName.trim()) {
            showError("تنبيه", "يرجى كتابة اسم الفني أولاً للبدء بالعمل!");
            return;
        }

        try {
            const updatedServices = [...(order.selected_services || [])];
            if (updatedServices.length > 0) {
                updatedServices[0] = {
                    ...updatedServices[0],
                    technicianName: techName,
                    shiftSupervisor: supervisorName
                };
            } else {
                updatedServices.push({
                    is_paper_v2_format: true,
                    technicianName: techName,
                    shiftSupervisor: supervisorName,
                    services: {}
                });
            }

            const { error } = await supabase
                .from('inspection_reports')
                .update({ 
                    status: 'قيد العمل', 
                    start_time: new Date().toISOString(),
                    bay_number: bayNum || null,
                    notes: maintNotes || null,
                    odometer_reading: odometer ? parseInt(odometer) : 0,
                    selected_services: updatedServices
                })
                .eq('id', id);

            if (error) throw error;
            showSuccess("تم البدء", "تم بدء العمل على المركبة بنجاح!");
            fetchOrder();
        } catch (err) {
            console.error(err);
            showError("خطأ", "فشل بدء العمل");
        }
    };

    const handleComplete = async () => {
        let finalElapsed = order?.elapsed_time || 0;
        if (order?.start_time) {
            const startMs = new Date(order.start_time).getTime();
            finalElapsed += Math.floor((Date.now() - startMs) / 60000);
        }
        const isDelayed = finalElapsed > (order?.estimated_duration || 0);

        await supabase.from('inspection_reports')
            .update({ 
                status: 'تم الانتهاء', 
                elapsed_time: finalElapsed, 
                is_delayed: isDelayed, 
                completed_at: new Date().toISOString() 
            })
            .eq('id', id);
        fetchOrder();
    };

    const handleAddDynamicService = async (svc: any) => {
        if (!order) return;
        const updatedServices = [...(order.selected_services || []), svc];
        const newEstimated = order.estimated_duration + (svc.estimatedMinutes || 0);
        const newTotalPrice = (order.total_price || 0) + (svc.price || 0);
        
        await supabase.from('inspection_reports').update({ 
            selected_services: updatedServices, 
            estimated_duration: newEstimated,
            total_price: newTotalPrice
        }).eq('id', id);
        
        setIsAddingSvc(false);
        fetchOrder();
    };

    const handleAddDiagnosis = async () => {
        if (!diagName) return;
        await supabase.from('report_services').insert([{
            report_id: id,
            category: diagName,
            status: diagStatus as any,
            notes: diagNotes,
            service_price: 0
        }]);
        setIsDiagnosing(false);
        setDiagName("");
        setDiagNotes("");
        fetchOrder();
    };

    const handleEditTime = async () => {
        const newTime = prompt('أدخل الوقت المقدر الجديد بالدقائق:', order?.estimated_duration.toString());
        if (newTime && !isNaN(Number(newTime))) {
            await supabase.from('inspection_reports').update({ estimated_duration: Number(newTime) }).eq('id', id);
            fetchOrder();
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500 w-12 h-12" />
            </div>
        );
    }

    if (employeeRole !== 'Owner' && !permissionWorkOrders) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center p-4 text-center font-ibm" dir="rtl">
                <div className="glass-card p-8 rounded-3xl border border-rose-500/20 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-rose-500 mb-2">غير مصرح بالوصول</h2>
                    <p className="text-muted-foreground mb-6">ليس لديك صلاحية للوصول إلى ساحة الورشة والعمل الحي.</p>
                </div>
            </div>
        );
    }

    if (unauthorized) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center p-4 text-center font-ibm" dir="rtl">
                <div className="glass-card p-8 rounded-3xl border border-rose-500/20 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-rose-500 mb-2">غير مصرح بالوصول</h2>
                    <p className="text-muted-foreground mb-6">أمر العمل هذا ينتمي لفرع آخر، لا يمكنك الاطلاع على تفاصيله.</p>
                </div>
            </div>
        );
    }

    if (loading) return <div className="p-12 text-center text-foreground"><Clock className="animate-spin inline mr-2"/> جاري تحميل البيانات الحية...</div>;
    
    if (!order) return (
        <div className="p-12 text-center" dir="rtl">
            <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48}/>
            <h2 className="text-xl font-bold text-foreground mb-2">أمر العمل غير موجود</h2>
            <p className="text-muted-foreground mb-6">هذا المعرف (ID) غير مسجل في قاعدة البيانات، تأكد أنك أنشأت أمر عمل حقيقي من قسم الصيانة.</p>
            <Link href="/work-orders" className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">العودة للساحة</Link>
        </div>
    );

    const totalEstimatedSeconds = order.estimated_duration * 60;
    const isOverdue = order.status !== 'تم الانتهاء' && liveSeconds > totalEstimatedSeconds;
    
    const displayLiveMins = Math.floor(liveSeconds / 60);
    const displayLiveSecs = liveSeconds % 60;
    const liveTimeString = `${displayLiveMins.toString().padStart(2, '0')}:${displayLiveSecs.toString().padStart(2, '0')}`;

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto" dir="rtl">
            {/* Header */}
            <div className="print:hidden flex flex-col md:flex-row justify-between gap-4 items-start md:items-center bg-card p-6 rounded-3xl border border-border shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/work-orders" className="text-muted-foreground hover:text-foreground transition-colors p-1 bg-muted rounded-md border border-border"><ArrowRight size={16}/></Link>
                        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                            تفاصيل أمر العمل <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1 rounded-xl text-lg flex items-center font-mono font-black">#{order.report_number}</span>
                        </h1>
                    </div>
                    <p className="text-muted-foreground font-bold text-sm bg-muted inline-block px-3 py-1 rounded-lg border border-border">{order.vehicles?.clients?.name} - {order.vehicles?.make} {order.vehicles?.model}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => { setPreviewOpen(true); setPreviewMode('short'); }}
                        className="px-4 py-2.5 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/20 text-cyan-400 font-bold transition-all flex items-center gap-2 rounded-xl text-xs md:text-sm shadow-sm shadow-cyan-950/20"
                    >
                        <Eye size={16} /> معاينة التقرير 🔍
                    </button>
                    <div className="flex bg-background border border-border rounded-xl shadow-sm overflow-hidden">
                        <button 
                            onClick={() => router.push(`/print/${id}?mode=short`)}
                            className="px-4 py-2.5 hover:bg-muted font-bold transition-colors flex items-center gap-2 border-l border-border text-xs md:text-sm"
                        >
                            <Printer size={16} /> طباعة للفني (مختصر)
                        </button>
                        <button 
                            onClick={() => router.push(`/print/${id}?mode=full`)}
                            className="px-4 py-2.5 hover:bg-muted font-bold transition-colors flex items-center gap-2 text-xs md:text-sm text-rose-500"
                        >
                            <Printer size={16} /> طباعة كامل (للعميل)
                        </button>
                    </div>
                    {order.vehicles?.booklet_serial && (
                        <button 
                            onClick={() => window.open(`/print/${id}?mode=sticker`, '_blank')}
                            className="px-4 py-2.5 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-400 font-bold transition-all flex items-center gap-2 rounded-xl text-xs md:text-sm shadow-sm"
                        >
                            🏷️ ملصق الدفتر (Sticker)
                        </button>
                    )}
                    {order.status === 'تم الاستلام' && (
                        <button onClick={handleStart} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
                            <Play size={18} /> بدء التشغيل (Start Check)
                        </button>
                    )}
                    {order.status === 'قيد العمل' && (
                        <button onClick={handleComplete} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30">
                            <StopCircle size={18} /> إنهاء الصيانة (Finish)
                        </button>
                    )}
                    {order.status === 'تم الانتهاء' && (
                        <span className="px-6 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 font-bold flex items-center gap-2">
                            <CheckCircle2 size={18} /> المركبة جاهزة
                        </span>
                    )}
                </div>
            </div>

            <div className="print:hidden grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Right Column */}
                <div className="lg:col-span-1 space-y-6 flex flex-col">
                    {/* Live Timer Status */}
                    <div className={`glass-card p-8 rounded-3xl border-2 flex flex-col items-center justify-center text-center relative overflow-hidden transition-colors ${order.status === 'تم الانتهاء' ? 'border-emerald-500/50 bg-emerald-500/5' : isOverdue ? 'border-rose-500/50 bg-rose-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                        <div className="mb-4">
                            <Activity className={order.status === 'تم الانتهاء' ? 'text-emerald-500' : isOverdue ? 'text-rose-500 animate-pulse' : 'text-blue-500'} size={48} />
                        </div>
                        <p className="text-muted-foreground font-bold mb-2 uppercase text-xs tracking-wider">الزمن المستغرق (Live Timing)</p>
                        <p className={`text-6xl font-display font-black font-mono mb-2 ${order.status === 'تم الانتهاء' ? 'text-emerald-500' : isOverdue ? 'text-rose-500' : 'text-blue-500'}`}>
                            {order.status === 'تم الانتهاء' ? `${order.elapsed_time}:00` : liveTimeString}
                        </p>
                        <p className="text-muted-foreground text-sm font-medium flex items-center justify-center gap-2">
                            من أصل <span className="text-foreground font-bold bg-muted px-2 py-0.5 rounded border border-border">{order.estimated_duration}m</span> مقدرة
                            {order.status !== 'تم الانتهاء' && (
                                <button onClick={handleEditTime} className="text-blue-500 hover:text-blue-400 p-1 bg-blue-500/10 rounded">تعديل</button>
                            )}
                        </p>
                        
                        {isOverdue && order.status !== 'تم الانتهاء' && (
                            <div className="absolute top-0 w-full bg-rose-500 text-white text-xs font-bold py-1">⚠️ تأخير عن الموعد!</div>
                        )}
                        {order.status === 'قيد العمل' && !isOverdue && (
                            <div className="absolute top-0 w-full bg-blue-500 text-white text-xs font-bold py-1">العداد يعمل الآن...</div>
                        )}
                    </div>

                    {/* Technician Details & Start Card */}
                    <div className="glass-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Wrench className="text-blue-500" size={18} /> تفاصيل الصيانة والفني
                        </h3>
                        <hr className="border-border" />
                        
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">اسم المشرف</label>
                                <input
                                    type="text"
                                    list="wo-supervisor-list"
                                    value={supervisorName}
                                    onChange={(e) => setSupervisorName(e.target.value)}
                                    placeholder="أدخل اسم المشرف..."
                                    className="w-full bg-card border border-border rounded-xl p-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none transition-colors font-ibm"
                                />
                                <datalist id="wo-supervisor-list">
                                    {suggLists.supervisorNames.map((n, i) => <option key={i} value={typeof n === 'object' && n !== null ? (n as any).name : n} />)}
                                </datalist>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">اسم الفني</label>
                                <input
                                    type="text"
                                    list="wo-tech-list"
                                    value={techName}
                                    onChange={(e) => setTechName(e.target.value)}
                                    placeholder="أدخل اسم الفني المسؤول..."
                                    className="w-full bg-card border border-border rounded-xl p-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none transition-colors font-ibm"
                                />
                                <datalist id="wo-tech-list">
                                    {suggLists.technicianNames.map((n, i) => <option key={i} value={typeof n === 'object' && n !== null ? (n as any).name : n} />)}
                                </datalist>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">رقم الخانة (Bay Number)</label>
                                <input
                                    type="text"
                                    list="wo-bay-list"
                                    value={bayNum}
                                    onChange={(e) => setBayNum(e.target.value)}
                                    placeholder="مثال: الخانة 1..."
                                    className="w-full bg-card border border-border rounded-xl p-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none transition-colors font-ibm"
                                />
                                <datalist id="wo-bay-list">
                                    {suggLists.bayNumbers.map((n, i) => <option key={i} value={typeof n === 'object' && n !== null ? (n as any).name : n} />)}
                                </datalist>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">عداد السيارة (Odometer)</label>
                                <input
                                    type="number"
                                    value={odometer}
                                    onChange={(e) => setOdometer(e.target.value)}
                                    placeholder="أدخل قراءة العداد بالكم..."
                                    className="w-full bg-card border border-border rounded-xl p-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none transition-colors font-ibm"
                                />
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-muted-foreground block mb-1">ملاحظات الصيانة العامة</label>
                                <textarea
                                    value={maintNotes}
                                    onChange={(e) => setMaintNotes(e.target.value)}
                                    placeholder="اكتب أي ملاحظات صيانة هنا..."
                                    rows={3}
                                    className="w-full bg-card border border-border rounded-xl p-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none transition-colors resize-none font-ibm"
                                />
                            </div>
                        </div>
                        
                        {order.status === 'تم الاستلام' && (
                            <button
                                onClick={handleStart}
                                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2 font-ibm"
                            >
                                <Play size={16} /> حفظ وابدأ بالعمل
                            </button>
                        )}
                        
                        {order.status !== 'تم الاستلام' && (
                            <button
                                onClick={handleSaveDetailsOnly}
                                disabled={isSavingDetails}
                                className="w-full py-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-foreground font-bold rounded-xl transition-all flex items-center justify-center gap-2 font-ibm"
                            >
                                {isSavingDetails ? (
                                    <>
                                        <Loader2 className="animate-spin w-4 h-4" /> جاري الحفظ...
                                    </>
                                ) : (
                                    <>حفظ التفاصيل فقط</>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Left: Services List & Inspected items */}
                <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-border shadow-sm flex flex-col gap-6">
                    
                    {/* Part 1: Requested Services */}
                    <div>
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-rose-500/10">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Wrench className="text-rose-500" size={20}/> الخدمات المطلوبة (Services)</h2>
                        <button onClick={() => setIsAddingSvc(!isAddingSvc)} className="text-blue-600 hover:text-blue-500 text-sm font-bold flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors font-ibm">
                            <Plus size={16} /> إضافة خدمة إضافية
                        </button>
                        </div>

                        {isAddingSvc && (
                            <div className="mb-4 p-4 bg-muted/50 rounded-2xl border border-border space-y-4 font-ibm text-right" dir="rtl">
                                <h3 className="text-sm font-bold text-foreground">إضافة خدمة جديدة من الكتالوج أو مخصصة:</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-muted-foreground block mb-1">اختر الخدمة:</label>
                                        <select
                                            value={selectedCatalogId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setSelectedCatalogId(val);
                                                if (val === "custom") {
                                                    setDynamicSvcName("");
                                                    setDynamicSvcPrice("");
                                                    setDynamicSvcDuration("30");
                                                    setDynamicSvcCategory("خدمة مخصصة");
                                                } else {
                                                    const catalog = [...(catalogRaw.services || []), ...(catalogRaw.inspections || [])];
                                                    const selected = catalog.find(item => item.id === val);
                                                    if (selected) {
                                                        setDynamicSvcName(selected.name);
                                                        setDynamicSvcPrice(selected.defaultPrice?.toString() || "");
                                                        setDynamicSvcDuration(selected.estimatedMinutes?.toString() || "30");
                                                        setDynamicSvcCategory(selected.category || "إضافة لاحقة");
                                                    }
                                                }
                                            }}
                                            className="w-full bg-card border border-border rounded-xl p-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none"
                                        >
                                            <option value="">-- اختر خدمة --</option>
                                            <option value="custom">✍️ خدمة مخصصة (كتابة يدوية)</option>
                                            <optgroup label="الخدمات الرئيسية">
                                                {(catalogRaw.services || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </optgroup>
                                            <optgroup label="الفحوصات والتشخيص">
                                                {(catalogRaw.inspections || []).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                            </optgroup>
                                        </select>
                                    </div>

                                    {selectedCatalogId && (
                                        <div>
                                            <label className="text-xs text-muted-foreground block mb-1">اسم الخدمة:</label>
                                            <input
                                                type="text"
                                                value={dynamicSvcName}
                                                onChange={e => setDynamicSvcName(e.target.value)}
                                                placeholder="اكتب اسم الخدمة..."
                                                className="w-full bg-card border border-border rounded-xl p-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none"
                                            />
                                        </div>
                                    )}
                                </div>

                                {selectedCatalogId && (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-muted-foreground block mb-1">السعر (د.ع):</label>
                                                <input
                                                    type="number"
                                                    value={dynamicSvcPrice}
                                                    onChange={e => setDynamicSvcPrice(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full bg-card border border-border rounded-xl p-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground block mb-1">الوقت المقدر (بالدقائق):</label>
                                                <input
                                                    type="number"
                                                    value={dynamicSvcDuration}
                                                    onChange={e => setDynamicSvcDuration(e.target.value)}
                                                    placeholder="30"
                                                    className="w-full bg-card border border-border rounded-xl p-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground block mb-1">التفاصيل/الملاحظة:</label>
                                                <input
                                                    type="text"
                                                    value={dynamicSvcDetails}
                                                    onChange={e => setDynamicSvcDetails(e.target.value)}
                                                    placeholder="الشركة المصنعة، الملاحظات..."
                                                    className="w-full bg-card border border-border rounded-xl p-2.5 text-sm text-foreground focus:border-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={async () => {
                                                    if (!dynamicSvcName) {
                                                        showError("تنبيه", "يرجى كتابة اسم الخدمة!");
                                                        return;
                                                    }
                                                    const newSvc = {
                                                        name: dynamicSvcName,
                                                        category: dynamicSvcCategory,
                                                        estimatedMinutes: parseInt(dynamicSvcDuration) || 30,
                                                        price: parseFloat(dynamicSvcPrice) || 0,
                                                        details: dynamicSvcDetails
                                                    };
                                                    await handleAddDynamicService(newSvc);
                                                    setSelectedCatalogId("");
                                                    setDynamicSvcName("");
                                                    setDynamicSvcPrice("");
                                                    setDynamicSvcDuration("30");
                                                    setDynamicSvcDetails("");
                                                }}
                                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors font-ibm"
                                            >
                                                إضافة الخدمة
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsAddingSvc(false);
                                                    setSelectedCatalogId("");
                                                }}
                                                className="px-5 py-2.5 bg-background border border-border text-foreground hover:bg-muted rounded-xl text-sm font-bold transition-colors font-ibm"
                                            >
                                                إلغاء
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(() => {
                                const svcs: {name: string, category: string, estimatedMinutes?: number, price?: string | number, qty?: string | number, notes?: string, details?: string}[] = [];
                                
                                order.selected_services?.forEach(svc => {
                                    if (svc.is_paper_v2_format) {
                                        const services = svc.services || {};
                                        Object.entries(services).forEach(([key, value]: [string, any]) => {
                                            const def = PAPER_V2_SERVICE_DEFS[key];
                                            if (!def || !value) return;
                                            if (value.status === 'جيد') return;

                                            const hasStatus = !!value.status;
                                            const hasPrice = value.price !== undefined && value.price !== null && String(value.price).trim() !== "";
                                            const hasDetails = value.details && Object.values(value.details).some((d: any) => String(d ?? "").trim() !== "");

                                            if (!hasStatus && !hasPrice && !hasDetails) return;

                                            const statusLabel = hasStatus ? ` - ${value.status}` : "";
                                            
                                            let detailsStr = "";
                                            let notesStr = "";
                                            if (value.details) {
                                                const detailsArr: string[] = [];
                                                Object.entries(value.details).forEach(([k, v]: [string, any]) => {
                                                    const strVal = String(v ?? "").trim();
                                                    if (strVal) {
                                                        if (k === 'notes') {
                                                            notesStr = strVal;
                                                        } else {
                                                            detailsArr.push(strVal);
                                                        }
                                                    }
                                                });
                                                detailsStr = detailsArr.join(" | ");
                                            }

                                            svcs.push({
                                                name: `${def.name}${statusLabel}`,
                                                category: "نموذج الاستقبال",
                                                estimatedMinutes: def.estimatedMinutes,
                                                details: detailsStr,
                                                notes: notesStr,
                                                price: value.price
                                            });
                                        });

                                        const freeServices = svc.freeServices || {};
                                        Object.entries(PAPER_V2_FREE_SERVICES).forEach(([key, label]) => {
                                            if (freeServices[key]) {
                                                svcs.push({
                                                    name: label,
                                                    category: "فحص مجاني",
                                                    estimatedMinutes: 10,
                                                });
                                            }
                                        });

                                        const customServices = svc.customServices || [];
                                        customServices.forEach((cs: any) => {
                                            svcs.push({
                                                name: cs.label,
                                                category: "حدث صيانة إضافي",
                                                estimatedMinutes: 30,
                                                price: cs.price,
                                                qty: cs.qty,
                                                notes: cs.notes
                                            });
                                        });
                                    } else if (svc.is_paper_format) {
                                        if (svc.services?.engineOil) svcs.push({ name: 'تغيير زيت المحرك', category: 'صيانة ورقية', estimatedMinutes: 30 });
                                        if (svc.services?.transOil) svcs.push({ name: 'تغيير زيت ناقل الحركة', category: 'صيانة ورقية', estimatedMinutes: 45 });
                                        if (svc.services?.filters) svcs.push({ name: 'تغيير الفلاتر', category: 'صيانة ورقية', estimatedMinutes: 20 });
                                        if (svc.services?.cooling) svcs.push({ name: 'تنظيف دورة التبريد', category: 'صيانة ورقية', estimatedMinutes: 60 });
                                        if (svc.services?.brakes) svcs.push({ name: 'فحص نظام الفرامل', category: 'صيانة ورقية', estimatedMinutes: 30 });
                                        if (svc.services?.comprehensive) svcs.push({ name: 'فحص شامل (خدمة الإعزاز)', category: 'فحص شامل', estimatedMinutes: 60 });
                                        
                                        if (svc.texts?.deviceCheck) svcs.push({ name: `فحص بالجهاز: ${svc.texts.deviceCheck}`, category: 'اضافي', estimatedMinutes: 30 });
                                        if (svc.texts?.maintenanceText) svcs.push({ name: `ادامة: ${svc.texts.maintenanceText}`, category: 'اضافي', estimatedMinutes: 45 });
                                    } else {
                                        // Legacy / Dynamically added arrays
                                        svcs.push(svc);
                                    }
                                });

                                if (svcs.length === 0) {
                                    return <p className="text-muted-foreground text-sm col-span-2">لم يتم تحديد خدمات رئيسية.</p>;
                                }

                                return svcs.map((svc, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-card border border-border rounded-xl shadow-sm hover:border-rose-500/30 transition-colors">
                                        <div>
                                            <p className="font-bold text-foreground text-sm">{svc.name}</p>
                                            <p className="text-[10px] text-muted-foreground">{svc.category} {(svc as any).details ? `• ${(svc as any).details}` : ''}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(svc as any).price !== undefined && (svc as any).price > 0 && (
                                                <span className="font-mono text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                    {Number((svc as any).price).toLocaleString()} د.ع
                                                </span>
                                            )}
                                            {(svc as any).qty && (
                                                <span className="font-mono text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                                    الكمية: {(svc as any).qty}
                                                </span>
                                            )}
                                            {(svc as any).notes && (
                                                <span className="font-mono text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 max-w-[150px] truncate" title={(svc as any).notes}>
                                                    ملاحظات: {(svc as any).notes}
                                                </span>
                                            )}
                                            <div className="text-left font-mono font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md text-xs">
                                                {svc.estimatedMinutes || 30}m
                                            </div>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    {/* Part 2: Detailed Inspected Items (Health Check) */}
                    <div>
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-emerald-500/10">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={20}/> تشخيص الأعطال (Diagnosis)</h2>
                            <button onClick={() => setIsDiagnosing(true)} className="text-emerald-600 hover:text-emerald-500 text-sm font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors font-ibm">
                                <Plus size={16} /> تسجيل عطل فني
                            </button>
                        </div>

                        {/* Diagnostics Form */}
                        {isDiagnosing && (
                            <div className="mb-4 p-4 bg-muted/50 rounded-2xl border border-border space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-muted-foreground">اسم الجزء التالف (مثال: المحرك، فريون، الكير)</label>
                                    <input value={diagName} onChange={e=>setDiagName(e.target.value)} type="text" className="w-full mt-1 bg-card border border-border rounded-lg p-2 text-sm" placeholder="اكتب الجزء المربوط بالعطل..." />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground">التشخيص</label>
                                        <select value={diagStatus} onChange={e=>setDiagStatus(e.target.value)} className="w-full mt-1 bg-card border border-border rounded-lg p-2 text-sm">
                                            <option value="يحتاج صيانة">يحتاج صيانة</option>
                                            <option value="تالف">تالف تماماً</option>
                                            <option value="سليم">سليم وتم فحصه</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-muted-foreground">ملاحظات الفني (اسباب/تفاصيل)</label>
                                        <input value={diagNotes} onChange={e=>setDiagNotes(e.target.value)} type="text" className="w-full mt-1 bg-card border border-border rounded-lg p-2 text-sm" placeholder="اكتب ملاحظة..." />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={handleAddDiagnosis} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-bold">تسجيل العطل</button>
                                    <button onClick={() => setIsDiagnosing(false)} className="px-4 bg-muted border border-border text-foreground py-2 rounded-lg text-sm font-bold">إلغاء</button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                            {inspectedServices.map((svc) => (
                                <div key={svc.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-muted/30 border border-border rounded-xl gap-3">
                                    <div>
                                        <p className="font-bold text-foreground text-sm">{svc.category}</p>
                                        {svc.notes && <p className="text-xs text-muted-foreground mt-1">الملاحظة: {svc.notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {svc.service_price && svc.service_price > 0 && (
                                            <span className="font-mono text-sm font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">{svc.service_price} د.ع</span>
                                        )}
                                        <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                                            svc.status === 'سليم' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                            svc.status === 'يحتاج صيانة' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                            'bg-rose-500/10 text-rose-600 border-rose-500/20'
                                        }`}>
                                            {svc.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {inspectedServices.length === 0 && (
                                <p className="text-muted-foreground text-sm">التشخيص لم يبدأ أو لم يتم تسجيل ملاحظات العطل.</p>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Print Preview Modal */}
            {previewOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-ibm">
                    <div className="bg-[#0c101d] border border-cyan-900/30 rounded-3xl p-6 max-w-4xl w-full h-[90vh] shadow-[0_0_60px_rgba(6,182,212,0.15)] animate-scale-in flex flex-col space-y-4 text-right" dir="rtl">
                        
                        {/* Header Area */}
                        <div className="flex items-center justify-between border-b border-border/40 pb-4">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-bold text-foreground">🔍 معاينة التقرير والفاتورة</h3>
                                {order && (
                                    <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg px-2.5 py-1 font-mono">
                                        #{order.report_number}
                                    </span>
                                )}
                            </div>
                            
                            {/* Controls */}
                            <div className="flex items-center gap-3">
                                {/* Toggle full/short Mode */}
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

                                {/* Direct Print Button */}
                                <button
                                    onClick={() => window.open(`/print/${id}?mode=${previewMode}`, '_blank')}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-600/20 text-xs"
                                >
                                    <Printer size={16} /> إرسال للطباعة 🖨️
                                </button>
                                {order?.vehicles?.booklet_serial && (
                                    <button
                                        onClick={() => window.open(`/print/${id}?mode=sticker`, '_blank')}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-amber-600/20 text-xs"
                                    >
                                        🏷️ ملصق الدفتر
                                    </button>
                                )}

                                {/* Close Button */}
                                <button
                                    onClick={() => setPreviewOpen(false)}
                                    className="p-2 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-xl transition-all border border-border/40"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Preview Area */}
                        <div className="flex-1 overflow-auto bg-neutral-950/60 border border-border/20 rounded-2xl p-4 md:p-6 flex justify-center items-start min-h-0 relative">
                            {order ? (
                                <div className="bg-white p-6 rounded-2xl shadow-2xl overflow-x-auto min-w-[800px] transition-transform origin-top print-preview-doc">
                                    <PrintableInspectionReport report={order} mode={previewMode} />
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground">حدث خطأ أثناء تحميل التقرير.</div>
                            )}
                        </div>
                        
                    </div>
                </div>
            )}

        </div>
    );
}
