"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    FileSpreadsheet, Plus, Trash2, Save, RotateCcw, Search, X,
    Droplets, Thermometer, Filter, Zap, Battery, Cog, ChevronDown, ChevronUp, Check, Loader2,
    Shield, Wrench, Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError, showConfirm } from "@/lib/alerts";
import { useAuth } from "@/lib/AuthProvider";

// ─── Default Lists (used as initial seed / fallback) ───
const DEFAULT_LISTS: Record<string, string[]> = {
    oilBrands: [
        "لكوي مولي اخضر", "لكوي مولي ازرق", "لكوي مولي احمر", "لكوي مولي بنفسجي",
        "لكوي مولي رصاصي", "لكوي مولي سمائي", "لكوي مولي توب تك", "لكوي مولي دراجات",
        "لكوي مولي سكوتر", "فالفولاين احمر", "فالفولاين ازرق", "فالفولاين رصاصي",
        "فالفولاين رصاصي بريميوم", "فالفولاين ديزل", "فالفولاين دراجات", "فالفولاين رصاصي دراجات",
        "كاسترول ايدج", "كاسترول ايدج DX1", "كاسترول ماجناتيك", "كاسترول ماجناتيك DX",
        "كاسترول CRB", "كاسترول GTX", "كاسترول ديزل", "ميغوين احمر", "ميغوين اخضر",
        "ميغوين ازرق", "ميغوين اصفر", "ميغوين جوزي", "ميغوين فيروزي", "ميغوين زيوت محركات",
        "ميغوين سكوتر", "شل ULTRA", "شل ULTRA X", "شل HX5", "شل HX6", "شل HX7",
        "شل HX8", "شل R4 X", "ستيرلنك", "ستيرلنك دراجات", "موتل 8100", "موتل 6100",
        "موتل 4100", "موتل محركات هايبرد", "موتل دراجات", "موبيل 1 سبيشل", "موبيل 1 سوبر 2000",
        "موبيل 1 سوبر 3000", "موبيل 1 ديزل", "موبيل 1 زيوت محركات", "مانول زيوت محركات",
        "مانول دراجات", "هاناتا", "امزويل"
    ],
    viscosities: [
        "0W-20", "0W-30", "0W-40", "5W-20", "5W-30", "5W-40",
        "10W-30", "10W-40", "10W-50", "15W-40", "20W-50"
    ],
    brakeFluids: ["Ate DOT 4", "Bosch DOT 4", "ليكي مولي DOT 4", "ليكي مولي DOT 5.1", "شل DOT 4"],
    coolants: ["ليكي مولي احمر", "ليكي مولي اخضر", "تويوتا اصلي احمر", "ميتسوبيشي اخضر", "كاسترول جاهز"],
    oilFilterBrands: ["Mann", "Mahle", "Bosch", "Hengst", "هيونداي اصلي", "تويوتا اصلي", "كيا اصلي"],
    oilFilterCodes: ["HU 514 X", "HU 716/2 X", "HU 612/2 X", "OC 21", "OC 47", "W 712/95"],
    airFilterBrands: ["Mann", "Mahle", "Bosch", "Sakura", "Purflux", "هيونداي اصلي", "تويوتا اصلي"],
    airFilterCodes: ["C 25 710/3", "C 30 005", "LX 3778"],
    acFilterBrands: ["Mann", "Mahle", "Bosch", "Hengst", "Sakura", "اصلي"],
    acFilterCodes: ["CU 2545"],
    gearboxFilterBrands: ["ZF", "Mann", "Mahle", "Aisin", "اصلي"],
    gearboxFilterCodes: ["OC 983"],
    batteryFilterBrands: ["اصلي", "كوري", "ياباني"],
    gearboxOils: [
        "ليكي مولي ATF", "ليكي مولي CVT", "ليكي مولي DCT", "ليكي مولي Top Tec 1800",
        "ستيرلنك ATF", "موبيل ATF", "كاسترول ATF", "شل ATF", "ZF LifeGuard", "Aisin ATF"
    ],
    engineFlashBrands: ["ليكي مولي فلاش محرك", "BG فلاش محرك"],
    engineCeramicBrands: ["ليكي مولي سيراميك محرك"],
    linerCleanerBrands: ["ليكي مولي منظف بطانة"],
    oilLeakPreventerBrands: ["ليكي مولي مانع تسريب زيت"],
    smokePreventerBrands: ["ليكي مولي مانع دخان"],
    gearboxFlashBrands: ["ليكي مولي فلاش كير"],
    gearboxCeramicBrands: ["ليكي مولي سيراميك كير"],
    gearboxAntiSlipBrands: ["ليكي مولي مانع انزلاق كير"],
    acCleanerBrands: ["ليكي مولي منظف دورة تبريد", "ليكي مولي واقي رديتر"],
    injectorCleanerBrands: ["ليكي مولي منظف بخاخات", "BG منظف بخاخات"],
    fuelSystemCleanerBrands: ["ليكي مولي منظف وقود"],
    octaneBoosterBrands: ["ليكي مولي اوكتان"],
    batteries: ["Varta", "Bosch", "AC Delco", "Optima", "Exide", "GS Yuasa", "Amaron", "هانكوك", "اطلس"],
    wiperBrands: ["Bosch", "Denso", "Michelin", "اصلي"],
    wiperSizes: ["14 Inch", "16 Inch", "18 Inch", "20 Inch", "22 Inch", "24 Inch", "26 Inch", "28 Inch"],
    engineBeltsBrands: ["Gates", "Contitech", "Dongil", "اصلي"],
    brakePadsBrands: ["Brembo", "Ate", "Bosch", "Sangsin", "اصلي"],
    sparkPlugsBrands: ["NGK Laser", "Denso Iridium", "Bosch Double Platinum", "اصلي"],
    windshieldFluids: ["ليكي مولي مركز", "سائل رغوي جاهز", "ماء مقطر"],
    technicianNames: ["أحمد", "حيدر", "مصطفى", "علي", "سجاد", "كرار"],
    supervisorNames: ["محمد", "حسن", "عمر", "جعفر"],
    bayNumbers: ["الخانة 1", "الخانة 2", "الخانة 3", "الخانة 4", "الخانة 5"]
};

