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
const MAIN_SERVICES: { key: string; label: string; detailFields: { key: string; label: string; listId?: string }[] }[] = [
    {
        key: "engineOil",
        label: "زيت المحرك",
        detailFields: [
            { key: "brand",     label: "نوع الزيت", listId: "oilBrands" },
            { key: "viscosity", label: "درجة اللزوجة", listId: "viscosities" },
            { key: "liters",    label: "عدد اللترات" },
            { key: "unitPrice", label: "سعر اللتر" },
        ],
    },
    {
        key: "oilFilter",
        label: "فلتر زيت المحرك",
        detailFields: [
            { key: "type",      label: "نوع الفلتر", listId: "filterBrands" },
            { key: "filterNum", label: "رقم الفلتر" },
        ],
    },
    {
        key: "airFilter",
        label: "فلتر الهواء",
        detailFields: [
            { key: "type",      label: "نوع الفلتر", listId: "filterBrands" },
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
        key: "gearboxFilter",
        label: "فلتر الكير",
        detailFields: [
            { key: "type", label: "نوع الفلتر" },
            { key: "filterNum", label: "رقم الفلتر" },
            { key: "unitPrice", label: "السعر" },
        ],
    },
    {
        key: "wipers",
        label: "الماسحات",
        detailFields: [
            { key: "type", label: "نوع الماسحات", listId: "wiperTypes" },
            { key: "size", label: "حجم الماسحات", listId: "wiperSizes" }
        ],
    },
    {
        key: "additives",
        label: "المضافات والمحسنات",
        detailFields: [], // Rendered custom below
    },
];

const initServices = (): Record<string, ServiceEntry> => {
    const obj: Record<string, ServiceEntry> = {};
    MAIN_SERVICES.forEach(s => { obj[s.key] = makeService(); });
    return obj;
};

function ReceptionWizard({ onClose }: { onClose: () => void }) {
    const { t } = useLanguage();
    const { user, employeeRole, employeeBranchId } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const editId = searchParams.get('edit');
    const [editReportId, setEditReportId] = useState<string | null>(null);

    // Wizard step
    const [step, setStep] = useState<Step>(1);

    // ---------- Branches ----------
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

    // ---------- Employees ----------
    const [employees, setEmployees] = useState<{ id: string; name: string; role: string }[]>([]);
    const [selectedReceptionistId, setSelectedReceptionistId] = useState<string>("");
    const [selectedTechnicianId, setSelectedTechnicianId] = useState<string>("");

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
    const [bayNumber, setBayNumber] = useState("");
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

    // Fetch branches + employees on mount
    useEffect(() => {
        let branchQuery = supabase.from('branches').select('id, name');
        let empQuery = supabase.from('employees').select('id, name, role, branch_id').order('name');

        if (employeeBranchId) {
            branchQuery = branchQuery.eq('id', employeeBranchId);
            empQuery = empQuery.eq('branch_id', employeeBranchId);
        }

        branchQuery.then(({ data, error }) => {
            if (!error && data) {
                setBranches(data);
                if (data.length === 1 || employeeBranchId) {
                    setSelectedBranchId(employeeBranchId || data[0].id);
                }
            }
        });

        empQuery.then(({ data }) => {
            if (data) setEmployees(data);
        });
    }, [employeeRole, employeeBranchId]);

    // Load existing report for editing
    useEffect(() => {
        if (!editId) return;
        const loadReport = async () => {
            const { data } = await supabase.from('inspection_reports')
                .select(`id, status, notes, total_price, odometer_reading, selected_services, branch_id, bay_number,
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
                setBayNumber(data.bay_number || "");
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

    // Real-time calculation of total price
    useEffect(() => {
        const sumServices = Object.values(services).reduce((acc, svc) => acc + (parseFloat(svc.price) || 0), 0);
        const sumCustom = customServices.reduce((acc, svc) => acc + (parseFloat(svc.price) || 0), 0);
        const sum = sumServices + sumCustom;
        if (sum > 0) {
            setTotalPrice(sum.toString());
        }
    }, [services, customServices]);

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

    // Auto-calculate total from service prices (kept for manual trigger if needed)
    const calcTotal = () => {
        const sumServices = Object.values(services).reduce((acc, svc) => acc + (parseFloat(svc.price) || 0), 0);
        const sumCustom = customServices.reduce((acc, svc) => acc + (parseFloat(svc.price) || 0), 0);
        const sum = sumServices + sumCustom;
        if (sum > 0) setTotalPrice(sum.toString());
    };

    const handleNextStep1 = () => {
        if (!name || !phone || !make) {
            setError("يرجى تعبئة الحقول المطلوبة (اسم، هاتف، نوع السيارة)");
            return;
        }
        setError(null); setStep(2);
    };

    const handleNextStep2 = () => { 
        setError(null); 
        calcTotal();
        setStep(3); 
    };

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

            const receptionistName = employees.find(e => e.id === selectedReceptionistId)?.name || '';

            const paperPayload = {
                is_paper_v2_format: true,
                freeServices,
                services,
                customServices,
                booklet: { type: bookletType, changes: bookletChanges },
                pricing: { totalPrice, discount, amountReceived, amountOwedByClient, amountOwedToClient },
                receptionistName,
            };

            const finalBranchId = selectedBranchId || branchId;

            if (editReportId) {
                const { error: re } = await supabase.from('inspection_reports')
                    .update({
                        branch_id: finalBranchId, vehicle_id: vehicleId, receptionist_id: employeeId,
                        odometer_reading: parseInt(odometer || "0") || 0,
                        total_price: parseFloat(totalPrice || "0"),
                        notes, bay_number: bayNumber,
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
                    notes, bay_number: bayNumber, start_time: startTime,
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
        setOdometer(""); setPlateNumber(""); setNotes(""); setBayNumber("");
        setFreeServices({ windshieldWater: false, tirePressure: false, engineClean: false });
        setServices(initServices());
        setCustomServices([]);
        setBookletType("");
        setBookletChanges("");
        setSelectedBranchId("");
        setSelectedReceptionistId(""); setSelectedTechnicianId("");
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
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 bg-muted hover:bg-rose-500 hover:text-white rounded-xl transition-colors border border-border" title="رجوع إلى قائمة أوامر العمل">
                        <ArrowRight size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <FileText className="text-rose-500" size={32} />
                            أمر عمل جديد — هندسة السيارات
                        </h1>
                        <p className="text-muted-foreground">إنشاء بطاقة عمل مفصّلة مطابقة للنموذج الرسمي للورشة</p>
                    </div>
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
                            {branches.length > 0 && (employeeRole === 'Owner' || employeeRole === 'Admin' || !employeeBranchId) && (
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
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">موظف الاستقبال</label>
                                <select
                                    value={selectedReceptionistId}
                                    onChange={e => setSelectedReceptionistId(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="">-- اختر موظف الاستقبال --</option>
                                    {employees.filter(e => e.role === 'Receptionist' || e.role === 'Admin' || e.role === 'Owner').map(e => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
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
                                        onChange={() => {
                                            setBookletType(opt);
                                            if (opt === 'جديد') setBookletChanges("1");
                                            else if (opt === 'لا يوجد') setBookletChanges("");
                                        }}
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
                                            {entry.status === "يحتاج تغيير" && (svc.detailFields.length > 0 || svc.key === 'additives') && (
                                                <div className="flex flex-wrap gap-2 px-4 pb-3 pr-10 border-t border-border/50 pt-3">
                                                    {svc.key === 'additives' ? (
                                                        <div className="flex flex-col gap-2 w-full max-w-sm">
                                                            {(Object.keys(entry.details).filter(k => k.startsWith('prod_')).length === 0 ? ['prod_1'] : Object.keys(entry.details).filter(k => k.startsWith('prod_'))).map((k, i) => {
                                                                const priceKey = k.replace('prod_', 'price_');
                                                                return (
                                                                    <div key={k} className="flex items-center gap-2">
                                                                        <input
                                                                            type="text"
                                                                            placeholder={`اسم المنتج ${i + 1}`}
                                                                            className="input-field text-xs py-1.5 flex-1"
                                                                            value={entry.details[k] || ""}
                                                                            onChange={e => setServiceDetail(svc.key, k, e.target.value)}
                                                                        />
                                                                        <div className="flex items-center gap-1 w-24">
                                                                            <input 
                                                                                type="number"
                                                                                placeholder="السعر"
                                                                                className="input-field text-xs py-1.5 w-full text-left"
                                                                                dir="ltr"
                                                                                value={entry.details[priceKey] || ""}
                                                                                onChange={e => {
                                                                                    setServiceDetail(svc.key, priceKey, e.target.value);
                                                                                    setTimeout(() => {
                                                                                        setServices(prev => {
                                                                                            const svcData = prev[svc.key];
                                                                                            const details = svcData.details;
                                                                                            let sum = 0;
                                                                                            Object.keys(details).forEach(dk => {
                                                                                                if (dk.startsWith('price_')) sum += Number(details[dk] || 0);
                                                                                            });
                                                                                            return { ...prev, [svc.key]: { ...svcData, price: sum > 0 ? String(sum) : "" } };
                                                                                        });
                                                                                    }, 50);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        {i > 0 && (
                                                                            <button type="button" onClick={() => {
                                                                                const newDetails = {...entry.details};
                                                                                delete newDetails[k];
                                                                                delete newDetails[priceKey];
                                                                                let sum = 0;
                                                                                Object.keys(newDetails).forEach(dk => {
                                                                                    if (dk.startsWith('price_')) sum += Number(newDetails[dk] || 0);
                                                                                });
                                                                                setServices(prev => ({...prev, [svc.key]: {...prev[svc.key], details: newDetails, price: sum > 0 ? String(sum) : ""}}));
                                                                            }} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg">✕</button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setServiceDetail(svc.key, `prod_${Date.now()}`, '')}
                                                                className="text-xs text-rose-500 font-bold border border-rose-500/30 rounded-lg py-1.5 hover:bg-rose-500/10 transition-colors w-max px-3"
                                                            >
                                                                + منتج آخر
                                                            </button>
                                                        </div>
                                                    ) : svc.detailFields.map(df => {
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
                                                                list={df.listId}
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

                        {/* Maintenance Events (أحداث الصيانة - previously Custom Services) */}
                        <div className="rounded-xl border border-border bg-background/40">
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-muted-foreground w-5 text-center">{MAIN_SERVICES.length + 1}</span>
                                    <span className="font-bold text-sm min-w-[140px]">أحداث الصيانة (خدمات إضافية)</span>
                                </div>
                                {customServices.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={addCustomService}
                                        className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-500/30 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 text-xs font-bold rounded-lg transition-all"
                                    >
                                        <span className="text-base leading-none">+</span> إضافة حدث صيانة
                                    </button>
                                )}
                            </div>

                            {customServices.length > 0 && (
                                <div className="px-4 pb-3 pr-[3.25rem] border-t border-border/50 pt-3 space-y-3">
                                    {customServices.map((cs, idx) => (
                                        <div key={cs.id} className="flex flex-wrap items-center gap-3">
                                            <input
                                                type="text"
                                                placeholder="وصف حدث الصيانة..."
                                                list="customServicesList"
                                                value={cs.label}
                                                onChange={e => setCustomSvcField(cs.id, 'label', e.target.value)}
                                                className="input-field text-xs py-1.5 flex-1 min-w-[150px]"
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
                                    
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={addCustomService}
                                            className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-500/30 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 text-xs font-bold rounded-lg transition-all"
                                        >
                                            <span className="text-base leading-none">+</span> إضافة حدث صيانة آخر
                                        </button>
                                    </div>
                                </div>
                            )}
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

                        {/* Notes & Bay */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-rose-400 mb-2 block">رقم الخانة (الموقف):</label>
                                <input type="text" className="input-field bg-background text-lg font-bold" placeholder="مثال: A1, 5, يمين الباب..." value={bayNumber} onChange={e => setBayNumber(e.target.value)} />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-rose-400 mb-2 block">ملاحظات إضافية:</label>
                                <textarea className="input-field h-20 py-3 bg-background" placeholder="ملاحظات للفاتورة..." value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
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
                        <button onClick={() => router.push(`/print/${createdWorkOrderId}?mode=full`)}
                            className="px-6 py-3 rounded-xl bg-blue-600/20 text-blue-500 font-bold hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2">
                            <Printer size={20} /> طباعة للعميل (شامل)
                        </button>
                        <button onClick={() => router.push(`/print/${createdWorkOrderId}?mode=short`)}
                            className="px-6 py-3 rounded-xl bg-amber-600/20 text-amber-500 font-bold hover:bg-amber-600/30 transition-colors flex items-center justify-center gap-2">
                            <Printer size={20} /> طباعة للفني (مختصر)
                        </button>
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

            {/* Datalists for Auto-complete */}
            <datalist id="oilBrands">
                <option value="ليكي مولي (Liqui Moly)" />
                <option value="كاسترول (Castrol)" />
                <option value="توتال (Total)" />
                <option value="فوكس (Fuchs)" />
                <option value="موتول (Motul)" />
                <option value="شيل (Shell)" />
                <option value="أمسويل (Amsoil)" />
                <option value="موبيل 1 (Mobil 1)" />
                <option value="إيسن (Aisin)" />
                <option value="بترومين (Petromin)" />
            </datalist>

            <datalist id="viscosities">
                <option value="0W-20" />
                <option value="5W-20" />
                <option value="5W-30" />
                <option value="5W-40" />
                <option value="10W-30" />
                <option value="10W-40" />
                <option value="15W-40" />
                <option value="20W-50" />
            </datalist>

            <datalist id="filterBrands">
                <option value="أصلي (Genuine)" />
                <option value="بوش (Bosch)" />
                <option value="تويوتا (Toyota)" />
                <option value="هيونداي (Hyundai)" />
                <option value="فورد (Motorcraft)" />
                <option value="تجارى (Aftermarket)" />
            </datalist>

            <datalist id="customServicesList">
                <option value="فحص شامل (كمبيوتر)" />
                <option value="تنظيف البخاخات" />
                <option value="تبديل بواجي (شمعات)" />
                <option value="ميزانية وتويتر إطارات" />
                <option value="غسيل راديتر" />
                <option value="تبديل سفايف (بريكات)" />
                <option value="شحن غاز تبريد" />
                <option value="تبديل بطارية" />
            </datalist>

            <datalist id="wiperTypes">
                <option value="VH" />
                <option value="VP" />
                <option value="VS" />
            </datalist>

            <datalist id="wiperSizes">
                <option value="14 Inch" />
                <option value="16 Inch" />
                <option value="18 Inch" />
                <option value="20 Inch" />
                <option value="22 Inch" />
                <option value="24 Inch" />
                <option value="26 Inch" />
                <option value="28 Inch" />
            </datalist>

        </div>
    );
}

function ReceptionContainer() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { employeeBranchId, employeeRole } = useAuth();
    const editId = searchParams.get('edit');
    const [isWizardOpen, setIsWizardOpen] = useState(!!editId);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (editId) {
            setIsWizardOpen(true);
        }
    }, [editId]);

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
    }, [isWizardOpen, employeeBranchId, employeeRole]);

    const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
        const confirm = await showConfirm(
            "حذف أمر العمل",
            `هل أنت متأكد من حذف أمر العمل رقم #${orderNumber} بشكل نهائي؟`,
            "نعم، احذف",
            "إلغاء"
        );
        if (confirm) {
            const { error } = await supabase.from('inspection_reports').delete().eq('id', orderId);
            if (error) {
                showError("فشل الحذف", "حدث خطأ أثناء محاولة حذف أمر العمل.");
            } else {
                showSuccess("تم الحذف", "تم حذف أمر العمل بنجاح.");
                setOrders(orders.filter(o => o.id !== orderId));
            }
        }
    };

    if (isWizardOpen) {
        return <ReceptionWizard onClose={() => {
            setIsWizardOpen(false);
            if (editId) router.replace('/reception');
        }} />;
    }

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in" dir="rtl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                        <FileText className="text-rose-500" size={32} />
                        أوامر العمل (الاستقبال)
                    </h1>
                    <p className="text-muted-foreground">إدارة أوامر العمل السابقة وإنشاء أوامر جديدة</p>
                </div>
                <button 
                    onClick={() => setIsWizardOpen(true)}
                    className="btn-primary flex items-center gap-2 whitespace-nowrap px-6 py-2.5 text-lg shadow-rose-500/20"
                >
                    <span>+</span> أمر عمل جديد
                </button>
            </div>

            <div className="glass-card rounded-2xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                    <h2 className="font-bold text-foreground flex items-center gap-2">
                        <Wrench size={18} className="text-rose-500"/> أوامر العمل السابقة (أحدث 50)
                    </h2>
                </div>
                {loading ? (
                    <div className="p-12 text-center"><Loader2 className="animate-spin text-rose-500 mx-auto" size={32}/></div>
                ) : orders.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">لا توجد أوامر عمل سابقة. انقر على 'أمر عمل جديد' للبدء.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-muted text-muted-foreground font-medium">
                                <tr>
                                    <th className="p-4">رقم الأمر</th>
                                    <th className="p-4">التاريخ</th>
                                    <th className="p-4">المركبة</th>
                                    <th className="p-4">العميل</th>
                                    <th className="p-4">الحالة</th>
                                    <th className="p-4">الإجمالي (IQD)</th>
                                    <th className="p-4 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {orders.map(o => (
                                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="p-4 font-mono font-bold text-foreground">#{o.report_number}</td>
                                        <td className="p-4 text-muted-foreground">{new Date(o.created_at).toLocaleDateString('ar-IQ')}</td>
                                        <td className="p-4 text-foreground font-medium" dir="ltr">{o.vehicles?.make} {o.vehicles?.model} ({o.vehicles?.plate_number})</td>
                                        <td className="p-4 text-foreground">
                                            {o.vehicles?.clients ? (Array.isArray(o.vehicles.clients) ? o.vehicles.clients[0]?.name : o.vehicles.clients.name) : '---'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${o.status === 'تم الانتهاء' ? 'bg-emerald-500/10 text-emerald-500' : o.status === 'قيد العمل' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-emerald-500 font-mono" dir="ltr">{o.total_price?.toLocaleString() || 0}</td>
                                        <td className="p-4 flex items-center justify-center gap-2">
                                            <button onClick={() => { router.replace(`/reception?edit=${o.id}`); setIsWizardOpen(true); }} className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors" title="تعديل">
                                                <Edit2 size={16}/>
                                            </button>
                                            <button onClick={() => router.push(`/print/${o.id}?mode=full`)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors" title="طباعة">
                                                <Printer size={16}/>
                                            </button>
                                            {(employeeRole === 'Owner' || employeeRole === 'Admin') && (
                                                <button onClick={() => handleDeleteOrder(o.id, o.report_number)} className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-colors" title="حذف">
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
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
