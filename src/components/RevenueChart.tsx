"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useCurrency } from "@/lib/CurrencyProvider";

interface RevenueChartProps {
    data: {
        name: string;
        revenue: number;
        expenses: number;
        netProfit: number;
    }[];
}

const CustomTooltip = ({ active, payload, label, t, formatCurrency }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: "#071912", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "10px 14px" }}>
                <p className="text-emerald-300 font-display text-sm mb-2">{label}</p>
                {payload.map((entry: any, index: number) => {
                    const labelName = entry.name === "revenue" ? t.charts.revenue : entry.name === "expenses" ? t.charts.expenses : t.charts.netProfitBar;
                    return (
                        <p key={index} className="text-xs" style={{ color: entry.color }}>
                            {labelName}: {formatCurrency(entry.value)}
                        </p>
                    );
                })}
            </div>
        );
    }
    return null;
};

export function RevenueChart({ data }: RevenueChartProps) {
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();

    if (!data || data.length === 0) {
        return (
            <div className="chart-container flex items-center justify-center min-h-[300px]">
                <p className="text-emerald-700 font-display">{t.common.noData}</p>
            </div>
        );
    }

    return (
        <div className="chart-container">
            <h3 className="font-display text-base font-bold text-foreground mb-5">{t.charts.revenueChartTitle}</h3>
            <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.08)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "#10b981", fontSize: 11 }} axisLine={{ stroke: "rgba(16,185,129,0.2)" }} />
                        <YAxis tick={{ fill: "#10b981", fontSize: 11 }} axisLine={{ stroke: "rgba(16,185,129,0.2)" }} tickFormatter={(value) => `${value}`} />
                        <Tooltip content={<CustomTooltip t={t} formatCurrency={formatCurrency} />} cursor={{ fill: "rgba(16,185,129,0.05)" }} />
                        <Legend
                            formatter={(value) => (value === "revenue" ? t.charts.revenue : value === "expenses" ? t.charts.expenses : t.charts.netProfitBar)}
                            wrapperStyle={{ paddingTop: "16px", color: "#6ee7b7", fontSize: "12px" }}
                        />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="revenue" />
                        <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="expenses" />
                        <Bar dataKey="netProfit" fill="#f59e0b" radius={[4, 4, 0, 0]} name="netProfit" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
