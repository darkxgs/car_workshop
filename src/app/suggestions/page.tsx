"use client";

import { useState, useEffect, useCallback } from "react";
import {
    FileSpreadsheet, Plus, Trash2, Save, RotateCcw, Search, X,
    Droplets, Thermometer, Filter, Zap, Battery, Cog, ChevronDown, ChevronUp, Check
} from "lucide-react";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";

// ─── Default Lists (used as initial seed) ───
const DEFAULT_LISTS: Record<string, string[]> = {
    oilBrands: [
        "ليكي مولي اخضر", "ليكي مولي رصاصي", "ليكي مولي ديزل", "ليكي مولي ازرق",
        "ليكي مولي دراجات", "ليكي مولي سكوتر", "ستيرلنك", "موبيل 1",
        "كاسترول ماغنتك", "كاسترول ايدج", "كاسترول GTX",
        "ميغوين احمر", "ميغوين اخضر", "ميغوين فيروزي", "ميغيون اصفر", "ميغوين",
        "شل", "شل الترا", "فالفولاين رصاصي", "فالفولاين احمر", "فالفولاين ازرق",
    ],
    viscosities: [
        "0W-20", "0W-30", "0W-40", "5W-20", "5W-30", "5W-40",
        "10W-30", "10W-40", "10W-50", "15W-40", "20W-50",
    ],
    filterBrands: [
        "Mann", "Mahle", "Bosch", "Denso", "Hengst", "WIX", "Fram", "K&N",
        "Sakura", "Purflux", "UFI", "ليكي مولي", "هيونداي اصلي", "تويوتا اصلي", "كيا اصلي",
    ],
    filterCodes: [
        "HU 514 X", "HU 716/2 X", "HU 612/2 X", "OC 21", "OC 47", "OC 983",
        "W 712/95", "W 7015", "W 610/3", "C 25 710/3", "C 30 005", "LX 3778", "CU 2545",
    ],
    batteries: [
        "Varta", "Bosch", "AC Delco", "Optima", "Exide", "GS Yuasa", "Amaron", "هانكوك", "اطلس",
    ],
    cleanersAndAdditives: [
        "ليكي مولي فلاش محرك", "ليكي مولي سيراميك محرك", "ليكي مولي منظف بخاخات",
        "ليكي مولي منظف وقود", "ليكي مولي مانع تسريب زيت", "ليكي مولي مانع دخان",
        "ليكي مولي اوكتان", "ليكي مولي منظف دورة تبريد",
        "ليكي مولي سيراميك كير", "ليكي مولي فلاش كير", "ليكي مولي مانع انزلاق كير",
        "ليكي مولي منظف بطانة", "ليكي مولي واقي رديتر",
        "BG فلاش محرك", "BG منظف بخاخات", "Wurth منظف",
    ],
    gearboxOils: [
        "ليكي مولي ATF", "ليكي مولي CVT", "ليكي مولي DCT", "ليكي مولي Top Tec 1800",
        "ستيرلنك ATF", "موبيل ATF", "كاسترول ATF", "شل ATF", "ZF LifeGuard", "Aisin ATF",
    ],
};

const CATEGORY_META: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
    { key: "oilBrands", label: "أنواع الزيوت", icon: <Droplets size={20} />, color: "emerald" },
    { key: "viscosities", label: "درجات اللزوجة", icon: <Thermometer size={20} />, color: "blue" },
    { key: "filterBrands", label: "ماركات الفلاتر", icon: <Filter size={20} />, color: "amber" },
    { key: "filterCodes", label: "أكواد الفلاتر", icon: <Zap size={20} />, color: "purple" },
    { key: "batteries", label: "البطاريات", icon: <Battery size={20} />, color: "yellow" },
    { key: "cleanersAndAdditives", label: "المنظفات والمضافات", icon: <Cog size={20} />, color: "rose" },
    { key: "gearboxOils", label: "زيوت الكير", icon: <Cog size={20} />, color: "cyan" },
];

