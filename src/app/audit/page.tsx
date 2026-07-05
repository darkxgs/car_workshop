"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { showSuccess, showError } from "@/lib/alerts";
import { withCommas, digitsOnly } from "@/lib/format";
import {
    ClipboardCheck, Loader2, Car, User, Receipt, ChevronDown, ChevronUp,
    CheckCircle2, Wallet, Percent, HandCoins, Plus, Printer,
} from "lucide-react";

// Service key → Arabic label (mirrors the reception/customers service set).
const SERVICE_LABELS: Record<string, string> = {
    engineOil: 'زيت المحرك', oilFilter: 'فلتر زيت المحرك', airFilter: 'فلتر الهواء',
    acFilter: 'فلتر التبريد', brakeFluid: 'زيت المكابح', coolant: 'ماء الراديتر',
    battery: 'البطارية', engineBelts: 'قايش المحرك',
    brakePads: 'دسكات السيارة', sparkPlugs: 'شمعات الاحتراق',
    gearboxOil: 'هايدروليك الكير', gearboxFilter: 'فلتر الكير',
    wipers: 'مساحات زجاج', windshieldFluid: 'سائل غسيل جام',
    battery2: 'البطارية فحص دوري', batteryFilter: 'فلتر البطارية',
    engineFlash: 'فلاش المحرك', engineCeramic: 'سيراميك محرك',
    linerCleaner: 'منظف بطانة (جكجكة)', oilLeakPreventer: 'مانع تسريب زيت',
    smokePreventer: 'مانع دخان', gearboxFlash: 'فلاش كير',
    gearboxCeramic: 'سيراميك كير', gearboxAntiSlip: 'مانع انزلاق كير',
    acCleaner: 'منظف دورة تبريد', injectorCleaner: 'منظف بخاخات',
    fuelSystemCleaner: 'منظف نظام وقود', octaneBooster: 'محسن أوكتان',
    additives: 'معالجات ومحسنات', cleaners: 'منظفات وأساسيات',
    transOil: 'زيت ناقل الحركة', differentialOil: 'زيت الدبل / البكك',
    maintenanceUnits: 'وحدات الصيانة'
};

type Order = any;

const num = (v: any) => parseFloat(String(v ?? "").replace(/[^\d.]/g, "")) || 0;

