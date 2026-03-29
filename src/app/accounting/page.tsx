"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { 
    Wallet, TrendingUp, TrendingDown, DollarSign, Package, AlertTriangle, 
    Calendar, CheckCircle2, History, ArrowUpRight, ArrowDownRight, Clock
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

type Transaction = {
    id: string;
    report_number: number;
    created_at: string;
    total_price: number;
    status: string;
    clientName: string;
    vehicleDesc: string;
    cost: number;
    profit: number;
};

export default function AccountingPage() {
    const { t } = useLanguage();
    const { employeeRole } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [finance, setFinance] = useState({
        totalRevenue: 0,
        totalCOGS: 0,      // Cost of Goods Sold
        netProfit: 0,
        pendingReceivables: 0
    });
    
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        const fetchAccountingData = async () => {
            try {
                // Fetch reports, their vehicles, clients, and used parts & inventory costs
                const { data: reports, error } = await supabase
                    .from('inspection_reports')
                    .select(`
                        id, 
                        report_number,
                        created_at, 
                        total_price, 
                        status,
                        vehicles ( make, model, clients(name) ),
                        used_parts ( quantity, inventory ( purchase_price ) )
                    `)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                if (!reports) return;

                let revenue = 0;
                let cogs = 0;
                let pending = 0;
                const processedTransactions: Transaction[] = [];

                // Chart aggregation maps (group by date)
                const revByDate: Record<string, number> = {};
                const profitByDate: Record<string, number> = {};

                for (const r of reports) {
                    const price = Number(r.total_price || 0);
                    
                    // Safely calculate cost of parts for this report
                    let reportCost = 0;
                    if (r.used_parts && Array.isArray(r.used_parts)) {
                        for (const up of r.used_parts) {
                            const qty = Number(up.quantity || 0);
                            // handle case where inventory is an object (or potentially an array based on query structure mapping)
                            const invObj: any = up.inventory;
                            const purchasePrice = Number((invObj && invObj.purchase_price) ? invObj.purchase_price : 0);
                            reportCost += (qty * purchasePrice);
                        }
                    }

                    if (r.status === 'تم الانتهاء') {
                        revenue += price;
                        cogs += reportCost;
                        
                        const dateStr = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        revByDate[dateStr] = (revByDate[dateStr] || 0) + price;
                        profitByDate[dateStr] = (profitByDate[dateStr] || 0) + (price - reportCost);

                        processedTransactions.push({
                            id: r.id,
                            report_number: r.report_number,
                            created_at: r.created_at,
                            total_price: price,
                            status: r.status,
                            clientName: (r.vehicles as any)?.clients?.name || 'غير معروف',
                            vehicleDesc: `${(r.vehicles as any)?.make} ${(r.vehicles as any)?.model}`,
                            cost: reportCost,
                            profit: price - reportCost
                        });
                    } else if (r.status === 'قيد العمل') {
                        pending += price;
                    }
                }

                setFinance({
                    totalRevenue: revenue,
                    totalCOGS: cogs,
                    netProfit: revenue - cogs,
                    pendingReceivables: pending
                });

                setTransactions(processedTransactions);

                // Build chart data
                const chartArr = Object.keys(revByDate).map(date => ({
                    name: date,
                    الإيرادات: revByDate[date],
                    'صافي الربح': profitByDate[date]
                })).reverse().slice(-14); // Last 14 active days

                setChartData(chartArr);

            } catch (err) {
                console.error("Error fetching accounting data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAccountingData();
    }, []);

    // Helper: format currency
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US').format(val) + " د.ع";
    };

    if (employeeRole && !['Owner', 'Admin'].includes(employeeRole)) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-white text-center">
                <h2>غير مصرح لك بالدخول لهذه الصفحة</h2>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in pb-24 font-ibm min-h-screen" dir="rtl">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-rose-900/40 shadow-[0_0_20px_rgba(225,29,72,0.15)] flex items-center justify-center relative overflow-hidden">
                        <Wallet size={32} className="text-white drop-shadow-[0_0_8px_rgba(225,29,72,0.5)] relative z-10" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white mb-2">النظام المحاسبي</h1>
                        <p className="text-slate-400">ملخص الأداء المالي وصافي الأرباح للورشة</p>
                    </div>
                </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Net Profit */}
                <div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-rose-900/30 hover:border-emerald-500/50 transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full group-hover:bg-emerald-500/20 transition-colors pointer-events-none" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-sm font-medium mb-1">صافي الأرباح (المنفذة)</p>
                        <h3 className="text-3xl font-bold text-white">{loading ? "..." : formatCurrency(finance.netProfit)}</h3>
                        <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                            الإيرادات مخصوماً منها تكلفة القطع المستهلكة
                        </p>
                    </div>
                </div>

                {/* Total Revenue */}
                <div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-rose-900/30 hover:border-blue-500/50 transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full group-hover:bg-blue-500/20 transition-colors pointer-events-none" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/20">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-sm font-medium mb-1">إجمالي الإيرادات</p>
                        <h3 className="text-3xl font-bold text-white">{loading ? "..." : formatCurrency(finance.totalRevenue)}</h3>
                        <p className="text-xs text-blue-400 mt-2">عائدات فواتير الصيانة المكتملة</p>
                    </div>
                </div>

                {/* Total COGS */}
                <div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-rose-900/30 hover:border-rose-500/50 transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/10 blur-[50px] rounded-full group-hover:bg-rose-500/20 transition-colors pointer-events-none" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/20">
                            <Package size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-sm font-medium mb-1">تكلفة القطع المستخدمة</p>
                        <h3 className="text-3xl font-bold text-white">{loading ? "..." : formatCurrency(finance.totalCOGS)}</h3>
                        <p className="text-xs text-rose-400 mt-2">إجمالي أسعار شراء القطع المستهلكة</p>
                    </div>
                </div>

                {/* Pending Receivables */}
                <div className="glass-card p-6 flex flex-col justify-between rounded-2xl border-rose-900/30 hover:border-amber-500/50 transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-[50px] rounded-full group-hover:bg-amber-500/20 transition-colors pointer-events-none" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center border border-amber-500/20">
                            <Clock size={24} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-sm font-medium mb-1">مبالغ قيد الانتظار</p>
                        <h3 className="text-3xl font-bold text-white">{loading ? "..." : formatCurrency(finance.pendingReceivables)}</h3>
                        <p className="text-xs text-amber-500 mt-2">مبالغ لفواتير قيد العمل (غير محصلة بعد)</p>
                    </div>
                </div>

            </div>

            {/* Income vs Expenses Chart */}
            <div className="glass-card p-6 rounded-2xl border-rose-900/30 bg-[#0a0a0a]/80 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <TrendingUp className="text-emerald-400" size={20} />
                        مؤشر الإيرادات وصافي الأرباح
                    </h3>
                </div>

                {loading ? (
                    <div className="h-[350px] w-full flex items-center justify-center">
                         <span className="text-slate-500">جاري تحميل المؤشرات...</span>
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="h-[350px] w-full flex items-center justify-center">
                         <span className="text-slate-500 font-medium">لا توجد بيانات كافية لعرض المؤشر</span>
                    </div>
                ) : (
                    <div className="h-[350px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#111', borderColor: '#333', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="الإيرادات" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                                <Area type="monotone" dataKey="صافي الربح" stroke="#10b981" fillOpacity={1} fill="url(#colorNet)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Recent Ledger Transactions */}
            <div className="glass-card p-6 rounded-2xl border-rose-900/30 bg-[#0a0a0a]/80 backdrop-blur-xl">
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <History className="text-blue-400" size={20} />
                        أحدث المعاملات المنجزة
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                         <div className="py-12 text-center text-slate-500 font-bold">جاري تحميل المعاملات المنجزة...</div>
                    ) : transactions.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 font-bold">لم يتم تسجيل أي معاملات مكتملة بعد.</div>
                    ) : (
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs text-slate-400 uppercase bg-[#141414] border-y border-slate-800">
                                <tr>
                                    <th className="px-5 py-4 font-bold rounded-tr-lg">رقم الفاتورة</th>
                                    <th className="px-5 py-4 font-bold">التاريخ</th>
                                    <th className="px-5 py-4 font-bold">العميل / المركبة</th>
                                    <th className="px-5 py-4 font-bold">الإيراد</th>
                                    <th className="px-5 py-4 font-bold">تكلفة القطع</th>
                                    <th className="px-5 py-4 font-bold rounded-tl-lg">ربح الفاتورة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {transactions.slice(0, 10).map((t, i) => (
                                    <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-4 text-white font-mono bg-slate-800/20">#{t.report_number}</td>
                                        <td className="px-5 py-4 text-slate-400">
                                            {new Date(t.created_at).toLocaleDateString("ar-SA", { year: 'numeric', month: 'numeric', day: 'numeric'})}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold">{t.clientName}</span>
                                                <span className="text-xs text-slate-500">{t.vehicleDesc}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-blue-400 font-bold font-mono">
                                            {formatCurrency(t.total_price)}
                                        </td>
                                        <td className="px-5 py-4 text-rose-400 font-bold font-mono">
                                            {formatCurrency(t.cost)}
                                        </td>
                                        <td className="px-5 py-4 text-emerald-400 font-bold font-mono bg-emerald-500/5">
                                            <div className="flex items-center gap-1">
                                                {t.profit >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} className="text-rose-500"/>}
                                                {formatCurrency(t.profit)}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

        </div>
    );
}
