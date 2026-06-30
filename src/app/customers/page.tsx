"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/lib/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Users, User, Search, Download, Plus, MapPin, Phone,
    Car, FileText, ChevronLeft, ChevronRight, ShieldAlert,
    Trash2, Edit2, FolderOpen, Calendar, Save, X, Wrench, Loader2,
    CheckCircle2, ShieldCheck, Droplets, Gauge, RefreshCcw
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
    // Hooks must run unconditionally on every render (Rules of Hooks). The access
    // guards that early-return live below, after all hooks/handlers are declared.
    const isAuthorized = employeeRole === 'Owner' || permissionCustomers;

    const [clients, setClients] = useState<ClientWithVehicles[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [branchFilter, setBranchFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [branches, setBranches] = useState<{id:string, name:string}[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const PAGE_SIZE = 25;

    // Modals & Tabbed Profile
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<ClientWithVehicles | null>(null);
    const [activeProfileTab, setActiveProfileTab] = useState<string>("summary");
    const [loadedReports, setLoadedReports] = useState<Record<string, any>>({});
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Form fields (Add)
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    // Form fields (Edit Profile)
    const [editName, setEditName] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [isEditingInfo, setIsEditingInfo] = useState(false);

    const [backingUp, setBackingUp] = useState(false);

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [branchFilter, dateFrom, dateTo]);

    useEffect(() => {
        if (authLoading || !isAuthorized) return;
        fetchClients();
    }, [debouncedSearchTerm, branchFilter, dateFrom, dateTo, currentPage, employeeBranchId, employeeRole, authLoading, isAuthorized]);

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('id, name');
        if (data) setBranches(data);
    };

    const fetchClients = async () => {
        setLoading(true);
        try {
            let filteredClientIds: Set<string> | null = null;
            let filterHasNoMatches = false;

            const activeBranchId = employeeBranchId || branchFilter;

            if (activeBranchId || dateFrom || dateTo) {
                let reportQuery = supabase
                    .from('inspection_reports')
                    .select('vehicle_id');
                
                if (activeBranchId) reportQuery = reportQuery.eq('branch_id', activeBranchId);
                if (dateFrom) reportQuery = reportQuery.gte('created_at', `${dateFrom}T00:00:00`);
                if (dateTo) reportQuery = reportQuery.lte('created_at', `${dateTo}T23:59:59`);

                const { data: matchedReports } = await reportQuery;

                if (!matchedReports || matchedReports.length === 0) {
                    filterHasNoMatches = true;
                } else {
                    const vehicleIds = matchedReports.map(r => r.vehicle_id).filter((id): id is string => Boolean(id));
                    if (vehicleIds.length === 0) {
                        filterHasNoMatches = true;
                    } else {
                        const { data: matchedVehicles } = await supabase
                            .from('vehicles')
                            .select('client_id')
                            .in('id', vehicleIds);

                        if (!matchedVehicles || matchedVehicles.length === 0) {
                            filterHasNoMatches = true;
                        } else {
                            filteredClientIds = new Set(matchedVehicles.map(v => v.client_id).filter(Boolean));
                        }
                    }
                }
            }

            if (debouncedSearchTerm && !filterHasNoMatches) {
                const term = debouncedSearchTerm.trim();
                
                const { data: matchedClients } = await supabase
                    .from('clients')
                    .select('id')
                    .or(`name.ilike.%${term}%,phone.ilike.%${term}%`);

                const { data: matchedVehicles } = await supabase
                    .from('vehicles')
                    .select('client_id')
                    .or(`plate_number.ilike.%${term}%,make.ilike.%${term}%,booklet_serial.ilike.%${term}%`);

                const searchClientIds = new Set<string>();
                if (matchedClients) matchedClients.forEach(c => searchClientIds.add(c.id));
                if (matchedVehicles) matchedVehicles.forEach(v => { if (v.client_id) searchClientIds.add(v.client_id); });

                if (searchClientIds.size === 0) {
                    filterHasNoMatches = true;
                } else {
                    if (filteredClientIds === null) {
                        filteredClientIds = searchClientIds;
                    } else {
                        filteredClientIds = new Set([...filteredClientIds].filter(id => searchClientIds.has(id)));
                    }
                }
            }

            if (filterHasNoMatches || (filteredClientIds !== null && filteredClientIds.size === 0)) {
                setClients([]);
                setTotalCount(0);
                setLoading(false);
                return;
            }

            const offset = (currentPage - 1) * PAGE_SIZE;
            let query = supabase
                .from('clients')
                .select(`
                    id, name, phone, email, created_at,
                    vehicles (
                        id, make, model, plate_number, engine_size, booklet_serial,
                        inspection_reports (id, report_number, status, branch_id, created_at, total_price, branches(name))
                    )
                `, { count: 'exact' });

            if (filteredClientIds !== null) {
                query = query.in('id', Array.from(filteredClientIds));
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);

            if (error) throw error;

            if (data) {
                setTotalCount(count || 0);
                const mapped = data.map((c: any) => {
                    const allReports: any[] = [];
                    const branchIdSet = new Set<string>();
                    const branchNameSet = new Set<string>();

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

                setClients(mapped);
            }
        } catch (err: any) {
            console.error("Error fetching clients:", err);
            showError("خطأ", "حدث خطأ أثناء تحميل بيانات العملاء.");
        } finally {
            setLoading(false);
        }
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

    const handleReopenReport = async (reportId: string, reportNumber: number) => {
        const isConfirmed = await showConfirm(
            "إرجاع السيارة للعمل",
            `هل أنت متأكد من رغبتك في إرجاع المركبة في الفاتورة #${reportNumber} إلى ساحة العمل (قيد العمل)؟`,
            "نعم، إرجاع للعمل",
            false
        );
        if (!isConfirmed) return;
        
        const { error } = await supabase
            .from('inspection_reports')
            .update({ 
                status: 'قيد العمل', 
                start_time: new Date().toISOString(),
                completed_at: null
            })
            .eq('id', reportId);
            
        if (!error) {
            fetchClients();
            if (selectedProfile) {
                setSelectedProfile({
                    ...selectedProfile,
                    allReports: selectedProfile.allReports.map((r: any) => 
                        r.id === reportId 
                            ? { ...r, status: 'قيد العمل' } 
                            : r
                    )
                });
            }
            showSuccess("تمت إعادة الفتح", "تمت إعادة المركبة إلى قيد العمل بنجاح.");
        } else {
            showError("خطأ", `حدث خطأ: ${error.message}`);
        }
    };



    // Filter Logic is fully processed on server-side
    const filteredClients = clients;

    const exportExcel = async () => {
        const { data, error } = await supabase
            .from("inspection_reports")
            .select(`id, report_number, created_at, total_price, status, order_type, selected_services, odometer_reading, branch_id,
                     receptionist:receptionist_id(name),
                     vehicles(make, model, plate_number, booklet_serial, clients(name, phone)), branches(name)`)
            .order("created_at", { ascending: false });

        if (!data || error) return;

        let filteredReports = data;
        
        // 1. Apply employee branch restriction if set
        if (employeeBranchId) {
            filteredReports = filteredReports.filter((r: any) => r.branch_id === employeeBranchId);
        }

        // 2. Apply branchFilter selected in UI
        if (branchFilter) {
            filteredReports = filteredReports.filter((r: any) => r.branch_id === branchFilter);
        }
        
        // 3. Apply dateFrom and dateTo selected in UI
        if (dateFrom || dateTo) {
            filteredReports = filteredReports.filter((r: any) => {
                if (!r.created_at) return false;
                const rDate = new Date(r.created_at).toISOString().split('T')[0];
                if (dateFrom && rDate < dateFrom) return false;
                if (dateTo && rDate > dateTo) return false;
                return true;
            });
        }

        // 4. Apply searchTerm selected in UI
        const term = (searchTerm || "").toLowerCase().trim();
        if (term) {
            filteredReports = filteredReports.filter((r: any) => {
                const vehicle = Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles;
                const client  = vehicle ? (Array.isArray(vehicle.clients) ? vehicle.clients[0] : vehicle.clients) : null;
                
                const clientNameMatch = client?.name ? client.name.toLowerCase().includes(term) : false;
                const clientPhoneMatch = client?.phone ? client.phone.toLowerCase().includes(term) : false;
                const carMakeMatch = vehicle?.make ? vehicle.make.toLowerCase().includes(term) : false;
                const plateMatch = vehicle?.plate_number ? vehicle.plate_number.toLowerCase().includes(term) : false;
                
                return clientNameMatch || clientPhoneMatch || carMakeMatch || plateMatch;
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

            // "بيع منتج" order: no inspection services — show the product name(s) instead of "فحص".
            const isSale = r.order_type === 'sale' || payload?.is_sale === true;
            const saleProductsText = isSale
                ? (Array.isArray(payload?.products) && payload.products.length
                    ? payload.products.map((p: any) => {
                        const n = String(p?.name || '').trim() || 'منتج';
                        const q = Number(p?.qty || 0);
                        return q > 1 ? `${n} ×${q}` : n;
                    }).join("، ")
                    : 'بيع منتج')
                : '';

            const oilSvc  = services.engineOil || {};
            const oilType = oilSvc.details?.type || oilSvc.details?.brand || "";
            const oilVisc = oilSvc.details?.viscosity || "";
            const oilLiters = oilSvc.details?.liters || oilSvc.details?.qty || "";

            const needChange = Object.entries(services as Record<string, any>)
                .filter(([, v]) => v?.status === "يحتاج تغيير")
                .map(([k, v]) => {
                    const label = SERVICE_LABELS[k] || k;
                    const det = v?.details || {};
                    const parts = [];
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
                client_name:  isSale ? (payload?.customerName || "عميل نقدي") : (client?.name  || "—"),
                client_phone: isSale ? (payload?.customerPhone || "—") : (client?.phone || "—"),
                car_make:  isSale ? "بيع منتج" : (vehicle?.make  || "—"),
                car_model: isSale ? "—" : (vehicle?.model || "—"),
                plate: isSale ? "—" : (vehicle?.plate_number || "—"),
                booklet_serial: vehicle?.booklet_serial || "—",
                created_at: new Date(r.created_at).toLocaleDateString("en-US"),
                shift_name: shiftName || "—",
                receptionist_name: receptionistName || "—",
                supervisor_name: supervisorName || "—",
                technician_name: isSale ? "—" : (technicianName || "—"),
                odometer: isSale ? "—" : (odometer || "—"),
                service_type: isSale ? saleProductsText : (needChange.join("، ") || "فحص"),
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
        setActiveProfileTab("summary");
    };

    const handleSelectVisitTab = async (reportId: string) => {
        setActiveProfileTab(reportId);
        if (!loadedReports[reportId]) {
            setLoadingDetails(true);
            try {
                const { data, error } = await supabase
                    .from('inspection_reports')
                    .select(`
                        id, report_number, status, total_price, selected_services, odometer_reading, created_at,
                        branches (name),
                        receptionist:receptionist_id (name)
                    `)
                    .eq('id', reportId)
                    .single();
                
                if (!error && data) {
                    const basicRep = selectedProfile?.allReports.find((r: any) => r.id === reportId);
                    const reportWithVehicle = {
                        ...data,
                        vehicle: basicRep?.vehicle
                    };
                    setLoadedReports(prev => ({ ...prev, [reportId]: reportWithVehicle }));
                }
            } catch (e) {
                console.error("Error loading report details:", e);
            } finally {
                setLoadingDetails(false);
            }
        }
    };

    const backupDatabase = async () => {
        setBackingUp(true);
        try {
            showSuccess("جاري التحضير", "بدأت عملية النسخ الاحتياطي للبيانات. يرجى الانتظار...");
            
            const [clientsRes, vehiclesRes, reportsRes, branchesRes, employeesRes] = await Promise.all([
                supabase.from('clients').select('*'),
                supabase.from('vehicles').select('*'),
                supabase.from('inspection_reports').select('*'),
                supabase.from('branches').select('id, name, address, created_at'),
                supabase.from('employees').select('id, name, username, role, branch_id, phone, created_at')
            ]);

            const backupObj = {
                backup_version: "1.0",
                backup_date: new Date().toISOString(),
                data: {
                    clients: clientsRes.data || [],
                    vehicles: vehiclesRes.data || [],
                    inspection_reports: reportsRes.data || [],
                    branches: branchesRes.data || [],
                    employees: employeesRes.data || []
                }
            };

            const jsonString = JSON.stringify(backupObj, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `auto_workshop_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showSuccess("مكتمل", "تم تحميل نسخة احتياطية كاملة من البيانات بنجاح!");
        } catch (err: any) {
            console.error("Backup error:", err);
            showError("خطأ", "فشلت عملية النسخ الاحتياطي للبيانات.");
        } finally {
            setBackingUp(false);
        }
    };

    // Access guards (placed after all hooks so the Rules of Hooks are respected).
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500 w-12 h-12" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-[#08080d] flex items-center justify-center p-4 text-center font-ibm" dir="rtl">
                <div className="glass-card p-8 rounded-3xl border border-rose-500/20 max-w-md w-full">
                    <h2 className="text-2xl font-bold text-rose-500 mb-2">غير مصرح بالوصول</h2>
                    <p className="text-muted-foreground mb-6">ليس لديك صلاحية للوصول إلى سجل العملاء والمركبات.</p>
                </div>
            </div>
        );
    }

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
                        <button 
                            onClick={backupDatabase}
                            disabled={backingUp}
                            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                            title="نسخة احتياطية كاملة للموقع بصيغة JSON"
                        >
                            {backingUp ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            <span className="hidden sm:inline">نسخة احتياطية كاملة</span>
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
                    <div className="overflow-x-auto custom-scrollbar hidden md:block">
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
                                                        <div key={i} className="flex flex-col gap-1 items-start px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-foreground shadow-sm">
                                                            <div className="flex items-center gap-2">
                                                                <Car size={14} className="text-blue-500" />
                                                                <span>{v.make} {v.model}</span>
                                                                <span className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 bg-muted rounded">{v.plate_number}</span>
                                                            </div>
                                                            {false && v.booklet_serial && (
                                                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 w-full text-center font-mono">
                                                                    دفتر: {v.booklet_serial}
                                                                </span>
                                                            )}
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

                    {/* Mobile card list (replaces the wide table on phones) */}
                    <div className="md:hidden divide-y divide-border">
                        {loading && (
                            <div className="p-12 text-center text-muted-foreground">جاري تحميل البيانات...</div>
                        )}
                        {!loading && filteredClients.length === 0 && (
                            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
                                <ShieldAlert size={40} className="text-slate-700" />
                                لا يوجد عملاء يطابقون الفلاتر.
                            </div>
                        )}
                        {!loading && filteredClients.map((client) => (
                            <div
                                key={client.id}
                                onClick={() => openProfile(client)}
                                className="p-4 active:bg-muted/40 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-rose-400 font-bold text-lg shrink-0">
                                            {client.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <span className="font-bold text-foreground text-base block truncate">{client.name}</span>
                                            <span className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5">
                                                <Phone size={12} className="shrink-0" /> <span dir="ltr">{client.phone}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`inline-flex shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                        client.latestStatus === "مكتمل" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                        client.latestStatus === "قيد العمل" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                        "bg-muted text-muted-foreground border-border"
                                    }`}>
                                        {client.latestStatus}
                                    </span>
                                </div>

                                {client.vehicles && client.vehicles.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {client.vehicles.map((v, i) => (
                                            <div key={i} className="flex items-center gap-2 px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-medium">
                                                <Car size={13} className="text-blue-500 shrink-0" />
                                                <span>{v.make} {v.model}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 bg-muted rounded">{v.plate_number}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-3 flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                                    <FolderOpen size={14} /> عرض الملف الشامل
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination Controls */}
                    {!loading && totalCount > PAGE_SIZE && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-card/50 border-t border-border/60">
                            <span className="text-xs text-muted-foreground font-medium">
                                عرض {((currentPage - 1) * PAGE_SIZE) + 1} - {Math.min(currentPage * PAGE_SIZE, totalCount)} من إجمالي {totalCount} عميل
                            </span>
                            <div className="flex items-center gap-2" dir="ltr">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    className="p-2 bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50 border border-border rounded-xl transition-all font-bold text-xs flex items-center gap-1"
                                >
                                    <ChevronRight size={14} /> السابق
                                </button>
                                <span className="text-xs text-foreground font-bold px-3">
                                    صفحة {currentPage} من {Math.ceil(totalCount / PAGE_SIZE)}
                                </span>
                                <button
                                    disabled={currentPage >= Math.ceil(totalCount / PAGE_SIZE)}
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / PAGE_SIZE)))}
                                    className="p-2 bg-muted hover:bg-muted/80 text-foreground disabled:opacity-50 border border-border rounded-xl transition-all font-bold text-xs flex items-center gap-1"
                                >
                                    التالي <ChevronLeft size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Profile Modal */}
            {selectedProfile && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl">
                        
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

                        {/* Modal Body: Split view */}
                        <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0">
                            
                            {/* Right Sidebar - Visit Tabs */}
                            <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-border bg-muted/10 flex flex-col overflow-y-auto custom-scrollbar">
                                <div className="p-4 space-y-2">
                                    {/* Summary Tab */}
                                    <button
                                        onClick={() => setActiveProfileTab("summary")}
                                        className={`w-full text-right px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
                                            activeProfileTab === "summary"
                                                ? "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-950/20"
                                                : "bg-background hover:bg-muted text-foreground border-border"
                                        }`}
                                    >
                                        <span>الملخص الشامل للعميل</span>
                                        <User size={16} />
                                    </button>

                                    <div className="border-t border-border/40 my-2 pt-2">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-2 mb-2">تاريخ الزيارات ({selectedProfile.allReports.length})</span>
                                    </div>

                                    {/* Visits Tabs */}
                                    {selectedProfile.allReports.length === 0 ? (
                                        <span className="text-xs text-muted-foreground block text-center py-4">لا توجد زيارات سابقة</span>
                                    ) : (
                                        selectedProfile.allReports.map((r: any) => {
                                            const isSelected = activeProfileTab === r.id;
                                            const dateStr = new Date(r.created_at).toLocaleDateString("ar-IQ", {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit'
                                            });
                                            return (
                                                <button
                                                    key={r.id}
                                                    onClick={() => handleSelectVisitTab(r.id)}
                                                    className={`w-full text-right px-4 py-3 rounded-xl text-xs font-bold transition-all flex flex-col gap-1 border ${
                                                        isSelected
                                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-950/20"
                                                            : "bg-background hover:bg-muted text-foreground border-border"
                                                    }`}
                                                >
                                                    <div className="flex justify-between items-center w-full">
                                                        <span className="font-mono">فاتورة #{r.report_number}</span>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                                            isSelected 
                                                                ? "bg-white/20 text-white" 
                                                                : r.status === "completed" || r.status === "تم الانتهاء" 
                                                                    ? "bg-emerald-500/10 text-emerald-400" 
                                                                    : "bg-amber-500/10 text-amber-400"
                                                        }`}>
                                                            {r.status === "completed" || r.status === "تم الانتهاء" ? "مكتمل" : "قيد العمل"}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px] opacity-80 mt-1 font-normal">
                                                        <span>{r.vehicle?.make} {r.vehicle?.model}</span>
                                                        <span>{dateStr}</span>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Left Panel - Tab Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-background">
                                {activeProfileTab === "summary" ? (
                                    /* Summary Tab Content */
                                    <div className="space-y-8">
                                        {/* Basic Info */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-rose-500/30 pb-2 inline-flex">
                                                    <Users size={20} className="text-rose-500"/> بيانات العميل الأساسية
                                                </h3>
                                                {!isEditingInfo ? (
                                                    <button onClick={() => setIsEditingInfo(true)} className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-lg">
                                                        <Edit2 size={14}/> تعديل البيانات
                                                    </button>
                                                ) : (
                                                    isOwnerOrAdmin && (
                                                        <button onClick={() => handleDeleteClient(selectedProfile.id)} className="text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1 bg-rose-500/10 px-3 py-1.5 rounded-lg">
                                                            <Trash2 size={14}/> حذف العميل نهائياً
                                                        </button>
                                                    )
                                                )}
                                            </div>

                                            {isEditingInfo ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/50 p-4 rounded-xl border border-border">
                                                    <div>
                                                        <label className="text-xs text-muted-foreground block mb-1">الاسم</label>
                                                        <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:border-rose-500 outline-none" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-muted-foreground block mb-1">رقم الهاتف</label>
                                                        <input type="text" dir="ltr" value={editPhone} onChange={e=>setEditPhone(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:border-rose-500 outline-none text-right" />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-muted-foreground block mb-1">البريد الإلكتروني</label>
                                                        <input type="email" dir="ltr" value={editEmail} onChange={e=>setEditEmail(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:border-rose-500 outline-none text-right" />
                                                    </div>
                                                    <div className="sm:col-span-3 flex gap-2 justify-end mt-2">
                                                        <button onClick={() => setIsEditingInfo(false)} className="px-3 py-1.5 rounded-lg text-xs bg-background border border-border font-bold">إلغاء</button>
                                                        <button onClick={handleUpdateInfo} className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 text-white font-bold flex items-center gap-1"><Save size={14}/> حفظ التعديلات</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div className="bg-muted/20 border border-border/40 p-3 rounded-xl">
                                                        <p className="text-[10px] text-muted-foreground mb-1">الاسم الكامل</p>
                                                        <p className="font-bold text-xs">{selectedProfile.name}</p>
                                                    </div>
                                                    <div className="bg-muted/20 border border-border/40 p-3 rounded-xl">
                                                        <p className="text-[10px] text-muted-foreground mb-1">رقم الهاتف</p>
                                                        <p className="font-bold text-xs" dir="ltr">{selectedProfile.phone}</p>
                                                    </div>
                                                    <div className="bg-muted/20 border border-border/40 p-3 rounded-xl">
                                                        <p className="text-[10px] text-muted-foreground mb-1">البريد الإلكتروني</p>
                                                        <p className="font-bold text-xs">{selectedProfile.email || "—"}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Statistics Overview */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                                                <Gauge size={18} className="text-rose-500" />
                                                إحصائيات الملف الشخصي للعميل
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="bg-gradient-to-br from-rose-500/5 to-rose-600/5 border border-rose-500/10 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
                                                    <Car className="text-rose-400 mb-1.5" size={22} />
                                                    <span className="text-[11px] text-muted-foreground font-medium">المركبات المسجلة</span>
                                                    <span className="text-base font-black mt-1">{selectedProfile.vehicles.length} سيارات</span>
                                                </div>
                                                <div className="bg-gradient-to-br from-blue-500/5 to-blue-600/5 border border-blue-500/10 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
                                                    <Wrench className="text-blue-400 mb-1.5" size={22} />
                                                    <span className="text-[11px] text-muted-foreground font-medium">عدد زيارات الصيانة</span>
                                                    <span className="text-base font-black mt-1">{selectedProfile.allReports.length} زيارة</span>
                                                </div>
                                                <div className="bg-gradient-to-br from-emerald-500/5 to-emerald-600/5 border border-emerald-500/10 p-4 rounded-2xl flex flex-col justify-center items-center text-center">
                                                    <Download className="text-emerald-400 mb-1.5" size={22} />
                                                    <span className="text-[11px] text-muted-foreground font-medium">إجمالي المبالغ المدفوعة</span>
                                                    <span className="text-base font-black mt-1 text-emerald-400 font-mono" dir="ltr">
                                                        {selectedProfile.allReports.reduce((acc, r) => acc + (r.total_price || 0), 0).toLocaleString()} <span className="text-[10px] font-sans">IQD</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Vehicles List */}
                                        <div className="space-y-4">
                                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-blue-500/30 pb-2 inline-flex">
                                                <Car size={18} className="text-blue-500"/> المركبات المسجلة في الحساب
                                            </h3>
                                            {selectedProfile.vehicles.length === 0 ? (
                                                <div className="p-4 border border-dashed border-border rounded-xl text-center text-muted-foreground text-xs">
                                                    لا توجد مركبات مسجلة في هذا الملف. (يمكنك تسجيل سيارة جديدة من شاشة الاستقبال)
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {selectedProfile.vehicles.map((v: any, idx) => (
                                                        <div key={idx} className="bg-muted/10 border border-border/40 p-4 rounded-2xl flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                                                                <Car size={20}/>
                                                            </div>
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-sm">{v.make} {v.model} <span className="text-[10px] text-muted-foreground">({v.engine_size || "—"})</span></h4>
                                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                    <span className="text-[11px] font-mono text-muted-foreground">اللوحة: <span className="bg-muted px-1.5 py-0.5 rounded text-foreground font-sans">{v.plate_number || "—"}</span></span>
                                                                    {false && v.booklet_serial && (
                                                                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-mono">
                                                                            دفتر: {v.booklet_serial}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    /* Visit Details Tab Content */
                                    <div className="space-y-6">
                                        {loadingDetails ? (
                                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                                <Loader2 className="animate-spin text-emerald-500 w-10 h-10" />
                                                <span className="text-xs text-muted-foreground font-bold">جاري تحميل تفاصيل الزيارة...</span>
                                            </div>
                                        ) : loadedReports[activeProfileTab] ? (
                                            <VisitDetailsView 
                                                report={loadedReports[activeProfileTab]}
                                                isOwnerOrAdmin={isOwnerOrAdmin}
                                                onDeleteReport={handleDeleteReport}
                                                onReopenReport={handleReopenReport}
                                                router={router}
                                            />
                                        ) : (
                                            <div className="text-center text-muted-foreground py-20 text-xs">عذراً، فشل تحميل تفاصيل هذه الفاتورة.</div>
                                        )}
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

function VisitDetailsView({ report, isOwnerOrAdmin, onDeleteReport, onReopenReport, router }: {
    report: any;
    isOwnerOrAdmin: boolean;
    onDeleteReport: (id: string, num: number) => Promise<void>;
    onReopenReport: (id: string, num: number) => Promise<void>;
    router: any;
}) {
    const isPaperV2 = report.selected_services?.[0]?.is_paper_v2_format === true;
    const servicePayload = isPaperV2 ? report.selected_services[0] : null;

    const services = servicePayload?.services || {};
    const freeServices = servicePayload?.freeServices || {};
    const oldServicesList = !isPaperV2 && Array.isArray(report.selected_services) ? report.selected_services : [];
    
    const oilSvc = services.engineOil || {};
    const oilDetails = oilSvc.details || {};
    const hasOilChange = oilSvc.status === "يحتاج تغيير" || oldServicesList.some((s: any) => s.service === "engineOil" || s.label?.includes("زيت المحرك"));
    
    const replacedItems: string[] = [];
    const inspectedItems: string[] = [];

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

    const FREE_SERVICES_MAP: Record<string, string> = {
        windshieldWater: "ماء المساحات",
        tirePressure: "ضغط الإطارات",
        engineClean: "تنظيف محرك بالبخار",
    };

    if (isPaperV2) {
        Object.entries(services).forEach(([key, val]: [string, any]) => {
            const label = SERVICE_LABELS[key] || key;
            if (val?.status === "يحتاج تغيير") {
                let detailStr = "";
                if (key === 'engineOil') {
                    const brand = oilDetails.type || oilDetails.brand || "";
                    const visc = oilDetails.viscosity || "";
                    const qty = oilDetails.liters || oilDetails.qty || "";
                    detailStr = [brand, visc, qty ? `${qty}L` : ""].filter(Boolean).join(" - ");
                } else if (key === 'additives' || key === 'cleaners') {
                    const added: string[] = [];
                    for (let i = 0; i < 10; i++) {
                        if (val.details?.[`prod_${i}`]) added.push(val.details[`prod_${i}`]);
                    }
                    detailStr = added.join(" + ");
                } else {
                    const specs: string[] = [];
                    if (val.details?.qty || val.details?.liters) specs.push(`العدد: ${val.details?.qty || val.details?.liters}`);
                    if (val.details?.type || val.details?.brand) specs.push(val.details?.type || val.details?.brand);
                    detailStr = specs.join(" - ");
                }
                replacedItems.push(label + (detailStr ? ` (${detailStr})` : ""));
            } else if (val?.status === "جيد") {
                inspectedItems.push(label);
            }
        });

        const customServices = servicePayload?.customServices || [];
        customServices.forEach((c: any) => {
            if (c.label) replacedItems.push(c.label);
        });
    } else {
        oldServicesList.forEach((s: any) => {
            const lbl = typeof s === 'string' ? s : (s.label || s.service || 'خدمة صيانة');
            if (s.status === 'يحتاج تغيير' || typeof s === 'string') {
                replacedItems.push(SERVICE_LABELS[lbl] || lbl);
            } else if (s.status === 'جيد') {
                inspectedItems.push(SERVICE_LABELS[lbl] || lbl);
            }
        });
    }

    const activeFreeServices: string[] = [];
    Object.entries(freeServices).forEach(([key, val]) => {
        if (val === true && FREE_SERVICES_MAP[key]) {
            activeFreeServices.push(FREE_SERVICES_MAP[key]);
        }
    });

    const dateObj = new Date(report.created_at);
    const formattedDate = dateObj.toLocaleDateString("ar-IQ", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const formattedTime = dateObj.toLocaleTimeString("ar-IQ", {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="space-y-6">
            {/* Visit Details Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs bg-muted px-2.5 py-1 rounded-lg font-bold border border-border">زيارة #{report.report_number}</span>
                        <span className="text-[11px] text-muted-foreground">{formattedDate} ({formattedTime})</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            report.status === "completed" || report.status === "تم الانتهاء"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        }`}>
                            {report.status}
                        </span>
                    </div>
                    {report.vehicle && (
                        <p className="text-xs font-bold text-foreground">
                            المركبة: <span className="text-muted-foreground font-normal">{report.vehicle.make} {report.vehicle.model} ({report.vehicle.plate_number})</span>
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <p className="text-base font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20" dir="ltr">
                        {report.total_price ? report.total_price.toLocaleString() : 0} <span className="text-[10px]">IQD</span>
                    </p>
                    {(report.status === "completed" || report.status === "تم الانتهاء") && (
                        <button onClick={() => onReopenReport(report.id, report.report_number)} className="px-3 py-1.5 flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white rounded-lg text-amber-500 font-bold text-xs transition-colors border border-amber-500/30" title="إرجاع السيارة للعمل">
                            <RefreshCcw size={14}/> إرجاع للعمل
                        </button>
                    )}
                    <Link href={`/reception?edit=${report.id}`} className="p-2 bg-muted hover:bg-blue-500 hover:text-white rounded-lg text-muted-foreground transition-colors border border-border" title="تعديل الفاتورة بالكامل">
                        <Edit2 size={14}/>
                    </Link>
                    <button onClick={() => router.push(`/print/${report.id}?mode=full`)} className="p-2 bg-muted hover:bg-emerald-500 hover:text-white rounded-lg text-muted-foreground transition-colors border border-border" title="طباعة الفاتورة">
                        <FileText size={14}/>
                    </button>
                    {isOwnerOrAdmin && (
                        <button onClick={() => onDeleteReport(report.id, report.report_number)} className="p-2 bg-muted hover:bg-rose-600 hover:text-white rounded-lg text-muted-foreground transition-colors border border-border" title="حذف الفاتورة">
                            <Trash2 size={14}/>
                        </button>
                    )}
                </div>
            </div>

            {/* Visit Details Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/20 p-3.5 rounded-2xl border border-border/40 flex flex-col justify-center items-center text-center">
                    <Gauge className="text-rose-400 mb-1" size={18} />
                    <span className="text-[10px] text-muted-foreground font-medium">قراءة العداد</span>
                    <span className="text-xs font-bold text-foreground mt-1 font-mono">{report.odometer_reading ? report.odometer_reading.toLocaleString() : "—"} كم</span>
                </div>
                <div className="bg-muted/20 p-3.5 rounded-2xl border border-border/40 flex flex-col justify-center items-center text-center">
                    <MapPin className="text-blue-400 mb-1" size={18} />
                    <span className="text-[10px] text-muted-foreground font-medium">الفرع</span>
                    <span className="text-xs font-bold text-foreground mt-1">{report.branches?.name || "فرع رئيسي"}</span>
                </div>
            </div>

            {/* Engine Oil Block (Highlighted if changed) */}
            {hasOilChange && (
                <div className="p-4 bg-gradient-to-br from-[#1c1313]/50 to-[#221715]/40 rounded-2xl border border-rose-950/40 relative overflow-hidden">
                    <div className="absolute top-[-20px] left-[-20px] w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <h5 className="text-xs font-bold text-rose-400 flex items-center gap-2 mb-3">
                        <Droplets size={14} />
                        خدمة تغيير زيت المحرك
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                        <div className="bg-background/40 p-2 rounded-xl border border-border/30">
                            <span className="block text-[10px] text-muted-foreground mb-1">النوع / الماركة</span>
                            <span className="font-bold text-foreground">{oilDetails.type || oilDetails.brand || "—"}</span>
                        </div>
                        <div className="bg-background/40 p-2 rounded-xl border border-border/30">
                            <span className="block text-[10px] text-muted-foreground mb-1">درجة اللزوجة</span>
                            <span className="font-bold text-foreground font-mono">{oilDetails.viscosity || "—"}</span>
                        </div>
                        <div className="bg-background/40 p-2 rounded-xl border border-border/30">
                            <span className="block text-[10px] text-muted-foreground mb-1">حجم التعبئة</span>
                            <span className="font-bold text-foreground font-mono">{oilDetails.liters || oilDetails.qty || "—"} لتر</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Replaced Parts / Completed Services List */}
            {replacedItems.length > 0 && (
                <div className="space-y-3">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                        <Wrench size={12} className="text-amber-500" />
                        القطع المستبدلة والخدمات المنجزة
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {replacedItems.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-[11px] font-semibold text-foreground bg-muted/10 border border-border/20 p-2.5 rounded-xl">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Free services list */}
            {activeFreeServices.length > 0 && (
                <div className="space-y-3">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        خدمات مجانية إضافية منجزة
                    </h5>
                    <div className="flex flex-wrap gap-2">
                        {activeFreeServices.map((fs, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-xl">
                                ✓ {fs}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Checked items list (Good status) */}
            {inspectedItems.length > 0 && (
                <div className="space-y-3">
                    <h5 className="text-xs font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                        <ShieldCheck size={12} className="text-blue-400" />
                        أجزاء تم فحصها وحالتها جيدة
                    </h5>
                    <div className="flex flex-wrap gap-2">
                        {inspectedItems.map((item, idx) => (
                            <span key={idx} className="text-[10px] font-medium text-muted-foreground bg-muted/20 border border-border/30 px-2 py-1.5 rounded-xl">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Visit footer (Staff info) */}
            {(report.receptionist?.name || servicePayload?.shiftSupervisor || servicePayload?.technicianName) && (
                <div className="flex flex-wrap justify-between items-center gap-2 text-[10px] text-muted-foreground bg-muted/10 p-2.5 rounded-xl border border-border/20">
                    {report.receptionist?.name && (
                        <span>موظف الاستقبال: <strong className="text-foreground">{report.receptionist.name}</strong></span>
                    )}
                    {servicePayload?.shiftSupervisor && (
                        <span>مشرف الشفت: <strong className="text-foreground">{servicePayload.shiftSupervisor}</strong></span>
                    )}
                    {servicePayload?.technicianName && (
                        <span>الفني المختص: <strong className="text-foreground">{servicePayload.technicianName}</strong></span>
                    )}
                </div>
            )}
        </div>
    );
}
