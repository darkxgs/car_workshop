"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Search, ShieldAlert, BadgeCheck, CalendarDays, Edit2, X, Save } from "lucide-react";
import { showError, showSuccess } from "@/lib/alerts";

type WarrantyRecord = {
    id: string; // The inspection_report id
    report_num: string;
    client_name: string;
    vehicle: string;
    expiry_date: string;
    status: 'active' | 'expired' | 'void';
    service_name: string;
};

export default function WarrantyPage() {
    const [records, setRecords] = useState<WarrantyRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal States
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingWarranty, setEditingWarranty] = useState<WarrantyRecord | null>(null);
    const [formStatus, setFormStatus] = useState<'active'|'expired'|'void'>('active');
    const [formDurationMonths, setFormDurationMonths] = useState(12); // default 12 months

    useEffect(() => {
        fetchWarranties();
    }, []);

    const fetchWarranties = async () => {
        setLoading(true);
        // Fetch completed inspection_reports that have a warranty stamp
        const { data } = await supabase
            .from('inspection_reports' as any)
            .select('id, report_number, created_at, status, warranty_expiry_date, warranty_status, vehicles(make, model, clients(name))')
            .not('warranty_status', 'is', null)
            .order('created_at', { ascending: false });

        if (data) {
            const now = new Date().getTime();
            
            const parsedRecords: WarrantyRecord[] = [];
            
            for (const rep of data as any[]) {
                const expiry = rep.warranty_expiry_date || rep.created_at;
                const expiryTime = new Date(expiry).getTime();
                
                // Smart Expiry Detection — only auto-expire if genuinely 'active' and date has passed.
                // Never touch 'void' (manually cancelled) records.
                let currentStatus = rep.warranty_status;
                if (currentStatus === 'active' && now > expiryTime) {
                    currentStatus = 'expired';
                    // Write back to DB so it sticks permanently
                    supabase.from('inspection_reports').update({ warranty_status: 'expired' } as any).eq('id', rep.id).then();
                }

                parsedRecords.push({
                    id: rep.id,
                    report_num: rep.report_number.toString(),
                    client_name: rep.vehicles?.clients?.name || 'غير محدد',
                    vehicle: `${rep.vehicles?.make || ''} ${rep.vehicles?.model || ''}`,
                    expiry_date: expiry,
                    status: currentStatus,
                    service_name: 'صيانة بموجب التقرير'
                });
            }
            setRecords(parsedRecords);
        }
        setLoading(false);
    };

    const openEdit = (rec: WarrantyRecord) => {
        setEditingWarranty(rec);
        setFormStatus(rec.status);
        setFormDurationMonths(12); // reset to default
        setIsEditOpen(true);
    };

    const saveWarrantyStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingWarranty) return;

        // When manually setting to 'active', extend the expiry date by the chosen duration
        // so the auto-expire check doesn't immediately overwrite it.
        const updatePayload: any = { warranty_status: formStatus };
        if (formStatus === 'active') {
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + formDurationMonths);
            updatePayload.warranty_expiry_date = expiryDate.toISOString();
        }

        const { error } = await supabase
            .from('inspection_reports' as any)
            .update(updatePayload)
            .eq('id', editingWarranty.id);

        if (!error) {
            showSuccess('تم الحفظ', 'تم تحديث حالة الضمان بنجاح.');
            setIsEditOpen(false);
            fetchWarranties();
        } else {
            showError('خطأ', 'حدث خطأ أثناء حفظ حالة الضمان!');
        }
    };

    const handleSearch = records.filter(r => 
        r.client_name.includes(searchTerm) || 
        r.report_num.includes(searchTerm) ||
        r.vehicle.includes(searchTerm)
    );

    return (
        <div className="min-h-screen p-6 md:p-8 font-ibm" dir="rtl">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
                            <ShieldCheck className="text-blue-500" size={32} />
                            إدارة الضمانات (Warranties)
                        </h1>
                        <p className="text-muted-foreground">
                            متابعة صلاحية الضمانات، كشف المخالفات التلقائي وإلغاء الضمان.
                        </p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input 
                            type="text" 
                            placeholder="بحث برقم الفاتورة أو العميل..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-4 text-foreground focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 rounded-2xl border-border flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center">
                            <BadgeCheck size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-muted-foreground mb-1">الضمانات السارية الفعالة</p>
                            <span className="text-2xl font-bold font-mono text-foreground">{records.filter(r => r.status === 'active').length}</span>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-2xl border-border flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-muted border border-border text-muted-foreground rounded-xl flex items-center justify-center">
                            <CalendarDays size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-muted-foreground mb-1">ضمانات منتهية الصلاحية</p>
                            <span className="text-2xl font-bold font-mono text-muted-foreground">{records.filter(r => r.status === 'expired').length}</span>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-2xl border-border flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center justify-center">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-muted-foreground mb-1">ضمان ملغى (مخالفة شروط)</p>
                            <span className="text-2xl font-bold font-mono text-rose-500">{records.filter(r => r.status === 'void').length}</span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="glass-card rounded-2xl border-border overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-muted border-b border-border">
                                <tr>
                                    <th className="p-4 text-muted-foreground font-bold">ورقة العمل #</th>
                                    <th className="p-4 text-muted-foreground font-bold">العميل والمركبة</th>
                                    <th className="p-4 text-muted-foreground font-bold">تاريخ الانتهاء المحدد</th>
                                    <th className="p-4 text-muted-foreground font-bold text-center">حالة الضمان</th>
                                    <th className="p-4 text-muted-foreground font-bold text-center">إدارة الحالات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center p-8 text-muted-foreground font-bold">جاري المزامنة مع فواتير الورشة...</td></tr>
                                ) : handleSearch.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center p-12 text-muted-foreground font-bold opacity-60">لا يوجد بيانات ضمان تطابق بحثك حالياً!</td></tr>
                                ) : (
                                    handleSearch.map(rec => (
                                        <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-4 font-mono font-bold text-muted-foreground w-24">#{rec.report_num}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-foreground mb-1">{rec.client_name}</div>
                                                <div className="text-xs text-muted-foreground">{rec.vehicle}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="font-mono text-xs bg-background px-3 py-1 rounded border border-border inline-block" dir="ltr">
                                                    {new Date(rec.expiry_date).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {rec.status === 'active' && <span className="text-[11px] font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full inline-block min-w-[80px]">ساري</span>}
                                                {rec.status === 'expired' && <span className="text-[11px] font-bold px-3 py-1.5 bg-muted text-muted-foreground border border-border rounded-full inline-block min-w-[80px]">منتهي</span>}
                                                {rec.status === 'void' && <span className="text-[11px] font-bold px-3 py-1.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-full inline-block min-w-[80px]">ملغى (مخالفة)</span>}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => openEdit(rec)} className="p-2.5 bg-background border border-border hover:border-blue-500 hover:text-blue-500 text-muted-foreground rounded-xl transition-all shadow-sm" title="تعديل حالة الضمان">
                                                    <Edit2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* Edit Status Modal */}
            {isEditOpen && editingWarranty && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={saveWarrantyStatus} className="bg-card border border-border w-full max-w-sm rounded-[24px] overflow-hidden shadow-2xl relative animate-in zoom-in duration-200">
                        <div className="p-5 border-b border-border bg-muted/30 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-foreground">تعديل حالة الضمان #{editingWarranty.report_num}</h2>
                            <button type="button" onClick={() => setIsEditOpen(false)} className="text-muted-foreground hover:bg-background p-1.5 rounded-lg transition-colors"><X size={18} /></button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="p-4 bg-background border border-border rounded-xl">
                                <p className="text-xs text-muted-foreground mb-1">العميل الحالي:</p>
                                <p className="text-sm font-bold text-foreground">{editingWarranty.client_name}</p>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-muted-foreground block mb-2">تدخل بشري لتغيير حالة الضمان:</label>
                                <select value={formStatus} onChange={e => setFormStatus(e.target.value as any)} className="w-full bg-muted border border-border rounded-xl p-3 text-foreground focus:border-blue-500 font-bold">
                                    <option value="active">🟢 تفعيل (ساري المفعول)</option>
                                    <option value="expired">⚪ إنهاء الصلاحية (منتهي)</option>
                                    <option value="void">🔴 إلغاء فوري (خالف شروط الصيانة)</option>
                                </select>
                            </div>

                            {/* Duration picker — only shown when setting to active */}
                            {formStatus === 'active' && (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                                    <label className="text-sm font-bold text-emerald-600 block mb-3 flex items-center gap-2">
                                        <CalendarDays size={16} /> مدة الضمان (بالأشهر)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={1}
                                            max={36}
                                            value={formDurationMonths}
                                            onChange={e => setFormDurationMonths(Number(e.target.value))}
                                            className="flex-1 accent-emerald-500"
                                        />
                                        <span className="text-2xl font-display font-black text-emerald-500 min-w-[60px] text-center">
                                            {formDurationMonths}m
                                        </span>
                                    </div>
                                    <div className="flex justify-between mt-2">
                                        {[1, 3, 6, 12, 24].map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setFormDurationMonths(m)}
                                                className={`text-xs font-bold px-2 py-1 rounded-lg border transition-colors ${
                                                    formDurationMonths === m
                                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                                        : 'bg-muted border-border text-muted-foreground hover:border-emerald-500'
                                                }`}
                                            >
                                                {m === 1 ? '1 ش' : m === 12 ? 'سنة' : m === 24 ? 'سنتين' : `${m} ش`}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-3">
                                        ينتهي هذا الضمان في: <strong className="text-foreground">{(() => { const d = new Date(); d.setMonth(d.getMonth() + formDurationMonths); return d.toLocaleDateString('ar-EG'); })()}</strong>
                                    </p>
                                </div>
                            )}

                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                             ملاحظة: النظام يُنهي الضمان بشكل تلقائي عند تجاوز الموعد الزمني. التدخل اليدوي مطلوب فقط للإلغاء بسبب مخالفات.
                            </p>
                        </div>

                        <div className="p-4 border-t border-border bg-muted/30 flex gap-3">
                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                                <Save size={18} /> تطبيق التعديل
                            </button>
                            <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 bg-background border border-border hover:bg-muted text-foreground py-3 rounded-xl font-bold transition-colors">
                                إغلاق
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
