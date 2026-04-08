"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

const data = [
    { name: "عمال بناء", count: 5 },
    { name: "كهربائيين", count: 3 },
    { name: "سباكين", count: 2 },
    { name: "نجارين", count: 4 },
    { name: "حدادين", count: 3 },
    { name: "مهندسين", count: 2 },
];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-muted border border-border rounded-xl p-3 shadow-lg">
                <p className="text-foreground font-medium">{label}</p>
                <p className="text-sm text-amber-400">{payload[0].value} عامل</p>
            </div>
        );
    }
    return null;
};

export function LaborChart() {
    return (
        <div className="chart-container">
            <h3 className="font-display text-lg font-semibold text-foreground mb-6">توزيع العمالة حسب التخصص</h3>
            <div className="w-full h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={{ stroke: "#475569" }} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                            axisLine={{ stroke: "#475569" }}
                            width={70}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill="#fbbf24" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
