"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/lib/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
    UserPlus, Car, Save, Phone, Hash, AlertCircle, Loader2,
    CheckCircle2, ArrowLeft, ArrowRight, FileText, Printer, Play, CheckSquare
} from "lucide-react";

type Step = 1 | 2 | 3;

// Each of the 14 services has a status and type-specific detail fields
type ServiceEntry = {
    status: "جيد" | "يحتاج تغيير" | "";
    details: Record<string, string>; // flexible detail fields (type, number, qty, etc.)
    price: string;
};

const makeService = (): ServiceEntry => ({ status: "", details: {}, price: "" });

const FREE_SERVICES = [
    { key: "windshieldWater", label: "ماء المساحات" },
    { key: "tirePressure",    label: "ضغط الإطارات" },
    { key: "engineClean",    label: "تنظيف محرك بالبخار" },
];

// The 14 main services — updated to match official paper form
const MAIN_SERVICES: { key: string; label: string; detailFields: { key: string; label: string }[] }[] = [
    {
        key: "engineOil",
        label: "زيت المحرك",
        detailFields: [
            { key: "brand",     label: "نوع الزيت" },
            { key: "viscosity", label: "درجة اللزوجة" },
            { key: "liters",    label: "عدد اللترات" },
            { key: "unitPrice", label: "سعر اللتر" },
        ],
    },
    {
        key: "oilFilter",
        label: "فلتر زيت المحرك",
        detailFields: [
            { key: "type",      label: "نوع الفلتر" },
            { key: "filterNum", label: "رقم الفلتر" },
        ],
    },
    {
        key: "airFilter",
        label: "فلتر الهواء",
        detailFields: [
            { key: "type",      label: "نوع الفلتر" },
            { key: "filterNum", label: "رقم الفلتر" },
        ],
    },
    {
        key: "acFilter",
        label: "فلتر التبريد",
        detailFields: [
            { key: "type",      label: "نوع الفلتر" },
            { key: "filterNum", label: "رقم الفلتر" },
        ],
    },
    {
        key: "brakeFluid",
        label: "زيت المكابح",
        detailFields: [
            { key: "type", label: "نوع الزيت" },
            { key: "qty",  label: "عدد القطع" },
        ],
    },
    {
        key: "coolant",
        label: "ماء الراديتر",
        detailFields: [
            { key: "type", label: "نوع الماء" },
            { key: "size", label: "الحجم (4L / 1L)" },
            { key: "qty",  label: "العدد" },
            { key: "unitPrice", label: "سعر العبوة" },
        ],
    },
    {
        key: "battery",
        label: "البطارية",
        detailFields: [{ key: "type", label: "نوع البطارية والسعة" }],
    },
    {
        key: "engineBelts",
        label: "قايش المحرك",
        detailFields: [
            { key: "type", label: "نوع القايش" },
            { key: "num",  label: "رقم القايش" },
        ],
    },
    {
        key: "brakePads",
        label: "دسكات السيارة",
        detailFields: [
            { key: "type", label: "نوع الدسكات" },
            { key: "num",  label: "رقم الدسكات" },
        ],
    },
    {
        key: "sparkPlugs",
        label: "شمعات الاحتراق",
        detailFields: [
            { key: "type", label: "نوع الشمعات" },
            { key: "num",  label: "رقم البلكات" },
        ],
    },
    {
        key: "gearboxHydraulic",
        label: "هايدروليك الكير",
        detailFields: [
            { key: "type", label: "نوع الهيدروليك" },
            { key: "qty",  label: "عدد اللترات" },
        ],
    },
    {
        key: "wipers",
        label: "الماسحات",
        detailFields: [{ key: "type", label: "نوع الماسحات" }],
    },
    {
        key: "additives",
        label: "المضافات والمحسنات",
        detailFields: [{ key: "notes", label: "اسم المنتج" }],
    },
    {
        key: "maintenanceUnits",
        label: "حدات الصيانة",
        detailFields: [{ key: "notes", label: "وصف الحدة" }],
    },
];

