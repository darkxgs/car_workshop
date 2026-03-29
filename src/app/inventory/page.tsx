"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { PackageOpen, Plus, Search, Filter, Loader2, Save, X, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

interface InventoryItem {
    id: string;
    item_code: string;
    name: string;
    category: string;
    purchase_price: number;
    sell_price: number;
    quantity: number;
    min_quantity: number;
}

export default function InventoryPage() {
    const { t } = useLanguage();
    const { employeeRole } = useAuth();
    
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const PAGE_SIZE = 12;
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        item_code: "",
        name: "",
        category: "قطع غيار عامة",
        purchase_price: "",
        sell_price: "",
        quantity: "",
        min_quantity: "5"
    });

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset pagination
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch]);

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const from = (page - 1) * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            let query = supabase
                .from('inventory')
                .select('*', { count: 'exact' });

            if (debouncedSearch) {
                query = query.or(`name.ilike.%${debouncedSearch}%,item_code.ilike.%${debouncedSearch}%,category.ilike.%${debouncedSearch}%`);
            }

            const { data, count, error } = await query
                .order('name')
                .range(from, to);

            if (error) throw error;
            setItems(data as InventoryItem[]);
            setTotalPages(count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, [page, debouncedSearch]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase.from('inventory').insert([{
                item_code: formData.item_code,
                name: formData.name,
                category: formData.category,
                purchase_price: parseFloat(formData.purchase_price) || 0,
                sell_price: parseFloat(formData.sell_price) || 0,
                quantity: parseInt(formData.quantity) || 0,
                min_quantity: parseInt(formData.min_quantity) || 5,
                branch_id: null
            }]);

            if (error) throw error;
            setIsModalOpen(false);
            setFormData({ item_code: "", name: "", category: "قطع غيار عامة", purchase_price: "", sell_price: "", quantity: "", min_quantity: "5" });
            fetchInventory();
        } catch (err) {
            console.error(err);
            alert("حدث خطأ أثناء الحفظ");
        } finally {
            setSaving(false);
        }
    };

    // Removed client-side filteredItems completely. We map directly over `items`.

    if (employeeRole === "Receptionist") {
        return (
            <div className="p-8 flex items-center justify-center min-h-[50vh] animate-fade-in" dir="rtl">
                <div className="glass-card p-8 rounded-2xl border-rose-900/40 text-center max-w-md w-full relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/10 blur-[50px] rounded-full pointer-events-none" />
                    <AlertCircle className="mx-auto text-rose-500 mb-4 relative z-10" size={48} />
                    <h2 className="text-2xl font-bold text-white mb-2 relative z-10">غير مصرح لك</h2>
                    <p className="text-slate-400 relative z-10">عذراً، صفحة المخزون والأسعار غير متاحة لحساب الاستقبال.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in pb-24" dir={t.common.dashboard === "لوحة التحكم" ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
                        <PackageOpen className="text-rose-500" size={32} />
                        المخزن والقطع
                    </h1>
                    <p className="text-slate-400">
                        إدارة جرد قطع الغيار والزيوت والأسعار
                    </p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 whitespace-nowrap shadow-[0_0_20px_rgba(225,29,72,0.2)] transition-all border border-rose-500/50"
                >
                    <Plus size={20} />
                    إضافة صنف جديد
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" size={18} />
                    <input 
                        type="text" 
                        placeholder="البحث برقم القطعة أو الاسم..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field w-full"
                        style={{ paddingRight: '3rem' }}
                    />
                </div>
                <button className="flex items-center justify-center gap-2 px-6 py-3 bg-[#111] border border-slate-800 rounded-xl text-slate-300 hover:text-white hover:bg-[#1a1a1a] transition">
                    <Filter size={18} />
                    تصنيف
                </button>
            </div>

            {/* Data Table */}
            <div className="glass-card rounded-2xl overflow-hidden border border-rose-900/20 shadow-xl shadow-black">
                <div className="overflow-x-auto min-h-[400px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-[300px]">
                            <Loader2 className="animate-spin text-rose-500 w-10 h-10" />
                        </div>
                    ) : (
                        <table className="w-full data-table text-right text-sm">
                            <thead>
                                <tr className="bg-[#0a0a0a] border-b border-rose-900/30">
                                    <th className="font-medium text-slate-400">رمز القطعة (Code)</th>
                                    <th className="font-medium text-slate-400">اسم القطعة</th>
                                    <th className="font-medium text-slate-400">التصنيف</th>
                                    <th className="font-medium text-slate-400">سعر الشراء</th>
                                    <th className="font-medium text-slate-400">سعر البيع</th>
                                    <th className="font-medium text-slate-400">المتوفر</th>
                                    <th className="font-medium text-slate-400">الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12 text-slate-500 font-medium border-0">
                                            لا توجد قطع تتطابق مع بحثك في الخادم
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => {
                                        const isLow = item.quantity <= item.min_quantity;
                                        const isZero = item.quantity === 0;
                                        return (
                                            <tr key={item.id} className="hover:bg-white/5 transition-colors border-b border-slate-800/70">
                                                <td className="font-mono text-slate-400">{item.item_code}</td>
                                                <td className="font-bold text-white">{item.name}</td>
                                                <td>
                                                    <span className="px-3 py-1 bg-[#111] rounded-lg text-xs text-slate-300 border border-slate-800">
                                                        {item.category}
                                                    </span>
                                                </td>
                                                <td className="text-slate-400 font-mono" dir="ltr">{item.purchase_price} د.ع</td>
                                                <td className="text-emerald-400 font-bold font-mono" dir="ltr">{item.sell_price} د.ع</td>
                                                <td className={`font-bold text-lg ${isZero ? "text-rose-600" : isLow ? "text-amber-500" : "text-emerald-400"}`}>
                                                    {item.quantity}
                                                </td>
                                                <td>
                                                    {isZero ? (
                                                        <span className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded border border-rose-500/20 text-xs font-bold">
                                                            نفذت الكمية
                                                        </span>
                                                    ) : isLow ? (
                                                        <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20 text-xs font-bold">
                                                            إعادة طلب
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 text-xs font-bold">
                                                            متوفر
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                
                {/* Server-Side Pagination Controls */}
                <div className="p-4 bg-[#0a0a0a] border-t border-rose-900/30 flex items-center justify-between shadow-inner shrink-0 mt-auto">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="px-4 py-2 bg-black border border-slate-800 text-slate-300 rounded-xl hover:bg-[#111] hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-bold shadow-sm"
                    >
                        السابق
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-slate-500 font-bold mb-1">
                            {loading ? <Loader2 className="animate-spin w-4 h-4 inline text-rose-500" /> : 'المخزون المتوفر'}
                        </span>
                        <span className="text-sm text-slate-300 font-bold bg-[#111] px-4 py-1.5 rounded-full border border-slate-800 shadow-inner">
                            صفحة <span className="text-rose-400">{page}</span> من {totalPages}
                        </span>
                    </div>
                    <button 
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= totalPages || loading}
                        className="px-4 py-2 bg-black border border-slate-800 text-slate-300 rounded-xl hover:bg-[#111] hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-bold shadow-sm"
                    >
                        التالي
                    </button>
                </div>
            </div>
            
            {/* Add Item Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleSave} className="bg-black border border-rose-900/40 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(225,29,72,0.15)] overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-800/80 bg-[#0a0a0a] shrink-0">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus className="text-rose-500" /> إضافة صنف جديد
                            </h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors bg-[#111] border border-slate-800 p-1.5 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 overflow-y-auto w-full">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">اسم القطعة</label>
                                <input required type="text" className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">رمز القطعة (Code)</label>
                                <input required type="text" className="input-field" dir="ltr" value={formData.item_code} onChange={e => setFormData({...formData, item_code: e.target.value})} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-300">التصنيف</label>
                                <select className="input-field" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                    <option>قطع غيار عامة</option>
                                    <option>زيوت وسوائل</option>
                                    <option>كهرباء ومحرك</option>
                                    <option>عضلات وفرامل</option>
                                    <option>فلاتر</option>
                                </select>
                            </div>
                            <div className="space-y-2 border-t border-slate-800 pt-4">
                                <label className="text-sm font-medium text-slate-300">سعر الشراء (IQD)</label>
                                <input required type="number" step="1" className="input-field" dir="ltr" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} />
                            </div>
                            <div className="space-y-2 border-t border-slate-800 pt-4">
                                <label className="text-sm font-medium text-slate-300">سعر البيع (IQD)</label>
                                <input required type="number" step="1" className="input-field" dir="ltr" value={formData.sell_price} onChange={e => setFormData({...formData, sell_price: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">الكمية المتوفرة</label>
                                <input required type="number" className="input-field" dir="ltr" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">حد التنبيه (Low Stock) <span className="text-amber-500 text-xs px-1">*(مثال 5)*</span></label>
                                <input required type="number" className="input-field" dir="ltr" value={formData.min_quantity} onChange={e => setFormData({...formData, min_quantity: e.target.value})} />
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800/80 flex justify-end gap-3 bg-[#0a0a0a] shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-xl text-slate-300 hover:bg-[#111] border border-transparent hover:border-slate-800 transition-colors font-medium">إلغاء</button>
                            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-2 shadow-[0_0_15px_rgba(225,29,72,0.2)] disabled:opacity-50">
                                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} حفظ الصنف
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
