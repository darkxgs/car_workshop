"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Wrench, Car, Play, CheckCircle2, DollarSign, Activity, FileText } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Home() {
    const { t } = useLanguage();
    
    const [stats, setStats] = useState({
        today: 0,
        inProgress: 0,
        completed: 0,
        revenue: 0
    });
    
    // Recent reports
    const [recentActivites, setRecentActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Get all reports for stats 
                // In a real app we'd filter by today's date using `.gte('created_at', today)`
                const todayStr = new Date().toISOString().split('T')[0];
                
                const { data: allReports } = await supabase
                    .from('inspection_reports')
                    .select('status, total_price, created_at, report_number');
                
                if (allReports) {
                    const todayCount = allReports.filter(r => r.created_at.startsWith(todayStr)).length;
                    const inProgress = allReports.filter(r => r.status === 'قيد العمل').length;
                    const completed = allReports.filter(r => r.status === 'تم الانتهاء' && r.created_at.startsWith(todayStr)).length;
                    const revenue = allReports
                        .filter(r => r.status === 'تم الانتهاء' && r.created_at.startsWith(todayStr))
                        .reduce((sum, r) => sum + Number(r.total_price || 0), 0);

                    setStats({
                        today: todayCount,
                        inProgress,
                        completed,
                        revenue
                    });
                }

                // Get top 5 recent 
                const { data: recent } = await supabase
                    .from('inspection_reports')
                    .select('id, report_number, status, created_at, vehicles(make, model, clients(name))')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (recent) setRecentActivities(recent);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in pb-24 font-ibm" dir={t.common.dashboard === "لوحة التحكم" ? "rtl" : "ltr"}>
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-black border border-rose-900/40 shadow-[0_0_20px_rgba(225,29,72,0.15)] flex items-center justify-center p-2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-rose-500/5 mix-blend-overlay"></div>
                        <Image src="/logo.png" alt="Logo" width={50} height={50} className="object-contain drop-shadow-[0_0_8px_rgba(225,29,72,0.5)] relative z-10" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-500 mb-1">
                            هندسة السيارات
                        </h1>
                        <p className="text-slate-400">
                            نظرة عامة على نشاط الورشة اليوم
                        </p>
                    </div>
                </div>
                <div className="text-left" dir="ltr">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 flex flex-col justify-between rounded-2xl relative overflow-hidden group border-rose-900/30 hover:border-blue-500/80 transition-all duration-300">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors blur-[50px] rounded-full pointer-events-none" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-3 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/20 transition-colors shadow-[0_0_15px_rgba(59,130,246,0)] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                            <Car size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-sm font-medium mb-1">سيارات تم استقبالها اليوم</p>
                        <h3 className="text-4xl font-display font-bold text-white group-hover:text-blue-50 transition-colors">
                            {loading ? "..." : stats.today}
                        </h3>
                    </div>
                </div>
                
                <div className="glass-card p-6 flex flex-col justify-between rounded-2xl relative overflow-hidden group border-rose-900/30 hover:border-amber-500/80 transition-all duration-300">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors blur-[50px] rounded-full pointer-events-none" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-3 bg-amber-500/10 group-hover:bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/20 transition-colors shadow-[0_0_15px_rgba(245,158,11,0)] group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                            <Play size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-sm font-medium mb-1">السيارات قيد العمل</p>
                        <h3 className="text-4xl font-display font-bold text-white group-hover:text-amber-50 transition-colors">
                            {loading ? "..." : stats.inProgress}
                        </h3>
                    </div>
                </div>

                <div className="glass-card p-6 flex flex-col justify-between rounded-2xl relative overflow-hidden group border-rose-900/30 hover:border-emerald-500/80 transition-all duration-300">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors blur-[50px] rounded-full pointer-events-none" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-3 bg-emerald-500/10 group-hover:bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/20 transition-colors shadow-[0_0_15px_rgba(16,185,129,0)] group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-sm font-medium mb-1">السيارات المكتملة اليوم</p>
                        <h3 className="text-4xl font-display font-bold text-white group-hover:text-emerald-50 transition-colors">
                            {loading ? "..." : stats.completed}
                        </h3>
                    </div>
                </div>

                <div className="glass-card p-6 flex flex-col justify-between rounded-2xl relative overflow-hidden group border-rose-900/30 hover:border-rose-500/80 transition-all duration-300">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors blur-[50px] rounded-full pointer-events-none" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="p-3 bg-rose-500/10 group-hover:bg-rose-500/20 rounded-xl text-rose-400 border border-rose-500/20 transition-colors shadow-[0_0_15px_rgba(225,29,72,0)] group-hover:shadow-[0_0_20px_rgba(225,29,72,0.3)]">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-sm font-medium mb-1">إيرادات اليوم المتوقعة</p>
                        <h3 className="text-3xl font-display font-bold text-white group-hover:text-rose-50 transition-colors glow-gold" dir="ltr">
                            {loading ? "..." : `${stats.revenue} IQD`}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 rounded-2xl border-rose-900/30 relative">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Activity className="text-cyan-400" size={20} />
                            آخر الأنشطة والتقارير
                        </h3>
                        <Link href="/status" className="text-sm font-bold text-rose-500 hover:text-rose-400 transition-colors shrink-0">
                            عرض الكل &larr;
                        </Link>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <p className="text-slate-500 text-center py-4 font-bold">جاري التحميل...</p>
                        ) : recentActivites.length === 0 ? (
                            <p className="text-slate-500 text-center py-4 font-bold">لا يوجد نشاط حديث</p>
                        ) : (
                            recentActivites.map(act => (
                                <div key={act.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900/50 hover:bg-slate-800/80 transition-colors rounded-xl border border-slate-800">
                                    <div className="flex items-start sm:items-center gap-4">
                                        <div className={`p-2 rounded-lg shrink-0 ${
                                            act.status === 'تم الاستلام' ? 'bg-slate-800 text-slate-400' :
                                            act.status === 'قيد العمل' ? 'bg-indigo-500/20 text-indigo-400' :
                                            'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                            <FileText size={20} />
                                        </div>
                                        <div className="truncate">
                                            <p className="text-white font-bold truncate">{act.vehicles?.make} {act.vehicles?.model}</p>
                                            <p className="text-slate-400 text-xs truncate">عميل: {act.vehicles?.clients?.name} • بوليصة #{act.report_number}</p>
                                        </div>
                                    </div>
                                    <div className="text-right sm:text-left self-end sm:self-auto">
                                        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border whitespace-nowrap ${
                                            act.status === 'تم الاستلام' ? 'bg-slate-900 text-slate-400 border-slate-700' :
                                            act.status === 'قيد العمل' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/30' :
                                            'bg-emerald-900/30 text-emerald-400 border-emerald-500/30'
                                        }`}>
                                            {act.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <Link href="/reception" className="glass-card p-6 flex items-center gap-4 rounded-2xl border-rose-900/30 hover:bg-[#1a050a] hover:border-rose-500/80 transition-all duration-300 group">
                        <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(225,29,72,0)] group-hover:shadow-[0_0_25px_rgba(225,29,72,0.6)]">
                            <Car size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-lg group-hover:text-rose-400 transition-colors">استقبال سيارة</h4>
                            <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">فتح بوليصة فحص جديدة</p>
                        </div>
                    </Link>

                    <Link href="/services" className="glass-card p-6 flex items-center gap-4 rounded-2xl border-rose-900/30 hover:bg-[#05051a] hover:border-indigo-500/80 transition-all duration-300 group">
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.6)]">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-lg group-hover:text-indigo-400 transition-colors">الخدمات والفحص</h4>
                            <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">استكمال التقارير المعلقة</p>
                        </div>
                    </Link>

                    <Link href="/reports" className="glass-card p-6 flex items-center gap-4 rounded-2xl border-rose-900/30 hover:bg-[#051515] hover:border-emerald-500/80 transition-all duration-300 group">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0)] group-hover:shadow-[0_0_25px_rgba(16,185,129,0.6)]">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-bold text-lg group-hover:text-emerald-400 transition-colors">سجل التقارير</h4>
                            <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">طباعة ومراجعة الفواتير</p>
                        </div>
                    </Link>
                </div>
            </div>
            
        </div>
    );
}
