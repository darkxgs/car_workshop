"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { Wrench, ShieldAlert, ArrowLeft, Clock, Car, Activity } from "lucide-react";
import Link from "next/link";

type WorkOrderList = {
    id: string;
    report_number: number;
    status: string;
    bay_number: string | null;
    start_time: string | null;
    elapsed_time: number | null;
    vehicles: { make: string; model: string; plate_number: string; clients?: { name: string } | null };
    technician: { name: string } | null;
    created_at: string;
    estimated_duration: number;
    is_delayed: boolean;
};

export default function WorkOrdersListPage() {
    const { employeeRole, employeeBranchId } = useAuth();
    const [orders, setOrders] = useState<WorkOrderList[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 10000); // Check every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchOrders();

        const channel = supabase.channel('work_orders_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inspection_reports' }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [employeeBranchId, employeeRole]);

    const fetchOrders = async () => {
        let query = supabase
            .from('inspection_reports')
            .select(`id, report_number, status, created_at, estimated_duration, is_delayed, bay_number, start_time, elapsed_time, vehicles (make, model, plate_number, clients (name)), technician:technician_id(name)`)
            .neq('status', 'تم الانتهاء')
            .neq('status', 'ملغى')
            .order('created_at', { ascending: false });

        if (employeeBranchId) {
            query = query.eq('branch_id', employeeBranchId);
        }

        const { data } = await query;
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
                    <Link href="/reception" className="btn-primary flex items-center gap-2 whitespace-nowrap px-6 py-2">
                        <span>+</span> أمر عمل جديد
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
                ) : orders.length === 0 ? (
                    <div className="glass-card p-12 text-center text-muted-foreground rounded-2xl border-border">
                        لا يوجد مركبات في الورشة حالياً.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {orders.map(order => {
                            let currentLiveMins = order.elapsed_time || 0;
                            if (order.status === 'قيد العمل' && order.start_time) {
                                const startMs = new Date(order.start_time).getTime();
                                currentLiveMins += Math.floor((now - startMs) / 60000);
                            }
                            
                            const remainingMins = order.estimated_duration - currentLiveMins;
                            const isTimerDanger = remainingMins <= 0;
                            
                            return (
                            <div key={order.id} className="glass-card p-6 rounded-2xl border-border relative group overflow-hidden transition-all hover:border-blue-500/30 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex flex-col gap-2">
                                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 w-max ${
                                                order.status === 'تم الانتهاء' ? 'bg-emerald-500/10 text-emerald-500' :
                                                order.status === 'قيد العمل' ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-amber-500/10 text-amber-500'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <span className="font-mono text-muted-foreground font-bold text-lg">#{order.report_number}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                                            <Car size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-foreground truncate">{order.vehicles?.make} {order.vehicles?.model}</h3>
                                            <p className="text-sm text-muted-foreground font-mono mt-1" dir="ltr">
                                                {order.vehicles?.plate_number} 
                                                {order.vehicles?.clients && (Array.isArray(order.vehicles.clients) ? order.vehicles.clients[0]?.name : order.vehicles.clients.name) ? ` • ${Array.isArray(order.vehicles.clients) ? order.vehicles.clients[0]?.name : order.vehicles.clients.name}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 mb-4 text-sm font-bold text-muted-foreground border-b border-border/50 pb-3">
                                        <div className="flex items-center gap-2">
                                            <Wrench size={16} /> الفني: <span className="text-foreground">{order.technician?.name || 'غير محدد'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Activity size={16} /> رقم الخانة: <span className="text-foreground">{order.bay_number || 'غير محدد'}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-background/50 border border-border">
                                            <span className="text-sm text-muted-foreground mb-1">الوقت المتبقي</span>
                                            <div className={`text-4xl font-black font-mono tracking-wider ${isTimerDanger ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {order.status === 'قيد العمل' ? (
                                                    remainingMins > 0 ? `${remainingMins}m` : `-${Math.abs(remainingMins)}m`
                                                ) : (
                                                    `${order.estimated_duration}m`
                                                )}
                                            </div>
                                        </div>
                                        {/* Delay Warning */}
                                        {(order.is_delayed || order.status === 'متأخر' || isTimerDanger) && order.status === 'قيد العمل' && (
                                            <div className="flex justify-center items-center gap-1 text-rose-500 text-sm font-bold bg-rose-500/10 px-3 py-2 rounded-lg">
                                                <ShieldAlert size={16} /> تجاوز الوقت المحدد!
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Link href={`/work-orders/${order.id}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-muted hover:bg-blue-600 hover:text-white text-muted-foreground transition-colors font-bold rounded-xl text-base border border-transparent hover:border-blue-500 shadow-sm">
                                        تفاصيل الصيانة <ArrowLeft size={18} />
                                    </Link>
                                    <Link href={`/reception?edit=${order.id}`} className="px-5 py-3 bg-muted hover:bg-rose-600/10 hover:text-rose-500 text-muted-foreground transition-colors font-bold rounded-xl text-base border border-transparent hover:border-rose-500/30">
                                        تعديل
                                    </Link>
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>
        </div>
    );
}
