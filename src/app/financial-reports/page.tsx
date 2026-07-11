"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import * as XLSX from 'xlsx';
import { FileText, Download, Calendar as CalIcon, Filter, Layers, PieChart, ShoppingCart, Wrench, BarChart2, Users, BookOpen, Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";

type ReportType = 'revenue' | 'work-orders' | 'inventory' | 'analytics';

// A "بيع منتج" (product sale) order keeps its products in selected_services[0].products
// and has no maintenance services — show the product names instead of the inspection details.
function isSaleReport(r: any, svc: any): boolean {
    return r?.order_type === 'sale' || svc?.is_sale === true;
}
function saleProductsText(svc: any): string {
    const products = Array.isArray(svc?.products) ? svc.products : [];
    if (products.length === 0) return 'بيع منتج';
    return products
        .map((p: any) => {
            const name = String(p?.name || '').trim() || 'منتج';
            const qty = Number(p?.qty || 0);
            return qty > 1 ? `${name} ×${qty}` : name;
        })
        .join(' | ');
}

export default function ReportsPage() {
    const [activeTab, setActiveTab] = useState<ReportType>('revenue');
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [reportData, setReportData] = useState<any[]>([]);
    
    const [analyticsData, setAnalyticsData] = useState<{
        totalVisits: number;
        bookletCount: number;
        servicesBreakdown: Record<string, number>;
        dailyVisits: { date: string, count: number }[];
    } | null>(null);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

    const generateReport = async (fetchWithoutDates = false) => {
        setLoading(true);
        setReportData([]);
        setAnalyticsData(null);

        try {
            if (activeTab === 'revenue') {
                // Fetch from Work Orders
                let q1 = supabase.from('inspection_reports').select('report_number, status, total_price, created_at, order_type, selected_services, vehicles(make, model, clients(name))').eq('status', 'تم الانتهاء');
                
                // Fetch from POS
                let q2 = supabase.from('pos_sales').select('id, payment_method, total_amount, created_at');

                if (!fetchWithoutDates) {
                    if (dateRange.start) {
                        q1 = q1.gte('created_at', dateRange.start + 'T00:00:00Z');
                        q2 = q2.gte('created_at', dateRange.start + 'T00:00:00Z');
                    }
                    if (dateRange.end) {
                        q1 = q1.lte('created_at', dateRange.end + 'T23:59:59Z');
                        q2 = q2.lte('created_at', dateRange.end + 'T23:59:59Z');
                    }
                }

                const [res1, res2] = await Promise.all([q1, q2]);
                
                const mergedRevenue = [];
                if (res1.data) {
                    mergedRevenue.push(...res1.data.map((r: any) => {
                        const svc = Array.isArray(r.selected_services) ? r.selected_services[0] : null;
                        const sale = isSaleReport(r, svc);
                        return {
                            id: r.report_number,
                            type: sale ? 'بيع منتج' : 'ورشة (صيانة)',
                            client: sale ? (svc?.customerName || 'عميل نقدي') : (r.vehicles?.clients?.name || 'عميل مجهول'),
                            details: sale ? saleProductsText(svc) : `${r.vehicles?.make || ''} ${r.vehicles?.model || ''}`.trim(),
                            status: r.status,
                            total_price: Number(r.total_price || 0),
                            created_at: r.created_at
                        };
                    }));
                }
                if (res2.data) {
                    mergedRevenue.push(...res2.data.map((r: any) => ({
                        id: 'POS-' + r.id,
                        type: 'مبيعات مباشرة (POS)',
                        client: 'مبيعات شباك',
                        details: `دفع: ${r.payment_method}`,
                        status: 'مكتمل',
                        total_price: Number(r.total_amount || 0),
                        created_at: r.created_at
                    })));
                }

                // Sort merged by newest
                mergedRevenue.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setReportData(mergedRevenue);

            } else if (activeTab === 'work-orders') {
                let query = supabase.from('inspection_reports').select('report_number, status, total_price, created_at, odometer_reading, order_type, selected_services, vehicles(make, model, plate_number, clients(name))');
                
                if (!fetchWithoutDates) {
                    if (dateRange.start) query = query.gte('created_at', dateRange.start + 'T00:00:00Z');
                    if (dateRange.end) query = query.lte('created_at', dateRange.end + 'T23:59:59Z');
                }

                const { data } = await query.order('created_at', { ascending: false });
                if (data) {
                    const SERVICE_LABELS: Record<string, string> = {
                        engineOil: 'زيت المحرك', oilFilter: 'فلتر زيت المحرك',
                        airFilter: 'فلتر الهواء', acFilter: 'فلتر التبريد',
                        brakeFluid: 'زيت المكابح', coolant: 'ماء الراديتر',
                        battery: 'البطارية', engineBelts: 'قايش المحرك',
                        brakePads: 'دسكات السيارة', sparkPlugs: 'شمعات الاحتراق',
                        gearboxOil: 'زيت كير', gearboxHydraulic: 'هايدروليك الكير', gearboxFilter: 'فلتر الكير',
                        wipers: 'مساحات زجاج', windshieldFluid: 'سائل غسيل جام',
                        battery2: 'البطارية فحص دوري', batteryFilter: 'فلتر البطارية',
                        engineFlash: 'فلاش المحرك', engineCeramic: 'سيراميك محرك',
                        linerCleaner: 'منظف بطانة (جكجكة)', oilLeakPreventer: 'مانع تسريب زيت',
                        smokePreventer: 'مانع دخان', gearboxFlash: 'فلاش كير',
                        gearboxCeramic: 'سيراميك كير', gearboxAntiSlip: 'مانع انزلاق كير',
                        acCleaner: 'منظف دورة تبريد', injectorCleaner: 'منظف بخاخات',
                        fuelSystemCleaner: 'منظف نظام وقود', octaneBooster: 'محسن أوكتان',
                        additives: 'معالجات ومحسنات', cleaners: 'منظفات وأساسيات'
                    };
                    setReportData(data.map(r => {
                        const svc = Array.isArray(r.selected_services) ? r.selected_services[0] : null;
                        const services = svc?.services || {};
                        const serviceDetails = Object.entries(services)
                            .filter(([, v]: any) => v?.status === 'يحتاج تغيير')
                            .map(([key, v]: any) => {
                                const label = SERVICE_LABELS[key] || key;
                                const det = v?.details || {};
                                
                                const parts = [];
                                if (key === 'additives' || key === 'cleaners') {
                                    for (let i = 0; i < 10; i++) {
                                        if (det[`prod_${i}`]) {
                                            let s = String(det[`prod_${i}`]);
                                            if (det[`notes_${i}`]) s += ` (ملاحظات: ${det[`notes_${i}`]})`;
                                            parts.push(s);
                                        }
                                    }
                                } else {
                                    for (const [k, val] of Object.entries(det)) {
                                        if (k === 'unitPrice' || !val) continue;
                                        if (k === 'notes') parts.push(`ملاحظات: ${val}`);
                                        else if (k === 'qty' || k === 'liters') parts.push(`العدد/اللترات: ${val}`);
                                        else parts.push(String(val));
                                    }
                                }
                                return parts.length ? `${label}: ${parts.join(' - ')}` : label;
                            })
                            .join(' | ');
                        const sale = isSaleReport(r, svc);
                        return {
                            id: r.report_number,
                            type: sale ? 'بيع منتج' : 'أمر عمل',
                            client: sale ? (svc?.customerName || 'عميل نقدي') : ((r.vehicles as any)?.clients?.name || 'غير محدد'),
                            vehicle: sale ? 'بيع منتج' : `${(r.vehicles as any)?.make || ''} ${(r.vehicles as any)?.model || ''}`.trim(),
                            plate: sale ? '' : ((r.vehicles as any)?.plate_number || ''),
                            odometer: sale ? 0 : (r.odometer_reading || 0),
                            services: sale ? saleProductsText(svc) : (serviceDetails || '-'),
                            shift: svc?.shiftName || '',
                            supervisor: svc?.shiftSupervisor || '',
                            technician: sale ? '' : (svc?.technicianName || ''),
                            status: r.status,
                            total_price: Number(r.total_price || 0),
                            created_at: r.created_at
                        };
                    }));
                }
            } else if (activeTab === 'inventory') {
                const { data } = await supabase.from('inventory').select('item_code, name, category, quantity, purchase_price, sell_price');
                setReportData(data || []);
            } else if (activeTab === 'analytics') {
                let query = supabase.from('inspection_reports').select('created_at, selected_services');
                
                if (!fetchWithoutDates) {
                    if (dateRange.start) query = query.gte('created_at', dateRange.start + 'T00:00:00Z');
                    if (dateRange.end) query = query.lte('created_at', dateRange.end + 'T23:59:59Z');
                }

                const { data } = await query;
                if (data) {
                    const totalVisits = data.length;
                    let bookletCount = 0;
                    const servicesBreakdown: Record<string, number> = {};
                    const visitsMap: Record<string, number> = {};

                    const SERVICE_LABELS: Record<string, string> = {
                        engineOil: 'زيت المحرك', oilFilter: 'فلتر زيت المحرك',
                        airFilter: 'فلتر الهواء', acFilter: 'فلتر التبريد',
                        brakeFluid: 'زيت المكابح', coolant: 'ماء الراديتر',
                        battery: 'البطارية', engineBelts: 'قايش المحرك',
                        brakePads: 'دسكات السيارة', sparkPlugs: 'شمعات الاحتراق',
                        gearboxOil: 'زيت كير', gearboxHydraulic: 'هايدروليك الكير', gearboxFilter: 'فلتر الكير',
                        wipers: 'مساحات زجاج', windshieldFluid: 'سائل غسيل جام',
                        battery2: 'البطارية فحص دوري', batteryFilter: 'فلتر البطارية',
                        engineFlash: 'فلاش المحرك', engineCeramic: 'سيراميك محرك',
                        linerCleaner: 'منظف بطانة (جكجكة)', oilLeakPreventer: 'مانع تسريب زيت',
                        smokePreventer: 'مانع دخان', gearboxFlash: 'فلاش كير',
                        gearboxCeramic: 'سيراميك كير', gearboxAntiSlip: 'مانع انزلاق كير',
                        acCleaner: 'منظف دورة تبريد', injectorCleaner: 'منظف بخاخات',
                        fuelSystemCleaner: 'منظف نظام وقود', octaneBooster: 'محسن أوكتان',
                        additives: 'معالجات ومحسنات', cleaners: 'منظفات وأساسيات'
                    };

                    data.forEach(r => {
                        // Track daily visits
                        const dateObj = new Date(r.created_at);
                        const dateStr = dateObj.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
                        visitsMap[dateStr] = (visitsMap[dateStr] || 0) + 1;

                        const svc = Array.isArray(r.selected_services) ? r.selected_services[0] : null;
                        if (!svc) return;

                        // Check Booklet
                        if (svc.booklet?.type && svc.booklet.type !== 'none' && svc.booklet.serial) {
                            bookletCount++;
                        }

                        // Check Standard Services
                        const services = svc.services || {};
                        Object.entries(services).forEach(([key, v]: any) => {
                            if (v?.status === 'تغيير' || v?.status === 'يحتاج تغيير' || v?.status === 'مضاف') {
                                const label = SERVICE_LABELS[key] || key;
                                servicesBreakdown[label] = (servicesBreakdown[label] || 0) + 1;
                            }
                        });

                        // Check Custom Services
                        const customServices = svc.customServices || [];
                        customServices.forEach((c: any) => {
                            if (c.label) {
                                servicesBreakdown[c.label] = (servicesBreakdown[c.label] || 0) + 1;
                            }
                        });
                    });

                    // Sort breakdown by count descending
                    const sortedBreakdown = Object.fromEntries(
                        Object.entries(servicesBreakdown).sort(([,a], [,b]) => b - a)
                    );

                    // Format Daily Visits for chart (maintain chronological order if possible, but they are from map so we sort by actual date by recreating or just taking as is since we don't have year in key. For simplicity, since data is already sorted by created_at desc from supabase if we ordered it, but we didn't order. Let's order by the original r.created_at chronological)
                    // We'll just build it from sorted data
                    const dailyVisitsArr = Object.entries(visitsMap).map(([date, count]) => ({ date, count }));
                    // simple reverse since data was likely ordered desc
                    dailyVisitsArr.reverse();

                    setAnalyticsData({ totalVisits, bookletCount, servicesBreakdown: sortedBreakdown, dailyVisits: dailyVisitsArr });
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const downloadExcel = () => {
        if (reportData.length === 0) return;
        
        let ws;
        if (activeTab === 'inventory') {
            const formattedData = reportData.map(row => ({
                'كود القطعة (SKU)': row.item_code || '-',
                'الاسم': row.name,
                'التصنيف': row.category,
                'الكمية المقدرة': row.quantity,
                'سعر الوحدة للشراء': row.purchase_price,
                'سعر البيع الافتراضي': row.sell_price
            }));
            ws = XLSX.utils.json_to_sheet(formattedData);
        } else if (activeTab === 'work-orders') {
            const formattedData = reportData.map(row => ({
                'رقم الأمر': row.id,
                'العميل': row.client,
                'السيارة': row.vehicle,
                'رقم اللوحة': row.plate,
                'العداد (كم)': row.odometer,
                'الشفت': row.shift || '-',
                'المشرف': row.supervisor,
                'الفني': row.technician,
                'الخدمات والتفاصيل': row.services,
                'الحالة': row.status,
                'الإجمالي (د.ع)': row.total_price,
                'التاريخ': new Date(row.created_at).toLocaleDateString('en-US')
            }));
            ws = XLSX.utils.json_to_sheet(formattedData);
        } else {
            const formattedData = reportData.map(row => ({
                'المعرف': row.id,
                'نوع الدخل': row.type,
                'العميل': row.client,
                'التفاصيل': row.details,
                'الحالة': row.status,
                'الإجمالي المحصل (د.ع)': row.total_price,
                'التاريخ': new Date(row.created_at).toLocaleDateString('en-US')
            }));
            ws = XLSX.utils.json_to_sheet(formattedData);
        }

        // Set column widths dynamically for better readability in Excel
        if (activeTab === 'inventory') {
            ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];
        } else if (activeTab === 'work-orders') {
            ws['!cols'] = [
                { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 14 },
                { wch: 12 }, // الشفت
                { wch: 18 }, { wch: 18 }, { wch: 60 }, { wch: 15 }, { wch: 18 }, { wch: 15 }
            ];
        } else {
            ws['!cols'] = [
                { wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 45 }, { wch: 15 }, { wch: 18 }, { wch: 15 }
            ];
        }

        // Create workbook and add the worksheet (with Right-to-Left orientation!)
        const wb = XLSX.utils.book_new();
        ws['!dir'] = 'rtl'; // Enable RTL inside Excel!
        XLSX.utils.book_append_sheet(wb, ws, "التقرير المالي");

        // Execute download
        XLSX.writeFile(wb, `Report_${activeTab}_${new Date().getTime()}.xlsx`);
    };

    return (
        <div className="min-h-screen p-4 md:p-8 print:p-0 font-ibm print:bg-white" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-8 print:space-y-0 animate-fade-in print:block">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <PieChart className="text-blue-500" size={32} />
                            التقارير المالية والإحصائيات
                        </h1>
                        <p className="text-muted-foreground">
                            استخراج تقارير الإيرادات الشاملة (ورشة + POS) وتتبع العمليات بضغطة زر
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:block">
                    {/* Sidebar Configuration */}
                    <div className="glass-card p-6 rounded-2xl border-border h-fit space-y-6 print:hidden">
                        <div>
                            <label className="text-sm font-bold text-muted-foreground mb-3 block">نوع التقرير</label>
                            <div className="space-y-2">
                                <button onClick={() => setActiveTab('revenue')} className={`w-full text-right p-3 rounded-xl transition-colors border flex items-center gap-3 ${activeTab === 'revenue' ? 'bg-blue-600/10 border-blue-500/30 text-blue-500' : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted'}`}>
                                    <FileText size={18} /> تقرير الإيرادات (الشامل)
                                </button>
                                <button onClick={() => setActiveTab('work-orders')} className={`w-full text-right p-3 rounded-xl transition-colors border flex items-center gap-3 ${activeTab === 'work-orders' ? 'bg-blue-600/10 border-blue-500/30 text-blue-500' : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted'}`}>
                                    <Wrench size={18} /> تقرير أوامر الصيانة فقط
                                </button>
                                <button onClick={() => setActiveTab('inventory')} className={`w-full text-right p-3 rounded-xl transition-colors border flex items-center gap-3 ${activeTab === 'inventory' ? 'bg-blue-600/10 border-blue-500/30 text-blue-500' : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted'}`}>
                                    <Layers size={18} /> تقييم جرد المخزون
                                </button>
                                <button onClick={() => setActiveTab('analytics')} className={`w-full text-right p-3 rounded-xl transition-colors border flex items-center gap-3 ${activeTab === 'analytics' ? 'bg-amber-600/10 border-amber-500/30 text-amber-500' : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted'}`}>
                                    <BarChart2 size={18} /> الملخص التحليلي (مختصر)
                                </button>
                            </div>
                        </div>

                        {activeTab !== 'inventory' && (
                            <div className="pt-4 border-t border-border">
                                <label className="text-sm font-bold text-muted-foreground mb-3 block">الفترة الزمنية</label>
                                <div className="space-y-3">
                                    <div>
                                        <span className="text-xs text-muted-foreground block mb-1">من تاريخ</span>
                                        <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground text-sm focus:border-blue-500" />
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground block mb-1">إلى تاريخ</span>
                                        <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground text-sm focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 mt-4">
                            <button onClick={() => generateReport(false)} disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                                <Filter size={18} /> {loading ? 'جاري التوليد...' : 'توليد التقرير المحدد'}
                            </button>
                            {activeTab !== 'inventory' && activeTab !== 'analytics' && (
                                <button onClick={() => { setDateRange({start:'', end:''}); generateReport(true); }} disabled={loading} className="w-full py-3 bg-muted border border-border hover:bg-slate-200 dark:hover:bg-slate-800 text-foreground font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                                    إظهار تفاصيل كل التواريخ
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="lg:col-span-3 glass-card rounded-2xl border-border flex flex-col min-h-[500px]">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/50 rounded-t-2xl">
                            <h2 className="font-bold text-foreground flex items-center gap-2">
                                <CalIcon className="text-blue-500" size={18} /> 
                                {activeTab === 'revenue' ? 'سجل الإيرادات المكتملة الفعلي' : activeTab === 'work-orders' ? 'كافة أوامر العمل (مفتوحة ومغلقة)' : activeTab === 'analytics' ? 'الملخص التحليلي للأداء' : 'الأرصدة وتقييم المستودع'}
                            </h2>
                            {activeTab === 'analytics' && (
                                <button onClick={() => window.print()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-bold shadow-sm print:hidden">
                                    <Printer size={16} /> طباعة الملخص (PDF)
                                </button>
                            )}
                            {activeTab !== 'analytics' && (
                                <button onClick={downloadExcel} disabled={reportData.length === 0} className="px-4 py-2 bg-background border border-border hover:bg-muted text-foreground rounded-lg transition-colors flex items-center gap-2 text-sm font-bold disabled:opacity-50 shadow-sm print:hidden">
                                    <Download size={16} /> تصدير نسخة Excel (.xlsx)
                                </button>
                            )}
                        </div>

                        <div className="flex-1 p-0 overflow-x-auto custom-scrollbar relative print:overflow-visible print:bg-white print:text-black print:p-4">
                            {(reportData.length === 0 && activeTab !== 'analytics') && !loading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground space-y-3">
                                    <FileText size={48} className="text-muted-foreground opacity-30" />
                                    <p className="font-bold">قم بتحديد الفلتر الزمني واضغط "توليد التقرير" لجلب البيانات.</p>
                                </div>
                            )}

                            {activeTab === 'analytics' ? (
                                analyticsData ? (
                                    <div className="p-6 space-y-8 max-w-5xl mx-auto w-full">
                                        {/* Top KPIs */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="bg-muted/30 print:bg-gray-50 border border-border print:border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
                                                <Users size={36} className="text-blue-500 mb-2" />
                                                <h3 className="text-muted-foreground print:text-gray-600 font-bold text-sm">إجمالي زيارات العملاء</h3>
                                                <span className="text-4xl md:text-5xl font-black font-mono text-foreground print:text-black">{analyticsData.totalVisits}</span>
                                            </div>
                                            <div className="bg-muted/30 print:bg-gray-50 border border-border print:border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 shadow-sm">
                                                <BookOpen size={36} className="text-amber-500 mb-2" />
                                                <h3 className="text-muted-foreground print:text-gray-600 font-bold text-sm">عملاء لديهم دفتر صيانة</h3>
                                                <span className="text-4xl md:text-5xl font-black font-mono text-foreground print:text-black">{analyticsData.bookletCount}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Daily Visits Chart */}
                                            <div className="bg-card print:bg-white border border-border print:border-gray-300 rounded-2xl p-4 md:p-6 flex flex-col shadow-sm min-h-[350px] lg:min-h-[400px]">
                                                <h3 className="font-bold flex items-center gap-2 text-foreground print:text-black mb-6">
                                                    <BarChart2 size={18} className="text-blue-500" />
                                                    معدل الزيارات اليومي
                                                </h3>
                                                <div className="flex-1 w-full min-h-0">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={analyticsData.dailyVisits} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                                            <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} angle={-35} textAnchor="end" height={60} minTickGap={10} tickMargin={15} />
                                                            <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                                            <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px', textAlign: 'right'}} itemStyle={{color: '#fff', textAlign: 'right'}} />
                                                            <Bar dataKey="count" name="عدد الزيارات" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            {/* Services Pie Chart */}
                                            <div className="bg-card print:bg-white border border-border print:border-gray-300 rounded-2xl p-4 md:p-6 flex flex-col shadow-sm min-h-[350px] lg:min-h-[400px]">
                                                <h3 className="font-bold flex items-center gap-2 text-foreground print:text-black mb-6">
                                                    <PieChart size={18} className="text-amber-500" />
                                                    الخدمات الأكثر مبيعاً
                                                </h3>
                                                <div className="flex-1 w-full min-h-0">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RechartsPieChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                                                            <Pie
                                                                data={Object.entries(analyticsData.servicesBreakdown).map(([name, value]) => ({ name, value })).slice(0, 5)}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius="50%"
                                                                outerRadius="80%"
                                                                paddingAngle={3}
                                                                dataKey="value"
                                                            >
                                                                {Object.entries(analyticsData.servicesBreakdown).slice(0, 5).map((entry, index) => (
                                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip contentStyle={{backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px', textAlign: 'right'}} itemStyle={{color: '#fff', textAlign: 'right'}} />
                                                            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '12px', marginTop: '20px' }} />
                                                        </RechartsPieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Services Breakdown Table */}
                                        <div className="bg-card print:bg-white border border-border print:border-gray-300 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="bg-muted/50 print:bg-gray-100 p-4 border-b border-border print:border-gray-300">
                                                <h3 className="font-bold flex items-center gap-2 text-foreground print:text-black">
                                                    <Wrench size={18} className="text-emerald-500" />
                                                    تفاصيل الخدمات المباعة والمضافة
                                                </h3>
                                            </div>
                                            {Object.keys(analyticsData.servicesBreakdown).length === 0 ? (
                                                <div className="p-8 text-center text-muted-foreground print:text-gray-500">لا توجد خدمات مباعة في هذه الفترة</div>
                                            ) : (
                                                <div className="divide-y divide-border print:divide-gray-200">
                                                    {Object.entries(analyticsData.servicesBreakdown).map(([serviceName, count]) => (
                                                        <div key={serviceName} className="flex justify-between items-center p-4 hover:bg-muted/20 transition-colors">
                                                            <span className="font-medium text-foreground print:text-black">{serviceName}</span>
                                                            <span className="font-mono font-bold bg-emerald-500/10 print:bg-emerald-100 text-emerald-500 print:text-emerald-700 px-3 py-1 rounded-full border border-emerald-500/20 print:border-emerald-200">
                                                                {count} <span className="text-xs font-sans font-normal ml-1">مرة</span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    !loading && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground space-y-3">
                                            <BarChart2 size={48} className="text-muted-foreground opacity-30" />
                                            <p className="font-bold">قم بتحديد الفلتر الزمني واضغط "توليد التقرير" لجلب الملخص التحليلي.</p>
                                        </div>
                                    )
                                )
                            ) : reportData.length > 0 && (
                                <table className="w-full text-right border-collapse text-sm">
                                    <thead className="bg-muted sticky top-0 border-b border-border z-10">
                                        <tr>
                                            {activeTab === 'inventory' ? (
                                                <>
                                                    <th className="p-4 text-muted-foreground font-bold">كود (SKU)</th>
                                                    <th className="p-4 text-muted-foreground font-bold">الاسم</th>
                                                    <th className="p-4 text-muted-foreground font-bold text-center">الكمية المقدرة</th>
                                                    <th className="p-4 text-muted-foreground font-bold">سعر الوحدة للشراء</th>
                                                    <th className="p-4 text-muted-foreground font-bold">سعر البيع الافتراضي</th>
                                                </>
                                            ) : activeTab === 'work-orders' ? (
                                                <>
                                                    <th className="p-3 text-muted-foreground font-bold">#</th>
                                                    <th className="p-3 text-muted-foreground font-bold">العميل</th>
                                                    <th className="p-3 text-muted-foreground font-bold">السيارة / اللوحة</th>
                                                    <th className="p-3 text-muted-foreground font-bold text-center">العداد (كم)</th>
                                                    <th className="p-3 text-muted-foreground font-bold">المشرف / الفني</th>
                                                    <th className="p-3 text-muted-foreground font-bold">الخدمات والتفاصيل</th>
                                                    <th className="p-3 text-muted-foreground font-bold text-center">الحالة</th>
                                                    <th className="p-3 text-muted-foreground font-bold text-left">الإجمالي</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="p-4 text-muted-foreground font-bold">المعرف</th>
                                                    <th className="p-4 text-muted-foreground font-bold">نوع الدخل</th>
                                                    <th className="p-4 text-muted-foreground font-bold">العميل والتفاصيل</th>
                                                    <th className="p-4 text-muted-foreground font-bold text-center">الحالة</th>
                                                    <th className="p-4 text-muted-foreground font-bold text-center">التاريخ</th>
                                                    <th className="p-4 text-muted-foreground font-bold text-left">الإجمالي المحصل</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {reportData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                                {activeTab === 'inventory' ? (
                                                    <>
                                                        <td className="p-4 font-mono">{row.item_code || '-'}</td>
                                                        <td className="p-4 text-foreground font-bold">{row.name}</td>
                                                        <td className="p-4 text-center font-mono font-bold text-lg">{row.quantity}</td>
                                                        <td className="p-4 font-mono text-muted-foreground">{row.purchase_price} د.ع</td>
                                                        <td className="p-4 font-mono font-bold text-emerald-500">{row.sell_price} د.ع</td>
                                                    </>
                                                ) : activeTab === 'work-orders' ? (
                                                    <>
                                                        <td className="p-3 font-mono text-xs text-muted-foreground">#{row.id}</td>
                                                        <td className="p-3 font-bold text-foreground">{row.client}</td>
                                                        <td className="p-3">
                                                            <p className="text-foreground font-bold text-sm">{row.vehicle}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">{row.plate}</p>
                                                        </td>
                                                        <td className="p-3 text-center font-mono text-foreground">{row.odometer ? row.odometer.toLocaleString() : '-'}</td>
                                                        <td className="p-3">
                                                            {row.supervisor && <p className="text-xs text-rose-400 font-bold">🛡 {row.supervisor}</p>}
                                                            {row.technician && <p className="text-xs text-blue-400 font-bold">🔧 {row.technician}</p>}
                                                            {!row.supervisor && !row.technician && <span className="text-xs text-muted-foreground">-</span>}
                                                        </td>
                                                        <td className="p-3 text-xs text-muted-foreground max-w-xs">
                                                            <span className="line-clamp-2">{row.services}</span>
                                                        </td>
                                                        <td className="p-3 text-center">
                                                            <span className={`whitespace-nowrap inline-block px-2 py-1 rounded-full text-[10px] font-bold border ${row.status === 'تم الانتهاء' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : row.status === 'قيد العمل' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 font-mono font-bold text-emerald-500 text-left">{row.total_price.toLocaleString()}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-4 font-mono text-xs text-muted-foreground w-20">#{row.id}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1 w-max ${row.type.includes('POS') ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                                                                {row.type.includes('POS') ? <ShoppingCart size={12}/> : <Wrench size={12} />} {row.type}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <p className="text-foreground font-bold mb-1">{row.client}</p>
                                                            <p className="text-xs text-muted-foreground">{row.details}</p>
                                                        </td>
                                                        <td className="p-4 text-xs text-center">
                                                            <span className={`whitespace-nowrap inline-flex justify-center px-2 py-1 rounded-full border ${row.status === 'تم الانتهاء' || row.status === 'مكتمل' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-muted border-border text-muted-foreground'}`}>
                                                                {row.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-muted-foreground font-mono text-xs text-center">{new Date(row.created_at).toLocaleDateString('ar-SA')}</td>
                                                        <td className="p-4 font-mono font-bold text-lg text-emerald-500 text-left">{row.total_price.toLocaleString()}</td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        
                        {/* Summary Bar */}
                        {reportData.length > 0 && (
                            <div className="p-4 border-t border-border bg-muted/30 rounded-b-2xl flex justify-between items-center px-6">
                                <span className="text-muted-foreground text-sm font-bold">إجمالي السجلات المستخرجة: <span className="text-foreground font-mono text-lg">{reportData.length}</span></span>
                                {(activeTab === 'revenue' || activeTab === 'work-orders') && (
                                    <span className="text-muted-foreground text-sm font-bold flex items-center gap-3">
                                        مجموع المبالغ:
                                        <span className="text-emerald-500 font-black font-mono text-2xl bg-emerald-500/10 px-4 py-1 rounded-xl border border-emerald-500/20">
                                            {reportData.reduce((acc, row) => acc + (Number(row.total_price) || 0), 0).toLocaleString()} <span className="text-sm">د.ع</span>
                                        </span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
