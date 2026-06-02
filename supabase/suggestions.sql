-- ========================================================
-- Schema and Seed Data for Suggestions/Autocomplete Lists
-- ========================================================

-- 1. Create the suggestions table
CREATE TABLE IF NOT EXISTS public.suggestion_lists (
    key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.suggestion_lists ENABLE ROW LEVEL SECURITY;

-- 3. Create Security Policies
-- Anyone (including guests) can read suggestions
DROP POLICY IF EXISTS "Allow read access for anyone on suggestion_lists" ON public.suggestion_lists;
CREATE POLICY "Allow read access for anyone on suggestion_lists"
ON public.suggestion_lists FOR SELECT
USING (true);

-- Only authenticated users (employees) can insert, update, or delete suggestions
DROP POLICY IF EXISTS "Allow write access for authenticated users on suggestion_lists" ON public.suggestion_lists;
CREATE POLICY "Allow write access for authenticated users on suggestion_lists"
ON public.suggestion_lists FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Seed/Upsert data for all 33 categories
INSERT INTO public.suggestion_lists (key, label, items) VALUES
-- المحرك والسوائل
('oilBrands', 'أنواع زيوت المحرك', '[
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
]'::jsonb),

('viscosities', 'درجات لزوجة زيت المحرك', '[
    "0W-20", "0W-30", "0W-40",
    "5W-20", "5W-30", "5W-40",
    "10W-30", "10W-40", "10W-50",
    "15W-40", "20W-50"
]'::jsonb),

('brakeFluids', 'أنواع زيت الفرامل', '[
    "Ate DOT 4", "Bosch DOT 4", "ليكي مولي DOT 4", "ليكي مولي DOT 5.1", "شل DOT 4"
]'::jsonb),

('coolants', 'أنواع ماء الراديتر/التبريد', '[
    "ليكي مولي احمر", "ليكي مولي اخضر", "تويوتا اصلي احمر", "ميتسوبيشي اخضر", "كاسترول جاهز"
]'::jsonb),

-- الفلاتر
('oilFilterBrands', 'ماركات فلاتر زيت المحرك', '[
    "Mann", "Mahle", "Bosch", "Hengst", "هيونداي اصلي", "تويوتا اصلي", "كيا اصلي"
]'::jsonb),

('oilFilterCodes', 'أكواد فلاتر زيت المحرك', '[
    "HU 514 X", "HU 716/2 X", "HU 612/2 X", "OC 21", "OC 47", "W 712/95"
]'::jsonb),

('airFilterBrands', 'ماركات فلاتر الهواء', '[
    "Mann", "Mahle", "Bosch", "Sakura", "Purflux", "هيونداي اصلي", "تويوتا اصلي"
]'::jsonb),

('airFilterCodes', 'أكواد فلاتر الهواء', '[
    "C 25 710/3", "C 30 005", "LX 3778"
]'::jsonb),

('acFilterBrands', 'ماركات فلاتر التبريد', '[
    "Mann", "Mahle", "Bosch", "Hengst", "Sakura", "اصلي"
]'::jsonb),

('acFilterCodes', 'أكواد فلاتر التبريد', '[
    "CU 2545"
]'::jsonb),

('gearboxFilterBrands', 'ماركات فلاتر الكير', '[
    "ZF", "Mann", "Mahle", "Aisin", "اصلي"
]'::jsonb),

('gearboxFilterCodes', 'أكواد فلاتر الكير', '[
    "OC 983"
]'::jsonb),

('batteryFilterBrands', 'ماركات فلاتر البطارية', '[
    "اصلي", "كوري", "ياباني"
]'::jsonb),

-- الكير والناقل
('gearboxOils', 'زيوت الكير والهايدروليك', '[
    "ليكي مولي ATF", "ليكي مولي CVT", "ليكي مولي DCT", "ليكي مولي Top Tec 1800",
    "ستيرلنك ATF", "موبيل ATF", "كاسترول ATF", "شل ATF", "ZF LifeGuard", "Aisin ATF"
]'::jsonb),

-- المنظفات والمضافات
('engineFlashBrands', 'مضافات فلاش المحرك', '[
    "ليكي مولي فلاش محرك", "BG فلاش محرك"
]'::jsonb),

('engineCeramicBrands', 'مضافات سيراميك المحرك', '[
    "ليكي مولي سيراميك محرك"
]'::jsonb),

('linerCleanerBrands', 'منظفات بطانة المحرك', '[
    "ليكي مولي منظف بطانة"
]'::jsonb),

('oilLeakPreventerBrands', 'مانع تسريب زيت المحرك', '[
    "ليكي مولي مانع تسريب زيت"
]'::jsonb),

('smokePreventerBrands', 'مانع دخان ونقص الزيت', '[
    "ليكي مولي مانع دخان"
]'::jsonb),

('gearboxFlashBrands', 'مضافات فلاش الكير', '[
    "ليكي مولي فلاش كير"
]'::jsonb),

('gearboxCeramicBrands', 'مضافات سيراميك الكير', '[
    "ليكي مولي سيراميك كير"
]'::jsonb),

('gearboxAntiSlipBrands', 'مانع انزلاق الكير', '[
    "ليكي مولي مانع انزلاق كير"
]'::jsonb),

('acCleanerBrands', 'منظفات دورة التبريد والمكيف', '[
    "ليكي مولي منظف دورة تبريد", "ليكي مولي واقي رديتر"
]'::jsonb),

('injectorCleanerBrands', 'مضافات منظف البخاخات', '[
    "ليكي مولي منظف بخاخات", "BG منظف بخاخات"
]'::jsonb),

('fuelSystemCleanerBrands', 'منظفات نظام الوقود', '[
    "ليكي مولي منظف وقود"
]'::jsonb),

('octaneBoosterBrands', 'محسنات الأوكتان', '[
    "ليكي مولي اوكتان"
]'::jsonb),

-- الاستهلاكيات والأساسيات
('batteries', 'أنواع البطاريات', '[
    "Varta", "Bosch", "AC Delco", "Optima", "Exide", "GS Yuasa", "Amaron", "هانكوك", "اطلس"
]'::jsonb),

('wiperBrands', 'ماركات مساحات الزجاج', '[
    "Bosch", "Denso", "Michelin", "اصلي"
]'::jsonb),

('wiperSizes', 'مقاسات مساحات الزجاج', '[
    "14 Inch", "16 Inch", "18 Inch", "20 Inch", "22 Inch", "24 Inch", "26 Inch", "28 Inch"
]'::jsonb),

('engineBeltsBrands', 'ماركات قوايش المحرك', '[
    "Gates", "Contitech", "Dongil", "اصلي"
]'::jsonb),

('brakePadsBrands', 'ماركات دسكات الفرامل', '[
    "Brembo", "Ate", "Bosch", "Sangsin", "اصلي"
]'::jsonb),

('sparkPlugsBrands', 'ماركات شمعات الاحتراق', '[
    "NGK Laser", "Denso Iridium", "Bosch Double Platinum", "اصلي"
]'::jsonb),

('windshieldFluids', 'سائل غسيل جام الزجاج', '[
    "ليكي مولي مركز", "سائل رغوي جاهز", "ماء مقطر"
]'::jsonb)

ON CONFLICT (key) DO UPDATE 
SET label = EXCLUDED.label,
    items = EXCLUDED.items,
    updated_at = timezone('utc'::text, now());
