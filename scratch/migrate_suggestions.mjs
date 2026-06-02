import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve('.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    if (!line || line.trim().startsWith('#')) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const SEEDED_CATEGORIES = {
    // المحرك والسوائل
    oilBrands: {
        label: "أنواع زيوت المحرك",
        items: [
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
        ]
    },
    viscosities: {
        label: "درجات اللزوجة",
        items: [
            "0W-20", "0W-30", "0W-40",
            "5W-20", "5W-30", "5W-40",
            "10W-30", "10W-40", "10W-50",
            "15W-40", "20W-50"
        ]
    },
    brakeFluids: {
        label: "زيت الفرامل",
        items: ["Ate DOT 4", "Bosch DOT 4", "ليكي مولي DOT 4", "ليكي مولي DOT 5.1", "شل DOT 4"]
    },
    coolants: {
        label: "ماء وسوائل التبريد",
        items: ["ليكي مولي احمر", "ليكي مولي اخضر", "تويوتا اصلي احمر", "ميتسوبيشي اخضر", "كاسترول جاهز"]
    },

    // الفلاتر
    oilFilterBrands: {
        label: "ماركات فلاتر زيت المحرك",
        items: ["Mann", "Mahle", "Bosch", "Hengst", "هيونداي اصلي", "تويوتا اصلي", "كيا اصلي"]
    },
    oilFilterCodes: {
        label: "أكواد فلاتر زيت المحرك",
        items: ["HU 514 X", "HU 716/2 X", "HU 612/2 X", "OC 21", "OC 47", "W 712/95"]
    },
    airFilterBrands: {
        label: "ماركات فلاتر الهواء",
        items: ["Mann", "Mahle", "Bosch", "Sakura", "Purflux", "هيونداي اصلي", "تويوتا اصلي"]
    },
    airFilterCodes: {
        label: "أكواد فلاتر الهواء",
        items: ["C 25 710/3", "C 30 005", "LX 3778"]
    },
    acFilterBrands: {
        label: "ماركات فلاتر التبريد",
        items: ["Mann", "Mahle", "Bosch", "Hengst", "Sakura", "اصلي"]
    },
    acFilterCodes: {
        label: "أكواد فلاتر التبريد",
        items: ["CU 2545"]
    },
    gearboxFilterBrands: {
        label: "ماركات فلاتر الكير",
        items: ["ZF", "Mann", "Mahle", "Aisin", "اصلي"]
    },
    gearboxFilterCodes: {
        label: "أكواد فلاتر الكير",
        items: ["OC 983"]
    },
    batteryFilterBrands: {
        label: "ماركات فلاتر البطارية",
        items: ["اصلي", "كوري", "ياباني"]
    },

    // الكير والناقل
    gearboxOils: {
        label: "زيوت الكير والهايدروليك",
        items: [
            "ليكي مولي ATF", "ليكي مولي CVT", "ليكي مولي DCT", "ليكي مولي Top Tec 1800",
            "ستيرلنك ATF", "موبيل ATF", "كاسترول ATF", "شل ATF", "ZF LifeGuard", "Aisin ATF"
        ]
    },

    // المنظفات والمضافات
    engineFlashBrands: {
        label: "مضافات فلاش المحرك",
        items: ["ليكي مولي فلاش محرك", "BG فلاش محرك"]
    },
    engineCeramicBrands: {
        label: "مضافات سيراميك المحرك",
        items: ["ليكي مولي سيراميك محرك"]
    },
    linerCleanerBrands: {
        label: "منظفات بطانة المحرك",
        items: ["ليكي مولي منظف بطانة"]
    },
    oilLeakPreventerBrands: {
        label: "مانع تسريب زيت المحرك",
        items: ["ليكي مولي مانع تسريب زيت"]
    },
    smokePreventerBrands: {
        label: "مانع دخان ونقص الزيت",
        items: ["ليكي مولي مانع دخان"]
    },
    gearboxFlashBrands: {
        label: "مضافات فلاش الكير",
        items: ["ليكي مولي فلاش كير"]
    },
    gearboxCeramicBrands: {
        label: "مضافات سيراميك الكير",
        items: ["ليكي مولي سيراميك كير"]
    },
    gearboxAntiSlipBrands: {
        label: "مانع انزلاق الكير",
        items: ["ليكي مولي مانع انزلاق كير"]
    },
    acCleanerBrands: {
        label: "منظفات دورة التبريد والمكيف",
        items: ["ليكي مولي منظف دورة تبريد", "ليكي مولي واقي رديتر"]
    },
    injectorCleanerBrands: {
        label: "مضافات منظف البخاخات",
        items: ["ليكي مولي منظف بخاخات", "BG منظف بخاخات"]
    },
    fuelSystemCleanerBrands: {
        label: "منظفات نظام الوقود",
        items: ["ليكي مولي منظف وقود"]
    },
    octaneBoosterBrands: {
        label: "محسنات الأوكتان",
        items: ["ليكي مولي اوكتان"]
    },

    // الاستهلاكيات والأساسيات
    batteries: {
        label: "أنواع البطاريات",
        items: ["Varta", "Bosch", "AC Delco", "Optima", "Exide", "GS Yuasa", "Amaron", "هانكوك", "اطلس"]
    },
    wiperBrands: {
        label: "ماركات مساحات الزجاج",
        items: ["Bosch", "Denso", "Michelin", "اصلي"]
    },
    wiperSizes: {
        label: "مقاسات مساحات الزجاج",
        items: ["14 Inch", "16 Inch", "18 Inch", "20 Inch", "22 Inch", "24 Inch", "26 Inch", "28 Inch"]
    },
    engineBeltsBrands: {
        label: "ماركات قوايش المحرك",
        items: ["Gates", "Contitech", "Dongil", "اصلي"]
    },
    brakePadsBrands: {
        label: "ماركات دسكات الفرامل",
        items: ["Brembo", "Ate", "Bosch", "Sangsin", "اصلي"]
    },
    sparkPlugsBrands: {
        label: "ماركات شمعات الاحتراق",
        items: ["NGK Laser", "Denso Iridium", "Bosch Double Platinum", "اصلي"]
    },
    windshieldFluids: {
        label: "سائل غسيل جام الزجاج",
        items: ["ليكي مولي مركز", "سائل رغوي جاهز", "ماء مقطر"]
    }
};

