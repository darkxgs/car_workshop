"use client";

import { Search } from "lucide-react";

interface FilterBarProps {
    searchPlaceholder?: string;
    onSearch?: (value: string) => void;
    children?: React.ReactNode;
}

export function FilterBar({ searchPlaceholder = "البحث...", onSearch, children }: FilterBarProps) {
    return (
        <div className="glass-card rounded-2xl p-2 mb-6 flex flex-col md:flex-row gap-2 animate-slide-up delay-100">
            <div className="relative flex-1">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-emerald-600" />
                </div>
                <input
                    type="search"
                    placeholder={searchPlaceholder}
                    onChange={(e) => onSearch?.(e.target.value)}
                    className="input-field pr-11 text-sm"
                />
            </div>
            {children && <div className="flex gap-2">{children}</div>}
        </div>
    );
}