// ─── Visual Groupings ───
const GROUPS = [
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
    },
    {
        id: "staff",
        name: "طاقم العمل والورشة",
        icon: <Wrench size={18} />,
        categories: [
            { key: "technicianNames", label: "أسماء الفنيين", icon: <Wrench size={16} />, color: "blue" },
            { key: "supervisorNames", label: "أسماء المشرفين", icon: <Shield size={16} />, color: "rose" },
            { key: "bayNumbers", label: "أرقام الخانات", icon: <Activity size={16} />, color: "emerald" },
        ]
    }
];

// Flat CATEGORY_META for easy lookup
const CATEGORY_META = GROUPS.reduce((acc, g) => {
    return [...acc, ...g.categories];
}, [] as { key: string; label: string; icon: React.ReactNode; color: string }[]);

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
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeGroupId, setActiveGroupId] = useState<string>("engine");
    const [expandedCategory, setExpandedCategory] = useState<string | null>("oilBrands");
    const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});
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

    // Fetch from Supabase
    const fetchLists = useCallback(async () => {
        if (!selectedBranchId) return;
        setLoading(true);
        try {
            const { data, error } = await (supabase as any)
                .from("suggestion_lists")
                .select("key, items")
                .eq("branch_id", selectedBranchId);
            
            if (error) throw error;

            const fetchedLists: Record<string, string[]> = {};
            if (data && data.length > 0) {
                data.forEach((row: any) => {
                    fetchedLists[row.key] = Array.isArray(row.items) ? row.items : [];
                });
            }

            // Merge with DEFAULT_LISTS in case some keys are missing in DB
            const merged: Record<string, string[]> = {};
            for (const key of Object.keys(DEFAULT_LISTS)) {
                merged[key] = fetchedLists[key] || DEFAULT_LISTS[key];
            }

            setLists(merged);
            setHasChanges(false);
        } catch (err) {
            console.error("Error fetching suggestion lists from Supabase:", err);
            showError("خطأ في الاتصال", "فشل جلب الاقتراحات من السيرفر. تم استخدام القيم الافتراضية.");
        } finally {
            setLoading(false);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        fetchLists();
    }, [fetchLists]);

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
        const group = GROUPS.find(g => g.id === activeGroupId);
        return group ? group.categories.map(c => c.key) : [];
    }, [activeGroupId]);

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
                        تحكم بـ 33 قائمة مستقلة للاقتراحات والـ Autocomplete تظهر في شاشة الاستقبال وأوامر العمل.
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
                                className="bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-rose-500/50"
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
                                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20"
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
                    {GROUPS.map(g => (
                        <button
                            key={g.id}
                            onClick={() => {
                                setActiveGroupId(g.id);
                                // Expand the first category of this group by default
                                if (g.categories.length > 0) {
                                    setExpandedCategory(g.categories[0].key);
                                }
                            }}
                            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-all ${
                                activeGroupId === g.id
                                    ? "border-rose-500 text-rose-500 bg-rose-500/5"
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
                            ? items.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
                            : items;

                        // If searching and no matches in this list, skip
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
            )}

            {/* Floating Save Button for mobile */}
            {hasChanges && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-2xl shadow-2xl shadow-emerald-500/30 text-sm animate-bounce"
                    >
                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        {saving ? "جاري الحفظ..." : "حفظ التغييرات في السيرفر"}
                    </button>
                </div>
            )}
        </div>
    );
}
