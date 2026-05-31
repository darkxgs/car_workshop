"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Clock, CheckCircle2, Play, AlertTriangle, Plus, Printer, Activity, Wrench, StopCircle, ArrowRight, Loader2 } from "lucide-react";
import catalogRaw from '@/lib/data/servicesCatalog.json';
import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";

type WorkOrder = {
    id: string;
    report_number: number;
    status: string;
    estimated_duration: number;
    elapsed_time: number;
    start_time: string | null;
    is_delayed: boolean;
    selected_services: any[];
    receptionist: { name: string } | null;
    vehicles: { make: string; model: string; plate_number: string, clients?: { name: string; phone: string } };
    bay_number: string | null;
    technician_id: string | null;
    branch_id: string | null;
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
            .select(`id, report_number, status, estimated_duration, elapsed_time, start_time, is_delayed, bay_number, selected_services, branch_id, vehicles (make, model, plate_number, clients (name, phone)), receptionist:receptionist_id(name)`)
            .eq('id', id)
            .single();

        if (data) {
            if (employeeBranchId && employeeRole !== 'Owner' && data.branch_id && data.branch_id !== employeeBranchId) {
                setUnauthorized(true);
                setLoading(false);
                return;
            }
            setOrder(data as any as WorkOrder);
            
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

    const handleStart = async () => {
        const bayNum = prompt('أدخل رقم الخانة (Bay Number):', order?.bay_number || '');
        if (bayNum === null) return; // Cancelled
        
        await supabase.from('inspection_reports').update({ 
            status: 'قيد العمل', 
            start_time: new Date().toISOString(),
            bay_number: bayNum || null 
        }).eq('id', id);
        fetchOrder();
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
        const newEstimated = order.estimated_duration + svc.estimatedMinutes;
        
        await supabase.from('inspection_reports').update({ selected_services: updatedServices, estimated_duration: newEstimated }).eq('id', id);
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
                {/* Right: Live Timer Status */}
                <div className={`lg:col-span-1 glass-card p-8 rounded-3xl border-2 flex flex-col items-center justify-center text-center relative overflow-hidden transition-colors ${order.status === 'تم الانتهاء' ? 'border-emerald-500/50 bg-emerald-500/5' : isOverdue ? 'border-rose-500/50 bg-rose-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
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

                {/* Left: Services List & Inspected items */}
                <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-border shadow-sm flex flex-col gap-6">
                    
                    {/* Part 1: Requested Services */}
                    <div>
                        <div className="flex justify-between items-center mb-4 pb-3 border-b border-rose-500/10">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Wrench className="text-rose-500" size={20}/> الخدمات المطلوبة (Services)</h2>
                            {order.status !== 'تم الانتهاء' && (
                                <button onClick={() => setIsAddingSvc(!isAddingSvc)} className="text-blue-600 hover:text-blue-500 text-sm font-bold flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-colors">
                                    <Plus size={16} /> إضافة خدمة إضافية
                                </button>
                            )}
                        </div>

                        {isAddingSvc && (
                            <div className="mb-4 p-4 bg-muted/50 rounded-2xl border border-border">
                                <h3 className="text-sm font-bold text-foreground mb-3">إضافة خدمة يدوية جديدة:</h3>
                                <div className="flex gap-2">
                                    <input type="text" id="manualSvcInput" placeholder="اكتب اسم الخدمة..." className="input-field flex-1 bg-card text-sm" />
                                    <button onClick={async () => {
                                        const input = document.getElementById('manualSvcInput') as HTMLInputElement;
                                        if (input && input.value) {
                                            const newSvc = { name: input.value, category: 'إضافة لاحقة', estimatedMinutes: 30 };
                                            await handleAddDynamicService(newSvc);
                                            input.value = '';
                                        }
                                    }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500">إضافة</button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {(() => {
                                const svcs: {name: string, category: string, estimatedMinutes?: number}[] = [];
                                
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
                                            svcs.push({
                                                name: `${def.name}${statusLabel}`,
                                                category: "نموذج الاستقبال",
                                                estimatedMinutes: def.estimatedMinutes,
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
                                            <p className="text-[10px] text-muted-foreground">{svc.category}</p>
                                        </div>
                                        <div className="text-left font-mono font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-md text-xs">
                                            {svc.estimatedMinutes || 30}m
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
                            {order.status !== 'تم الانتهاء' && (
                                <button onClick={() => setIsDiagnosing(true)} className="text-emerald-600 hover:text-emerald-500 text-sm font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors">
                                    <Plus size={16} /> تسجيل عطل فني
                                </button>
                            )}
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

        </div>
    );
}
