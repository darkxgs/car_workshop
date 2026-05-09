"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Wrench, ShieldAlert, ArrowLeft, Clock, Car, Activity } from "lucide-react";
import Link from "next/link";

type WorkOrderList = {
    id: string;
    report_number: number;
    status: string;
    vehicles: { make: string; model: string; plate_number: string; clients?: { name: string } | null };
    created_at: string;
    estimated_duration: number;
    is_delayed: boolean;
};

export default function WorkOrdersListPage() {
    const [orders, setOrders] = useState<WorkOrderList[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        const { data } = await supabase
            .from('inspection_reports')
            .select(`id, report_number, status, created_at, estimated_duration, is_delayed, vehicles (make, model, plate_number, clients (name))`)
            .order('created_at', { ascending: false });

        if (data) setOrders(data as any);
        setLoading(false);
    };

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <Wrench className="text-blue-500" size={32} />
                            ساحة الورشة (أوامر العمل)
                        </h1>
                        <p className="text-muted-foreground">
                            إدارة العمليات، مراقبة الوقت، وتوجيه السيارات للفنيين
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : orders.length === 0 ? (
                    <div className="glass-card p-12 text-center text-muted-foreground rounded-2xl border-border">
                        لا يوجد مركبات في الورشة حالياً.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {orders.map(order => (
                            <div key={order.id} className="glass-card p-5 rounded-2xl border-border relative group overflow-hidden transition-all hover:border-blue-500/30 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 ${
                                            order.status === 'تم الانتهاء' ? 'bg-emerald-500/10 text-emerald-500' :
                                            order.status === 'قيد العمل' ? 'bg-blue-500/10 text-blue-500' :
                                            'bg-muted text-muted-foreground'
                                        }`}>
                                            {order.status}
                                        </span>
                                        <span className="font-mono text-muted-foreground font-bold text-sm">#{order.report_number}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                            <Car size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground truncate">{order.vehicles?.make} {order.vehicles?.model}</h3>
                                            <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                                                {order.vehicles?.plate_number} 
                                                {order.vehicles?.clients && (Array.isArray(order.vehicles.clients) ? order.vehicles.clients[0]?.name : order.vehicles.clients.name) ? ` • ${Array.isArray(order.vehicles.clients) ? order.vehicles.clients[0]?.name : order.vehicles.clients.name}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                                            <span>المدة المقدرة:</span>
                                            <span className="font-bold font-mono text-foreground">{order.estimated_duration}m</span>
                                        </div>
                                        {/* Delay Warning */}
                                        {(order.is_delayed || order.status === 'متأخر') && (
                                            <div className="flex items-center gap-1 text-rose-500 text-[10px] bg-rose-500/10 px-2 py-1 rounded">
                                                <ShieldAlert size={12} /> تجاوز الحد الزمني!
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/work-orders/${order.id}`} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-muted group-hover:bg-blue-600 group-hover:text-white text-muted-foreground transition-colors font-bold rounded-xl text-sm border border-transparent group-hover:border-blue-500 shadow-sm">
                                        تفاصيل الصيانة <ArrowLeft size={16} />
                                    </Link>
                                    <Link href={`/reception?edit=${order.id}`} className="px-4 py-2.5 bg-muted group-hover:bg-rose-600/10 group-hover:text-rose-500 text-muted-foreground transition-colors font-bold rounded-xl text-sm border border-transparent group-hover:border-rose-500/30">
                                        تعديل
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
