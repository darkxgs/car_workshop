"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/lib/AuthProvider";
import {
    Wrench, Car, Play, CheckCircle2, DollarSign, Activity, FileText,
    Search, Bell, Settings, Calendar, Plus, Users, User, LayoutDashboard,
    Package, ShoppingCart, TrendingUp, AlertTriangle, Clock, Wallet, Database
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function Home() {
    const { t } = useLanguage();
    const { employeeName, employeeRole } = useAuth();

    const [stats, setStats] = useState({
        today: 0,
        inProgress: 0,
        completed: 0,
        revenue: 0,
        lowStock: 0,
        lowStockAlertStr: ""
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const todayStr = new Date().toISOString().split('T')[0];

    // Fetch reports
                const { data: allReports } = await supabase
                    .from('inspection_reports')
                    .select(`                        id, status, total_price, created_at, report_number,                         vehicles ( make, model, clients(name) )                    `)
                    .order('created_at', { ascending: false });

    // Fetch inventory
                const { data: inventory } = await supabase
                    .from('inventory')
                    .select('name, quantity, min_quantity');

    let lowStockCount = 0;
                let lowStockItems: any[] = [];

    if (inventory) {
                    lowStockItems = inventory.filter(i => (i.quantity || 0) <= (i.min_quantity || 5));
                    lowStockCount = lowStockItems.length;
                }

    if (allReports) {
                    const todayCount = allReports.filter(r => r.created_at.startsWith(todayStr)).length;
                    const inProgress = allReports.filter(r => r.status === 'قيد العمل').length;
                    const completed = allReports.filter(r => r.status === 'تم الانتهاء' && r.created_at.startsWith(todayStr)).length;
                    const revenue = allReports
                        .filter(r => r.status === 'تم الانتهاء' && r.created_at.startsWith(todayStr))
                        .reduce((sum, r) => sum + Number(r.total_price || 0), 0);

    // 1. Chart Data
                    const dailyData: Record<string, { orders: number, revenue: number }> = {};
                    for (const r of allReports) {
                        const dateStr = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        if (!dailyData[dateStr]) {
                            dailyData[dateStr] = { orders: 0, revenue: 0 };
                        }
                        dailyData[dateStr].orders += 1;
                        if (r.status === 'تم الانتهاء') {
                            dailyData[dateStr].revenue += Number(r.total_price || 0);
                        }
                    }
                    const chartArr = Object.keys(dailyData).map(date => ({
                        name: date,
                        orders: dailyData[date].orders,
                        revenue: dailyData[date].revenue
                    })).slice(0, 7).reverse();

    setChartData(chartArr.length > 0 ? chartArr : [
                        { name: 'لا توجد بيانات', orders: 0, revenue: 0 }
                    ]);

    // 2. Tasks
                    const activeTasks = allReports.slice(0, 5).map(r => ({
                        id: r.id,
                        time: new Date(r.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                        title:`فحص - ${(r.vehicles as any)?.make} ${(r.vehicles as any)?.model}`,
                        subtitle: `العميل: ${(r.vehicles as any)?.clients?.name || 'غير معروف'} (#${r.report_number})`,
                        priority: r.status === 'قيد العمل' ? 'عالية' : r.status === 'تم الاستلام' ? 'متوسطة' : 'منخفضة',
                        status: r.status,
                        pColor: r.status === 'قيد العمل' ? "text-rose-400 bg-rose-500/10" : r.status === 'تم الاستلام' ? "text-amber-500 bg-amber-500/10" : "text-emerald-400 bg-emerald-500/10",
                        sColor: r.status === 'قيد العمل' ? "text-blue-400 bg-blue-500/10" : r.status === 'تم الاستلام' ? "text-slate-400 bg-slate-800" : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                    }));
                    setTasks(activeTasks);

    // 3. Alerts
                    const generatedAlerts = [];
                    let lowStockStr = "مخزون سليم";
                    if (lowStockCount > 0) {
                        lowStockStr = "يحتاج طلب";
                        generatedAlerts.push({
                            icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/50",
                            title: "قطع غيار منخفضة المخزون",
                            desc:`${lowStockCount} صنف يحتاج إعادة طلب (منها: ${lowStockItems[0]?.name})`,
                            time: "الآن"
                        });
                    }
                    const pendingReports = allReports.filter(r => r.status === 'قيد العمل').length;
                    if (pendingReports > 0) {
                        generatedAlerts.push({
                            icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-transparent",
                            title: "أوامر صيانة قيد العمل",
                            desc: `يوجد ${pendingReports} مركبات جاري العمل عليها`,
                            time: "مستمر"
                        });
                    }
                    if (revenue > 0) {
                        generatedAlerts.push({
                            icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-transparent",
                            title: "ملخص الإيرادات اليوم",
                            desc: `تم تحصيل ${formatCurrency(revenue)} د.ع اليوم`,
                            time: "اليوم"
                        });
                    }
                    if (generatedAlerts.length === 0) {
                         generatedAlerts.push({
                             icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-transparent",
                             title: "حالة النظام ممتازة", desc: "لا توجد تنبيهات عاجلة حالياً", time: "الآن"
                         });
                    }
                    setAlerts(generatedAlerts);

    setStats({
                        today: todayCount,
                        inProgress,
                        completed,
                        revenue,
                        lowStock: lowStockCount,
                        lowStockAlertStr: lowStockStr
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

    fetchDashboardData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US').format(val);
    };

    return (`<div className="min-h-screen pb-24 font-ibm bg-gradient-to-br from-[#0a0a0a] to-[#121212]" dir="rtl">`

    {/* 1. Header Navigation Simulation */}`<div className="sticky top-0 z-30 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-rose-900/30 px-6 py-4 flex items-center justify-between">`
                `<div className="flex-1 max-w-md hidden md:flex items-center relative">`
                    `<Search className="absolute right-4 text-slate-500" size={18} />`
                    `<input 
                        type="text" 
                        placeholder="البحث في النظام..." 
                        className="w-full bg-[#1a1a1a] border border-slate-800 rounded-xl py-2.5 pr-11 pl-4 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-colors"
                    />`
                `</div>`

    `<div className="flex items-center gap-4 mr-auto">`
                    `<button className="relative p-2.5 bg-[#1a1a1a] hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors text-slate-300">`
                        `<Bell size={20} />`
                    `</button>`
                    `<Link href="/settings" className="p-2.5 bg-[#1a1a1a] hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors text-slate-300 hidden sm:flex items-center justify-center">`
                        `<Settings size={20} />`
                    `</Link>`
                    `<div className="h-8 w-[1px] bg-slate-800 mx-2 hidden sm:block"></div>`
                    `<div className="flex items-center gap-3">`
                        `<div className="text-right hidden sm:block">`
                            `<p className="text-sm font-bold text-white leading-tight">`{employeeName || "المستخدم الحالي"}`</p>`
                            `<p className="text-xs text-rose-400">`{employeeRole || "قيد التحميل..."}`</p>`
                        `</div>`
                        `<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-900 border border-rose-500/30 flex items-center justify-center overflow-hidden shadow-lg shadow-rose-500/20">`
                            `<User className="text-white" size={20} />`
                        `</div>`
                    `</div>`
                `</div>`
            `</div>`

    `<div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto animate-fade-in">`

    {/* 2. Page Title & Primary Actions */}`<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">`
                    `<div>`
                        `<h1 className="text-3xl font-display font-bold text-white mb-2">`لوحة التحكم الرئيسية`</h1>`
                        `<p className="text-slate-400 flex items-center gap-2">`
                            نظرة عامة على أداء ورشة العمل - {new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
                        `</p>`
                    `</div>`

    `<div className="flex items-center gap-3">`
                        `<button className="px-5 py-2.5 bg-[#1a1a1a] hover:bg-slate-800 text-white rounded-xl border border-slate-800 transition-all font-medium flex items-center gap-2 shadow-sm">`
                            <Calendar size={18} className="text-slate-400" />
                            حجز موعد
                        `</button>`
                        `<Link href="/reception" className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg shadow-rose-500/25 border border-rose-500/50">`
                            `<Plus size={18} />`
                            أمر صيانة جديد
                        `</Link>`
                    `</div>`
                `</div>`

    {/* 3. KPI Cards*/}
                `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">`
                    {/* Orders */}
                    `<div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-rose-900/30 hover:border-blue-500/50 transition-all duration-300 relative group overflow-hidden">`
                        `<div className="absolute -inset-2 bg-blue-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>`
                        `<div className="flex justify-between items-start mb-4 relative z-10">`
                            `<div className="flex items-center gap-4">`
                                `<div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex flex-col items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">`
                                    `<FileText size={24} />`
                                `</div>`
                                `<div>`
                                    `<p className="text-slate-400 text-sm font-medium mb-1">`أوامر الصيانة اليوم`</p>`
                                    `<h3 className="text-3xl font-bold text-white">`{loading ? "..." : (stats.today || 0)}`</h3>`
                                `</div>`
                            `</div>`
                        `</div>`
                        `<div className="mt-4 flex items-center gap-2 text-sm relative z-10">`
                            `<span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded flex items-center gap-1 font-medium">`
                                من أصل {stats.today + stats.inProgress}
                          
                        `</div>`
                    `</div>`

    {/* Revenue */}`<div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-rose-900/30 hover:border-emerald-500/50 transition-all duration-300 relative group overflow-hidden">`
                        `<div className="absolute -inset-2 bg-emerald-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>`
                        `<div className="flex justify-between items-start mb-4 relative z-10">`
                            `<div className="flex items-center gap-4">`
                                `<div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex flex-col items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">`
                                    `<DollarSign size={24} />`
                                `</div>`
                                `<div>`
                                    `<p className="text-slate-400 text-sm font-medium mb-1">`إيرادات اليوم`</p>`
                                    `<h3 className="text-3xl font-bold text-white" dir="ltr">`{loading ? "..." : formatCurrency(stats.revenue)}`</h3>`
                                `</div>`
                            `</div>`
                        `</div>`
                        `<div className="mt-4 flex items-center gap-2 text-sm relative z-10">`
                            `<span className="text-emerald-400 font-medium">`
                                تم الانتهاء من {stats.completed} مركبات
                          
                        `</div>`
                    `</div>`

    {/* Pending Vehicles */}`<div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-rose-900/30 hover:border-amber-500/50 transition-all duration-300 relative group overflow-hidden">`
                        `<div className="absolute -inset-2 bg-amber-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>`
                        `<div className="flex justify-between items-start mb-4 relative z-10">`
                            `<div className="flex items-center gap-4">`
                                `<div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500 flex flex-col items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">`
                                    `<Car size={24} />`
                                `</div>`
                                `<div>`
                                    `<p className="text-slate-400 text-sm font-medium mb-1">`المركبات بالخدمة`</p>`
                                    `<h3 className="text-3xl font-bold text-white">`{loading ? "..." : (stats.inProgress || 0)}`</h3>`
                                `</div>`
                            `</div>`
                        `</div>`
                        `<div className="mt-4 text-sm relative z-10">`
                            `<span className="text-amber-500 font-medium">`قيد العمل أو الانتظار
                        `</div>`
                    `</div>`

    {/* Low Stock */}`<div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-rose-900/30 hover:border-purple-500/50 transition-all duration-300 relative group overflow-hidden">`
                        `<div className="absolute -inset-2 bg-purple-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>`
                        `<div className="flex justify-between items-start mb-4 relative z-10">`
                            `<div className="flex items-center gap-4">`
                                `<div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex flex-col items-center justify-center border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">`
                                    `<Package size={24} />`
                                `</div>`
                                `<div>`
                                    `<p className="text-slate-400 text-sm font-medium mb-1">`قطع منخفضة المخزون`</p>`
                                    `<h3 className="text-3xl font-bold text-white">`{loading ? "..." : (stats.lowStock || 0)}`</h3>`
                                `</div>`
                            `</div>`
                        `</div>`
                        `<div className="mt-4 text-sm relative z-10">`
                            <span className={`${stats.lowStock > 0 ? "text-rose-500" : "text-emerald-500"} font-medium flex items-center gap-1`}>
                                {stats.lowStock > 0 ? `<AlertTriangle size={14} />` : `<CheckCircle2 size={14} />`} {stats.lowStockAlertStr}
                          
                        `</div>`
                    `</div>`
                `</div>`

    {/* 4. Chart & Modules*/}
                `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`
                    {/* Performance Chart (66%) */}
                    `<div className="lg:col-span-2 glass-card p-6 rounded-2xl border-rose-900/30 bg-[#0a0a0a]/80 backdrop-blur-xl">`
                        `<div className="flex items-center justify-between mb-8">`
                            `<h3 className="text-lg font-bold text-white flex items-center gap-2">`
                                `<Activity className="text-emerald-400" size={20} />`
                                أداء الورشة
                            `</h3>`
                            `<select className="bg-[#1a1a1a] border border-slate-800 text-slate-300 text-sm rounded-lg py-1.5 px-3 focus:outline-none focus:border-rose-500/50">`
                                `<option>`آخر 7 أيام نشطة`</option>`
                            `</select>`
                        `</div>`

    {/* Custom Legend */}`<div className="flex items-center justify-center gap-8 mb-6 text-sm">`
                            `<span className="flex items-center gap-2 text-slate-400"><div className="w-3 h-3 rounded-full bg-blue-500">``</div>` أوامر الصيانة
                            `<span className="flex items-center gap-2 text-slate-400"><div className="w-3 h-3 rounded-full bg-emerald-500">``</div>` الإيرادات
                        `</div>`

    `<div className="h-[280px] w-full" dir="ltr">`
                            `<ResponsiveContainer width="100%" height="100%">`
                                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    `<CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />`
                                    <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#000', strokeWidth: 2 }} />
                                    <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#000', strokeWidth: 2 }} />
                                `</LineChart>`
                            `</ResponsiveContainer>`
                        `</div>`
                    `</div>`

    {/* Main Modules Grid (33%) */}`<div className="glass-card p-6 rounded-2xl border-rose-900/30 bg-[#0a0a0a]/80 backdrop-blur-xl h-full flex flex-col">`
                        `<div className="flex items-center gap-2 mb-6">`
                            `<LayoutDashboard className="text-blue-400" size={20} />`
                            `<h3 className="text-lg font-bold text-white">`الوحدات الرئيسية`</h3>`
                        `</div>`

    `<div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 flex-1 content-start">`
                            {/* Line 1 */}
                            `<Link href="/reception" className="flex flex-col items-center justify-center p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-slate-800 hover:border-blue-500/40 rounded-xl transition-all group">`
                                `<div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl mb-3 group-hover:scale-110 transition-transform"><Car size={24} />``</div>`
                                `<span className="text-sm font-medium text-slate-300">`المركبات
                            `</Link>`
                            `<Link href="/services" className="flex flex-col items-center justify-center p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-slate-800 hover:border-emerald-500/40 rounded-xl transition-all group">`
                                `<div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl mb-3 group-hover:scale-110 transition-transform"><Wrench size={24} />``</div>`
                                `<span className="text-sm font-medium text-slate-300">`إدارة الورشة
                            `</Link>`
                            {/* Line 2 */}
                            `<Link href="/parts-db" className="flex flex-col items-center justify-center p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-slate-800 hover:border-amber-500/40 rounded-xl transition-all group">`
                                `<div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl mb-3 group-hover:scale-110 transition-transform"><ShoppingCart size={24} />``</div>`
                                `<span className="text-sm font-medium text-slate-300">`نقاط البيع
                            `</Link>`
                            `<Link href="/inventory" className="flex flex-col items-center justify-center p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-slate-800 hover:border-purple-500/40 rounded-xl transition-all group">`
                                `<div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl mb-3 group-hover:scale-110 transition-transform"><Package size={24} />``</div>`
                                `<span className="text-sm font-medium text-slate-300">`المخزون
                            `</Link>`
                            {/* Line 3 */}
                            `<Link href="/accounting" className="flex flex-col items-center justify-center p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-slate-800 hover:border-rose-500/40 rounded-xl transition-all group">`
                                `<div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl mb-3 group-hover:scale-110 transition-transform"><Wallet size={24} />``</div>`
                                `<span className="text-sm font-medium text-slate-300">`المحاسبة
                            `</Link>`
                            `<Link href="/reports" className="flex flex-col items-center justify-center p-4 bg-[#141414] hover:bg-[#1a1a1a] border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all group">`
                                `<div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl mb-3 group-hover:scale-110 transition-transform"><FileText size={24} />``</div>`
                                `<span className="text-sm font-medium text-slate-300">`التقارير
                            `</Link>`
                        `</div>`
                    `</div>`
                `</div>`

    {/* 5. Tasks & Alerts*/}
                `<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`
                    {/* Today's Tasks (66%) */}
                    `<div className="lg:col-span-2 glass-card p-6 rounded-2xl border-rose-900/30 bg-[#0a0a0a]/80 backdrop-blur-xl">`
                        `<div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">`
                            `<h3 className="text-lg font-bold text-white flex items-center gap-2">`
                                `<CheckCircle2 className="text-blue-400" size={20} />`
                                المهام والتقارير الأحدث
                            `</h3>`
                            `<Link href="/status" className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">`عرض جميع المهام`</Link>`
                        `</div>`

    `<div className="space-y-3">`
                            {loading ? (
                                `<p className="text-slate-500">`جاري التحميل...`</p>`
                            ) : tasks.length === 0 ? (
                                `<p className="text-slate-500 font-bold">`لا توجد مهام حالياً`</p>`
                            ) : tasks.map((task, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center p-4 bg-[#141414] hover:bg-[#1a1a1a] rounded-xl border border-slate-800 transition-colors gap-4">
                                    `<div className="text-slate-400 text-sm font-medium w-20 shrink-0 text-right">`{task.time}`</div>`
                                    `<div className="flex-1">`
                                        `<div className="flex items-center gap-3 mb-1">`
                                            `<h4 className="text-white font-bold truncate max-w-[200px] sm:max-w-xs">`{task.title}`</h4>`
                                            <span className={`text-[10px] whitespace-nowrap font-bold px-2 py-0.5 rounded ${task.pColor}`}>{task.priority}
                                        `</div>`
                                        `<p className="text-slate-500 text-sm">`{task.subtitle}`</p>`
                                    `</div>`
                                    `<div className="sm:text-left self-end sm:self-auto">`
                                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${task.sColor}`}>
                                            {task.status}
                                      
                                    `</div>`
                                `</div>`
                            ))}
                        `</div>`
                    `</div>`

    {/* Alerts & Activity (33%) */}`<div className="glass-card p-6 rounded-2xl border-rose-900/30 bg-[#0a0a0a]/80 backdrop-blur-xl">`
                         `<div className="flex items-center mb-6 pb-4 border-b border-slate-800">`
                            `<h3 className="text-lg font-bold text-white flex items-center gap-2">`
                                `<Bell className="text-amber-400" size={20} />`
                                تنبيهات ونشاط متصل
                            `</h3>`
                        `</div>`

    `<div className="space-y-4">`
                            {loading ? (
                                `<p className="text-slate-500">`جاري التحميل...`</p>`
                            ) : alerts.length === 0 ? (
                                `<p className="text-slate-500">`لا توجد تنبيهات`</p>`
                            ) : alerts.map((alert, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-3 rounded-lg hover:bg-[#141414] transition-colors group">
                                    <div className={`p-2.5 rounded-xl ${alert.bg} ${alert.color} border ${alert.border} shrink-0`}>
                                        <alert.icon size={20} />
                                    `</div>`
                                    `<div className="flex-1">`
                                        `<div className="flex justify-between items-start">`
                                            `<h4 className="text-slate-200 text-sm font-bold group-hover:text-white transition-colors">`{alert.title}`</h4>`
                                            `<span className="text-slate-500 text-[10px] whitespace-nowrap mr-2">`{alert.time}
                                        `</div>`
                                        `<p className="text-slate-500 text-xs mt-1">`{alert.desc}`</p>`
                                    `</div>`
                                `</div>`
                            ))}
                        `</div>`
                    `</div>`
                `</div>`

    `</div>`
        `</div>`
    );
}
