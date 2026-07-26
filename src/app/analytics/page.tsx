"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PieChart, TrendingUp, Users, Wrench, Car, ArrowUpRight, ArrowDownRight, BarChart3, Star } from "lucide-react";

export default function AnalyticsPage() {
    const [revenue, setRevenue] = useState(0);
    const [clients, setClients] = useState(0);
    const [orders, setOrders] = useState(0);

    useEffect(() => {
        const fetchStats = async () => {
            // 1. Revenue
            const { data: revData } = await supabase.from('pos_sales' as any).select('total_amount');
            const { data: wpData } = await supabase.from('inspection_reports').select('total_price').eq('status', 'تم الانتهاء');
            
            let total = 0;
            revData?.forEach((r: any) => total += Number(r.total_amount));
            wpData?.forEach((w: any) => total += Number(w.total_price));
            setRevenue(total);

            // 2. Clients
            const { count: cliCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
            if (cliCount) setClients(cliCount);

            // 3. Completed Orders
            const { count: ordCount } = await supabase.from('inspection_reports').select('*', { count: 'exact', head: true }).eq('status', 'تم الانتهاء');
            if (ordCount) setOrders(ordCount);
        };
        fetchStats();
    }, []);

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <PieChart className="text-indigo-500" size={32} />
                            التحليلات ومؤشرات الأداء (KPIs)
                        </h1>
                        <p className="text-muted-foreground">
                            نظرة عميقة على أداء الورشة، رضا العملاء، وإنتاجية الفنيين.
                        </p>
                    </div>
                    <div className="flex bg-card border border-border rounded-xl p-1">
                        <button className="px-4 py-2 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold transition-colors text-sm">هذا الشهر</button>
                        <button className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors text-sm">ربع سنوي</button>
                        <button className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors text-sm">الكل</button>
                    </div>
                </div>

                {/* Top KPIs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard 
                        title="إجمالي الإيرادات (تم تأكيدها)" 
                        value={revenue.toLocaleString()} 
                        unit="د.ع" 
                        trend="+12%" 
                        isUp={true} 
                        icon={<TrendingUp size={24} />} 
                        color="text-emerald-500 bg-emerald-500/10" 
                    />
                    <KpiCard 
                        title="معدل عودة العملاء" 
                        value="85" 
                        unit="%" 
                        trend="+2%" 
                        isUp={true} 
                        icon={<Star size={24} />} 
                        color="text-amber-500 bg-amber-500/10" 
                    />
                    <KpiCard 
                        title="قاعدة العملاء" 
                        value={clients.toString()} 
                        unit="عميل مسجل" 
                        trend="+5%" 
                        isUp={true} 
                        icon={<Users size={24} />} 
                        color="text-blue-500 bg-blue-500/10" 
                    />
                    <KpiCard 
                        title="أوامر العمل المكتملة" 
                        value={orders.toString()} 
                        unit="مركبة" 
                        trend="+24%" 
                        isUp={true} 
                        icon={<Wrench size={24} />} 
                        color="text-indigo-500 bg-indigo-500/10" 
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Performance Chart Placeholder */}
                    <div className="lg:col-span-2 glass-card p-6 rounded-2xl border-border flex flex-col min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <BarChart3 className="text-indigo-400" /> النمو المالي الشهري
                            </h3>
                        </div>
                        <div className="flex-1 border border-dashed border-border rounded-xl flex items-center justify-center relative overflow-hidden bg-background">
                            {/* CSS Decorative Chart Placeholder */}
                            <div className="absolute bottom-0 left-0 w-full flex items-end justify-between px-8 gap-4 h-full pt-10">
                                {[30, 45, 25, 60, 40, 75, 55, 90, 65, 80].map((h, i) => (
                                    <div key={i} className="flex-1 bg-gradient-to-t from-indigo-900/50 to-indigo-500 rounded-t-lg relative group transition-all duration-500 hover:to-indigo-400" style={{ height: `${h}%` }}>
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black font-bold text-xs px-2 py-1 rounded transition-opacity">
                                            {h}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Operational Insights */}
                    <div className="glass-card p-6 rounded-2xl border-border space-y-6">
                        <h3 className="text-xl font-bold text-foreground border-b border-border pb-4">رؤى تشغيلية</h3>
                        
                        <div className="space-y-4">
                            <InsightItem 
                                title="أكثر السيارات زيارة" 
                                desc="تويوتا كامري وهيونداي سوناتا تشكل 40% من الدخل." 
                                icon={<Car size={18} />} 
                                color="text-emerald-400" 
                            />
                            <InsightItem 
                                title="اختناقات العمل" 
                                desc="قسم السمكرة والدهان يعاني من تأخير بمتوسط 1.5 يوم." 
                                icon={<Wrench size={18} />} 
                                color="text-rose-400" 
                            />
                            <InsightItem 
                                title="أداء المخزون" 
                                desc="بطاريات 70 أمبير تنفد أسرع من معدل التوريد." 
                                icon={<TrendingUp size={18} />} 
                                color="text-amber-400" 
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

function KpiCard({ title, value, unit, trend, isUp, icon, color }: { title: string, value: string, unit: string, trend: string, isUp: boolean, icon: any, color: string }) {
    return (
        <div className="glass-card p-6 rounded-2xl border-border flex flex-col justify-between h-36 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 ${color} blur-3xl opacity-20 group-hover:opacity-40 transition-opacity translate-x-1/2 -translate-y-1/2`} />
            <div className="flex justify-between items-start z-10">
                <span className="text-sm font-bold text-muted-foreground">{title}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    {icon}
                </div>
            </div>
            <div className="z-10 flex items-end justify-between">
                <div>
                    <span className="text-3xl font-display font-black text-foreground">{value}</span>
                    <span className="text-xs text-muted-foreground font-mono ms-2 mt-1 inline-block">{unit}</span>
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`} dir="ltr">
                    {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {trend}
                </div>
            </div>
        </div>
    );
}

function InsightItem({ title, desc, icon, color }: { title: string, desc: string, icon: any, color: string }) {
    return (
        <div className="p-4 bg-muted rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-2">
                <span className={color}>{icon}</span>
                <h4 className="font-bold text-foreground">{title}</h4>
            </div>
            <p className="text-sm text-muted-foreground pr-7">{desc}</p>
        </div>
    );
}
