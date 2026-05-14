"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { Activity, Clock, CheckCircle2, AlertCircle, Car, User, ArrowLeft } from "lucide-react";
import Link from "next/link";

type WorkOrder = {
    id: string;
    report_number: number;
    status: string;
    estimated_duration: number;
    elapsed_time: number;
    start_time: string | null;
    is_delayed: boolean;
    vehicles: { make: string; model: string; plate_number: string, clients: { name: string; phone: string } };
};

const COLUMNS = [
    { id: 'تم الاستلام', label: 'تم الاستلام (قيد الانتظار)', icon: Clock, color: 'text-muted-foreground', border: 'border-border', bg: 'bg-card' },
    { id: 'قيد العمل', label: 'جاري العمل (بالورشة)', icon: Activity, color: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-900/10' },
    { id: 'تم الانتهاء', label: 'مكتمل (جاهز للتسليم)', icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-900/10' },
    { id: 'متأخر', label: 'متأخر (تنبيه)', icon: AlertCircle, color: 'text-rose-500', border: 'border-rose-500/30', bg: 'bg-rose-900/10' },
];

export default function KanbanStatusPage() {
    const { employeeRole, employeeBranchId } = useAuth();
    const [orders, setOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
        const channel = supabase.channel('kanban_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inspection_reports' }, () => {
                fetchOrders(); 
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [employeeRole, employeeBranchId]);

    const fetchOrders = async () => {
        setLoading(true);
        let query = supabase
            .from('inspection_reports')
            .select(`
                id, report_number, status, estimated_duration, elapsed_time, start_time, is_delayed,
                vehicles (make, model, plate_number, clients (name, phone))
            `)
            .neq('status', 'تم الانتهاء')
            .neq('status', 'ملغى')
            .order('created_at', { ascending: false });

        if (employeeRole !== 'Owner' && employeeRole !== 'Admin' && employeeBranchId) {
            query = query.eq('branch_id', employeeBranchId);
        }

        const { data, error } = await query;

        if (!error && data) {
            setOrders(data as any);
        }
        setLoading(false);
    };

    const handleDragStart = (e: React.DragEvent, orderId: string) => {
        e.dataTransfer.setData("orderId", orderId);
        if (e.target instanceof HTMLElement) {
             e.target.style.opacity = "0.5";
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.target instanceof HTMLElement) {
             e.target.style.opacity = "1";
        }
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData("orderId");
        if (!orderId) return;

        // Optimistic UI update
        const previousOrders = [...orders];
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));

        // Db Update
        let updateData: any = { status: newStatus };
        
        // If moved to "تم الانتهاء", log completed_at
        if (newStatus === 'تم الانتهاء') {
            updateData.completed_at = new Date().toISOString();
            updateData.end_time = new Date().toISOString();
        }

        const { error } = await supabase.from('inspection_reports').update(updateData).eq('id', orderId);
        
        if (error) {
            alert("حدث خطأ أثناء تغيير الحالة.");
            setOrders(previousOrders); // Revert UI
            fetchOrders();
        }
    };

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm bg-background" dir="rtl">
            <div className="max-w-[1600px] mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <Activity className="text-blue-500" size={32} />
                            لوحة متابعة الورشة (Kanban)
                        </h1>
                        <p className="text-muted-foreground">
                            قم بسحب وإفلات أوامر العمل لتغيير حالتها فورياً
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                        {COLUMNS.map(column => {
                            const columnOrders = orders.filter(o => {
                                if (column.id === 'متأخر') return o.is_delayed || o.status === 'متأخر';
                                if (o.is_delayed && o.status !== 'تم الانتهاء') return false; // Hide from standard cols if delayed
                                return o.status === column.id;
                            });

                            return (
                                <div 
                                    key={column.id}
                                    className={`glass-card rounded-2xl border ${column.border} ${column.bg} p-4 min-h-[500px]`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, column.id)}
                                >
                                    <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
                                        <h2 className={`font-bold flex items-center gap-2 ${column.color}`}>
                                            <column.icon size={18} />
                                            {column.label}
                                        </h2>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground`}>
                                            {columnOrders.length}
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {columnOrders.map(order => (
                                            <div 
                                                key={order.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, order.id)}
                                                onDragEnd={handleDragEnd}
                                                className="bg-muted hover:bg-muted/80 border border-border hover:border-slate-700 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all shadow-sm"
                                            >
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="font-mono text-muted-foreground text-xs bg-muted/80 px-2 py-0.5 rounded border border-border">#{order.report_number}</span>
                                                    {(order.is_delayed || order.status === 'متأخر') && (
                                                        <span className="text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                                            <AlertCircle size={10} /> متأخر
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-foreground font-bold text-sm mb-1 flex items-center gap-2 truncate">
                                                    <Car size={14} className="text-muted-foreground shrink-0" /> 
                                                    <span className="truncate">{order.vehicles?.make} {order.vehicles?.model}</span>
                                                </h3>
                                                <p className="text-muted-foreground text-xs flex items-center gap-2 truncate mb-4">
                                                    <User size={14} className="shrink-0" /> 
                                                    <span className="truncate">{order.vehicles?.clients?.name || 'غير محدد'}</span>
                                                </p>

                                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                                                    <div className="text-[10px] text-muted-foreground font-mono bg-black/30 px-2 py-1 rounded">
                                                        {order.vehicles?.plate_number}
                                                    </div>
                                                    <Link 
                                                        href={`/work-orders/${order.id}`}
                                                        className="p-1.5 hover:bg-blue-500/10 text-muted-foreground hover:text-blue-400 rounded-lg transition-colors"
                                                        title="التفاصيل"
                                                    >
                                                        <ArrowLeft size={16} />
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}

                                        {columnOrders.length === 0 && (
                                            <div className="text-center p-6 border-2 border-dashed border-border rounded-xl">
                                                <p className="text-slate-600 text-sm">اسحب البطاقات هنا</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