const initServices = (): Record<string, ServiceEntry> => {
    const obj: Record<string, ServiceEntry> = {};
    MAIN_SERVICES.forEach(s => { obj[s.key] = makeService(); });
    return obj;
};

function ReceptionWizard() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const editId = searchParams.get('edit');
    const [editReportId, setEditReportId] = useState<string | null>(null);

    // Wizard step
    const [step, setStep] = useState<Step>(1);

    // ---------- Branches ----------
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

    // ---------- STEP 1: Customer & Vehicle ----------
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [clientSuggestions, setClientSuggestions] = useState<{ id: string; name: string; phone: string; vehicles: any[] }[]>([]);
    const [isSearchingClient, setIsSearchingClient] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [make, setMake] = useState("");
    const [model, setModel] = useState("");
    const [engineSize, setEngineSize] = useState("");
    const [odometer, setOdometer] = useState("");
    const [plateNumber, setPlateNumber] = useState("");

    // ---------- STEP 2: Services ----------
    const [freeServices, setFreeServices] = useState<Record<string, boolean>>({
        windshieldWater: false, tirePressure: false, engineClean: false,
    });
    const [services, setServices] = useState<Record<string, ServiceEntry>>(initServices());
    const [customServices, setCustomServices] = useState<{ id: string; label: string; status: string; price: string }[]>([]);

    // ---------- دفتر الخدمة ----------
    const [bookletType, setBookletType] = useState<"جديد" | "قديم" | "لا يوجد" | "">("");
    const [bookletChanges, setBookletChanges] = useState("");

    // ---------- STEP 3: Pricing & Notes ----------
    const [notes, setNotes] = useState("");
    const [totalPrice, setTotalPrice] = useState("");
    const [discount, setDiscount] = useState("");
    const [amountReceived, setAmountReceived] = useState("");
    const [amountOwedByClient, setAmountOwedByClient] = useState("");
    const [amountOwedToClient, setAmountOwedToClient] = useState("");

    // ---------- UI States ----------
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdWorkOrderId, setCreatedWorkOrderId] = useState<string | null>(null);
    const [reportNumber, setReportNumber] = useState<number | null>(null);

    // Fetch branches on mount
    useEffect(() => {
        supabase.from('branches').select('id, name').then(({ data }) => {
            if (data) setBranches(data);
        });
    }, []);

    // Load existing report for editing
    useEffect(() => {
        if (!editId) return;
        const loadReport = async () => {
            const { data } = await supabase.from('inspection_reports')
                .select(`id, status, notes, total_price, odometer_reading, selected_services, branch_id,
                         vehicles(id, make, model, engine_size, plate_number, clients(id, name, phone))`)
                .eq('id', editId).single();
            
            if (data) {
                setEditReportId(data.id);
                const vehicle = Array.isArray(data.vehicles) ? data.vehicles[0] : data.vehicles;
                const client = vehicle ? (Array.isArray(vehicle.clients) ? vehicle.clients[0] : vehicle.clients) : null;
                
                if (client) {
                    setName(client.name); setPhone(client.phone); setSelectedClientId(client.id);
                }
                if (vehicle) {
                    setMake(vehicle.make || ""); setModel(vehicle.model || "");
                    setEngineSize(vehicle.engine_size || ""); setPlateNumber(vehicle.plate_number || "");
                }
                setOdometer(data.odometer_reading?.toString() || "");
                setNotes(data.notes || "");
                if (data.branch_id) setSelectedBranchId(data.branch_id);
                
                const payload = Array.isArray(data.selected_services) ? data.selected_services[0] : data.selected_services;
                if (payload) {
                    if (payload.freeServices) setFreeServices(payload.freeServices);
                    if (payload.services) setServices({ ...initServices(), ...payload.services });
                    if (payload.customServices) setCustomServices(payload.customServices);
                    if (payload.booklet) {
                        setBookletType(payload.booklet.type || "");
                        setBookletChanges(payload.booklet.changes || "");
                    }
                    if (payload.pricing) {
                        setTotalPrice(payload.pricing.totalPrice || data.total_price?.toString() || "");
                        setDiscount(payload.pricing.discount || "");
                        setAmountReceived(payload.pricing.amountReceived || "");
                        setAmountOwedByClient(payload.pricing.amountOwedByClient || "");
                        setAmountOwedToClient(payload.pricing.amountOwedToClient || "");
                    } else {
                        setTotalPrice(data.total_price?.toString() || "");
                    }
                }
            }
        };
        loadReport();
    }, [editId]);

    // Custom services helpers
    const addCustomService = () => {
        setCustomServices(prev => [...prev, { id: Date.now().toString(), label: "", status: "", price: "" }]);
    };
    const removeCustomService = (id: string) => setCustomServices(prev => prev.filter(s => s.id !== id));
    const setCustomSvcField = (id: string, field: string, value: string) =>
        setCustomServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

    // Phone search
    useEffect(() => {
        if (!phone || phone.length < 3) { setClientSuggestions([]); return; }
        if (selectedClientId) return;
        const searchClient = async () => {
            setIsSearchingClient(true);
            const { data } = await supabase
                .from('clients')
                .select('id, name, phone, vehicles(make, model, engine_size, plate_number)')
                .ilike('phone', `%${phone}%`)
                .limit(5);
            setClientSuggestions(data || []);
            setIsSearchingClient(false);
        };
        const timeout = setTimeout(searchClient, 500);
        return () => clearTimeout(timeout);
    }, [phone, selectedClientId]);

    const selectSuggestion = (client: any) => {
        setPhone(client.phone);
        setName(client.name);
        setSelectedClientId(client.id);
        setClientSuggestions([]);
        if (client.vehicles && client.vehicles.length > 0) {
            const v = client.vehicles[0];
            setMake(v.make || ""); setModel(v.model || "");
            setEngineSize(v.engine_size || ""); setPlateNumber(v.plate_number || "");
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(e.target.value);
        if (selectedClientId) {
            setSelectedClientId(null);
            setName(""); setMake(""); setModel(""); setPlateNumber("");
        }
    };

    // Update a service's status
    const setServiceStatus = (key: string, status: "جيد" | "يحتاج تغيير") => {
        setServices(prev => ({ ...prev, [key]: { ...prev[key], status } }));
    };

    // Update a service's detail field
    const setServiceDetail = (key: string, field: string, value: string) => {
        setServices(prev => {
            const newDet = { ...prev[key].details, [field]: value };
            let newPrice = prev[key].price;
            if (key === 'engineOil' && (field === 'liters' || field === 'unitPrice')) {
                const l = parseFloat(field === 'liters' ? value : newDet.liters) || 0;
                const up = parseFloat(field === 'unitPrice' ? value : newDet.unitPrice) || 0;
                newPrice = (l * up) > 0 ? (l * up).toString() : '';
            }
            if (key === 'transOil' && (field === 'qty' || field === 'unitPrice')) {
                const q = parseFloat(field === 'qty' ? value : newDet.qty) || 0;
                const up = parseFloat(field === 'unitPrice' ? value : newDet.unitPrice) || 0;
                newPrice = (q * up) > 0 ? (q * up).toString() : '';
            }
            if (key === 'coolant' && (field === 'qty' || field === 'unitPrice')) {
                const q = parseFloat(field === 'qty' ? value : newDet.qty) || 0;
                const up = parseFloat(field === 'unitPrice' ? value : newDet.unitPrice) || 0;
                newPrice = (q * up) > 0 ? (q * up).toString() : '';
            }
            return {
                ...prev,
                [key]: { ...prev[key], details: newDet, price: newPrice }
            };
        });
    };

    // Update a service's price
    const setServicePrice = (key: string, value: string) => {
        setServices(prev => ({ ...prev, [key]: { ...prev[key], price: value } }));
    };

    // Auto-calculate total from service prices
    const calcTotal = () => {
        const sum = Object.values(services).reduce((acc, svc) => acc + (parseFloat(svc.price) || 0), 0);
        setTotalPrice(sum > 0 ? sum.toString() : totalPrice);
    };

    const handleNextStep1 = () => {
        if (!name || !phone || !make) {
            setError("يرجى تعبئة الحقول المطلوبة (اسم، هاتف، نوع السيارة)");
            return;
        }
        setError(null); setStep(2);
    };

    const handleNextStep2 = () => { calcTotal(); setError(null); setStep(3); };

    const handleSaveDraft = async () => saveWorkOrder('تم الاستلام', null);
    const handleStartWorkOrder = async () => saveWorkOrder('قيد العمل', new Date().toISOString());

    const saveWorkOrder = async (status: 'تم الاستلام' | 'قيد العمل', startTime: string | null) => {
        setLoading(true); setError(null);
        try {
            let branchId = null, employeeId = null;
            if (user?.id) {
                const { data: emp } = await supabase.from('employees').select('id, branch_id').eq('auth_id', user.id).maybeSingle();
                if (emp) { employeeId = emp.id; branchId = emp.branch_id; }
            }

            let clientId = selectedClientId;
            if (!clientId) {
                const { data: nc, error: ce } = await supabase.from('clients').insert({ name, phone }).select('id').single();
                if (ce) throw ce;
                clientId = nc!.id;
            }

            let vehicleId: string | null = null;
            if (plateNumber && plateNumber.trim() !== "") {
                const { data: ev } = await supabase.from('vehicles').select('id').eq('plate_number', plateNumber).maybeSingle();
                if (ev) vehicleId = ev.id;
            }
            if (vehicleId) {
                await supabase.from('vehicles').update({ client_id: clientId, make, model, engine_size: engineSize }).eq('id', vehicleId);
            } else {
                const { data: nv, error: ve } = await supabase.from('vehicles')
                    .insert({ client_id: clientId, make, model, engine_size: engineSize, plate_number: plateNumber || null })
                    .select('id').single();
                if (ve) throw ve;
                vehicleId = nv!.id;
            }

            const paperPayload = {
                is_paper_v2_format: true,
                freeServices,
                services,
                customServices,
                booklet: { type: bookletType, changes: bookletChanges },
                pricing: { totalPrice, discount, amountReceived, amountOwedByClient, amountOwedToClient },
            };

            const finalBranchId = selectedBranchId || branchId;

            if (editReportId) {
                const { error: re } = await supabase.from('inspection_reports')
                    .update({
                        branch_id: finalBranchId, vehicle_id: vehicleId, receptionist_id: employeeId,
                        odometer_reading: parseInt(odometer || "0") || 0,
                        total_price: parseFloat(totalPrice || "0"),
                        notes,
                        selected_services: [paperPayload],
                    })
                    .eq('id', editReportId);
                
                if (re) throw re;

                const { data: rd } = await supabase.from('inspection_reports').select('report_number').eq('id', editReportId).single();
                setCreatedWorkOrderId(editReportId);
                if (rd) setReportNumber(rd.report_number);
                setStep(3);
                setLoading(false);
                return;
            }

            const { data: rd, error: re } = await supabase.from('inspection_reports')
                .insert({
                    branch_id: finalBranchId, vehicle_id: vehicleId, receptionist_id: employeeId,
                    odometer_reading: parseInt(odometer || "0") || 0,
                    status, total_price: parseFloat(totalPrice || "0"),
                    notes, start_time: startTime, estimated_duration: 60,
                    selected_services: [paperPayload],
                })
                .select('id, report_number').single();

            if (re) throw re;
            setCreatedWorkOrderId(rd!.id);
            setReportNumber(rd!.report_number);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "حدث خطأ أثناء الحفظ.");
        } finally {
            setLoading(false);
        }
    };

    const resetWizard = () => {
        setName(""); setPhone(""); setMake(""); setModel(""); setEngineSize("");
        setOdometer(""); setPlateNumber(""); setNotes("");
        setFreeServices({ windshieldWater: false, tirePressure: false, engineClean: false });
        setServices(initServices());
        setCustomServices([]);
        setBookletType("");
        setBookletChanges("");
        setSelectedBranchId("");
        setTotalPrice(""); setDiscount(""); setAmountReceived(""); setAmountOwedByClient(""); setAmountOwedToClient("");
        setCreatedWorkOrderId(null); setReportNumber(null); setSelectedClientId(null); setEditReportId(null);
        setStep(1);
        router.replace('/reception'); // clear edit param
    };

    // ===================== JSX =====================
    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in" dir="rtl">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                        <FileText className="text-rose-500" size={32} />
                        أمر عمل جديد — هندسة السيارات
                    </h1>
                    <p className="text-muted-foreground">إنشاء بطاقة عمل مفصّلة مطابقة للنموذج الرسمي للورشة</p>
                </div>
                <div className="flex items-center gap-2 bg-background/40 p-2 rounded-xl border border-border">
                    {["1. البيانات", "2. الفحص", "3. المراجعة"].map((label, i) => (
                        <div key={i} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${step >= i + 1 ? 'bg-rose-600 text-white' : 'text-muted-foreground'}`}>{label}</div>
                    ))}
                </div>
            </div>

            {error && (
                <div className="bg-rose-950/40 border border-rose-900/50 rounded-xl p-4 flex gap-3 text-rose-200">
                    <AlertCircle className="text-rose-400 shrink-0" size={20} />
                    <p>{error}</p>
                </div>
            )}

            {/* ===== STEP 1: Customer & Vehicle ===== */}
            {step === 1 && !createdWorkOrderId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                    {/* Customer */}
                    <div className="glass-card p-6 rounded-2xl border border-rose-900/20">
                        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2 border-b border-rose-500/20 pb-4">
                            <UserPlus className="text-rose-400" size={24} /> بيانات العميل
                        </h2>
                        <div className="space-y-4">
                            <div className="space-y-2 relative">
                                <label className="text-sm font-medium text-muted-foreground">رقم الهاتف <span className="text-rose-500">*</span></label>
                                <div className="relative">
                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" size={18} />
                                    <input type="tel" dir="ltr" placeholder="+964 7X XXX XXXX" className="input-field text-right" style={{ paddingRight: '2.5rem' }} value={phone} onChange={handlePhoneChange} />
                                    {isSearchingClient && <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500 animate-spin" size={16} />}
                                </div>
                                {clientSuggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                                        {clientSuggestions.map(c => (
                                            <div key={c.id} onClick={() => selectSuggestion(c)} className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-0">
                                                <div className="flex justify-between text-sm">
                                                    <span className="font-bold text-foreground">{c.name}</span>
                                                    <span className="text-muted-foreground font-mono">{c.phone}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">اسم العميل <span className="text-rose-500">*</span></label>
                                <input type="text" placeholder="مثال: أحمد محمد" className="input-field" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                            {branches.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">الفرع <span className="text-rose-500">*</span></label>
                                    <select
                                        value={selectedBranchId}
                                        onChange={e => setSelectedBranchId(e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="">-- اختر الفرع --</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vehicle */}
                    <div className="glass-card p-6 rounded-2xl border border-rose-900/20">
                        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2 border-b border-rose-500/20 pb-4">
                            <Car className="text-rose-400" size={24} /> بيانات السيارة
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">نوع السيارة <span className="text-rose-500">*</span></label>
                                <input type="text" placeholder="تويوتا" className="input-field" value={make} onChange={e => setMake(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">الموديل</label>
                                <input type="text" placeholder="كامري 2022" className="input-field" value={model} onChange={e => setModel(e.target.value)} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <label className="text-sm font-medium text-muted-foreground">رقم اللوحة</label>
                                <div className="relative">
                                    <Hash className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" size={18} />
                                    <input type="text" placeholder="بغداد ١٢٣٤" className="input-field" style={{ paddingRight: '2.5rem' }} value={plateNumber} onChange={e => setPlateNumber(e.target.value)} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">حجم المحرك</label>
                                <input type="text" placeholder="2.5L" className="input-field" value={engineSize} onChange={e => setEngineSize(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">عداد الكيلومتر</label>
                                <input type="number" dir="ltr" placeholder="0" className="input-field text-right" value={odometer} onChange={e => setOdometer(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* دفتر الخدمة — full width row */}
                    <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-rose-900/20">
                        <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2 border-b border-rose-500/20 pb-3">
                            <FileText className="text-rose-400" size={20} /> دفتر الخدمة
                        </h2>
                        <div className="flex flex-wrap items-center gap-4">
                            {(['جديد', 'قديم', 'لا يوجد'] as const).map(opt => (
                                <label key={opt} className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                                    bookletType === opt
                                        ? opt === 'لا يوجد' ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                                        : opt === 'جديد'   ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                        : 'border-amber-500 bg-amber-500/10 text-amber-300'
                                        : 'border-border hover:border-rose-500/40 text-muted-foreground'
                                }`}>
                                    <input
                                        type="radio"
                                        name="bookletType"
                                        value={opt}
                                        checked={bookletType === opt}
                                        onChange={() => setBookletType(opt)}
                                        className="w-4 h-4 accent-rose-600"
                                    />
                                    <span className="font-bold text-sm">دفتر {opt}</span>
                                </label>
                            ))}
                            {bookletType !== 'لا يوجد' && bookletType !== '' && (
                                <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                                    <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">عدد التبديلات داخل الدفتر:</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={bookletChanges}
                                        onChange={e => setBookletChanges(e.target.value)}
                                        className="input-field w-24 text-center"
                                        dir="ltr"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-2 flex justify-end">
                        <button onClick={handleNextStep1} className="px-8 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors flex items-center gap-2">
                            التالي: الفحص والخدمات <ArrowLeft size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* ===== STEP 2: Services Form ===== */}
            {step === 2 && !createdWorkOrderId && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="glass-card p-6 rounded-2xl border border-rose-500/20 max-w-5xl mx-auto space-y-8">

                        {/* Free Services */}
                        <div>
                            <h3 className="text-lg font-bold mb-4 pb-2 border-b border-border text-foreground">خدمات الفحص المجاني</h3>
                            <div className="flex flex-wrap gap-4">
                                {FREE_SERVICES.map(fs => (
                                    <label key={fs.key} className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={freeServices[fs.key]}
                                            onChange={e => setFreeServices(prev => ({ ...prev, [fs.key]: e.target.checked }))}
                                            className="w-5 h-5 accent-emerald-600 rounded"
                                        />
                                        <span className="font-bold text-sm">{fs.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Main 14 Services */}
                        <div>
                            <h3 className="text-lg font-bold mb-4 pb-2 border-b border-border text-foreground">
                                خدمات العميل (1-{MAIN_SERVICES.length}) — فحص دوري مع كل زيارة
                            </h3>

                            <div className="space-y-3">
                                {MAIN_SERVICES.map((svc, idx) => {
                                    const entry = services[svc.key];
                                    return (
                                        <div key={svc.key} className={`rounded-xl border transition-colors ${entry.status === 'يحتاج تغيير' ? 'border-rose-500/40 bg-rose-950/10' : entry.status === 'جيد' ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-border bg-background/40'}`}>
                                            <div className="flex flex-wrap items-center gap-3 p-3">
                                                {/* Row number + name */}
                                                <span className="text-xs font-mono text-muted-foreground w-5 text-center">{idx + 1}</span>
                                                <span className="font-bold text-sm flex-1 min-w-[140px]">{svc.label}</span>

                                                {/* Status buttons */}
                                                <div className="flex gap-2">
                                                    <button onClick={() => setServiceStatus(svc.key, "جيد")}
                                                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${entry.status === "جيد" ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-muted border-border hover:border-emerald-500/50'}`}>
                                                        جيد ✓
                                                    </button>
                                                    <button onClick={() => setServiceStatus(svc.key, "يحتاج تغيير")}
                                                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${entry.status === "يحتاج تغيير" ? 'bg-rose-600 border-rose-500 text-white' : 'bg-muted border-border hover:border-rose-500/50'}`}>
                                                        يحتاج تغيير
                                                    </button>
                                                </div>

                                                {/* Price field */}
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        placeholder="السعر"
                                                        className="input-field text-xs py-1.5 w-24 text-left"
                                                        dir="ltr"
                                                        value={entry.price}
                                                        onChange={e => setServicePrice(svc.key, e.target.value)}
                                                    />
                                                    <span className="text-xs text-muted-foreground">د.ع</span>
                                                </div>
                                            </div>

                                            {/* Expandable detail fields when يحتاج تغيير is selected */}
                                            {entry.status === "يحتاج تغيير" && svc.detailFields.length > 0 && (
                                                <div className="flex flex-wrap gap-2 px-4 pb-3 pr-10 border-t border-border/50 pt-3">
                                                    {svc.detailFields.map(df => {
                                                        if (svc.key === 'coolant' && df.key === 'size') {
                                                            return (
                                                                <select 
                                                                    key={df.key} 
                                                                    className="input-field text-xs py-1.5 flex-1 min-w-[120px]"
                                                                    value={entry.details[df.key] || ""}
                                                                    onChange={e => setServiceDetail(svc.key, df.key, e.target.value)}
                                                                >
                                                                    <option value="">اختر الحجم</option>
                                                                    <option value="دبة 1 لتر">دبة 1 لتر</option>
                                                                    <option value="دبة 4 لتر">دبة 4 لتر</option>
                                                                </select>
                                                            );
                                                        }
                                                        return (
                                                            <input
                                                                key={df.key}
                                                                type={df.key === 'unitPrice' || df.key === 'qty' ? "number" : "text"}
                                                                placeholder={df.label}
                                                                className="input-field text-xs py-1.5 flex-1 min-w-[120px]"
                                                                value={entry.details[df.key] || ""}
                                                                onChange={e => setServiceDetail(svc.key, df.key, e.target.value)}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Extra Services */}
                        <div>
                            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
                                <h3 className="text-lg font-bold text-foreground">خدمات إضافية</h3>
                                <button
                                    type="button"
                                    onClick={addCustomService}
                                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl transition-colors"
                                >
                                    <span className="text-lg leading-none">+</span> إضافة خدمة
                                </button>
                            </div>
                            {customServices.length === 0 && (
                                <p className="text-muted-foreground text-sm text-center py-4">اضغط + لإضافة خدمة إضافية غير مدرجة في القائمة</p>
                            )}
                            <div className="space-y-3">
                                {customServices.map((cs, idx) => (
                                    <div key={cs.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-dashed border-rose-500/30 bg-rose-950/10">
                                        <span className="text-xs font-mono text-muted-foreground w-5 text-center">{MAIN_SERVICES.length + idx + 1}</span>
                                        <input
                                            type="text"
                                            placeholder="اسم الخدمة..."
                                            value={cs.label}
                                            onChange={e => setCustomSvcField(cs.id, 'label', e.target.value)}
                                            className="input-field text-sm py-1.5 flex-1 min-w-[150px]"
                                        />

                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                placeholder="السعر"
                                                value={cs.price}
                                                onChange={e => setCustomSvcField(cs.id, 'price', e.target.value)}
                                                className="input-field text-xs py-1.5 w-24 text-left"
                                                dir="ltr"
                                            />
                                            <span className="text-xs text-muted-foreground">د.ع</span>
                                        </div>
                                        <button type="button" onClick={() => removeCustomService(cs.id)}
                                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors">
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center max-w-5xl mx-auto">
                        <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl bg-muted text-foreground font-bold hover:bg-muted transition-colors flex items-center gap-2">
                            <ArrowRight size={20} /> رجوع
                        </button>
                        <button onClick={handleNextStep2} className="px-8 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors flex items-center gap-2 shadow-lg shadow-rose-500/20">
                            مراجعة وحفظ <ArrowLeft size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* ===== STEP 3: Review & Pricing ===== */}
            {step === 3 && !createdWorkOrderId && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="glass-card p-8 rounded-3xl border border-rose-500/30 max-w-2xl mx-auto space-y-6">
                        <h2 className="text-2xl font-display font-bold text-foreground text-center border-b border-border pb-4">مراجعة والتسعير</h2>

                        {/* Summary */}
                        <div className="bg-background/40 rounded-2xl p-5 border border-border space-y-3">
                            <h3 className="text-muted-foreground text-sm font-bold">ملخص</h3>
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">العميل</span><span className="font-bold">{name}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">السيارة</span><span className="font-bold">{make} {model} ({plateNumber})</span></div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">الخدمات المحتاجة للتغيير</span>
                                <span className="font-bold text-rose-400">
                                    {Object.values(services).filter(s => s.status === "يحتاج تغيير").length} خدمة
                                </span>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-sm font-bold text-rose-400 mb-2 block">ملاحظات إضافية:</label>
                            <textarea className="input-field h-20 py-3 bg-background" placeholder="ملاحظات للفاتورة..." value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>

                        {/* Pricing */}
                        <div className="bg-rose-950/20 border border-rose-900/30 p-5 rounded-xl space-y-3">
                            <h3 className="text-sm font-bold text-rose-300 mb-3">الأسعار</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">المجموع الكلي (د.ع)</label>
                                    <input type="number" className="input-field bg-background text-lg font-bold" placeholder="0" value={totalPrice} onChange={e => setTotalPrice(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-rose-400 font-bold block mb-1">الخصم (د.ع)</label>
                                    <input type="number" className="input-field bg-rose-950/30 text-rose-300 font-bold border-rose-500/30" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">الواصل (د.ع)</label>
                                    <input type="number" className="input-field bg-background" placeholder="0" value={amountReceived} onChange={e => setAmountReceived(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">مدين لنا (د.ع)</label>
                                    <input type="number" className="input-field bg-background" placeholder="0" value={amountOwedByClient} onChange={e => setAmountOwedByClient(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">دائن علينا (د.ع)</label>
                                    <input type="number" className="input-field bg-background" placeholder="0" value={amountOwedToClient} onChange={e => setAmountOwedToClient(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col md:flex-row gap-3 justify-center pt-2">
                            <button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl bg-muted text-foreground font-bold hover:bg-muted transition-colors">
                                رجوع للتعديل
                            </button>
                            <button onClick={handleSaveDraft} disabled={loading} className="px-6 py-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 font-bold hover:bg-blue-600/30 flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                حفظ وطباعة / مسودة
                            </button>
                            <button onClick={handleStartWorkOrder} disabled={loading} className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                                تسليم للفني (Start)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== SUCCESS SCREEN ===== */}
            {step === 3 && createdWorkOrderId && (
                <div className="glass-card p-10 rounded-3xl border border-emerald-500/30 text-center animate-scale-in">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full mx-auto flex items-center justify-center mb-6">
                        <CheckCircle2 className="text-emerald-500" size={48} />
                    </div>
                    <h2 className="text-3xl font-display font-bold text-foreground mb-2">تم إنشاء أمر العمل!</h2>
                    <p className="text-muted-foreground mb-8">رقم الطلب: <span className="text-foreground font-mono bg-muted px-3 py-1 rounded-lg">#{reportNumber}</span></p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <a href={`/print/${createdWorkOrderId}`} target="_blank" rel="noopener noreferrer"
                            className="px-8 py-3 rounded-xl bg-muted text-foreground font-bold hover:bg-muted transition-colors flex items-center justify-center gap-2">
                            <Printer size={20} /> طباعة أمر العمل (PDF)
                        </a>
                        <a href={`/work-orders/${createdWorkOrderId}`}
                            className="px-8 py-3 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition-all flex items-center justify-center gap-2">
                            متابعة المركبة أونلاين <ArrowLeft size={20} />
                        </a>
                    </div>
                    <div className="mt-8 pt-8 border-t border-border">
                        <button onClick={resetWizard} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-bold">
                            + إنشاء أمر عمل جديد
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ReceptionPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center"><Loader2 className="animate-spin text-rose-500 w-10 h-10 mx-auto" /></div>}>
            <ReceptionWizard />
        </Suspense>
    );
}
