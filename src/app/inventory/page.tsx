"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Package, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Edit2, Box, Trash2, History, Layers } from "lucide-react";
import { showConfirm, showError, showSuccess } from "@/lib/alerts";
import { useAuth } from "@/lib/AuthProvider";

type InventoryItem = {
    id: string;
    branch_id: string | null;
    name: string;
    item_code: string | null;
    category: string | null;
    quantity: number;
    min_quantity: number;
    purchase_price: number | null;
    sell_price: number | null;
    created_at: string;
    notes: string | null;
    branches?: { id: string; name: string } | null;
};

import * as XLSX from 'xlsx';

export default function InventoryPage() {
    const { employeeBranchId, employeeRole, employeeName } = useAuth();
    
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [activeTab, setActiveTab] = useState<'inventory' | 'transactions'>('inventory');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    // Branches
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState("");

    // Warehouse Note


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
    const [formNotes, setFormNotes] = useState("");
    const [formBranchId, setFormBranchId] = useState("");

    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from('branches').select('id, name').order('name');
            if (data) setBranches(data);
        };
        fetchBranches();
    }, []);

    useEffect(() => {
        if (employeeBranchId) {
            setSelectedBranchId(employeeBranchId);
        } else if (branches.length > 0 && !selectedBranchId) {
            setSelectedBranchId(branches[0].id);
        }
    }, [employeeBranchId, branches]);

    useEffect(() => {
        if (selectedBranchId) {
            fetchInventory();
            if (activeTab === 'transactions') {
                fetchTransactions();
            }
        }
    }, [selectedBranchId, activeTab]);



    const fetchInventory = async () => {
        if (!selectedBranchId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory')
            .select('*, branches(id, name)')
            .eq('branch_id', selectedBranchId)
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

    const fetchTransactions = async () => {
        if (!selectedBranchId) return;
        setLoadingTransactions(true);
        const { data, error } = await supabase
            .from('inventory_transactions')
            .select('*')
            .eq('branch_id', selectedBranchId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setTransactions(data);
        }
        setLoadingTransactions(false);
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
            setFormNotes(item.notes || "");
            setFormBranchId(item.branch_id || "");
        } else {
            setEditingItem(null);
            setFormName(""); setFormSku(""); setFormCategory("قطع غيار");
            setFormQuantity("10"); setFormMinQuantity("2"); setFormPurchasePrice("0"); setFormSellPrice("0"); setFormNotes("");
            setFormBranchId(selectedBranchId || employeeBranchId || "");
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const targetBranchId = formBranchId || selectedBranchId;
        if (!targetBranchId) {
            showError("خطأ", "يرجى تحديد الفرع المرتبط.");
            return;
        }

        const payload = {
            branch_id: targetBranchId,
            name: formName, 
            item_code: formSku || "SYS-" + Math.floor(Math.random()*100000), 
            category: formCategory,
            quantity: parseInt(formQuantity), 
            min_quantity: parseInt(formMinQuantity),
            purchase_price: parseFloat(formPurchasePrice), 
            sell_price: parseFloat(formSellPrice),
            notes: formNotes || null
        };

        let error;
        let savedItem: any = null;

        if (editingItem) {
            const oldQty = editingItem.quantity;
            const newQty = payload.quantity;
            const diff = newQty - oldQty;

            const { data, error: updateErr } = await supabase
                .from('inventory')
                .update(payload)
                .eq('id', editingItem.id)
                .select();
            
            error = updateErr;
            if (!error && data && data[0]) {
                savedItem = data[0];
                if (diff !== 0) {
                    await supabase.from('inventory_transactions').insert([{
                        branch_id: targetBranchId,
                        inventory_id: editingItem.id,
                        item_code: editingItem.item_code,
                        item_name: editingItem.name,
                        transaction_type: diff > 0 ? 'إضافة كمية' : 'تعديل كمية',
                        quantity_changed: diff,
                        quantity_before: oldQty,
                        quantity_after: newQty,
                        user_name: employeeName || 'مستخدم النظام'
                    }]);
                } else {
                    await supabase.from('inventory_transactions').insert([{
                        branch_id: targetBranchId,
                        inventory_id: editingItem.id,
                        item_code: editingItem.item_code,
                        item_name: editingItem.name,
                        transaction_type: 'تعديل كمية',
                        quantity_changed: 0,
                        quantity_before: oldQty,
                        quantity_after: oldQty,
                        user_name: employeeName || 'مستخدم النظام'
                    }]);
                }
            }
        } else {
            const { data, error: insertErr } = await supabase
                .from('inventory')
                .insert([payload])
                .select();
            
            error = insertErr;
            if (!error && data && data[0]) {
                savedItem = data[0];
                await supabase.from('inventory_transactions').insert([{
                    branch_id: targetBranchId,
                    inventory_id: savedItem.id,
                    item_code: savedItem.item_code,
                    item_name: savedItem.name,
                    transaction_type: 'إنشاء منتج',
                    quantity_changed: savedItem.quantity,
                    quantity_before: 0,
                    quantity_after: savedItem.quantity,
                    user_name: employeeName || 'مستخدم النظام'
                }]);
            }
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
        const confirmed = await showConfirm("تأكيد الحذف", "هل أنت متأكد من حذف هذا المنتج نهائياً؟", "warning");
        if (confirmed) {
            const itemToDelete = items.find(i => i.id === id);
            const { error } = await supabase.from('inventory').delete().eq('id', id);
            if (!error) {
                await supabase.from('inventory_transactions').insert([{
                    branch_id: selectedBranchId,
                    inventory_id: null,
                    item_code: itemToDelete?.item_code || null,
                    item_name: itemToDelete?.name || 'تم حذف منتج',
                    transaction_type: 'حذف منتج',
                    quantity_changed: itemToDelete ? -itemToDelete.quantity : 0,
                    quantity_before: itemToDelete?.quantity || 0,
                    quantity_after: 0,
                    user_name: employeeName || 'مستخدم النظام'
                }]);
                showSuccess("تم الحذف", "تم حذف المنتج بنجاح.");
                fetchInventory();
            } else {
                showError("خطأ", "فشل الحذف");
            }
        }
    };

    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    showError("الملف فارغ", "يرجى رفع ملف يحتوي على بيانات");
                    return;
                }

                // Fetch existing SKUs to avoid duplicates
                const { data: existingItems } = await supabase
                    .from('inventory')
                    .select('item_code')
                    .eq('branch_id', selectedBranchId);
                const existingSkus = new Set(existingItems?.map(i => i.item_code) || []);

                const validItems = [];
                let skippedCount = 0;
                let errorCount = 0;

                for (const row of json as any[]) {
                    const name = row['اسم المادة'] || row['المنتج'] || row['name'];
                    let sku = row['الكود'] || row['SKU'] || row['item_code'];
                    
                    if (!name) {
                        errorCount++;
                        continue; // Invalid row
                    }

                    if (!sku) {
                        sku = `SYS-${Math.floor(Math.random() * 1000000)}`;
                    }

                    if (existingSkus.has(sku)) {
                        skippedCount++;
                        continue; // Duplicate
                    }

                    validItems.push({
                        branch_id: selectedBranchId,
                        name: name,
                        item_code: sku,
                        category: row['التصنيف'] || row['category'] || 'قطع غيار',
                        quantity: parseInt(row['الكمية'] || row['quantity'] || '0'),
                        min_quantity: parseInt(row['الحد الأدنى'] || row['min_quantity'] || '2'),
                        purchase_price: parseFloat(row['سعر الشراء'] || row['purchase_price'] || '0'),
                        sell_price: parseFloat(row['سعر البيع'] || row['sell_price'] || '0'),
                        notes: row['ملاحظات'] || row['notes'] || null
                    });
                    
                    existingSkus.add(sku); // Add to set so we don't insert duplicates within the file itself
                }

                if (validItems.length > 0) {
                    const { error } = await supabase.from('inventory').insert(validItems);
                    if (error) throw error;
                }
                
                showSuccess("اكتمل الرفع", `تم إضافة ${validItems.length} صنف بنجاح. تخطي ${skippedCount} (مكرر)، فشل ${errorCount} (بيانات ناقصة).`);
                fetchInventory();
            } catch (err) {
                console.error(err);
                showError("خطأ", "فشل معالجة ملف الإكسل. تأكد من صحة البيانات والأعمدة.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const filteredItems = items.filter(item => 
        item.name.includes(searchTerm) || 
        (item.item_code && item.item_code.includes(searchTerm)) ||
        (item.category && item.category.includes(searchTerm))
    );

    const isOwnerOrAdmin = employeeRole === 'Owner' || employeeRole === 'Admin';
    const activeBranchName = branches.find(b => b.id === selectedBranchId)?.name || 'غير محدد';
    const lowStockItems = items.filter(i => i.quantity <= i.min_quantity);

    return (
        <div className="min-h-screen p-4 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <Package className="text-purple-500" size={32} />
                            إدارة مخزن الفرع
                        </h1>
                        <p className="text-muted-foreground flex items-center gap-2">
                            مراقبة وتتبع قطع الغيار، الزيوت، والمستهلكات لفرع: 
                            <span className="text-purple-400 font-bold bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20">{activeBranchName}</span>
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        {/* Branch Selector Dropdown */}
                        {isOwnerOrAdmin && (
                            <div className="w-48">
                                <select 
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                    className="bg-card border border-border rounded-xl py-2.5 px-4 w-full text-foreground text-sm focus:outline-none focus:border-purple-500"
                                >
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        )}
                        {/* Search Input */}
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <input 
                                type="text" 
                                placeholder="ابحث باسم القطعة، أو الـ SKU..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-4 text-foreground placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                            />
                        </div>
                        
                        {/* Excel Upload */}
                        <div>
                            <input 
                                type="file" 
                                accept=".xlsx, .xls" 
                                id="excel-upload" 
                                className="hidden" 
                                onChange={handleExcelUpload} 
                            />
                            <label htmlFor="excel-upload" className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shrink-0 border border-emerald-500/20 cursor-pointer">
                                <Layers size={18} /> <span>رفع إكسل</span>
                            </label>
                        </div>

                        <button onClick={() => openModal()} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold transition-colors flex items-center gap-2 shrink-0 shadow-lg shadow-purple-600/20">
                            <Plus size={18} /> <span>إضافة مادة جديدة</span>
                        </button>
                    </div>
                </div>

                {/* Low Stock Warning Alert */}
                {lowStockItems.length > 0 && activeTab === 'inventory' && (
                    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 p-4 rounded-2xl flex items-start gap-3 animate-fade-in shadow-[0_0_15px_rgba(244,63,94,0.05)]">
                        <AlertTriangle className="shrink-0 mt-0.5 text-rose-500 animate-pulse" />
                        <div>
                            <h4 className="font-bold text-sm">⚠️ تحذير: هناك أصناف منخفضة المخزون!</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                                المنتجات التالية وصلت أو انخفضت عن الحد الأدنى: {' '}
                                <span className="font-bold text-rose-400">
                                    {lowStockItems.map(i => `${i.name} (${i.quantity} عبوة)`).join('، ')}
                                </span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-border/40 gap-6">
                    <button 
                        onClick={() => setActiveTab('inventory')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'inventory' ? 'border-purple-500 text-purple-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <Layers size={16} /> قائمة المخزون الحالي
                    </button>
                    <button 
                        onClick={() => setActiveTab('transactions')}
                        className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'transactions' ? 'border-purple-500 text-purple-400 font-bold' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        <History size={16} /> سجل حركات المخزن (Logs)
                    </button>
                </div>

                {activeTab === 'inventory' ? (
                    <>


                        {/* Micro Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
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
                                    <p className="text-2xl font-bold text-foreground" dir="ltr">{formatCurrency(stats.totalValue)} IQD</p>
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
                                            <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap">الفرع المرتبط</th>
                                            <th className="p-4 text-muted-foreground font-bold text-sm whitespace-nowrap text-left">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading && (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-muted-foreground">جاري تحميل المخزون...</td>
                                            </tr>
                                        )}
                                        {!loading && filteredItems.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-muted-foreground">
                                                    المخزون فارغ أو لا يوجد قطعة مطابقة لبحثك. اضغط على (إضافة مادة جديدة) فوق للإضافة.
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
                                                            <span className={`text-xl font-bold font-mono ${isLowStock ? 'text-rose-500 animate-pulse' : 'text-foreground'}`}>
                                                                {item.quantity}
                                                            </span>
                                                            {isLowStock ? (
                                                                <span className="text-xs font-bold px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded flex items-center gap-1">
                                                                    <TrendingDown size={12} /> منخفض (تحذير)
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
                                                    <td className="p-4 align-middle">
                                                        <span className="font-bold text-xs bg-muted px-2.5 py-1 rounded-md border border-border">
                                                            {item.branches?.name || 'غير محدد'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 align-middle text-left">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => openModal(item)} className="p-2 bg-muted hover:bg-blue-600 hover:text-white text-muted-foreground rounded-lg transition-colors border border-border">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button onClick={() => handleDelete(item.id)} className="p-2 bg-muted hover:bg-rose-600 hover:text-white text-muted-foreground rounded-lg transition-colors border border-border">
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
                    </>
                ) : (
                    /* Transactions Tab */
                    <div className="glass-card rounded-2xl border-border overflow-hidden">
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-right border-collapse text-sm">
                                <thead>
                                    <tr className="bg-card border-b border-border">
                                        <th className="p-4 text-muted-foreground font-bold whitespace-nowrap">التاريخ والوقت</th>
                                        <th className="p-4 text-muted-foreground font-bold whitespace-nowrap">نوع الحركة</th>
                                        <th className="p-4 text-muted-foreground font-bold whitespace-nowrap">المادة (المنتج)</th>
                                        <th className="p-4 text-muted-foreground font-bold whitespace-nowrap text-center">الكمية المعدلة</th>
                                        <th className="p-4 text-muted-foreground font-bold whitespace-nowrap text-center">الرصيد (قبل ← بعد)</th>
                                        <th className="p-4 text-muted-foreground font-bold whitespace-nowrap">المسؤول عن الحركة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingTransactions ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-muted-foreground">جاري تحميل حركات المخزن...</td>
                                        </tr>
                                    ) : transactions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-muted-foreground">لا توجد حركات مسجلة لهذا الفرع.</td>
                                        </tr>
                                    ) : (
                                        transactions.map((tx) => {
                                            const isPositive = tx.quantity_changed > 0;
                                            const isNegative = tx.quantity_changed < 0;
                                            return (
                                                <tr key={tx.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                                                    <td className="p-4 align-middle text-muted-foreground font-mono text-xs">
                                                        {new Date(tx.created_at).toLocaleString('ar-IQ')}
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                                                            tx.transaction_type === 'إنشاء منتج' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            tx.transaction_type === 'إضافة كمية' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            tx.transaction_type === 'صرف كمية' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                            tx.transaction_type === 'حذف منتج' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                            'bg-muted text-muted-foreground border-border'
                                                        }`}>
                                                            {tx.transaction_type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 align-middle">
                                                        <p className="font-bold text-foreground">{tx.item_name}</p>
                                                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{tx.item_code}</p>
                                                    </td>
                                                    <td className={`p-4 align-middle text-center font-bold font-mono ${isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-muted-foreground'}`}>
                                                        {isPositive ? `+${tx.quantity_changed}` : tx.quantity_changed}
                                                    </td>
                                                    <td className="p-4 align-middle text-center font-mono">
                                                        <span className="text-muted-foreground">{tx.quantity_before}</span>
                                                        <span className="mx-2 text-slate-600">←</span>
                                                        <span className="text-foreground font-bold">{tx.quantity_after}</span>
                                                    </td>
                                                    <td className="p-4 align-middle text-foreground font-bold">
                                                        {tx.user_name || 'غير محدد'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
                            <h2 className="text-xl font-bold text-foreground">{editingItem ? 'تعديل الصنف' : 'إضافة صنف جديد للمخزن'}</h2>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">اسم المادة / المنتج <span className="text-rose-500">*</span></label>
                                    <input type="text" required value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">كود المادة (SKU)</label>
                                    <input type="text" value={formSku} onChange={e => setFormSku(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground font-mono focus:outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">التصنيف</label>
                                    <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500 appearance-none">
                                        <option value="قطع غيار">قطع غيار</option>
                                        <option value="زيوت">زيوت</option>
                                        <option value="تكييف">منظفات ومحسنات</option>
                                        <option value="كهرباء">كهرباء وبطاريات</option>
                                        <option value="مستهلكات">مستهلكات وفلاتر</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">الكمية الحالية <span className="text-rose-500">*</span></label>
                                    <input type="number" required value={formQuantity} onChange={e => setFormQuantity(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">الحد الأدنى للمخزون (تحذير)</label>
                                    <input type="number" required value={formMinQuantity} onChange={e => setFormMinQuantity(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">سعر الشراء (التكلفة)</label>
                                    <input type="number" required value={formPurchasePrice} onChange={e => setFormPurchasePrice(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">سعر البيع للعميل <span className="text-rose-500">*</span></label>
                                    <input type="number" required value={formSellPrice} onChange={e => setFormSellPrice(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500 font-bold text-emerald-400" />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">ملاحظات للمنتج</label>
                                    <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500" />
                                </div>
                                
                                {/* Branch Association in Form */}
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">الفرع المرتبط بالمادة <span className="text-rose-500">*</span></label>
                                    <select 
                                        value={formBranchId} 
                                        onChange={e => setFormBranchId(e.target.value)} 
                                        required 
                                        disabled={!!employeeBranchId && employeeRole !== 'Owner' && employeeRole !== 'Admin'}
                                        className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-purple-500"
                                    >
                                        <option value="">اختر الفرع...</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-border mt-6">
                                <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-xl font-bold transition-colors shadow-lg shadow-purple-600/20">
                                    حفظ البيانات
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-muted border border-border hover:bg-slate-200 dark:hover:bg-slate-800 text-foreground py-2.5 rounded-xl font-bold transition-colors">
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