const STORAGE_KEY = "workshop_suggestion_lists";

function loadLists(): Record<string, string[]> {
    if (typeof window === "undefined") return DEFAULT_LISTS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Merge with defaults to ensure all categories exist
            const merged: Record<string, string[]> = {};
            for (const key of Object.keys(DEFAULT_LISTS)) {
                merged[key] = parsed[key] || DEFAULT_LISTS[key];
            }
            return merged;
        }
    } catch { }
    return { ...DEFAULT_LISTS };
}

function saveLists(lists: Record<string, string[]>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

// Color utilities
const colorClasses: Record<string, { bg: string; border: string; text: string; badge: string; ring: string }> = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-500", badge: "bg-emerald-500/20 text-emerald-400", ring: "ring-emerald-500/30" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-500", badge: "bg-blue-500/20 text-blue-400", ring: "ring-blue-500/30" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-500", badge: "bg-amber-500/20 text-amber-400", ring: "ring-amber-500/30" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-500", badge: "bg-purple-500/20 text-purple-400", ring: "ring-purple-500/30" },
    yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-500", badge: "bg-yellow-500/20 text-yellow-400", ring: "ring-yellow-500/30" },
    rose: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-500", badge: "bg-rose-500/20 text-rose-400", ring: "ring-rose-500/30" },
    cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-500", badge: "bg-cyan-500/20 text-cyan-400", ring: "ring-cyan-500/30" },
};

