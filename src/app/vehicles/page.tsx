"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Car, User, Hash, Box, Settings } from "lucide-react";
import Link from "next/link";

type VehicleWithClient = {
    id: string;
    make: string;
    model: string;
    plate_number: string;
    engine_size: string | null;
    created_at: string;
    clients: { name: string; phone: string };
};

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<VehicleWithClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('vehicles')
            .select(`
                id, make, model, plate_number, engine_size, created_at,
                clients (name, phone)
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setVehicles(data as any);
        }
        setLoading(false);
    };

    const filteredVehicles = vehicles.filter(v => 
        v.plate_number.includes(searchTerm) || 
        v.make.includes(searchTerm) || 
        v.model.includes(searchTerm) ||
        (v.clients && v.clients.name.includes(searchTerm))
    );

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <Car className="text-blue-500" size={32} />
                            إدارة المركبات
                        </h1>
                        <p className="text-muted-foreground">
                            أسطول سيارات العملاء المسجلة في النظام
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input 
                                type="text" 
                                placeholder="ابحث برقم اللوحة، الماركة، أو المالك..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-4 text-foreground placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                            />
                        </div>
                        {/* Adding a vehicle usually happens via Reception, but can provide a button */}
                        <Link 
                            href="/reception"
                            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
                        >
                            <Plus size={18} /> <span className="hidden sm:inline">إضافة من الاستقبال</span>
                        </Link>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="glass-card p-4 rounded-xl border border-border flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><Car size={20} /></div>
                        <div>
                            <p className="text-muted-foreground text-xs">إجمالي المركبات</p>
                            <p className="text-foreground font-bold text-xl">{vehicles.length}</p>
                        </div>
                     </div>
                </div>

                {/* Main Table */}
                <div className="glass-card rounded-2xl border-border overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-card border-b border-border">
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">المركبة</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">رقم اللوحة (رقم الشاصي)</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">المالك</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">المحرك</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-muted-foreground">جاري تحميل البيانات...</td>
                                    </tr>
                                )}
                                {!loading && filteredVehicles.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-muted-foreground">
                                            لا توجد مركبات تطابق بحثك.
                                        </td>
                                    </tr>
                                )}
                                {!loading && filteredVehicles.map((vehicle) => (
                                    <tr key={vehicle.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-blue-400 border border-border">
                                                    <Car size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground text-base">
                                                        {vehicle.make} {vehicle.model}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Hash size={14} className="text-muted-foreground" /> 
                                                <span className="bg-card border border-border px-2 py-0.5 rounded text-foreground font-mono text-sm shadow-sm">{vehicle.plate_number}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                <User size={14} className="text-muted-foreground" /> {vehicle.clients?.name}
                                            </div>
                                            <div className="text-muted-foreground text-xs mt-1 mr-5">
                                                {vehicle.clients?.phone}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                <Box size={14} className="text-muted-foreground" /> {vehicle.engine_size || 'غير مدرج'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
