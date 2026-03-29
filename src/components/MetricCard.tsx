"use client";

import type { ReactNode } from "react";

interface MetricCardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: ReactNode;
    iconBg: string;
    delay?: string;
}

export function MetricCard({ title, value, subtitle, icon, iconBg, delay = "" }: MetricCardProps) {
    return (
        <div className={`metric-card animate-slide-up ${delay}`}>
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-emerald-500/80 text-xs font-display mb-1">{title}</p>
                    <p className="text-2xl font-bold text-white font-display">{value}</p>
                    <p className="text-xs text-emerald-700 mt-1">{subtitle}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}
