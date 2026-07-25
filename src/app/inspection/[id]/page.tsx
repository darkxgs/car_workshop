"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ComprehensiveInspectionReport } from "@/components/ComprehensiveInspectionReport";
import { ArrowRight } from "lucide-react";

// Print view for a saved الفحص الشامل report.
export default function InspectionPrintPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const { data } = await supabase.from("inspection_reports")
                .select(`id, report_number, created_at, odometer_reading, selected_services,
                         vehicles(make, model, plate_number, engine_size, clients(name, phone))`)
                .eq("id", id).single();
            if (data) setReport(data);
            setLoading(false);
        })();
    }, [id]);

    if (loading) return <Centered>جاري تحضير التقرير...</Centered>;
    if (!report) return <Centered>لم يتم العثور على التقرير.</Centered>;

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
                <button onClick={() => window.print()} className="bg-rose-600 text-white py-3 px-6 rounded-xl text-base font-bold shadow-lg">🖨️ طباعة</button>
            </div>
            <div className="wrap">
                <div style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                    <ComprehensiveInspectionReport report={report} />
                </div>
            </div>
        </>
    );
}

function Centered({ children }: { children: React.ReactNode }) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", direction: "rtl", fontFamily: "Arial" }}><p>{children}</p></div>;
}