const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function AuditPage() {
    const { employeeBranchId, employeeRole, loading: authLoading } = useAuth();
    const [selectedDate, setSelectedDate] = useState(getLocalDateString());
    const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
    const [closedOrders, setClosedOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'pending' | 'closed'>('pending');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    // Per-order accounting inputs, keyed by order id.
    const [inputs, setInputs] = useState<Record<string, { discount: string; received: string }>>({});
    const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from('branches').select('id, name');
            if (data) setBranches(data);
        };
        fetchBranches();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            // 1. Fetch pending orders (status = 'تم الانتهاء', order_type !== 'sale', and accounted is not true)
            let qPending = supabase.from('inspection_reports')
                .select(`id, report_number, status, order_type, created_at, completed_at, total_price, odometer_reading, selected_services, branch_id, vehicles(make, model, plate_number, clients(name, phone)), branches(name), receptionist:receptionist_id(name)`)
                .eq('status', 'تم الانتهاء')
                .neq('order_type', 'sale')
                .not('selected_services->0->pricing->>accounted', 'eq', 'true')
                .order('completed_at', { ascending: false });

            const activeBranchId = (employeeBranchId && employeeRole !== 'Owner') ? employeeBranchId : selectedBranchId;
            if (activeBranchId) {
                qPending = qPending.eq('branch_id', activeBranchId);
            }

            // 2. Fetch closed orders for the selected date (status = 'تم الانتهاء', and accountedAt is on the selected date)
            const startUTC = new Date(`${selectedDate}T00:00:00`).toISOString();
            const endUTC = new Date(`${selectedDate}T23:59:59.999`).toISOString();

            let qClosed = supabase.from('inspection_reports')
                .select(`id, report_number, status, order_type, created_at, completed_at, total_price, odometer_reading, selected_services, branch_id, vehicles(make, model, plate_number, clients(name, phone)), branches(name), receptionist:receptionist_id(name)`)
                .eq('status', 'تم الانتهاء')
                .neq('order_type', 'sale')
                .gte('selected_services->0->pricing->>accountedAt', startUTC)
                .lte('selected_services->0->pricing->>accountedAt', endUTC)
                .order('completed_at', { ascending: false });

            if (activeBranchId) {
                qClosed = qClosed.eq('branch_id', activeBranchId);
            }

            const [resPending, resClosed] = await Promise.all([qPending, qClosed]);

            if (resPending.error) throw resPending.error;
            if (resClosed.error) throw resClosed.error;

            setPendingOrders(resPending.data || []);
            setClosedOrders(resClosed.data || []);
        } catch (err: any) {
            console.error("Error fetching orders:", err);
            showError("خطأ", err.message || "تعذر جلب البيانات.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        fetchOrders();

        const channel = supabase.channel('audit_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'inspection_reports' }, () => {
                fetchOrders();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, employeeBranchId, selectedDate, selectedBranchId]);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'print_complete') {
                const el = document.getElementById('print-iframe');
                if (el) {
                    try {
                        document.body.removeChild(el);
                    } catch (err) {
                        console.error("Error removing print iframe:", err);
                    }
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Split into pending (not yet accounted) vs closed (accounted).
    const isAccounted = (o: Order) => {
        if (o.order_type === 'sale') return true;
        const p = (Array.isArray(o.selected_services) ? o.selected_services[0] : o.selected_services)?.pricing;
        return p?.accounted === true;
    };
    
    const list = tab === 'pending' ? pendingOrders : closedOrders;

    // Financial summary for the closed orders (المحاسبة): totals + collected vs discounted.
    const summary = useMemo(() => {
        let grand = 0, discount = 0, received = 0;
        closedOrders.forEach(o => {
            const p = (Array.isArray(o.selected_services) ? o.selected_services[0] : o.selected_services)?.pricing || {};
            grand += num(p.grandTotal ?? o.total_price);
            discount += num(p.discount);
            received += num(p.amountReceived ?? (o.order_type === 'sale' ? o.total_price : 0));
        });
        return { grand, discount, received, net: grand - discount, remaining: grand - discount - received };
    }, [closedOrders]);

    // Build the invoice line-items for an order (original services + services added during work).
    const invoiceLines = (o: Order): { label: string; price: number; added: boolean; note?: string }[] => {
        const payload = Array.isArray(o.selected_services) ? o.selected_services[0] : o.selected_services;
        const lines: { label: string; price: number; added: boolean; note?: string }[] = [];
        const services = payload?.services || {};
        Object.entries(services as Record<string, any>).forEach(([k, v]) => {
            if (!v || v.status === 'جيد' || v.status === 'سليم' || num(v.price) === 0) return;
            lines.push({ label: SERVICE_LABELS[k] || k, price: num(v.price), added: v.addedDuringWork === true });
        });
        (payload?.customServices || []).forEach((c: any) => {
            if (!c?.label && !c?.name || num(c.price) === 0) return;
            lines.push({ label: c.label || c.name, price: num(c.price), added: c.addedDuringWork === true });
        });
        // Extra service entries appended to selected_services (custom services added live).
        (Array.isArray(o.selected_services) ? o.selected_services.slice(1) : []).forEach((s: any) => {
            if (s?.is_paper_v2_format) return;
            if (!s?.name || num(s.price) === 0) return;
            lines.push({ label: s.name, price: num(s.price), added: s.addedDuringWork === true, note: s.details });
        });
        return lines;
    };

    const vehicleOf = (o: Order) => (Array.isArray(o.vehicles) ? o.vehicles[0] : o.vehicles);
    const clientOf = (o: Order) => { const v = vehicleOf(o); return v ? (Array.isArray(v.clients) ? v.clients[0] : v.clients) : null; };
    const pricingOf = (o: Order) => (Array.isArray(o.selected_services) ? o.selected_services[0] : o.selected_services)?.pricing || {};

    const getInput = (o: Order) => {
        const p = pricingOf(o);
        return inputs[o.id] ?? { discount: String(p.discount ?? ""), received: String(p.amountReceived ?? "") };
    };
    const setInput = (id: string, field: 'discount' | 'received', value: string) =>
        setInputs(prev => ({ ...prev, [id]: { ...(prev[id] ?? { discount: "", received: "" }), [field]: value } }));

    const closeAccounting = async (o: Order) => {
        const grand = num(o.total_price) || invoiceLines(o).reduce((s, l) => s + l.price, 0);
        const inp = getInput(o);
        const discount = num(inp.discount);
        const received = inp.received === "" ? (grand - discount) : num(inp.received);
        if (discount > grand) { showError("خطأ", "الخصم أكبر من المجموع الكلي."); return; }
        if (received > (grand - discount)) { showError("خطأ", "المبلغ الواصل أكبر من الصافي المطلوب."); return; }
        const net = grand - discount;
        setSavingId(o.id);
        try {
            const services = [...(Array.isArray(o.selected_services) ? o.selected_services : [o.selected_services])].filter(Boolean);
            if (services.length === 0) services.push({ is_paper_v2_format: true, services: {} });
            services[0] = {
                ...services[0],
                pricing: {
                    ...(services[0]?.pricing || {}),
                    grandTotal: String(grand),
                    discount: String(discount),
                    amountReceived: String(received),
                    accounted: true,
                    accountedAt: o.completed_at || o.created_at || new Date().toISOString(),
                },
            };
            const { error } = await supabase.from('inspection_reports')
                .update({ selected_services: services, total_price: net })
                .eq('id', o.id);
            if (error) throw error;
            showSuccess("تمت المحاسبة", `تم إغلاق الفاتورة #${o.report_number}. الصافي ${net.toLocaleString('en-US')} د.ع.`);
            fetchOrders();
        } catch (err: any) {
            console.error(err);
            showError("خطأ", err.message || "تعذر حفظ المحاسبة.");
        } finally {
            setSavingId(null);
        }
    };

    const printReport = (id: string, mode: 'short' | 'full' = 'short') => {
        const existing = document.getElementById('print-iframe');
        if (existing) {
            try {
                document.body.removeChild(existing);
            } catch (err) {
                console.error(err);
            }
        }

        const iframe = document.createElement('iframe');
        iframe.id = 'print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '1024px';
        iframe.style.height = '768px';
        iframe.style.border = '0';
        iframe.src = `/print/${id}?mode=${mode}`;
        
        document.body.appendChild(iframe);

        // Fallback cleanup
        setTimeout(() => {
            const el = document.getElementById('print-iframe');
            if (el) {
                try {
                    document.body.removeChild(el);
                } catch (err) {
                    console.error(err);
                }
            }
        }, 45000);
    };

    if (authLoading || loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;
    }

    return (
        <div className="p-4 md:p-8 space-y-6 font-ibm" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground mb-1 flex items-center gap-3">
                        <ClipboardCheck className="text-emerald-500" size={30} /> التدقيق والمحاسبة
                    </h1>
                    <p className="text-muted-foreground text-sm">المركبات المنتهية بانتظار التدقيق والمحاسبة، مع تفاصيل الفواتير والمبالغ.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Branch Dropdown */}
                    {branches.length > 0 && (employeeRole === 'Owner' || !employeeBranchId) && (
                        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2">
                            <span className="text-xs font-bold text-muted-foreground">الفرع:</span>
                            <select
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                className="bg-transparent text-sm text-foreground focus:outline-none font-bold cursor-pointer"
                            >
                                <option value="" className="bg-card text-foreground">كل الفروع</option>
                                {branches.map(b => (
                                    <option key={b.id} value={b.id} className="bg-card text-foreground">{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2">
                        <span className="text-xs font-bold text-muted-foreground">تاريخ المحاسبة:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-sm text-foreground focus:outline-none font-bold"
                        />
                    </div>
                </div>
            </div>

            {/* Financial summary (closed orders) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard icon={<Wallet size={18} />} label="المجموع الكلي (المُحاسَب)" value={summary.grand} color="text-blue-400" />
                <SummaryCard icon={<Percent size={18} />} label="إجمالي الخصم" value={summary.discount} color="text-amber-400" />
                <SummaryCard icon={<HandCoins size={18} />} label="إجمالي الواصل" value={summary.received} color="text-emerald-400" />
                <SummaryCard icon={<Receipt size={18} />} label="المتبقي (الذمم)" value={summary.remaining} color="text-rose-400" />
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${tab === 'pending' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                    بانتظار المحاسبة ({pendingOrders.length})
                </button>
                <button onClick={() => setTab('closed')} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${tab === 'closed' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
                    مُحاسَبة ومغلقة ({closedOrders.length})
                </button>
            </div>

            {/* Orders */}
            {list.length === 0 ? (
                <div className="text-center text-muted-foreground py-16 glass-card rounded-2xl">لا توجد فواتير في هذه القائمة.</div>
            ) : (
                <div className="space-y-3">
                    {list.map(o => {
                        const v = vehicleOf(o); const c = clientOf(o);
                        const lines = invoiceLines(o);
                        const grand = num(o.total_price) || lines.reduce((s, l) => s + l.price, 0);
                        const p = pricingOf(o);
                        const inp = getInput(o);
                        const net = grand - num(inp.discount);
                        const remaining = net - (inp.received === "" ? net : num(inp.received));
                        const open = expanded === o.id;
                        const accounted = isAccounted(o);
                        return (
                            <div key={o.id} className="glass-card rounded-2xl border border-border overflow-hidden">
                                {/* Row header */}
                                <div className="p-4 flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-xs font-mono bg-muted px-2 py-1 rounded-lg text-muted-foreground">#{o.report_number}</span>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-[140px] flex-1">
                                        <User size={16} className="text-blue-400 shrink-0" />
                                        <span className="font-bold text-sm truncate">{c?.name || "عميل نقدي"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-[140px] flex-1">
                                        <Car size={16} className="text-rose-400 shrink-0" />
                                        <span className="text-sm text-muted-foreground truncate">{o.order_type === 'sale' ? 'بيع منتج' : `${v?.make || ''} ${v?.model || ''}`}</span>
                                    </div>
                                    <div className="text-left shrink-0">
                                        <div className="text-[10px] text-muted-foreground">المبلغ المستحق</div>
                                        <div className="font-black text-emerald-500">{(accounted ? num(p.grandTotal ?? grand) - num(p.discount) : net).toLocaleString('en-US')} د.ع</div>
                                    </div>
                                    <button onClick={() => setExpanded(open ? null : o.id)} className="px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm font-bold flex items-center gap-1 border border-border">
                                        <Receipt size={15} /> تفاصيل الفاتورة {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                    </button>
                                </div>

                                {/* Expanded invoice details + accounting */}
                                {open && (
                                    <div className="border-t border-border p-4 space-y-4 bg-background/40">
                                        {/* Line items */}
                                        <div className="space-y-1.5">
                                            <h4 className="text-xs font-bold text-muted-foreground mb-2">الخدمات المنفّذة</h4>
                                            {lines.length === 0 && <div className="text-xs text-muted-foreground">لا توجد خدمات مسجّلة.</div>}
                                            {lines.map((l, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/40">
                                                    <span className="flex items-center gap-2">
                                                        {l.label}
                                                        {l.added && <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded px-1.5 py-0.5 flex items-center gap-1"><Plus size={10} /> أُضيفت أثناء العمل</span>}
                                                        {l.note && <span className="text-[10px] text-muted-foreground">({l.note})</span>}
                                                    </span>
                                                    <span className="font-mono text-muted-foreground">{l.price.toLocaleString('en-US')} د.ع</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Accounting */}
                                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">المجموع الكلي</span>
                                                <span className="font-black text-blue-400">{grand.toLocaleString('en-US')} د.ع</span>
                                            </div>
                                            {accounted ? (
                                                <>
                                                    <Row label="الخصم" value={`${num(p.discount).toLocaleString('en-US')} د.ع`} />
                                                    <Row label="الواصل" value={`${num(p.amountReceived).toLocaleString('en-US')} د.ع`} />
                                                    <Row label="الصافي" value={`${(num(p.grandTotal ?? grand) - num(p.discount)).toLocaleString('en-US')} د.ع`} strong />
                                                    <Row label="المتبقي (الذمم)" value={`${(num(p.grandTotal ?? grand) - num(p.discount) - num(p.amountReceived)).toLocaleString('en-US')} د.ع`} />
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/40">
                                                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold"><CheckCircle2 size={16} /> تمت المحاسبة والإغلاق</div>
                                                        <button
                                                            onClick={() => printReport(o.id, 'short')}
                                                            className="px-3.5 py-1.5 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 rounded-xl text-xs font-bold transition-all border border-blue-500/20 flex items-center justify-center gap-1.5"
                                                        >
                                                            <Printer size={13} /> طباعة ورقة العمل
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-xs text-muted-foreground block mb-1">الخصم (د.ع)</label>
                                                            <input inputMode="numeric" dir="ltr" value={withCommas(inp.discount)} onChange={e => setInput(o.id, 'discount', digitsOnly(e.target.value))} placeholder="0" className="w-full bg-muted/50 border border-border rounded-xl p-2.5 text-sm text-right focus:outline-none focus:border-amber-500 font-bold" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-muted-foreground block mb-1">المبلغ الواصل (د.ع)</label>
                                                            <input inputMode="numeric" dir="ltr" value={withCommas(inp.received)} onChange={e => setInput(o.id, 'received', digitsOnly(e.target.value))} placeholder={withCommas(net)} className="w-full bg-muted/50 border border-border rounded-xl p-2.5 text-sm text-right focus:outline-none focus:border-emerald-500 font-bold" />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm pt-1 border-t border-border/60">
                                                        <span className="text-muted-foreground">الصافي بعد الخصم</span>
                                                        <span className="font-bold text-foreground">{net.toLocaleString('en-US')} د.ع</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">المتبقي على الزبون (الذمم)</span>
                                                        <span className={`font-bold ${remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{remaining.toLocaleString('en-US')} د.ع</span>
                                                    </div>
                                                    <button disabled={savingId === o.id} onClick={() => closeAccounting(o)} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                                                        {savingId === o.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} إغلاق ومحاسبة الفاتورة
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div className="glass-card rounded-2xl border border-border p-4">
            <div className={`flex items-center gap-2 mb-1 ${color}`}>{icon}<span className="text-[11px] text-muted-foreground font-bold">{label}</span></div>
            <div className={`text-xl font-black ${color}`}>{value.toLocaleString('en-US')} <span className="text-xs">د.ع</span></div>
        </div>
    );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={strong ? "font-black text-foreground" : "font-mono text-muted-foreground"}>{value}</span>
        </div>
    );
}
