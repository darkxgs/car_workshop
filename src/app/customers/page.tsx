"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/lib/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Users, User, Search, Download, Plus, MapPin, Phone, 
    Mail, Car, FileText, ChevronLeft, ShieldAlert,
    Trash2, Edit2, FolderOpen, Calendar, Save, X, Wrench, Loader2
} from "lucide-react";
import { showConfirm, showError, showSuccess } from "@/lib/alerts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';

type ClientWithVehicles = {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    created_at: string;
    vehicles: any[];
    latestStatus: string;
    branchIds: string[];
    branchNames: string[];
    allReports: any[];
};

export default function CustomersPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { employeeRole, employeeBranchId, permissionCustomers, loading: authLoading } = useAuth();
    const isOwnerOrAdmin = employeeRole === 'Owner' || employeeRole === 'Admin';

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500 w-12 h-12" />
            </div>
        );
    }

    if (employeeRole !== 'Owner' && !permissionCustomers) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center p-4 text-center font-ibm" dir="rtl">
                <div className="glass-card p-8 rounded-3xl border border-rose-500/20 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-rose-500 mb-2">غير مصرح بالوصول</h2>
                    <p className="text-muted-foreground mb-6">ليس لديك صلاحية للوصول إلى سجل العملاء والمركبات.</p>
                </div>
            </div>
        );
    }
    
    const [clients, setClients] = useState<ClientWithVehicles[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [branchFilter, setBranchFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [branches, setBranches] = useState<{id:string, name:string}[]>([]);

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<ClientWithVehicles | null>(null);

    // Form fields (Add)
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    // Form fields (Edit Profile)
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [isEditingInfo, setIsEditingInfo] = useState(false);

    useEffect(() => {
        fetchBranches();
        fetchClients();
    }, [employeeBranchId, employeeRole]);

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name');
        if (data) setBranches(data);
    };

    const fetchClients = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('clients')
            .select(`
                id, name, phone, email, created_at,
                vehicles (
                    id, make, model, plate_number, engine_size,
                    inspection_reports (id, report_number, status, branch_id, created_at, total_price, branches(name))
                )
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            const mapped = data.map((c: any) => {
                let allReports: any[] = [];
                let branchIdSet = new Set<string>();
                let branchNameSet = new Set<string>();

                c.vehicles?.forEach((v: any) => {
                    v.inspection_reports?.forEach((r: any) => {
                        allReports.push({...r, vehicle: v});
                        if (r.branch_id) branchIdSet.add(r.branch_id);
                        if (r.branches?.name) branchNameSet.add(r.branches.name);
                    });
                });

                allReports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                let latestStatus = 'لا توجد طلبات';
                if (allReports.length > 0) {
                    const st = allReports[0].status;
                    if (st === 'completed' || st === 'تم الانتهاء' || st === 'ملغي' || st === 'cancelled') {
                        latestStatus = 'مكتمل';
                    } else if (st === 'pending' || st === 'قيد الانتظار' || st === 'قيد العمل' || st === 'in_progress') {
                        latestStatus = 'قيد العمل';
                    }
                }

                // Deduplicate vehicles for display (e.g. by make, model, and plate number)
                const uniqueVehicles: any[] = [];
                const seenVehKeys = new Set<string>();
                c.vehicles?.forEach((v: any) => {
                    const makeKey = (v.make || "").trim().toLowerCase();
                    const modelKey = (v.model || "").trim().toLowerCase();
                    const plateKey = (v.plate_number || "").trim().toLowerCase();
                    const key = `${makeKey}_${modelKey}_${plateKey}`;
                    if (!seenVehKeys.has(key)) {
                        seenVehKeys.add(key);
                        uniqueVehicles.push(v);
                    }
                });

                return {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    email: c.email,
                    created_at: c.created_at,
                    vehicles: uniqueVehicles,
                    latestStatus,
                    branchIds: Array.from(branchIdSet),
                    branchNames: Array.from(branchNameSet),
                    allReports
                };
            });

            if (employeeBranchId) {
                setClients(mapped.filter((c: any) => c.branchIds.includes(employeeBranchId)));
            } else {
                setClients(mapped);
            }
        }
        setLoading(false);
    };

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('clients').insert([{ name, phone, email }]);
        if (!error) {
            setIsAddModalOpen(false);
            setName(""); setPhone(""); setEmail("");
            fetchClients();
            showSuccess("تم الإضافة", "تم إضافة العميل بنجاح.");
        } else {
            showError("خطأ", "حدث خطأ أثناء إضافة العميل.");
        }
    };

    const handleDeleteClient = async (id: string) => {
        const isConfirmed = await showConfirm(
            "حذف العميل",
            "هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع البيانات المرتبطة به.",
            "نعم، احذف",
            true
        );
        if (!isConfirmed) return;
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (!error) {
            setSelectedProfile(null);
            fetchClients();
            showSuccess("تم الحذف", "تم حذف العميل بنجاح.");
        } else {
            showError("خطأ", "حدث خطأ أثناء حذف العميل.");
        }
    };

    const handleUpdateInfo = async () => {
        if (!selectedProfile) return;
        const { error } = await supabase
            .from('clients')
            .update({ name: editName, phone: editPhone, email: editEmail })
            .eq('id', selectedProfile.id);
            
        if (!error) {
            setIsEditingInfo(false);
            fetchClients();
            setSelectedProfile({
                ...selectedProfile,
                name: editName,
                phone: editPhone,
                email: editEmail
            });
            showSuccess("تم التحديث", "تم تحديث بيانات العميل بنجاح.");
        } else {
            showError("خطأ", "حدث خطأ أثناء تحديث البيانات.");
        }
    };

    const handleDeleteReport = async (reportId: string, reportNumber: number) => {
        const isConfirmed = await showConfirm(
            "حذف الفاتورة",
            `هل أنت متأكد من حذف الفاتورة #${reportNumber}؟\nهذا الإجراء لا يمكن التراجع عنه.`,
            "نعم، احذف",
            true
        );
        if (!isConfirmed) return;
        const { error } = await supabase.from('inspection_reports').delete().eq('id', reportId);
        if (!error) {
            fetchClients();
            if (selectedProfile) {
                setSelectedProfile({
                    ...selectedProfile,
                    allReports: selectedProfile.allReports.filter((r: any) => r.id !== reportId)
                });
            }
            showSuccess("تم الحذف", "تم حذف الفاتورة بنجاح.");
        } else {
            showError("خطأ", `خطأ أثناء الحذف: ${error.message}`);
        }
    };

    // Filter Logic
    const filteredClients = clients.filter(c => {
        const matchSearch = c.name.includes(searchTerm) || 
                            c.phone.includes(searchTerm) || 
                            (c.vehicles?.some(v => v.plate_number.includes(searchTerm) || v.make.includes(searchTerm)));
        const matchBranch = branchFilter ? c.branchIds?.includes(branchFilter) : true;
        
        let matchDate = true;
        if (dateFrom || dateTo) {
            const hasValidReport = c.allReports.some(r => {
                const rDate = new Date(r.created_at).toISOString().split('T')[0];
                if (dateFrom && rDate < dateFrom) return false;
                if (dateTo && rDate > dateTo) return false;
                return true;
            });
            matchDate = hasValidReport;
        }

        return matchSearch && matchBranch && matchDate;
    });

    const exportExcel = async () => {
        const { data, error } = await supabase
            .from("inspection_reports")
            .select(`id, report_number, created_at, total_price, status, selected_services, odometer_reading,
                     receptionist:receptionist_id(name),
                     vehicles(make, model, plate_number, clients(name, phone)), branches(name)`)
            .order("created_at", { ascending: false });

        if (!data || error) return;

        let filteredReports = data;
        
        if (branchFilter) {
            const selectedBranch = branches.find(b => b.id === branchFilter)?.name;
            if (selectedBranch) {
                filteredReports = filteredReports.filter((r: any) => r.branches?.name === selectedBranch);
            }
        }
        
        if (dateFrom || dateTo) {
            filteredReports = filteredReports.filter((r: any) => {
                const rDate = new Date(r.created_at).toISOString().split('T')[0];
                if (dateFrom && rDate < dateFrom) return false;
                if (dateTo && rDate > dateTo) return false;
                return true;
            });
        }

        const STATUS_MAP: Record<string, string> = {
            "pending": "قيد الانتظار", "قيد الانتظار": "قيد الانتظار",
            "in_progress": "قيد العمل", "قيد العمل": "قيد العمل",
            "completed": "تم الانتهاء", "تم الانتهاء": "تم الانتهاء",
            "cancelled": "ملغي", "ملغي": "ملغي"
        };

        const SERVICE_LABELS: Record<string, string> = {
            engineOil: 'زيت المحرك', oilFilter: 'فلتر زيت المحرك',
            airFilter: 'فلتر الهواء', acFilter: 'فلتر التبريد',
            brakeFluid: 'زيت المكابح', coolant: 'ماء الراديتر',
            battery: 'البطارية', engineBelts: 'قايش المحرك',
            brakePads: 'دسكات السيارة', sparkPlugs: 'شمعات الاحتراق',
            gearboxOil: 'هايدروليك الكير', gearboxFilter: 'فلتر الكير',
            wipers: 'مساحات زجاج', windshieldFluid: 'سائل غسيل جام',
            battery2: 'البطارية فحص دوري', batteryFilter: 'فلتر البطارية',
            engineFlash: 'فلاش المحرك', engineCeramic: 'سيراميك محرك',
            linerCleaner: 'منظف بطانة (جكجكة)', oilLeakPreventer: 'مانع تسريب زيت',
            smokePreventer: 'مانع دخان', gearboxFlash: 'فلاش كير',
            gearboxCeramic: 'سيراميك كير', gearboxAntiSlip: 'مانع انزلاق كير',
            acCleaner: 'منظف دورة تبريد', injectorCleaner: 'منظف بخاخات',
            fuelSystemCleaner: 'منظف نظام وقود', octaneBooster: 'محسن أوكتان',
            additives: 'معالجات ومحسنات', cleaners: 'منظفات وأساسيات',
            transOil: 'زيت ناقل الحركة', differentialOil: 'زيت الدبل / البكك',
            maintenanceUnits: 'وحدات الصيانة'
        };

        const mapped = filteredReports.map((r: any, idx: number) => {
            const vehicle = Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles;
            const client  = vehicle ? (Array.isArray(vehicle.clients) ? vehicle.clients[0] : vehicle.clients) : null;
            const payload = Array.isArray(r.selected_services) ? r.selected_services[0] : r.selected_services;
            
            const services   = payload?.services  || {};
            const customs    = payload?.customServices || [];
            const bookletObj = payload?.booklet   || {};

            const oilSvc  = services.engineOil || {};
            const oilType = oilSvc.details?.type || oilSvc.details?.brand || "";
            const oilVisc = oilSvc.details?.viscosity || "";
            const oilLiters = oilSvc.details?.qty || oilSvc.details?.liters || "";

            const needChange = Object.entries(services as Record<string, any>)
                .filter(([, v]) => v?.status === "يحتاج تغيير")
                .map(([k, v]) => {
                    const label = SERVICE_LABELS[k] || k;
                    const det = v?.details || {};
                    let parts = [];
                    if (k === 'additives' || k === 'cleaners') {
                        for (let i = 0; i < 10; i++) {
                            if (det[`prod_${i}`]) {
                                let s = String(det[`prod_${i}`]);
                                if (det[`notes_${i}`]) s += ` (ملاحظات: ${det[`notes_${i}`]})`;
                                parts.push(s);
                            }
                        }
                    } else if (k !== 'engineOil') {
                        for (const [dk, dval] of Object.entries(det)) {
                            if (dk === 'unitPrice' || !dval) continue;
                            if (dk === 'notes') parts.push(`ملاحظات: ${dval}`);
                            else if (dk === 'qty' || dk === 'liters') parts.push(`العدد/اللترات: ${dval}`);
                            else parts.push(String(dval));
                        }
                    }
                    return parts.length ? `${label}: ${parts.join(' - ')}` : label;
                });

            const customLabels = customs.filter((c: any) => c.label).map((c: any) => c.label);
            const bookletStr   = bookletObj.type
                ? `${bookletObj.type}${bookletObj.changes ? ` (${bookletObj.changes})` : ""}`
                : "";

            // New fields
            const odometer = r.odometer_reading || "";
            const receptionistName = r.receptionist?.name || payload?.receptionistName || "";
            const supervisorName = payload?.shiftSupervisor || "";
            const technicianName = payload?.technicianName || "";
            const shiftName = payload?.shiftName || "";

            return {
                seq: idx + 1,
                branch_name: r.branches?.name || "—",
                client_name:  client?.name  || "—",
                client_phone: client?.phone || "—",
                car_make:  vehicle?.make  || "—",
                car_model: vehicle?.model || "—",
                plate: vehicle?.plate_number || "—",
                created_at: new Date(r.created_at).toLocaleDateString("en-US"),
                shift_name: shiftName || "—",
                receptionist_name: receptionistName || "—",
                supervisor_name: supervisorName || "—",
                technician_name: technicianName || "—",
                odometer: odometer || "—",
                service_type: needChange.join("، ") || "فحص",
                oil_type: oilType, oil_viscosity: oilVisc, oil_liters: oilLiters,
                extra_services: customLabels.join("، "),
                booklet: bookletStr,
                total_price: r.total_price || 0,
                status: STATUS_MAP[r.status] || r.status || "",
            };
        });

        const wsData = [
            ["#", "الفرع", "اسم الزبون", "رقم الهاتف", "السيارة", "الموديل", "رقم اللوحة", "التاريخ", "الشفت",
             "موظف الاستقبال", "المشرف", "الفني", "العداد (كم)",
             "نوع الخدمة", "نوع الزيت", "درجة اللزوجة", "عدد اللترات",
             "الخدمات الإضافية", "دفتر الزيت", "السعر (د.ع)", "الحالة"],
            ...mapped.map(r => [
                r.seq, r.branch_name, r.client_name, r.client_phone, r.car_make, r.car_model, r.plate, r.created_at, r.shift_name,
                r.receptionist_name, r.supervisor_name, r.technician_name, r.odometer,
                r.service_type, r.oil_type, r.oil_viscosity, r.oil_liters,
                r.extra_services, r.booklet, r.total_price, r.status
            ])
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws["!cols"] = [
            {wch:5}, {wch:16}, {wch:22}, {wch:16}, {wch:14}, {wch:14}, {wch:14}, {wch:14}, {wch:12},
            {wch:18}, {wch:18}, {wch:18}, {wch:14},
            {wch:28}, {wch:18}, {wch:14}, {wch:10}, {wch:28}, {wch:14}, {wch:12}, {wch:12},
        ];
        if (!ws["!opts"]) ws["!opts"] = {};
        (ws as any)["!opts"].RTL = true;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "طلبات الصيانة");
        XLSX.writeFile(wb, `reports_${new Date().toISOString().slice(0,10)}.xlsx`);
    };

    const openProfile = (client: ClientWithVehicles) => {
        setSelectedProfile(client);
        setEditName(client.name);
        setEditPhone(client.phone);
        setEditEmail(client.email || "");
        setIsEditingInfo(false);
    };

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <User className="text-rose-500" size={32} />
                            سجل العملاء والمركبات الشامل
                        </h1>
                        <p className="text-muted-foreground">
                            إدارة بيانات العملاء، المركبات المرتبطة، وتاريخ الصيانة من مكان واحد.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                        >
                            <Plus size={18} /> <span className="hidden sm:inline">إضافة عميل</span>
                        </button>
                        <button 
                            onClick={exportExcel}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                        >
                            <Download size={18} /> <span className="hidden sm:inline">تصدير الفواتير</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="glass-card p-4 rounded-2xl flex flex-wrap gap-4 items-end">
                    <div className="relative flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5">بحث شامل</label>
                        <Search className="absolute right-3 top-9 text-muted-foreground" size={18} />
                        <input 
                            type="text" 
                            placeholder="الاسم، الرقم، أو رقم اللوحة..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl py-2.5 pr-10 pl-4 text-foreground placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500/50"
                        />
                    </div>
                    <div className="w-full sm:w-auto">
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5">الفرع</label>
                        <select 
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="bg-background border border-border rounded-xl py-2.5 px-4 min-w-[150px] text-foreground text-sm focus:outline-none focus:border-rose-500/50"
                        >
                            <option value="">كل الفروع</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div className="w-full sm:w-auto">
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5">من تاريخ</label>
                        <div className="relative">
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input 
                                type="date" 
                                value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                                className="bg-background border border-border rounded-xl py-2 pr-10 pl-3 text-foreground text-sm focus:outline-none focus:border-rose-500/50"
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-auto">
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5">إلى تاريخ</label>
                        <div className="relative">
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input 
                                type="date" 
                                value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                                className="bg-background border border-border rounded-xl py-2 pr-10 pl-3 text-foreground text-sm focus:outline-none focus:border-rose-500/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="glass-card rounded-2xl border-border overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-card border-b border-border">
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">العميل</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">معلومات التواصل</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">المركبات المسجلة</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">حالة العميل / الفرع</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap text-left">العمليات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-muted-foreground">جاري تحميل البيانات...</td>
                                    </tr>
                                )}
                                {!loading && filteredClients.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-3">
                                                <ShieldAlert size={48} className="text-slate-700 mx-auto" />
                                                لا يوجد عملاء يطابقون الفلاتر.
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {!loading && filteredClients.map((client) => (
                                    <tr key={client.id} onClick={() => openProfile(client)} className="border-b border-border hover:bg-muted/30 transition-colors group cursor-pointer">
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-rose-400 font-bold text-lg shrink-0">
                                                    {client.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-foreground text-base group-hover:text-rose-400 transition-colors">
                                                        {client.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top space-y-2">
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                <Phone size={14} className="text-muted-foreground" /> <span dir="ltr">{client.phone}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top w-1/3">
                                            {client.vehicles && client.vehicles.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {client.vehicles.map((v, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground shadow-sm">
                                                            <Car size={14} className="text-blue-500" />
                                                            <span>{v.make} {v.model}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 bg-muted rounded">{v.plate_number}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs px-2 py-1 bg-card rounded">لا توجد مركبات</span>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-2">
                                                <span className={`inline-flex w-fit px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                                    client.latestStatus === "مكتمل" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                    client.latestStatus === "قيد العمل" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                    "bg-muted text-muted-foreground border-border"
                                                }`}>
                                                    {client.latestStatus}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top text-left">
                                            <button className="px-4 py-2 bg-muted hover:bg-rose-500 hover:text-white text-muted-foreground rounded-xl text-sm font-bold transition-all inline-flex items-center gap-2">
                                                <FolderOpen size={16} /> الملف الشامل
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Profile Modal */}
            {selectedProfile && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500 font-bold text-2xl shrink-0">
                                    {selectedProfile.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                        {selectedProfile.name}
                                    </h2>
                                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                                        <Phone size={14}/> <span dir="ltr">{selectedProfile.phone}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedProfile(null)} className="p-2 bg-background hover:bg-rose-500 text-muted-foreground hover:text-white rounded-xl transition-colors border border-border">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            
                            {/* Section 1: Personal Info */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-rose-500/30 pb-2 inline-flex">
                                        <Users size={20} className="text-rose-500"/> بيانات العميل الأساسية
                                    </h3>
                                    {!isEditingInfo ? (
                                        <button onClick={() => setIsEditingInfo(true)} className="text-sm font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-lg">
                                            <Edit2 size={14}/> تعديل
                                        </button>
                                    ) : (
                                        isOwnerOrAdmin && (
                                            <button onClick={() => handleDeleteClient(selectedProfile.id)} className="text-sm font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1 bg-rose-500/10 px-3 py-1.5 rounded-lg">
                                                <Trash2 size={14}/> حذف العميل نهائياً
                                            </button>
                                        )
                                    )}
                                </div>

                                {isEditingInfo ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-xl border border-border">
                                        <div>
                                            <label className="text-xs text-muted-foreground block mb-1">الاسم</label>
                                            <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-rose-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground block mb-1">رقم الهاتف</label>
                                            <input type="text" dir="ltr" value={editPhone} onChange={e=>setEditPhone(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-rose-500 outline-none text-right" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground block mb-1">البريد</label>
                                            <input type="email" dir="ltr" value={editEmail} onChange={e=>setEditEmail(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-rose-500 outline-none text-right" />
                                        </div>
                                        <div className="sm:col-span-3 flex gap-2 justify-end mt-2">
                                            <button onClick={() => setIsEditingInfo(false)} className="px-4 py-2 rounded-lg text-sm bg-background border border-border font-bold">إلغاء</button>
                                            <button onClick={handleUpdateInfo} className="px-4 py-2 rounded-lg text-sm bg-rose-600 text-white font-bold flex items-center gap-1"><Save size={16}/> حفظ التعديلات</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="bg-background border border-border p-3 rounded-xl">
                                            <p className="text-xs text-muted-foreground mb-1">الاسم</p>
                                            <p className="font-bold text-sm">{selectedProfile.name}</p>
                                        </div>
                                        <div className="bg-background border border-border p-3 rounded-xl">
                                            <p className="text-xs text-muted-foreground mb-1">الهاتف</p>
                                            <p className="font-bold text-sm" dir="ltr">{selectedProfile.phone}</p>
                                        </div>
                                        <div className="bg-background border border-border p-3 rounded-xl">
                                            <p className="text-xs text-muted-foreground mb-1">البريد</p>
                                            <p className="font-bold text-sm">{selectedProfile.email || "—"}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section 2: Vehicles */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-blue-500/30 pb-2 inline-flex">
                                        <Car size={20} className="text-blue-500"/> مركبات العميل
                                    </h3>
                                </div>
                                {selectedProfile.vehicles.length === 0 ? (
                                    <div className="p-4 border border-dashed border-border rounded-xl text-center text-muted-foreground text-sm">
                                        لا توجد مركبات مسجلة لهذا العميل. (يمكنك إضافتها من الاستقبال)
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedProfile.vehicles.map((v: any, idx) => (
                                            <div key={idx} className="bg-background border border-border p-4 rounded-xl flex items-center gap-4 group">
                                                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                                                    <Car size={24}/>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-base">{v.make} {v.model} <span className="text-xs text-muted-foreground">({v.engine_size || "—"})</span></h4>
                                                    <p className="text-sm font-mono text-muted-foreground mt-1">اللوحة: <span className="bg-muted px-1.5 py-0.5 rounded text-foreground">{v.plate_number || "—"}</span></p>
                                                </div>
                                                {/* <Link href={`/vehicles/${v.id}`} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                    <Edit2 size={18}/>
                                                </Link> */}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Section 3: History */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-emerald-500/30 pb-2 inline-flex">
                                        <Wrench size={20} className="text-emerald-500"/> تاريخ الزيارات والفواتير
                                    </h3>
                                </div>
                                {selectedProfile.allReports.length === 0 ? (
                                    <div className="p-4 border border-dashed border-border rounded-xl text-center text-muted-foreground text-sm">
                                        لا توجد فواتير صيانة سابقة.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedProfile.allReports.map((r: any, idx) => (
                                            <div key={idx} className="bg-background border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-500/30 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded font-bold">#{r.report_number}</span>
                                                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('ar-IQ')}</span>
                                                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">{r.status}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-foreground">
                                                        المركبة: <span className="text-muted-foreground font-normal">{r.vehicle?.make} {r.vehicle?.model} ({r.vehicle?.plate_number})</span>
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="text-lg font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 shadow-sm" dir="ltr">
                                                        {r.total_price ? r.total_price.toLocaleString() : 0} <span className="text-xs">IQD</span>
                                                    </p>
                                                    <Link href={`/reception?edit=${r.id}`} className="p-2 bg-muted hover:bg-blue-500 hover:text-white rounded-lg text-muted-foreground transition-colors border border-border" title="تعديل الفاتورة بالكامل">
                                                        <Edit2 size={18}/>
                                                    </Link>
                                                    <button onClick={() => router.push(`/print/${r.id}?mode=full`)} className="p-2 bg-muted hover:bg-emerald-500 hover:text-white rounded-lg text-muted-foreground transition-colors border border-border" title="طباعة الفاتورة">
                                                        <FileText size={18}/>
                                                    </button>
                                                    {isOwnerOrAdmin && (
                                                        <button onClick={() => handleDeleteReport(r.id, r.report_number)} className="p-2 bg-muted hover:bg-rose-600 hover:text-white rounded-lg text-muted-foreground transition-colors border border-border" title="حذف الفاتورة (مالك النظام فقط)">
                                                            <Trash2 size={18}/>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* Add Client Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-xl font-bold text-foreground">إضافة عميل جديد</h2>
                        </div>
                        <form onSubmit={handleAddClient} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">اسم العميل *</label>
                                <input 
                                    type="text" required
                                    value={name} onChange={e => setName(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-rose-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">رقم الهاتف *</label>
                                <input 
                                    type="tel" required dir="ltr"
                                    value={phone} onChange={e => setPhone(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-rose-500 text-right"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl font-bold transition-colors">
                                    حفظ
                                </button>
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-muted hover:bg-muted text-foreground py-2.5 rounded-xl font-bold transition-colors">
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
