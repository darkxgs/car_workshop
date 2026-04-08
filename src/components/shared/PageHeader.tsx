"use client";

import { Plus } from "lucide-react";

interface PageHeaderProps {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function PageHeader({ title, description, actionLabel, onAction }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 animate-fade-in">
            <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-1">{title}</h1>
                <p className="text-emerald-600 text-sm">{description}</p>
            </div>
            {actionLabel && (
                <button onClick={onAction} className="btn-primary shrink-0">
                    <Plus size={18} />
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
