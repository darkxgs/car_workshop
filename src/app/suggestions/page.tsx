"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    FileSpreadsheet, Plus, Trash2, Save, Search, X,
    Droplets, Thermometer, Filter, Zap, Battery, Cog, ChevronDown, ChevronUp, Check, Loader2,
    Shield, Wrench, Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import { useAuth } from "@/lib/AuthProvider";

// ─── Default Lists (empty to avoid populating mock data) ───
const DEFAULT_LISTS: Record<string, string[]> = {
    materials: [], // Unified list
    oilBrands: [],
    viscosities: [],
    brakeFluids: [],
    coolants: [],
    oilFilterBrands: [],
    oilFilterCodes: [],
    airFilterBrands: [],
    airFilterCodes: [],
    acFilterBrands: [],
    acFilterCodes: [],
    gearboxFilterBrands: [],
    gearboxFilterCodes: [],
    batteryFilterBrands: [],
    gearboxOils: [],
    engineFlashBrands: [],
    engineCeramicBrands: [],
    linerCleanerBrands: [],
    oilLeakPreventerBrands: [],
    smokePreventerBrands: [],
    gearboxFlashBrands: [],
    gearboxCeramicBrands: [],
    gearboxAntiSlipBrands: [],
    acCleanerBrands: [],
    injectorCleanerBrands: [],
    fuelSystemCleanerBrands: [],
    octaneBoosterBrands: [],
    batteries: [],
    wiperBrands: [],
    wiperSizes: [],
    engineBeltsBrands: [],
    brakePadsBrands: [],
    sparkPlugsBrands: [],
    windshieldFluids: [],
    technicianNames: [],
    supervisorNames: [],
    bayNumbers: []
};

// ─── Visual Groupings ───
const ORIGINAL_GROUPS = [
    {
        id: "engine",
        name: "المحرك والسوائل",
        icon: <Droplets size={18} />,
        categories: [
            { key: "oilBrands", label: "أنواع زيوت المحرك", icon: <Droplets size={16} />, color: "emerald" },
            { key: "viscosities", label: "درجات اللزوجة", icon: <Thermometer size={16} />, color: "blue" },
            { key: "brakeFluids", label: "أنواع زيت الفرامل", icon: <Droplets size={16} />, color: "rose" },
            { key: "coolants", label: "أنواع ماء الراديتر/التبريد", icon: <Thermometer size={16} />, color: "cyan" },
        ]
    },
    {
        id: "filters",
        name: "الفلاتر",
        icon: <Filter size={18} />,
        categories: [
            { key: "oilFilterBrands", label: "ماركات فلاتر زيت المحرك", icon: <Filter size={16} />, color: "amber" },
            { key: "oilFilterCodes", label: "أكواد فلاتر زيت المحرك", icon: <Filter size={16} />, color: "amber" },
            { key: "airFilterBrands", label: "ماركات فلاتر الهواء", icon: <Filter size={16} />, color: "amber" },
            { key: "airFilterCodes", label: "أكواد فلاتر الهواء", icon: <Filter size={16} />, color: "amber" },
            { key: "acFilterBrands", label: "ماركات فلاتر التبريد", icon: <Filter size={16} />, color: "amber" },
            { key: "acFilterCodes", label: "أكواد فلاتر التبريد", icon: <Filter size={16} />, color: "amber" },
            { key: "gearboxFilterBrands", label: "ماركات فلاتر الكير", icon: <Filter size={16} />, color: "amber" },
            { key: "gearboxFilterCodes", label: "أكواد فلاتر الكير", icon: <Filter size={16} />, color: "amber" },
            { key: "batteryFilterBrands", label: "ماركات فلاتر البطارية", icon: <Filter size={16} />, color: "yellow" },
        ]
    },
    {
        id: "gearbox",
        name: "الكير والناقل",
        icon: <Cog size={18} />,
        categories: [
            { key: "gearboxOils", label: "زيوت الكير والهايدروليك", icon: <Cog size={16} />, color: "cyan" },
        ]
    },
    {
        id: "cleaners",
        name: "المنظفات والمضافات",
        icon: <Cog size={18} />,
        categories: [
            { key: "engineFlashBrands", label: "فلاش المحرك", icon: <Cog size={16} />, color: "rose" },
            { key: "engineCeramicBrands", label: "سيراميك المحرك", icon: <Cog size={16} />, color: "rose" },
            { key: "linerCleanerBrands", label: "منظف بطانة (جكجكة)", icon: <Cog size={16} />, color: "rose" },
            { key: "oilLeakPreventerBrands", label: "مانع تسريب زيت", icon: <Cog size={16} />, color: "rose" },
            { key: "smokePreventerBrands", label: "مانع دخان / نقص زيت", icon: <Cog size={16} />, color: "rose" },
            { key: "gearboxFlashBrands", label: "فلاش الكير", icon: <Cog size={16} />, color: "rose" },
            { key: "gearboxCeramicBrands", label: "سيراميك الكير", icon: <Cog size={16} />, color: "rose" },
            { key: "gearboxAntiSlipBrands", label: "مانع انزلاق الكير", icon: <Cog size={16} />, color: "rose" },
            { key: "acCleanerBrands", label: "منظف دورة التبريد والمكيف", icon: <Cog size={16} />, color: "rose" },
            { key: "injectorCleanerBrands", label: "منظف البخاخات", icon: <Cog size={16} />, color: "rose" },
            { key: "fuelSystemCleanerBrands", label: "منظف نظام الوقود", icon: <Cog size={16} />, color: "rose" },
            { key: "octaneBoosterBrands", label: "محسنات الأوكتان", icon: <Cog size={16} />, color: "rose" },
        ]
    },
    {
        id: "essentials",
        name: "الاستهلاكيات والأساسيات",
        icon: <Battery size={18} />,
        categories: [
            { key: "batteries", label: "أنواع البطاريات والسعة", icon: <Battery size={16} />, color: "yellow" },
            { key: "wiperBrands", label: "ماركات المساحات", icon: <Cog size={16} />, color: "blue" },
            { key: "wiperSizes", label: "مقاسات المساحات", icon: <Cog size={16} />, color: "blue" },
            { key: "engineBeltsBrands", label: "قوايش المحرك", icon: <Cog size={16} />, color: "emerald" },
            { key: "brakePadsBrands", label: "دسكات السيارة/الفرامل", icon: <Cog size={16} />, color: "rose" },
            { key: "sparkPlugsBrands", label: "شمعات الاحتراق/البواجي", icon: <Cog size={16} />, color: "purple" },
            { key: "windshieldFluids", label: "سائل غسيل جام", icon: <Cog size={16} />, color: "cyan" },
        ]
    }
];

