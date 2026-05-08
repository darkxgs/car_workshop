"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, User, Phone, Mail, Car, Edit2, ShieldAlert, Trash2, FolderOpen } from "lucide-react";
import Link from "next/link";

type ClientWithVehicles = {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    vehicles: { make: string; model: string; plate_number: string }[];
    created_at: string;
};

export default function CustomersPage() {
    const [clients, setClients] = useState<ClientWithVehicles[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<ClientWithVehicles | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('clients')
            .select(`
                id, name, phone, created_at,
                vehicles (make, model, plate_number)
            `)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setClients(data as any);
        }
        setLoading(false);
    };

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('clients').insert([{ name, phone, email }]);
        if (!error) {
            setIsAddModalOpen(false);
            setName(""); setPhone(""); setEmail("");
            fetchClients();
        } else {
            alert("حدث خطأ أثناء إضافة العميل.");
        }
    };

    const handleEditClick = (client: ClientWithVehicles) => {
        setEditingClient(client);
        setName(client.name);
        setPhone(client.phone);
        setEmail(client.email || "");
        setIsEditModalOpen(true);
    };

    const handleUpdateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingClient) return;

        const { error } = await supabase
            .from('clients')
            .update({ name, phone, email })
            .eq('id', editingClient.id);

        if (!error) {
            setIsEditModalOpen(false);
            setEditingClient(null);
            setName(""); setPhone(""); setEmail("");
            fetchClients();
        } else {
            alert("حدث خطأ أثناء تحديث بيانات العميل.");
        }
    };

    const handleDeleteClient = async (id: string) => {
        if (!confirm("هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع البيانات المرتبطة به.")) return;

        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchClients();
        } else {
            alert("حدث خطأ أثناء حذف العميل.");
        }
    };

    const filteredClients = clients.filter(c => 
        c.name.includes(searchTerm) || 
        c.phone.includes(searchTerm) || 
        (c.vehicles?.some(v => v.plate_number.includes(searchTerm) || v.make.includes(searchTerm)))
    );

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <User className="text-rose-500" size={32} />
                            إدارة العملاء (CRM)
                        </h1>
                        <p className="text-muted-foreground">
                            قاعدة بيانات العملاء وسجل مركباتهم المرتبطة
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input 
                                type="text" 
                                placeholder="ابحث بالاسم، الرقم، أو اللوحة..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-4 text-foreground placeholder-slate-500 focus:outline-none focus:border-rose-500/50"
                            />
                        </div>
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
                        >
                            <Plus size={18} /> <span className="hidden sm:inline">إضافة عميل</span>
                        </button>
                    </div>
                </div>

                {/* Main Table */}
                <div className="glass-card rounded-2xl border-border overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-card border-b border-border">
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">العميل</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">معلومات التواصل</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">المركبات المسجلة</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">تاريخ التسجيل</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap text-left">العمليات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-muted-foreground">جاري تحميل البيانات...</td>
                                    </tr>
                                )}
                                {!loading && filteredClients.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-3">
                                                <ShieldAlert size={48} className="text-slate-700 mx-auto" />
                                                لا يوجد عملاء يطابقون بحثك.
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {!loading && filteredClients.map((client) => (
                                    <tr key={client.id} className="border-b border-border hover:bg-muted/20 transition-colors group">
                                        <td className="p-4 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-rose-400 font-bold text-lg shrink-0">
                                                    {client.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <Link href={`/customers/${client.id}`} className="font-bold text-foreground text-base hover:text-rose-400 transition-colors">
                                                        {client.name}
                                                    </Link>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top space-y-2">
                                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                <Phone size={14} className="text-muted-foreground" /> <span dir="ltr">{client.phone}</span>
                                            </div>
                                            {client.email && (
                                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                    <Mail size={14} className="text-muted-foreground" /> {client.email}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            {client.vehicles && client.vehicles.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {client.vehicles.map((v, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-muted-foreground">
                                                            <Car size={14} className="text-blue-400" />
                                                            <span>{v.make} {v.model}</span>
                                                            <span className="text-[10px] text-muted-foreground font-mono px-1.5 py-0.5 bg-card rounded">{v.plate_number}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs px-2 py-1 bg-card rounded">لا توجد مركبات</span>
                                            )}
                                        </td>
                                        <td className="p-4 align-top text-muted-foreground text-sm">
                                            {new Date(client.created_at).toLocaleDateString('ar-SA')}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/customers/${client.id}`}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors"
                                                    title="عرض الملف الكامل"
                                                >
                                                    <FolderOpen size={14} />
                                                    عرض الملف
                                                </Link>
                                                <button 
                                                    onClick={() => handleEditClick(client)}
                                                    className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClient(client.id)}
                                                    className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors"
                                                    title="حذف"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Add Client Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-xl font-bold text-foreground">إضافة عميل جديد</h2>
                        </div>
                        <form onSubmit={handleAddClient} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">اسم العميل *</label>
                                <input 
                                    type="text" required
                                    value={name} onChange={e => setName(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-rose-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">رقم الهاتف *</label>
                                <input 
                                    type="tel" required dir="ltr"
                                    value={phone} onChange={e => setPhone(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-rose-500 text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">البريد الإلكتروني (اختياري)</label>
                                <input 
                                    type="email" dir="ltr"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-rose-500 text-right"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl font-bold transition-colors">
                                    حفظ
                                </button>
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-muted hover:bg-muted text-foreground py-2.5 rounded-xl font-bold transition-colors">
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit Client Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-border">
                            <h2 className="text-xl font-bold text-foreground">تعديل بيانات العميل</h2>
                        </div>
                        <form onSubmit={handleUpdateClient} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">اسم العميل *</label>
                                <input 
                                    type="text" required
                                    value={name} onChange={e => setName(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-rose-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">رقم الهاتف *</label>
                                <input 
                                    type="tel" required dir="ltr"
                                    value={phone} onChange={e => setPhone(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-rose-500 text-right"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">البريد الإلكتروني (اختياري)</label>
                                <input 
                                    type="email" dir="ltr"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-rose-500 text-right"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl font-bold transition-colors">
                                    تحديث
                                </button>
                                <button type="button" onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditingClient(null);
                                    setName(""); setPhone(""); setEmail("");
                                }} className="flex-1 bg-muted hover:bg-muted text-foreground py-2.5 rounded-xl font-bold transition-colors">
                                    إلغاء
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
