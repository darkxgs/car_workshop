"use client";

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useCurrency } from "@/lib/CurrencyProvider";

interface ProfitTrendChartProps {
    data: {
        name: string;
        netProfit: number;
    }[];
}

const CustomTooltip = ({ active, payload, label, t, formatCurrency }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: "#071912", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "10px 14px" }}>
                <p className="text-emerald-300 font-display text-sm mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-xs" style={{ color: entry.color }}>
                        {t.charts.netProfitBar}: {formatCurrency(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function ProfitTrendChart({ data }: ProfitTrendChartProps) {
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
        <div className="chart-container mt-6">
            <h3 className="font-display text-base font-bold text-foreground mb-5">{t.charts.profitTrendTitle}</h3>
            <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.08)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "#10b981", fontSize: 11 }} axisLine={{ stroke: "rgba(16,185,129,0.2)" }} />
                        <YAxis tick={{ fill: "#10b981", fontSize: 11 }} axisLine={{ stroke: "rgba(16,185,129,0.2)" }} />
                        <Tooltip content={<CustomTooltip t={t} formatCurrency={formatCurrency} />} cursor={{ stroke: "rgba(16,185,129,0.2)", strokeWidth: 1 }} />
                        <Line type="monotone" dataKey="netProfit" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#071912" }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
