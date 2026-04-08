"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useAuth } from "@/lib/AuthProvider";
import {
    Wrench, Car, Play, CheckCircle2, DollarSign, Activity, FileText,
    Search, Bell, Settings, Calendar, Plus, User, LayoutDashboard,
    Package, ShoppingCart, TrendingUp, AlertTriangle, Clock, Wallet, Database, ArrowLeft
} from "lucide-react";
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

type WorkOrder = {
    id: string;
    report_number: number;
    status: string;
    estimated_duration: number;
    elapsed_time: number;
    start_time: string | null;
    is_delayed: boolean;
    created_at: string;
    total_price: number | null;
    vehicles: { make: string; model: string; plate_number: string, clients: { name: string; phone: string } };
};

export default function Home() {
    const { t } = useLanguage();
    const { employeeName, employeeRole } = useAuth();

    const [stats, setStats] = useState({
        today: 0,
        inProgress: 0,
        completed: 0,
        revenue: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [liveOrders, setLiveOrders] = useState<WorkOrder[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();

        const channel = supabase.channel('dashboard_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inspection_reports' }, () => {
                fetchDashboardData();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const fetchDashboardData = async () => {
        try {
            const todayStr = new Date().toISOString().split('T')[0];

            // Fetch reports (acts as work orders)
            const { data: allReports } = await supabase
                .from('inspection_reports')
                .select(`
                    id, report_number, status, total_price, created_at,
                    estimated_duration, elapsed_time, start_time, is_delayed,
                    vehicles (make, model, plate_number, clients(name, phone))
                `)
                .order('created_at', { ascending: false });

            // Inventory fetch removed

            if (allReports) {
                // Map to Work Orders (first 6 active)
                const mappedOrders = allReports as any as WorkOrder[];
                setLiveOrders(mappedOrders.filter(o => o.status !== 'تم الانتهاء' && o.status !== 'ملغى').slice(0, 6));

                const isToday = (dateStr: string) => {
                    const d = new Date(dateStr);
                    const today = new Date();
                    return d.getDate() === today.getDate() &&
                        d.getMonth() === today.getMonth() &&
                        d.getFullYear() === today.getFullYear();
                };

                const todayCount = allReports.filter(r => isToday(r.created_at)).length;
                const inProgress = allReports.filter(r => r.status === 'قيد العمل').length;
                const completed = allReports.filter(r => r.status === 'تم الانتهاء' && isToday(r.created_at)).length;
                const revenue = allReports
                    .filter(r => r.status === 'تم الانتهاء' && isToday(r.created_at))
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

                // 2. Alerts
                const generatedAlerts = [];
                const delayedOrders = allReports.filter(r => r.is_delayed || r.status === 'متأخر').length;
                if (delayedOrders > 0) {
                    generatedAlerts.push({
                        icon: Activity, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/50",
                        title: "تأخير في الصيانة",
                        desc: `يوجد ${delayedOrders} مركبات متأخرة عن الوقت المقدر!`,
                        time: "عاجل"
                    });
                }
                if (revenue > 0) {
                    generatedAlerts.push({
                        icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-transparent",
                        title: "ملخص مالي مبدئي",
                        desc: `التحصيل اليومي وصل إلى ${formatCurrency(revenue)} د.ع`,
                        time: "اليوم"
                    });
                }
                if (generatedAlerts.length === 0) {
                    generatedAlerts.push({
                        icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-transparent",
                        title: "العمليات مستقرة", desc: "جميع المهام تسير بانتظام", time: "الآن"
                    });
                }
                setAlerts(generatedAlerts);

                setStats({
                    today: todayCount,
                    inProgress,
                    completed,
                    revenue
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US').format(val);
    };

    return (
        <div className="min-h-screen pb-24 font-ibm bg-gradient-to-br from-[var(--color-background)] to-[var(--color-background)]" dir="rtl">

            {/* 1. Header Navigation */}
            <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex-1 max-w-md hidden md:flex items-center relative">
                    <Search className="absolute right-4 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="ابحث في النظام عن فاتورة أو سيارة..."
                        className="w-full bg-card border-border border border-border rounded-xl py-2.5 pr-11 pl-4 text-foreground placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-4 mr-auto">
                    <button className="relative p-2.5 bg-card border-border hover:bg-muted rounded-xl border border-border transition-colors text-muted-foreground">
                        <Bell size={20} />
                    </button>
                    <Link href="/settings" className="p-2.5 bg-card border-border hover:bg-muted rounded-xl border border-border transition-colors text-muted-foreground hidden sm:flex items-center justify-center">
                        <Settings size={20} />
                    </Link>
                    <div className="h-8 w-[1px] bg-muted mx-2 hidden sm:block"></div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-foreground leading-tight">{employeeName || "المستخدم الحالي"}</p>
                            <p className="text-xs text-rose-400">{employeeRole || "تحميل..."}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-rose-900 border border-rose-500/30 flex items-center justify-center overflow-hidden shadow-lg shadow-rose-500/20">
                            <User className="text-foreground" size={20} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto animate-fade-in">

                {/* 2. Page Title & Actions */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2">لوحة التحكم الرئيسية</h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            نظرة عامة على أداء ومسار أوامر العمل - {new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="px-5 py-2.5 bg-card border-border hover:bg-muted text-foreground rounded-xl border border-border transition-all font-medium flex items-center gap-2 shadow-sm">
                            <Calendar size={18} className="text-muted-foreground" />
                            حجز موعد
                        </button>
                        <Link href="/reception" className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-foreground rounded-xl transition-all font-medium flex items-center gap-2 shadow-lg shadow-rose-500/25 border border-rose-500/50">
                            <Plus size={18} />
                            أمر صيانة جديد
                        </Link>
                    </div>
                </div>

                {/* 3. KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Orders */}
                    <div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-border hover:border-blue-500/50 transition-all duration-300 relative group overflow-hidden">
                        <div className="absolute -inset-2 bg-blue-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex flex-col items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium mb-1">أوامر الصيانة اليوم</p>
                                    <h3 className="text-3xl font-bold text-foreground">{loading ? "..." : (stats.today || 0)}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-sm relative z-10">
                            <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                                من أصل {stats.today + stats.inProgress}
                            </span>
                        </div>
                    </div>

                    {/* Revenue */}
                    <div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-border hover:border-emerald-500/50 transition-all duration-300 relative group overflow-hidden">
                        <div className="absolute -inset-2 bg-emerald-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex flex-col items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                                    <DollarSign size={24} />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium mb-1">إيرادات اليوم</p>
                                    <h3 className="text-3xl font-bold text-foreground" dir="ltr">{loading ? "..." : formatCurrency(stats.revenue)}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-sm relative z-10">
                            <span className="text-emerald-400 font-medium">
                                تم الانتهاء من {stats.completed} مركبات
                            </span>
                        </div>
                    </div>

                    {/* Pending Vehicles */}
                    <div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-border hover:border-amber-500/50 transition-all duration-300 relative group overflow-hidden">
                        <div className="absolute -inset-2 bg-amber-500/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500 flex flex-col items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                                    <Car size={24} />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium mb-1">المركبات بالخدمة</p>
                                    <h3 className="text-3xl font-bold text-foreground">{loading ? "..." : (stats.inProgress || 0)}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 text-sm relative z-10">
                            <span className="text-amber-500 font-medium">قيد العمل أو الانتظار</span>
                        </div>
                    </div>


                </div>

                {/* 4. Chart & Modules Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Performance Chart (66%) */}
                    <div className="lg:col-span-2 glass-card p-6 rounded-2xl border-border bg-card/80 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Activity className="text-emerald-400" size={20} />
                                أداء الورشة
                            </h3>
                            <select className="bg-card border-border border border-border text-muted-foreground text-sm rounded-lg py-1.5 px-3 focus:outline-none focus:border-rose-500/50">
                                <option>آخر 7 أيام نشطة</option>
                            </select>
                        </div>

                        {/* Custom Legend */}
                        <div className="flex items-center justify-center gap-8 mb-6 text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground"><div className="w-3 h-3 rounded-full bg-blue-500"></div> أوامر الصيانة</span>
                            <span className="flex items-center gap-2 text-muted-foreground"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> الإيرادات</span>
                        </div>

                        <div className="h-[280px] w-full" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                                    <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#10b981', stroke: '#000', strokeWidth: 2 }} />
                                    <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#000', strokeWidth: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Main Modules Grid (33%) matching user's exact design */}
                    <div className="glass-card p-6 rounded-2xl border-border bg-card/80 backdrop-blur-xl h-full flex flex-col">
                        <div className="flex items-center gap-2 mb-6">
                            <LayoutDashboard className="text-blue-400" size={20} />
                            <h3 className="text-lg font-bold text-foreground">الوحدات الرئيسية</h3>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 flex-1 content-start">
                            {/* Line 1 */}
                            <Link href="/vehicles" className="flex flex-col items-center justify-center p-4 bg-muted hover:bg-card border border-border hover:border-blue-500/40 rounded-xl transition-all group">
                                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl mb-3 group-hover:scale-110 transition-transform"><Car size={24} /></div>
                                <span className="text-sm font-medium text-foreground">المركبات</span>
                            </Link>
                            <Link href="/status" className="flex flex-col items-center justify-center p-4 bg-muted hover:bg-card border border-border hover:border-emerald-500/40 rounded-xl transition-all group">
                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl mb-3 group-hover:scale-110 transition-transform"><Wrench size={24} /></div>
                                <span className="text-sm font-medium text-foreground">شاشة المتابعة</span>
                            </Link>
                            {/* Line 2 */}
                            <Link href="/customers" className="flex flex-col items-center justify-center p-4 bg-muted hover:bg-card border border-border hover:border-amber-500/40 rounded-xl transition-all group">
                                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl mb-3 group-hover:scale-110 transition-transform"><User size={24} /></div>
                                <span className="text-sm font-medium text-foreground">العملاء (CRM)</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* 5. Live Work Orders & Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Live Work Orders (66%) */}
                    <div className="lg:col-span-2 glass-card p-6 rounded-2xl border-border bg-card/80 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Activity className="text-blue-400" size={20} />
                                أوامر العمل الحية (Live)
                            </h3>
                            <Link href="/status" className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors">لوحة المتابعة</Link>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" /></div>
                        ) : liveOrders.length === 0 ? (
                            <p className="text-muted-foreground font-bold p-8 text-center border-dashed border border-border rounded-2xl">لا يوجد مركبات قيد العمل.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {liveOrders.map(order => (
                                    <WorkOrderCard key={order.id} order={order} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Alerts (33%) */}
                    <div className="glass-card p-6 rounded-2xl border-border bg-card/80 backdrop-blur-xl flex flex-col h-full max-h-[500px]">
                        <div className="flex items-center mb-6 pb-4 border-b border-border shrink-0">
                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Bell className="text-amber-400" size={20} />
                                التنبيهات والنظام
                            </h3>
                        </div>

                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 pb-4">
                            {loading ? (
                                <p className="text-muted-foreground">جاري التحميل...</p>
                            ) : alerts.length === 0 ? (
                                <p className="text-muted-foreground">لا توجد تنبيهات</p>
                            ) : alerts.map((alert, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted transition-colors group">
                                    <div className={`p-2.5 rounded-xl ${alert.bg} ${alert.color} border ${alert.border} shrink-0`}>
                                        <alert.icon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-foreground text-sm font-bold group-hover:text-foreground transition-colors">{alert.title}</h4>
                                            <span className="text-muted-foreground text-[10px] whitespace-nowrap mr-2">{alert.time}</span>
                                        </div>
                                        <p className="text-muted-foreground text-xs mt-1 leading-snug">{alert.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ------ Live Timer Card Component ------
function WorkOrderCard({ order }: { order: WorkOrder }) {
    const [liveMinutes, setLiveMinutes] = useState(order.elapsed_time || 0);

    let statusColor = "border-border bg-card/50 text-muted-foreground"; // New / Default
    let statusLabel = order.status;

    if (order.status === 'قيد العمل') statusColor = "border-blue-500/50 bg-blue-900/20 text-blue-400"; // In Progress
    if (order.status === 'متأخر' || order.is_delayed) statusColor = "border-rose-500/50 bg-rose-900/20 text-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.2)]"; // Delayed

    // Calculate live timer only if IN PROGRESS
    useEffect(() => {
        if (order.status !== 'قيد العمل' || !order.start_time) return;

        const interval = setInterval(() => {
            const startMs = new Date(order.start_time!).getTime();
            const nowMs = Date.now();
            const diffMins = Math.floor((nowMs - startMs) / 60000);

            setLiveMinutes((order.elapsed_time || 0) + diffMins);
        }, 10000); // Check every 10s

        return () => clearInterval(interval);
    }, [order.status, order.start_time, order.elapsed_time]);

    const isOverdue = order.estimated_duration > 0 && liveMinutes > order.estimated_duration;
    // Override visual if dynamically overdue right now
    if (isOverdue && order.status === 'قيد العمل') {
        statusColor = "border-rose-500/50 bg-rose-900/20 text-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.2)]";
        statusLabel = "متأخر (تلقائي)";
    }

    return (
        <div className={`p-4 rounded-xl relative overflow-hidden group border transition-all duration-300 flex flex-col justify-between h-full bg-muted hover:bg-muted/80 ${statusColor.split(' ')[0]}`}>
            <div className="mb-3">
                <div className="flex justify-between items-start mb-2">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                        {statusLabel}
                    </div>
                    <span className="font-mono text-muted-foreground text-xs">#{order.report_number}</span>
                </div>

                <h3 className="text-foreground font-bold text-sm mb-1 truncate flex items-center gap-1">
                    <Car size={12} className="text-muted-foreground" /> {order.vehicles?.make} {order.vehicles?.model}
                </h3>
            </div>

            <div className="border-t border-border pt-3 mt-auto">
                <div className="flex justify-between items-center mb-2">
                    <div className="text-right w-1/2">
                        <p className="text-[10px] text-muted-foreground mb-0.5">المقدر</p>
                        <p className="text-foreground font-mono font-bold text-sm">{order.estimated_duration || 0}m</p>
                    </div>
                    <div className="text-left w-1/2">
                        <p className="text-[10px] text-muted-foreground mb-0.5">الحي</p>
                        <p className={`font-mono font-bold text-sm ${isOverdue ? 'text-rose-500 animate-pulse' : 'text-blue-400'}`}>
                            {liveMinutes}m
                        </p>
                    </div>
                </div>

                <div className="h-1 w-full bg-card rounded-full overflow-hidden mb-3">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${isOverdue ? 'bg-rose-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min((liveMinutes / (order.estimated_duration || 1)) * 100, 100)}%` }}
                    />
                </div>

                <Link href={`/work-orders/${order.id}`} className="w-full py-1.5 bg-card hover:bg-muted rounded-lg text-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors block border border-border">
                    تفاصيل التذكرة
                </Link>
            </div>
        </div>
    );
}
