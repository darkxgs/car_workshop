"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Bell, CheckCircle, PackageOpen, Wrench, Clock, RefreshCw } from "lucide-react";

type Alert = {
    id: string;
    type: 'critical' | 'warning' | 'info';
    source: 'inventory' | 'workshop' | 'system';
    title: string;
    message: string;
    time: string;
    read: boolean;
};

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        generateAlerts();
    }, []);

    const generateAlerts = async () => {
        setLoading(true);
        const sysAlerts: Alert[] = [];

        // 1. Check Inventory
        const { data: lowStock } = await supabase.from('inventory').select('name, quantity, min_quantity').lt('quantity', 10);
        if (lowStock) {
            lowStock.forEach(item => {
                const isCrit = item.quantity === 0;
                sysAlerts.push({
                    id: Math.random().toString(),
                    type: isCrit ? 'critical' : 'warning',
                    source: 'inventory',
                    title: isCrit ? 'نفاد مخزون ⚠️' : 'نقص مخزون',
                    message: `القطعة "${item.name}" ${isCrit ? 'نفدت بالكامل!' : `الكمية المتبقية (${item.quantity}) يجب طلب توريد.`}`,
                    time: new Date().toISOString(),
                    read: false
                });
            });
        }

        // 2. Check Workshop
        const { data: delayedData } = await supabase.from('inspection_reports').select('report_number').eq('status', 'متأخر').limit(5);
        if (delayedData) {
            delayedData.forEach(rep => {
                sysAlerts.push({
                    id: Math.random().toString(),
                    type: 'critical',
                    source: 'workshop',
                    title: 'تأخير صيانة',
                    message: `أمر العمل رقم #${rep.report_number} متاخر عن موعد التسليم المحدد للعميل.`,
                    time: new Date().toISOString(),
                    read: false
                });
            });
        }

        setAlerts(sysAlerts);
        setLoading(false);
    };

    const markAllRead = () => {
        setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    };

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <Bell className="text-amber-500" size={32} />
                            مركز التنبيهات والأحداث
                        </h1>
                        <p className="text-muted-foreground">
                            متابعة التحذيرات الخاصة بالمخزون ومواعيد تسليم السيارات.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={markAllRead} className="px-4 py-2 bg-muted hover:bg-muted/70 text-muted-foreground font-bold rounded-xl transition-colors border border-border flex items-center gap-2 text-sm">
                            <CheckCircle size={16} /> تحديد الكل كمقروء
                        </button>
                        <button onClick={generateAlerts} className="px-3 py-2 bg-muted hover:bg-muted/70 text-foreground rounded-xl transition-colors">
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Alerts List */}
                <div className="glass-card rounded-2xl border-border overflow-hidden min-h-[500px] flex flex-col">
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-muted-foreground">
                            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p>جاري مسح النظام...</p>
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-muted-foreground">
                            <CheckCircle size={48} className="text-emerald-500 mb-4 opacity-50" />
                            <p className="text-lg">لا توجد أي تنبيهات حالياً!</p>
                            <span className="text-xs">نظام الورشة يعمل باستقرار وكل شيء على ما يرام.</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {alerts.map((alert) => (
                                <div key={alert.id} className={`p-5 flex gap-4 transition-colors ${alert.read ? 'opacity-60 bg-transparent' : 'bg-muted'}`}>
                                    <div className="shrink-0 pt-1">
                                        {alert.source === 'inventory' ? (
                                            <div className={`p-2 rounded-xl ${alert.type === 'critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'}`}><PackageOpen size={20} /></div>
                                        ) : alert.source === 'workshop' ? (
                                            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-500"><Clock size={20} /></div>
                                        ) : (
                                            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500"><Wrench size={20} /></div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`font-bold ${alert.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                                                {alert.title}
                                                {!alert.read && <span className="ms-2 inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                                            </h4>
                                            <span className="text-xs text-muted-foreground font-mono" dir="ltr">{new Date(alert.time).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground leading-relaxed">{alert.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
