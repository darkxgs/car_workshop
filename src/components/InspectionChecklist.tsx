"use client";

import { INSPECTION_SECTIONS, INSPECTION_STATUSES, ComprehensiveInspection, InspectionStatus } from "@/lib/comprehensiveInspection";
import { digitsOnly } from "@/lib/format";

// Reusable الفحص الشامل checklist — used by the standalone InspectionForm and,
// via a toggle, inside the القطاع work order. Controlled by value/onChange.
const STATUS_CLASSES: Record<string, { active: string; idle: string }> = {
    "سليم": { active: "bg-emerald-500 text-white border-emerald-500", idle: "border-border text-muted-foreground hover:border-emerald-500/50" },
    "صيانة": { active: "bg-amber-500 text-white border-amber-500", idle: "border-border text-muted-foreground hover:border-amber-500/50" },
    "تالف": { active: "bg-rose-500 text-white border-rose-500", idle: "border-border text-muted-foreground hover:border-rose-500/50" },
};

export default function InspectionChecklist({
    value, onChange,
}: {
    value: ComprehensiveInspection;
    onChange: (v: ComprehensiveInspection) => void;
}) {
    const setItem = (key: string, field: "status" | "note", val: string) =>
        onChange({ ...value, items: { ...value.items, [key]: { ...value.items[key], [field]: val as any } } });

    const allItems = Object.values(value.items);
    const total = allItems.length;
    const cnt = (s: string) => allItems.filter(i => i.status === s).length;
    const assessed = allItems.filter(i => i.status).length;

    return (
        <div className="space-y-4">
            {/* Progress summary */}
            <div className="glass-card p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">تم تقييم {assessed} من {total}</span>
                    <div className="h-2 w-40 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 transition-all" style={{ width: `${total ? (assessed / total) * 100 : 0}%` }} />
                    </div>
                </div>
                <div className="flex gap-2 text-xs font-bold">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">سليم {cnt("سليم")}</span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">صيانة {cnt("صيانة")}</span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">تالف {cnt("تالف")}</span>
                </div>
            </div>

            {/* Sections */}
            {INSPECTION_SECTIONS.map(sec => (
                <div key={sec.key} className="glass-card p-4 rounded-2xl">
                    <h3 className="font-bold mb-3 border-b border-border pb-2 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-base">{sec.icon}</span>
                        <span className="text-rose-400">{sec.title}</span>
                    </h3>
                    <div className="space-y-2">
                        {sec.items.map(it => {
                            const cur = value.items[it.key];
                            return (
                                <div key={it.key} className="flex flex-col md:flex-row md:items-center gap-2 border-b border-border/40 pb-2">
                                    <span className="md:w-48 font-medium text-sm shrink-0">{it.label}</span>
                                    <div className="flex gap-1.5">
                                        {INSPECTION_STATUSES.map(st => {
                                            const active = cur.status === st;
                                            const cls = STATUS_CLASSES[st];
                                            return (
                                                <button key={st} type="button" onClick={() => setItem(it.key, "status", active ? "" : st)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${active ? cls.active : cls.idle}`}>
                                                    {st}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <input className="input-field text-xs py-1.5 flex-1" placeholder="ملاحظة الفني"
                                        value={cur.note} onChange={e => setItem(it.key, "note", e.target.value)} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Final assessment */}
            <div className="glass-card p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">الملاحظات النهائية</label>
                    <textarea className="input-field min-h-[70px]" value={value.finalNotes}
                        onChange={e => onChange({ ...value, finalNotes: e.target.value })} placeholder="—" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5">التقييم الفني</label>
                    <div className="flex gap-1.5">
                        {INSPECTION_STATUSES.map(st => (
                            <button key={st} type="button" onClick={() => onChange({ ...value, rating: value.rating === st ? "" : st })}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${value.rating === st ? "bg-rose-600 text-white border-rose-600" : "border-border text-muted-foreground"}`}>
                                {st}
                            </button>
                        ))}
                    </div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1.5 mt-3">النسبة %</label>
                    <input className="input-field text-right" dir="ltr" inputMode="numeric" value={value.percentage}
                        onChange={e => {
                            const raw = digitsOnly(e.target.value).slice(0, 3);
                            const capped = raw === "" ? "" : String(Math.min(100, parseInt(raw, 10)));
                            onChange({ ...value, percentage: capped });
                        }} placeholder="0 - 100" />
                    <span className="text-[10px] text-muted-foreground mt-1 block">النسبة من 0 إلى 100% فقط.</span>
                </div>
            </div>
        </div>
    );
}
