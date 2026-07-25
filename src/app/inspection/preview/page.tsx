"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { ComprehensiveInspectionReport } from "@/components/ComprehensiveInspectionReport";
import { emptyInspection } from "@/lib/comprehensiveInspection";

// Standalone PREVIEW of the comprehensive-inspection PDF template, with sample
// data — so the layout can be reviewed before the reception form is wired in.
export default function InspectionPreviewPage() {
    const router = useRouter();

    const insp = emptyInspection();
    // Sample marks so the checkboxes/notes are visible in the preview.
    const sample: Record<string, { status: any; note: string }> = {
        sparkPlugs: { status: "صيانة", note: "تحتاج تنظيف" },
        belt: { status: "سليم", note: "" },
        turbo: { status: "تالف", note: "صوت غير طبيعي" },
        padsFront: { status: "صيانة", note: "قريبة من الحد" },
        tiresFront: { status: "صيانة", note: "تآكل خفيف" },
        tiresRear: { status: "سليم", note: "" },
        tiresPressure: { status: "سليم", note: "32 PSI" },
        batteryAge: { status: "تالف", note: "عمرها 3 سنوات" },
    };
    Object.assign(insp.items, sample);
    insp.rating = "صيانة";
    insp.percentage = "78";
    insp.finalNotes = "المركبة بحالة جيدة عموماً، تحتاج صيانة دورية للبريك والبلكات.";

    const report = {
        report_number: 1234,
        created_at: new Date("2026-07-26").toISOString(),
        odometer_reading: 85000,
        vehicles: {
            make: "تيوتا", model: "كامري 2020", plate_number: "بغداد ١٢٣٤", engine_size: "2.5L",
            clients: { name: "زبون تجريبي", phone: "07701234567" },
        },
        selected_services: [{ comprehensiveInspection: insp, technicianName: "الفني المسؤول" }],
    };

    return (
        <>
            <style>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { background: white; }
                @media screen { body { padding: 20px; background: #f5f5f5; } .wrap { display: flex; justify-content: center; } }
                @media print { html, body { margin: 0 !important; padding: 0 !important; } @page { size: A4 portrait; margin: 0; } .no-print-btn { display: none !important; } }
                .no-print-btn { position: fixed; bottom: 20px; right: 20px; z-index: 999; }
            `}</style>

            <div className="no-print-btn flex flex-col gap-3">
                <button onClick={() => router.back()} className="bg-slate-800 text-white py-3 px-6 rounded-xl text-base font-bold shadow-lg flex items-center gap-2 justify-center">
                    <ArrowRight size={20} /> رجوع
                </button>
                <button onClick={() => window.print()} className="bg-rose-600 text-white py-3 px-6 rounded-xl text-base font-bold shadow-lg">
                    🖨️ طباعة
                </button>
            </div>

            <div className="wrap">
                <div style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                    <ComprehensiveInspectionReport report={report} />
                </div>
            </div>
        </>
    );
}