const STAFF_GROUP = {
    id: "staff",
    name: "طاقم العمل والورشة",
    icon: <Wrench size={18} />,
    categories: [
        { key: "technicianNames", label: "أسماء الفنيين", icon: <Wrench size={16} />, color: "blue" },
        { key: "supervisorNames", label: "أسماء المشرفين", icon: <Shield size={16} />, color: "rose" },
        { key: "bayNumbers", label: "أرقام الخانات", icon: <Activity size={16} />, color: "emerald" },
    ]
};

const UNIFIED_GROUP = {
    id: "unified",
    name: "المواد والقطع",
    icon: <Droplets size={18} />,
    categories: [
        { key: "materials", label: "قائمة المواد والقطع الموحدة", icon: <Droplets size={16} />, color: "emerald" }
    ]
};

const CATEGORY_META = [
    ...ORIGINAL_GROUPS.flatMap(g => g.categories),
    ...UNIFIED_GROUP.categories,
    ...STAFF_GROUP.categories
];

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

interface SuggestionItem {
    name: string;
    price: string;
    serial?: string;
}

const INITIAL_LISTS: Record<string, SuggestionItem[]> = {};
for (const key of Object.keys(DEFAULT_LISTS)) {
    INITIAL_LISTS[key] = DEFAULT_LISTS[key].map(name => ({ name, price: "", serial: "" }));
}

