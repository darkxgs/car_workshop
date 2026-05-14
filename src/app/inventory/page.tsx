"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Package, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Edit2, Box, Trash2 } from "lucide-react";
import { showConfirm, showError, showSuccess } from "@/lib/alerts";

type InventoryItem = {
    id: string;
    name: string;
    item_code: string | null;
    category: string | null;
    quantity: number;
    min_quantity: number;
    purchase_price: number | null;
    sell_price: number | null;
    updated_at: string;
};

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Stats
    const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, totalValue: 0 });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

    // Form State
    const [formName, setFormName] = useState("");
    const [formSku, setFormSku] = useState("");
    const [formCategory, setFormCategory] = useState("قطع غيار");
    const [formQuantity, setFormQuantity] = useState("10");
    const [formMinQuantity, setFormMinQuantity] = useState("2");
    const [formPurchasePrice, setFormPurchasePrice] = useState("0");
    const [formSellPrice, setFormSellPrice] = useState("0");

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .order('name');

        if (!error && data) {
            setItems(data as any);
            const lowStockCount = data.filter(i => (i.quantity || 0) <= (i.min_quantity || 0)).length;
            const value = data.reduce((sum, item) => sum + ((item.quantity || 0) * (item.purchase_price || 0)), 0);
            
            setStats({
                totalItems: data.length,
                lowStock: lowStockCount,
                totalValue: value
            });
        }
        setLoading(false);
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US').format(val || 0);
    };

    const openModal = (item?: InventoryItem) => {
        if (item) {
            setEditingItem(item);
            setFormName(item.name);
            setFormSku(item.item_code || "");
            setFormCategory(item.category || "قطع غيار");
            setFormQuantity(item.quantity.toString());
            setFormMinQuantity(item.min_quantity.toString());
            setFormPurchasePrice((item.purchase_price || 0).toString());
            setFormSellPrice((item.sell_price || 0).toString());
        } else {
            setEditingItem(null);
            setFormName(""); setFormSku(""); setFormCategory("قطع غيار");
            setFormQuantity("10"); setFormMinQuantity("2"); setFormPurchasePrice("0"); setFormSellPrice("0");
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: formName, item_code: formSku || "SYS-" + Math.floor(Math.random()*10000), category: formCategory,
            quantity: parseInt(formQuantity), min_quantity: parseInt(formMinQuantity),
            purchase_price: parseFloat(formPurchasePrice), sell_price: parseFloat(formSellPrice)
        };

        let error;
        if (editingItem) {
            ({ error } = await supabase.from('inventory').update(payload).eq('id', editingItem.id));
        } else {
            ({ error } = await supabase.from('inventory').insert([payload]));
        }
        
        if (!error) {
            showSuccess("تم الحفظ", "تم تحديث بيانات المخزون بنجاح");
            setIsModalOpen(false);
            fetchInventory();
        } else {
            showError("خطأ", "حدث خطأ أثناء حفظ البيانات");
        }
    };

    const handleDelete = async (id: string) => {
        const isConfirmed = await showConfirm(
            "حذف عنصر",
            "هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.",
            "نعم، احذف",
            true
        );
        if (isConfirmed) {
            const { error } = await supabase.from('inventory').delete().eq('id', id);
            if (!error) {
                showSuccess("تم الحذف", "تم حذف العنصر بنجاح");
                fetchInventory();
            } else {
                showError("خطأ", "حدث خطأ أثناء الحذف");
            }
        }
    };

    const filteredItems = items.filter(item => 
        item.name.includes(searchTerm) || 
        (item.item_code && item.item_code.includes(searchTerm)) ||
        (item.category && item.category.includes(searchTerm))
    );

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <Package className="text-purple-500" size={32} />
                            إدارة المخزون
                        </h1>
                        <p className="text-muted-foreground">
                            مراقبة وتتبع قطع الغيار، الزيوت، والمستهلكات إضافة وحذف
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input 
                                type="text" 
                                placeholder="ابحث باسم القطعة، أو الـ SKU..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-4 text-foreground placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                            />
                        </div>
                        <button onClick={() => openModal()} className="bg-purple-600 hover:bg-purple-500 text-foreground px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 shrink-0">
                            <Plus size={18} /> <span className="hidden sm:inline">صنف جديد</span>
                        </button>
                    </div>
                </div>

                {/* Micro Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-5 rounded-2xl border-border flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20"><Box size={24} /></div>
                        <div>
                            <p className="text-muted-foreground text-sm font-bold mb-1">إجمالي الأصناف</p>
                            <p className="text-2xl font-bold text-foreground">{stats.totalItems}</p>
                        </div>
                    </div>
                    
                    <div className="glass-card p-5 rounded-2xl border-border flex items-center gap-4 group hover:border-rose-500/50 transition-colors">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20"><AlertTriangle size={24} /></div>
                        <div>
                            <p className="text-muted-foreground text-sm font-bold mb-1">يتطلب إعادة طلب (Low Stock)</p>
                            <p className="text-2xl font-bold text-foreground group-hover:text-rose-400 transition-colors">{stats.lowStock}</p>
                        </div>
                    </div>
                    
                    <div className="glass-card p-5 rounded-2xl border-border flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20"><TrendingUp size={24} /></div>
                        <div>
                            <p className="text-muted-foreground text-sm font-bold mb-1">القيمة التقديرية (التكلفة)</p>
                            <p className="text-2xl font-bold text-foreground" dir="ltr">{formatCurrency(stats.totalValue)}</p>
                        </div>
                    </div>
                </div>

                {/* Inventory Table */}
                <div className="glass-card rounded-2xl border-border overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-card border-b border-border">
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">رمز القطعة (SKU)</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap w-1/3">الاسم والفئة</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap text-center">الكمية والمخزون</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">السعر (شراء / بيع)</th>
                                    <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap text-left">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-muted-foreground">جاري تحميل المخزون...</td>
                                    </tr>
                                )}
                                {!loading && filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-muted-foreground">
                                            المخزون فارغ أو لا يوجد قطعة مطابقة لبحثك. اضغط على (صنف جديد) برتقالي فوق للإضافة.
                                        </td>
                                    </tr>
                                )}
                                {!loading && filteredItems.map((item) => {
                                    const isLowStock = item.quantity <= item.min_quantity;
                                    
                                    return (
                                        <tr key={item.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                                            <td className="p-4 align-middle">
                                                <span className="font-mono text-sm bg-background px-2 py-1 rounded border border-border text-muted-foreground">
                                                    {item.item_code || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <p className="font-bold text-foreground">{item.name}</p>
                                                <p className="text-xs text-muted-foreground mt-1">{item.category || 'بدون فئة'}</p>
                                            </td>
                                            <td className="p-4 align-middle text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <span className={`text-xl font-bold font-mono ${isLowStock ? 'text-rose-500' : 'text-foreground'}`}>
                                                        {item.quantity}
                                                    </span>
                                                    {isLowStock ? (
                                                        <span className="text-xs font-bold px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded flex items-center gap-1">
                                                            <TrendingDown size={12} /> منخفض
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded flex items-center gap-1">
                                                            <CheckCircle2 size={12} /> جيد
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-1 uppercase">الحد الأدنى: {item.min_quantity}</p>
                                            </td>
                                            <td className="p-4 align-middle">
                                                <div className="space-y-1 font-mono text-sm">
                                                    <div className="text-muted-foreground flex items-center gap-1"><span className="text-xs text-slate-600">شراء:</span> {formatCurrency(item.purchase_price || 0)}</div>
                                                    <div className="text-emerald-400 font-bold flex items-center gap-1"><span className="text-xs text-emerald-600">بيع:</span> {formatCurrency(item.sell_price || 0)}</div>
                                                </div>
                                            </td>
                                            <td className="p-4 align-middle text-left">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openModal(item)} className="p-2 bg-muted hover:bg-blue-600 hover:text-foreground text-muted-foreground rounded-lg transition-colors">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-2 bg-muted hover:bg-rose-600 hover:text-foreground text-muted-foreground rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold text-foreground">{editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد للبضاعة'}</h2>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">الاسم القطعة <span className="text-rose-500">*</span></label>
                                    <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">كود الـ SKU (اختياري)</label>
                                    <input type="text" value={formSku} onChange={e => setFormSku(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground font-mono focus:outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">الفئة</label>
                                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500 appearance-none">
                                        <option value="قطع غيار">قطع غيار محركات</option>
                                        <option value="زيوت">زيوت وسوائل</option>
                                        <option value="تكييف">تبريد وتكييف</option>
                                        <option value="كهرباء">كهرباء وإلكترونيات</option>
                                        <option value="مستهلكات">مستهلكات (فلاتر/بواجي)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">الكمية الحالية <span className="text-rose-500">*</span></label>
                                    <input type="number" required value={formQuantity} onChange={e => setFormQuantity(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">الحد الأدنى للتنبيه</label>
                                    <input type="number" required value={formMinQuantity} onChange={e => setFormMinQuantity(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">سعر الشراء (التكلفة)</label>
                                    <input type="number" required step="0.01" value={formPurchasePrice} onChange={e => setFormPurchasePrice(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">سعر البيع للعميل <span className="text-rose-500">*</span></label>
                                    <input type="number" required step="0.01" value={formSellPrice} onChange={e => setFormSellPrice(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500 font-bold text-emerald-400" />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-foreground py-2.5 rounded-xl font-bold transition-colors">
                                    حفظ البيانات
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-muted hover:bg-muted text-foreground py-2.5 rounded-xl font-bold transition-colors">
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
