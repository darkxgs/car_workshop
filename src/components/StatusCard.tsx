"use client";

import type { ReactNode } from "react";

interface StatusCardProps {
    title: string;
    subtitle: string;
    icon: ReactNode;
    borderColor: string;
}

export function StatusCard({ title, subtitle, icon, borderColor }: StatusCardProps) {
    return (
        <div className={`glass-card rounded-xl p-4 flex items-center gap-4 border-s-4 ${borderColor}`}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(7,25,18,0.8)" }}>
                {icon}
            </div>
            <div>
                <p className="text-foreground font-semibold text-sm">{title}</p>
                <p className="text-emerald-600 text-xs">{subtitle}</p>
            </div>
        </div>
    );
}
