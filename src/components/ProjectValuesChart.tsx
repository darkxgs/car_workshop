"use client";

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from "recharts";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useCurrency } from "@/lib/CurrencyProvider";

interface ProjectValuesChartProps {
    data: {
        name: string;
        budget: number;
    }[];
}

const CustomTooltip = ({ active, payload, label, t, formatCurrency }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: "#071912", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", padding: "10px 14px" }}>
                <p className="text-emerald-300 font-display text-sm mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-xs" style={{ color: entry.color }}>
                        {t.projects.budget}: {formatCurrency(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function ProjectValuesChart({ data }: ProjectValuesChartProps) {
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
            <h3 className="font-display text-base font-bold text-white mb-5">{t.charts.projectValuesTitle}</h3>
            <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.08)" horizontal={false} />
                        <XAxis type="number" tick={{ fill: "#10b981", fontSize: 11 }} axisLine={{ stroke: "rgba(16,185,129,0.2)" }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "#10b981", fontSize: 11 }} axisLine={{ stroke: "rgba(16,185,129,0.2)" }} width={100} />
                        <Tooltip content={<CustomTooltip t={t} formatCurrency={formatCurrency} />} cursor={{ fill: "rgba(16,185,129,0.05)" }} />
                        <Bar dataKey="budget" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