export default function SuggestionsPage() {
    const [lists, setLists] = useState<Record<string, SuggestionItem[]>>(INITIAL_LISTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Suggestion inputs and editing
    const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});
    const [newItemPrices, setNewItemPrices] = useState<Record<string, string>>({});
    const [newItemSerials, setNewItemSerials] = useState<Record<string, string>>({});
    const [editingItem, setEditingItem] = useState<{ categoryKey: string; index: number; name: string; price: string; serial: string } | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    // Branch state parameters
    const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const { employeeBranchId, employeeRole } = useAuth();

    // Fetch branches list
    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from('branches').select('id, name');
            if (data && data.length > 0) {
                setBranches(data);
                setSelectedBranchId(employeeBranchId || data[0].id);
            }
        };
        fetchBranches();
    }, [employeeBranchId]);

    // Fetch suggestion lists from Supabase
    useEffect(() => {
        if (!selectedBranchId) return;

        const fetchSuggestions = async () => {
            setLoading(true);
            try {
                const { data, error } = await (supabase as any)
                    .from('suggestion_lists')
                    .select('key, items')
                    .eq('branch_id', selectedBranchId);

                if (error) throw error;

                // Create a temporary object with default values
                const loadedLists: Record<string, SuggestionItem[]> = {};
                for (const key of Object.keys(DEFAULT_LISTS)) {
                    loadedLists[key] = [];
                }

                if (data && data.length > 0) {
                    data.forEach((row: any) => {
                        if (row.key && Array.isArray(row.items)) {
                            // Ensure each item has name, price, and serial
                            loadedLists[row.key] = row.items.map((item: any) => {
                                if (typeof item === 'object' && item !== null) {
                                    return {
                                        name: item.name || "",
                                        price: item.price || "",
                                        serial: item.serial || ""
                                    };
                                }
                                return {
                                    name: String(item),
                                    price: "",
                                    serial: ""
                                };
                            });
                        }
                    });
                }

                setLists(loadedLists);
            } catch (err) {
                console.error("Error loading suggestion lists from Supabase:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSuggestions();
    }, [selectedBranchId]);

    const activeGroups = useMemo(() => {
        return [
            UNIFIED_GROUP,
            STAFF_GROUP
        ];
    }, [branches, selectedBranchId]);

    const activeCategoryMeta = useMemo(() => {
        return activeGroups.reduce((acc, g) => {
            return [...acc, ...g.categories];
        }, [] as { key: string; label: string; icon: React.ReactNode; color: string }[]);
    }, [activeGroups]);

    // Track active Group ID
    const [activeGroupId, setActiveGroupId] = useState<string>("engine");
    const [expandedCategory, setExpandedCategory] = useState<string | null>("oilBrands");

    // Automatically switch active tab if it's no longer available for this branch
    useEffect(() => {
        const exists = activeGroups.some(g => g.id === activeGroupId);
        if (!exists && activeGroups.length > 0) {
            setActiveGroupId(activeGroups[0].id);
        }
    }, [activeGroups, activeGroupId]);

    const handleAddItem = useCallback((categoryKey: string) => {
        const name = (newItemNames[categoryKey] || "").trim();
        const price = (newItemPrices[categoryKey] || "").trim();
        if (!name) return;
        
        const exists = lists[categoryKey]?.some(item => item.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            showError("موجود مسبقاً", `"${name}" موجود بالفعل في القائمة!`);
            return;
        }

        // Auto-calculate serial number if it's not a staff category
        let serial = "";
        const isStaffCategory = ["technicianNames", "supervisorNames", "bayNumbers"].includes(categoryKey);
        if (!isStaffCategory) {
            const currentItems = lists[categoryKey] || [];
            const serialNums = currentItems
                .map(item => parseInt(item.serial || ""))
                .filter(num => !isNaN(num));
            const maxSerial = serialNums.length > 0 ? Math.max(...serialNums) : 0;
            serial = String(maxSerial + 1);
        }

        setLists(prev => ({
            ...prev,
            [categoryKey]: [...(prev[categoryKey] || []), { name, price, serial }]
        }));
        
        setNewItemNames(prev => ({ ...prev, [categoryKey]: "" }));
        setNewItemPrices(prev => ({ ...prev, [categoryKey]: "" }));
        setNewItemSerials(prev => ({ ...prev, [categoryKey]: "" }));
        setHasChanges(true);
    }, [newItemNames, newItemPrices, lists]);
    const handleRemoveItem = useCallback((categoryKey: string, index: number) => {
        setLists(prev => ({
            ...prev,
            [categoryKey]: prev[categoryKey].filter((_, i) => i !== index)
        }));
        setHasChanges(true);
    }, []);

    const handleSave = useCallback(async () => {
        if (!selectedBranchId) return;
        setSaving(true);
        try {
            // Write each list to Supabase
            const promises = Object.keys(lists).map(async key => {
                const label = CATEGORY_META.find(c => c.key === key)?.label || key;
                return (supabase as any).from("suggestion_lists").upsert({
                    branch_id: selectedBranchId,
                    key,
                    label,
                    items: lists[key],
                    updated_at: new Date().toISOString()
                });
            });

            const results = await Promise.all(promises);
            const error = results.find(r => r.error);
            if (error) throw error.error;

            setHasChanges(false);
            showSuccess("تم الحفظ في قاعدة البيانات ✅", "تم حفظ وتحديث جميع الاقتراحات بنجاح!");
        } catch (err) {
            console.error("Error saving to Supabase:", err);
            showError("خطأ في الحفظ", "تعذر حفظ البيانات في السيرفر. يرجى التحقق من اتصال الشبكة.");
        } finally {
            setSaving(false);
        }
    }, [lists, selectedBranchId]);

    const totalItems = useMemo(() => {
        return Object.values(lists).reduce((sum, arr) => sum + arr.length, 0);
    }, [lists]);

    // Active Group Category Keys
    const activeGroupKeys = useMemo(() => {
        const group = activeGroups.find(g => g.id === activeGroupId);
        return group ? group.categories.map(c => c.key) : [];
    }, [activeGroupId, activeGroups]);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                            <FileSpreadsheet className="text-white" size={24} />
                        </div>
                        إدارة الاقتراحات (قاعدة البيانات)
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        تحكم بـ 33 قائمة للاقتراحات والأسعار التلقائية تظهر في شاشة الاستقبال وأوامر العمل.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {/* Branch Dropdown Select */}
                    {branches.length > 0 && (employeeRole === 'Owner' || employeeRole === 'Admin' || !employeeBranchId) && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">الفرع:</span>
                            <select
                                value={selectedBranchId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (hasChanges) {
                                        if (confirm("لديك تغييرات غير محفوظة، هل أنت متأكد من الانتقال وتجاهل التعديلات؟")) {
                                            setSelectedBranchId(val);
                                        }
                                    } else {
                                        setSelectedBranchId(val);
                                    }
                                }}
                                className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-rose-500/50 cursor-pointer hover:border-border/80 transition-colors"
                            >
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="bg-card border border-border rounded-xl px-4 py-2 text-sm font-bold text-muted-foreground">
                        الإجمالي: <span className="text-foreground">{totalItems}</span> اقتراح
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
                            hasChanges
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20 cursor-pointer"
                                : "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
                        }`}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : hasChanges ? <Save size={16} /> : <Check size={16} />}
                        {saving ? "جاري الحفظ..." : hasChanges ? "حفظ التغييرات في السيرفر" : "محفوظ في السيرفر"}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                    type="text"
                    placeholder="ابحث عن اقتراح معين في جميع القوائم..."
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

            {/* Tabs for Groupings */}
            {!searchQuery && (
                <div className="flex border-b border-border overflow-x-auto no-scrollbar gap-2 pb-1">
                    {activeGroups.map(g => (
                        <button
                            key={g.id}
                            onClick={() => {
                                setActiveGroupId(g.id);
                                if (g.categories.length > 0) {
                                    setExpandedCategory(g.categories[0].key);
                                }
                            }}
                            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${
                                activeGroupId === g.id
                                    ? "border-rose-500 text-rose-500 bg-rose-500/5 font-extrabold"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            }`}
                        >
                            {g.icon}
                            {g.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={36} className="text-rose-500 animate-spin" />
                    <p className="text-muted-foreground text-sm font-bold">جاري تحميل قوائم الاقتراحات من قاعدة البيانات...</p>
                </div>
            )}

            {/* Category Cards */}
            {!loading && (
                <div className="space-y-4">
                    {CATEGORY_META.map(cat => {
                        // If not searching, only show categories in active group
                        if (!searchQuery && !activeGroupKeys.includes(cat.key)) return null;

                        const items = lists[cat.key] || [];
                        const cc = colorClasses[cat.color] || colorClasses.emerald;
                        const isExpanded = expandedCategory === cat.key || searchQuery;
                        
                        const filteredItems = searchQuery
                            ? items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            : items;

                        // If searching and no matches in this list, skip
                        if (searchQuery && filteredItems.length === 0) return null;

                        const isStaffCategory = ["technicianNames", "supervisorNames", "bayNumbers"].includes(cat.key);

                        return (
                            <div key={cat.key} className={`bg-card border ${isExpanded ? cc.border : 'border-border'} rounded-2xl overflow-hidden transition-all shadow-sm`}>
                                {/* Category Header */}
                                <button
                                    onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer"
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
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="text"
                                                placeholder={`أضف عنصر جديد إلى ${cat.label}...`}
                                                value={newItemNames[cat.key] || ""}
                                                onChange={e => setNewItemNames(prev => ({ ...prev, [cat.key]: e.target.value }))}
                                                onKeyDown={e => { if (e.key === "Enter") handleAddItem(cat.key); }}
                                                className={`flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:${cc.border} focus:outline-none transition-colors font-ibm`}
                                            />
                                            {!isStaffCategory && (
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <div className="relative w-full sm:w-[180px]">
                                                        <input
                                                            type="number"
                                                            placeholder="سعر البيع (اختياري)"
                                                            value={newItemPrices[cat.key] || ""}
                                                            onChange={e => setNewItemPrices(prev => ({ ...prev, [cat.key]: e.target.value }))}
                                                            onKeyDown={e => { if (e.key === "Enter") handleAddItem(cat.key); }}
                                                            className={`w-full bg-background border border-border rounded-xl pr-4 pl-12 py-2.5 text-sm text-foreground focus:${cc.border} focus:outline-none transition-colors font-ibm text-left font-mono`}
                                                            dir="ltr"
                                                        />
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">د.ع</span>
                                                    </div>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleAddItem(cat.key)}
                                                className={`px-6 py-2.5 ${cc.bg} ${cc.border} border ${cc.text} font-bold text-sm rounded-xl hover:opacity-80 transition-all flex items-center justify-center gap-2 cursor-pointer`}
                                            >
                                                <Plus size={16} /> إضافة
                                            </button>
                                        </div>

                                        {/* Items Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                            {filteredItems.map((item, idx) => {
                                                const originalIdx = items.findIndex(original => original.name === item.name);
                                                const isEditing = editingItem && editingItem.categoryKey === cat.key && editingItem.index === originalIdx;

                                                if (isEditing) {
                                                    return (
                                                        <div key={`${item.name}-${idx}`} className="flex flex-wrap items-center gap-2 bg-muted/40 border border-border p-2 rounded-xl w-full">
                                                            {!isStaffCategory && editingItem.serial && (
                                                                <span className="shrink-0 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] px-2 py-1 rounded font-bold font-mono">
                                                                    {editingItem.serial}
                                                                </span>
                                                            )}
                                                            <input
                                                                type="text"
                                                                value={editingItem.name}
                                                                onChange={e => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                                                                className="flex-1 min-w-[120px] bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-rose-500 font-ibm"
                                                                placeholder="الاسم"
                                                            />
                                                            {!isStaffCategory && (
                                                                <div className="relative w-[100px]">
                                                                    <input
                                                                        type="number"
                                                                        value={editingItem.price}
                                                                        onChange={e => setEditingItem(prev => prev ? { ...prev, price: e.target.value } : null)}
                                                                        className="w-full bg-background border border-border rounded-lg pr-2 pl-7 py-1.5 text-xs text-foreground focus:outline-none focus:border-rose-500 font-ibm text-left font-mono"
                                                                        placeholder="السعر"
                                                                        dir="ltr"
                                                                    />
                                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">د.ع</span>
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    if (!editingItem.name.trim()) return;
                                                                    setLists(prev => {
                                                                        const updated = [...prev[editingItem.categoryKey]];
                                                                        updated[editingItem.index] = { 
                                                                            name: editingItem.name.trim(), 
                                                                            price: editingItem.price.trim(),
                                                                            serial: (editingItem.serial || "").trim()
                                                                        };
                                                                        return { ...prev, [editingItem.categoryKey]: updated };
                                                                    });
                                                                    setEditingItem(null);
                                                                    setHasChanges(true);
                                                                }}
                                                                className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                                                title="حفظ"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingItem(null)}
                                                                className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg hover:bg-rose-500/20 transition-colors cursor-pointer"
                                                                title="إلغاء"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={`${item.name}-${idx}`}
                                                        className={`group flex items-center justify-between gap-3 px-3 py-2.5 ${cc.bg} border ${cc.border} rounded-xl text-sm font-medium text-foreground transition-all hover:bg-muted/20 hover:shadow-sm`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            {item.serial && !isStaffCategory && (
                                                                <span className="shrink-0 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] px-1.5 py-0.5 rounded font-bold font-mono">
                                                                    {item.serial}
                                                                </span>
                                                            )}
                                                            <span className="truncate font-bold text-foreground/90">{item.name}</span>
                                                            {item.price && !isStaffCategory && (
                                                                <span className="shrink-0 bg-background/80 text-muted-foreground border border-border/50 text-[10px] px-2 py-0.5 rounded-lg font-bold font-mono">
                                                                    {Number(item.price).toLocaleString()} د.ع
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                onClick={() => setEditingItem({
                                                                    categoryKey: cat.key,
                                                                    index: originalIdx,
                                                                    name: item.name,
                                                                    price: item.price,
                                                                    serial: item.serial || ""
                                                                })}
                                                                className="text-blue-500 hover:text-blue-400 p-1 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                                                title="تعديل"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleRemoveItem(cat.key, originalIdx)}
                                                                className="text-rose-500 hover:text-rose-400 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                                                title="حذف"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {filteredItems.length === 0 && (
                                                <p className="text-muted-foreground text-sm py-4 col-span-full w-full text-center">
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
            )}

            {/* Floating Save Button for mobile */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-2xl shadow-2xl shadow-emerald-500/30 text-sm animate-bounce cursor-pointer"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? "جاري الحفظ..." : "حفظ التغييرات في السيرفر"}
                    </button>
                </div>
            )}
        </div>
    );
}
