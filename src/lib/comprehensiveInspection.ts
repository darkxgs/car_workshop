// Comprehensive vehicle inspection ("الفحص الشامل / تقرير الفحص الفني").
// A standalone, structured checklist filled in reception after the customer/vehicle
// info. Each item gets a status (سليم / صيانة / تالف) + a technician note. Mirrors the
// printed template "تقرير فحص المركبة التفصيلي.pdf" exactly (7 sections, tire in §7).

export type InspectionStatus = "سليم" | "صيانة" | "تالف" | "";

export interface InspectionItem {
    key: string;
    label: string;
}
export interface InspectionSection {
    key: string;
    title: string;   // e.g. "بند المحرك (Engine)"
    icon: string;    // emoji shown in the section header
    items: InspectionItem[];
}

// One entry per printed row. Keys are stable slugs; labels are verbatim from the PDF.
export const INSPECTION_SECTIONS: InspectionSection[] = [
    {
        key: "engine", title: "بند المحرك (Engine)", icon: "⚙️",
        items: [
            { key: "sparkPlugs", label: "البلكات (شمعات الاشتعال)" },
            { key: "injectors", label: "نوزلات" },
            { key: "sensors", label: "حساسات" },
            { key: "belt", label: "قايش" },
            { key: "pulleys", label: "بكرات" },
            { key: "oilLeak", label: "تسريب زيت (نضوح)" },
            { key: "fuelPump", label: "الفيول بم" },
            { key: "engineMount", label: "دهن المحرك" },
            { key: "turbo", label: "التوربو" },
        ],
    },
    {
        key: "transmission", title: "بند ناقل الحركة (الكير)", icon: "🔧",
        items: [
            { key: "gearboxElecTest", label: "فحص كهربائي بالجهاز" },
            { key: "gearboxOil", label: "فحص او تغيير زيت الكير" },
            { key: "gearboxLeak", label: "تسريب الكير" },
            { key: "gearboxFilter", label: "فلتر الكير" },
        ],
    },
    {
        key: "brakes", title: "بند الفرامل (البريك)", icon: "🛑",
        items: [
            { key: "padsFront", label: "فحص فلنجات امامي" },
            { key: "padsRear", label: "فحص فلنجات خلفي" },
            { key: "discsFront", label: "فحص دسكات امامي" },
            { key: "discsRear", label: "فحص دسكات خلفي" },
            { key: "brakeFluid", label: "فحص دهن البريك" },
        ],
    },
    {
        key: "suspension", title: "الحدادية (Suspension)", icon: "🛞",
        items: [
            { key: "shockFront", label: "هزة امامي" },
            { key: "shockRear", label: "هزة خلفي" },
            { key: "movingParts", label: "فحص الاجزاء المتحركة" },
            { key: "alignment", label: "ميزانية الكترونية" },
        ],
    },
    {
        key: "filters", title: "الفلاتر (Filters)", icon: "🧴",
        items: [
            { key: "airFilter", label: "فلتر هواء" },
            { key: "acFilter", label: "فلتر تبريد" },
            { key: "fuelFilter", label: "فلتر بانزين" },
            { key: "oilFilter", label: "فلتر زيت" },
            { key: "batteryFilter", label: "فلتر بطارية" },
        ],
    },
    {
        key: "cooling", title: "منظومة التبريد (Cooling)", icon: "❄️",
        items: [
            { key: "radiator", label: "الراديتر" },
            { key: "jointsPressure", label: "ضغط الجوينات" },
            { key: "reservoir", label: "الدبة" },
            { key: "radiatorCap", label: "قبق الراديتر" },
            { key: "coolant", label: "ماء الراديتر" },
            { key: "coolingLeak", label: "التسريب" },
            { key: "fanElecTest", label: "فحص الفان كهربائياً" },
        ],
    },
    {
        key: "tiresElectrical", title: "الإطارات و الكهرباء", icon: "🛞",
        items: [
            { key: "tiresFront", label: "الاطارات الامامية" },
            { key: "tiresRear", label: "الاطارات الخلفية" },
            { key: "tiresPressure", label: "ضغط الاطارات" },
            { key: "batteryAge", label: "عمر البطارية" },
            { key: "alternator", label: "الداينمو" },
            { key: "lightsFront", label: "الانارة الامامية" },
            { key: "lightsRear", label: "الانارة الخلفية" },
        ],
    },
];

export const INSPECTION_STATUSES: InspectionStatus[] = ["سليم", "صيانة", "تالف"];

// Payload stored on the report (selected_services[0].comprehensiveInspection).
export interface ComprehensiveInspection {
    isComprehensiveInspection: true;
    // itemKey -> { status, note }
    items: Record<string, { status: InspectionStatus; note: string }>;
    finalNotes: string;
    rating: InspectionStatus;   // overall التقييم الفني
    percentage: string;         // النسبة %
}

export function emptyInspection(): ComprehensiveInspection {
    const items: ComprehensiveInspection["items"] = {};
    for (const sec of INSPECTION_SECTIONS)
        for (const it of sec.items) items[it.key] = { status: "", note: "" };
    return { isComprehensiveInspection: true, items, finalNotes: "", rating: "", percentage: "" };
}
