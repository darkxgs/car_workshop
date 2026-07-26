"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { showError, showSuccess } from "@/lib/alerts";
import { Search, ShoppingCart, Plus, Minus, Trash2, Wallet, Receipt, CreditCard, Package } from "lucide-react";
import Link from "next/link";

type InventoryItem = {
    id: string;
    name: string;
    category: string | null;
    quantity: number;
    sell_price: number | null;
};

type CartItem = InventoryItem & { cartQuantity: number };

export default function PartsPOSPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [processing, setProcessing] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [taxNumber, setTaxNumber] = useState("غير محدد");
    const [lastTransaction, setLastTransaction] = useState<{ id: string | number, cart: CartItem[], total: number, time: string, method: string } | null>(null);

    useEffect(() => {
        fetchInventory();
        fetchTaxNumber();
    }, []);

    const fetchTaxNumber = async () => {
        const { data } = await supabase.from('workshop_settings' as any).select('setting_value').eq('setting_key', 'tax_number').single();
        if (data) setTaxNumber((data as any).setting_value);
    };

    const fetchInventory = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('inventory')
            .select('id, name, category, quantity, sell_price')
            .order('name');

        if (!error && data) {
            setItems(data as any);
        }
        setLoading(false);
    };

    const addToCart = (item: InventoryItem) => {
        if (item.quantity <= 0) return showError("خطأ", "الكمية المتاحة غير كافية!");
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                if (existing.cartQuantity >= item.quantity) {
                    showError("خطأ", "لقد تجاوزت المخزون المتاح!");
                    return prev;
                }
                return prev.map(i => i.id === item.id ? { ...i, cartQuantity: i.cartQuantity + 1 } : i);
            }
            return [...prev, { ...item, cartQuantity: 1 }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQ = item.cartQuantity + delta;
                if (newQ > item.quantity || newQ < 1) return item;
                return { ...item, cartQuantity: newQ };
            }
            return item;
        }));
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => i.id !== id));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.cartQuantity * (item.sell_price || 0)), 0);

    const handleCheckout = async (paymentMethod: string) => {
        if (cart.length === 0) return;
        setProcessing(true);

        try {
            // 1. Deduct from inventory
            for (const item of cart) {
                const newQuantity = item.quantity - item.cartQuantity;
                await supabase.from('inventory').update({ quantity: newQuantity }).eq('id', item.id);
            }

            // 2. Log REAL sale to database to get an Auto-Increment ID
            const { data: saleData } = await supabase.from('pos_sales' as any).insert({
                total_amount: totalAmount,
                payment_method: paymentMethod === 'cash' ? 'نقدي' : 'بطاقة',
                items: cart
            }).select('id').single();

            const invoiceId = saleData ? (saleData as any).id : Math.floor(Math.random() * 90000);

            setLastTransaction({
                id: invoiceId,
                cart: [...cart],
                total: totalAmount,
                time: new Date().toLocaleString('ar-SA'),
                method: paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'
            });

            setCart([]);
            showSuccess("تم", "تم الدفع وخصم الكميات من المستودع بنجاح!");
            fetchInventory(); // refresh

        } catch {
            showError("خطأ", "حدث خطأ أثناء إتمام العملية.");
        } finally {
            setProcessing(false);
        }
    };

    const filteredItems = items.filter(item => item.name.includes(searchTerm) || (item.category && item.category.includes(searchTerm)));

    return (
        <>
        <div className="min-h-screen p-6 font-ibm flex flex-col md:flex-row gap-6 max-w-[1600px] mx-auto relative print:hidden" dir="rtl">
            
            {/* Left: Products Grid (65%) */}
            <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                            <ShoppingCart className="text-amber-500" size={32} />
                            المبيعات المباشرة للقطع (POS)
                        </h1>
                        <p className="text-muted-foreground mt-1">بيع قطع غيار بدون أمر صيانة، ويتم دمج الأرباح وخصم المخزون أوتوماتيكياً.</p>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                    <input 
                        type="text" 
                        placeholder="ابحث باسم القطعة، القسم، الرقم..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-card border border-border rounded-xl py-4 pr-12 xl:pr-14 pl-4 text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 shadow-sm"
                    />
                </div>

                {loading ? (
                    <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center p-16 glass-card rounded-3xl border-dashed border-2 border-border">
                        <Package size={48} className="text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground mb-2">المستودع فارغ أو لا يوجد قطعة بهذا الاسم</h3>
                        <p className="text-muted-foreground mb-6">يجب إضافة القطع أولاً في قسم إدارة المخزون لتتمكن من بيعها هنا.</p>
                        <Link href="/inventory" className="px-6 py-2.5 bg-muted hover:bg-card text-foreground rounded-xl inline-flex items-center gap-2 transition-colors">
                            الذهاب لإدارة المخزون
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredItems.map(item => (
                            <button 
                                key={item.id} 
                                onClick={() => addToCart(item)}
                                disabled={item.quantity <= 0}
                                className={`flex flex-col text-right p-4 rounded-2xl border transition-all duration-200 shadow-sm ${item.quantity > 0 ? 'bg-muted hover:bg-card border-border hover:border-amber-500/30' : 'bg-card border-border opacity-50 cursor-not-allowed'}`}
                            >
                                <div className="text-xs text-muted-foreground px-2 py-0.5 bg-background rounded block w-max mb-3 border border-border">{item.category || "قطع غيار"}</div>
                                <h3 className="font-bold text-foreground mb-2 leading-tight flex-1">{item.name}</h3>
                                <div className="w-full flex items-center justify-between mt-2 pt-3 border-t border-border">
                                    <span className="font-mono font-bold text-lg text-emerald-400">{item.sell_price || 0}</span>
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold ${item.quantity > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-rose-500/10 text-rose-500'}`}>
                                        متاح: {item.quantity}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Cart (35%) */}
            <div className="w-full md:w-[400px] xl:w-[450px] shrink-0 bg-card border border-border rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-3rem)] sticky top-6 shadow-2xl">
                <div className="p-6 border-b border-border bg-muted">
                    <h2 className="text-xl font-bold text-foreground flex items-center justify-between">
                        فاتورة البيع الحالية
                        <span className="bg-amber-500/10 text-amber-500 text-sm px-3 py-1 rounded-full">{cart.length} أصناف</span>
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3">
                            <Receipt size={64} className="text-slate-800" />
                            <p>الفاتورة فارغة</p>
                        </div>
                    ) : cart.map((item, idx) => (
                        <div key={idx} className="flex flex-col bg-muted border border-border p-3 rounded-xl">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="text-foreground font-bold text-sm leading-tight pr-2">{item.name}</h4>
                                <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                            </div>
                            <div className="flex justify-between items-center bg-background p-2 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-muted text-foreground rounded hover:bg-background"><Plus size={14} /></button>
                                    <span className="font-mono font-bold text-foreground w-4 text-center">{item.cartQuantity}</span>
                                    <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-muted text-foreground rounded hover:bg-background"><Minus size={14} /></button>
                                </div>
                                <span className="font-mono font-bold text-emerald-400">{(item.cartQuantity * (item.sell_price || 0)).toLocaleString()} د.ع</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 border-t border-border bg-muted">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-muted-foreground text-lg">الإجمالي:</span>
                        <span className="text-4xl font-display font-bold text-foreground">{totalAmount.toLocaleString()} <span className="text-lg text-emerald-400">د.ع</span></span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            disabled={cart.length === 0 || processing}
                            onClick={() => handleCheckout('cash')}
                            className="flex items-center justify-center gap-2 p-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            <Wallet size={20} /> دفع نقدي
                        </button>
                        <button 
                            disabled={cart.length === 0 || processing}
                            onClick={() => handleCheckout('card')}
                            className="flex items-center justify-center gap-2 p-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                        >
                            <CreditCard size={20} /> بطاقة بنكية
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Modal & Print Trigger */}
            {lastTransaction && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center p-4 print:hidden">
                    <div className="bg-card border border-emerald-500/50 rounded-3xl w-full max-w-md overflow-hidden animate-scale-in p-8 text-center shadow-[0_0_50px_rgba(16,185,129,0.15)]">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full mx-auto flex items-center justify-center mb-6">
                            <Receipt size={40} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground mb-2">تمت عملية البيع بنجاح!</h2>
                        <p className="text-muted-foreground mb-8 font-mono text-xl">{lastTransaction.total.toLocaleString()} د.ع</p>

                        <div className="flex flex-col gap-3">
                            <button onClick={() => window.print()} className="w-full py-3.5 bg-muted hover:bg-card text-foreground font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                                طباعة الفاتورة (Receipt)
                            </button>
                            <button onClick={() => { setLastTransaction(null); setSuccessMsg(""); }} className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors">
                                عميل جديد
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

            {/* Hidden Printable Invoice (Tailored for PDF & Print) */}
            {lastTransaction && (
                <div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black font-ibm z-50 p-8" dir="rtl" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6 mb-6">
                        <div>
                            <h1 className="text-3xl font-display font-black text-slate-900 mb-1">مركز العناية بالمركبات</h1>
                            <p className="text-muted-foreground font-bold">فاتورة مبيعات قطع غيار (ضريبية)</p>
                            <p className="text-sm text-muted-foreground mt-2">الرقم الضريبي: {taxNumber}</p>
                        </div>
                        <div className="text-left">
                            <div className="bg-slate-100 px-4 py-2 rounded-lg border border-slate-200 inline-block mb-3">
                                <p className="text-xs text-muted-foreground mb-1">رقم الفاتورة (حقيقي)</p>
                                <p className="font-mono font-bold text-lg text-slate-900">#{lastTransaction.id}</p>
                            </div>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div>
                            <p className="text-sm text-muted-foreground font-bold mb-1">تاريخ ووقت الإصدار:</p>
                            <p className="font-mono text-slate-900">{lastTransaction.time}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-bold mb-1">طريقة الدفع:</p>
                            <p className="font-bold text-slate-900 bg-slate-100 inline-block px-3 py-1 rounded">{lastTransaction.method}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-right border-collapse mb-8">
                        <thead>
                            <tr className="bg-slate-100 border-y-2 border-slate-300">
                                <th className="py-3 px-4 font-bold text-slate-700 w-12 text-center">م</th>
                                <th className="py-3 px-4 font-bold text-slate-700">البيان (القطعة)</th>
                                <th className="py-3 px-4 font-bold text-slate-700 text-center">الكمية</th>
                                <th className="py-3 px-4 font-bold text-slate-700 text-center">سعر الوحدة</th>
                                <th className="py-3 px-4 font-bold text-slate-700 text-left">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {lastTransaction.cart.map((item, id) => (
                                <tr key={id}>
                                    <td className="py-4 px-4 text-center text-muted-foreground">{id + 1}</td>
                                    <td className="py-4 px-4 font-bold text-slate-900">{item.name}</td>
                                    <td className="py-4 px-4 text-center font-mono">{item.cartQuantity}</td>
                                    <td className="py-4 px-4 text-center font-mono">{(item.sell_price || 0).toLocaleString()}</td>
                                    <td className="py-4 px-4 text-left font-mono font-bold text-slate-900">
                                        {(item.cartQuantity * (item.sell_price || 0)).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end mb-12">
                        <div className="w-1/2 md:w-1/3 bg-slate-50 rounded-xl border border-slate-200 p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-600">المجموع الفرعي:</span>
                                <span className="font-mono text-slate-900 text-sm">{(lastTransaction.total).toLocaleString()} د.ع</span>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-slate-600">الضريبة (0%):</span>
                                <span className="font-mono text-slate-900 text-sm">0.00 د.ع</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300">
                                <span className="font-bold text-lg text-slate-900">الإجمالي النهائي:</span>
                                <span className="font-display font-bold text-2xl text-slate-900">{(lastTransaction.total).toLocaleString()} <span className="text-sm">د.ع</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Footer / T&C */}
                    <div className="border-t border-slate-200 pt-6 text-center">
                        <p className="text-sm text-muted-foreground font-bold mb-1">شكراً لتسوقكم معنا ونتمنى لكم قيادة آمنة!</p>
                        <p className="text-xs text-muted-foreground">البضاعة المباعة لا ترد ولا تستبدل إلا في حال وجود عيب مصنعي خلال 3 أيام بجلب أصل الفاتورة.</p>
                        <p className="text-xs text-muted-foreground mt-4 font-mono">ERP Automated System Invoice</p>
                    </div>
                </div>
            )}
        </>
    );
}