export default function SuggestionsPage() {
    const [lists, setLists] = useState<Record<string, string[]>>(DEFAULT_LISTS);
    const [expandedCategory, setExpandedCategory] = useState<string | null>("oilBrands");
    const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        setLists(loadLists());
    }, []);

    const handleAddItem = useCallback((categoryKey: string) => {
        const value = (newItemInputs[categoryKey] || "").trim();
        if (!value) return;
        if (lists[categoryKey]?.includes(value)) {
            showError("موجود مسبقاً", `"${value}" موجود بالفعل في القائمة!`);
            return;
        }
        setLists(prev => ({
            ...prev,
            [categoryKey]: [...(prev[categoryKey] || []), value]
        }));
        setNewItemInputs(prev => ({ ...prev, [categoryKey]: "" }));
        setHasChanges(true);
    }, [newItemInputs, lists]);

    const handleRemoveItem = useCallback((categoryKey: string, index: number) => {
        setLists(prev => ({
            ...prev,
            [categoryKey]: prev[categoryKey].filter((_, i) => i !== index)
        }));
        setHasChanges(true);
    }, []);

    const handleSave = useCallback(() => {
        saveLists(lists);
        setHasChanges(false);
        showSuccess("تم الحفظ ✅", "تم حفظ جميع الاقتراحات بنجاح! ستظهر التغييرات في شاشة الاستقبال.");
    }, [lists]);

    const handleReset = useCallback(async () => {
        const confirmed = await showConfirm(
            "إعادة تعيين؟",
            "هل تريد إرجاع جميع القوائم للقيم الافتراضية؟ سيتم حذف أي تعديلات أجريتها."
        );
        if (confirmed) {
            setLists({ ...DEFAULT_LISTS });
            saveLists(DEFAULT_LISTS);
            setHasChanges(false);
            showSuccess("تم الإعادة", "تم إرجاع جميع القوائم للقيم الافتراضية.");
        }
    }, []);

    const totalItems = Object.values(lists).reduce((sum, arr) => sum + arr.length, 0);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                            <FileSpreadsheet className="text-white" size={24} />
                        </div>
                        إدارة الاقتراحات
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        تحكم بقوائم الاقتراحات التي تظهر في شاشة الاستقبال وأوامر العمل. أضف أو احذف أي عنصر براحتك.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-card border border-border rounded-xl px-4 py-2 text-sm font-bold text-muted-foreground">
                        الإجمالي: <span className="text-foreground">{totalItems}</span> عنصر
                    </div>
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-amber-500/30 transition-all text-sm font-bold"
                    >
                        <RotateCcw size={16} /> إعادة تعيين
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                            hasChanges
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20"
                                : "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                        }`}
                    >
                        {hasChanges ? <Save size={16} /> : <Check size={16} />}
                        {hasChanges ? "حفظ التغييرات" : "محفوظ ✓"}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                    type="text"
                    placeholder="ابحث في جميع الاقتراحات..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-card border border-border rounded-2xl py-3 pr-12 pl-4 text-sm text-foreground focus:border-rose-500/50 focus:outline-none transition-colors font-ibm"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Category Cards */}
            <div className="space-y-4">
                {CATEGORY_META.map(cat => {
                    const items = lists[cat.key] || [];
                    const cc = colorClasses[cat.color] || colorClasses.emerald;
                    const isExpanded = expandedCategory === cat.key;
                    const filteredItems = searchQuery
                        ? items.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
                        : items;

                    // If searching and no matches, skip
                    if (searchQuery && filteredItems.length === 0) return null;

                    return (
                        <div key={cat.key} className={`bg-card border ${isExpanded ? cc.border : 'border-border'} rounded-2xl overflow-hidden transition-all shadow-sm`}>
                            {/* Category Header */}
                            <button
                                onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl ${cc.bg} ${cc.border} border flex items-center justify-center`}>
                                        <span className={cc.text}>{cat.icon}</span>
                                    </div>
                                    <div className="text-right">
                                        <h3 className="font-bold text-foreground text-sm">{cat.label}</h3>
                                        <p className="text-xs text-muted-foreground">{items.length} عنصر</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${cc.badge}`}>
                                        {items.length}
                                    </span>
                                    {isExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                                </div>
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-border p-4 space-y-4">
                                    {/* Add new item */}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder={`أضف عنصر جديد إلى ${cat.label}...`}
                                            value={newItemInputs[cat.key] || ""}
                                            onChange={e => setNewItemInputs(prev => ({ ...prev, [cat.key]: e.target.value }))}
                                            onKeyDown={e => { if (e.key === "Enter") handleAddItem(cat.key); }}
                                            className={`flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:${cc.border} focus:outline-none transition-colors font-ibm`}
                                        />
                                        <button
                                            onClick={() => handleAddItem(cat.key)}
                                            className={`px-5 py-2.5 ${cc.bg} ${cc.border} border ${cc.text} font-bold text-sm rounded-xl hover:opacity-80 transition-all flex items-center gap-2`}
                                        >
                                            <Plus size={16} /> إضافة
                                        </button>
                                    </div>

                                    {/* Items Grid */}
                                    <div className="flex flex-wrap gap-2">
                                        {filteredItems.map((item, idx) => {
                                            const originalIdx = items.indexOf(item);
                                            return (
                                                <div
                                                    key={`${item}-${idx}`}
                                                    className={`group flex items-center gap-2 px-3 py-2 ${cc.bg} border ${cc.border} rounded-xl text-sm font-medium text-foreground transition-all hover:shadow-sm`}
                                                >
                                                    <span>{item}</span>
                                                    <button
                                                        onClick={() => handleRemoveItem(cat.key, originalIdx)}
                                                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-400 transition-all p-0.5 hover:bg-rose-500/10 rounded"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        {filteredItems.length === 0 && (
                                            <p className="text-muted-foreground text-sm py-4 w-full text-center">
                                                {searchQuery ? "لا توجد نتائج مطابقة" : "لا توجد عناصر. أضف عنصراً جديداً أعلاه."}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Floating Save Button for mobile */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-2xl shadow-2xl shadow-emerald-500/30 text-sm animate-bounce"
                    >
                        <Save size={18} /> حفظ التغييرات
                    </button>
                </div>
            )}
        </div>
    );
}