async function migrate() {
    const createTableSql = `
    CREATE TABLE IF NOT EXISTS public.suggestion_lists (
        key TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    ALTER TABLE public.suggestion_lists ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow read access for anyone on suggestion_lists" ON public.suggestion_lists;
    CREATE POLICY "Allow read access for anyone on suggestion_lists"
    ON public.suggestion_lists FOR SELECT
    USING (true);

    DROP POLICY IF EXISTS "Allow write access for authenticated users on suggestion_lists" ON public.suggestion_lists;
    CREATE POLICY "Allow write access for authenticated users on suggestion_lists"
    ON public.suggestion_lists FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
    `;

    console.log("Creating/updating suggestion_lists table in database...");
    const { error: tableError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableSql });
    if (tableError) {
        console.error("Error executing table creation SQL:", tableError);
        process.exit(1);
    }
    console.log("Table structure configured successfully.");

    console.log("Seeding categories into table...");
    for (const [key, meta] of Object.entries(SEEDED_CATEGORIES)) {
        console.log(`Upserting suggestion list: ${key} (${meta.label}) - ${meta.items.length} items...`);
        const { error: upsertError } = await supabaseAdmin
            .from('suggestion_lists')
            .upsert({
                key,
                label: meta.label,
                items: meta.items,
                updated_at: new Date().toISOString()
            });

        if (upsertError) {
            console.error(`Error seeding category ${key}:`, upsertError);
        }
    }
    console.log("Seeding completed successfully!");
}

migrate();
