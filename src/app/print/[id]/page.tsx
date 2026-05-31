"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PrintableInspectionReport } from "@/components/PrintableInspectionReport";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PrintPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = params.id as string;
    const mode = searchParams.get('mode') || 'full';
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const fetchData = async () => {
            const { data: reportData } = await supabase
                .from("inspection_reports")
                .select(`
                    id, report_number, status, created_at, completed_at, odometer_reading,
                    estimated_duration, elapsed_time, start_time, selected_services, notes, branch_id,
                    branches(id, name),
                    vehicles (make, model, plate_number, engine_size, clients (name, phone)),
                    receptionist:receptionist_id(name)
                `)
                .eq("id", id)
                .single();

            if (reportData) {
                setReport(reportData);
            }
            setLoading(false);
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 840) {
                // scale to fit within viewport width with 20px padding on each side
                setScale((width - 40) / 800);
            } else {
                setScale(1);
            }
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        // Auto-trigger print once data is loaded
        if (!loading && report) {
            setTimeout(() => window.print(), 500);
        }
    }, [loading, report]);

    if (loading) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Arial", direction: "rtl" }}>
                <p>جاري تحضير التقرير للطباعة...</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "Arial", direction: "rtl" }}>
                <p>لم يتم العثور على التقرير.</p>
            </div>
        );
    }

    return (
        <>
            <style>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { background: white; }
                @media screen {
                    body { padding: 20px; background: #f5f5f5; }
                    .print-scale-container {
                        width: 100%;
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                        overflow: hidden;
                        padding: 10px 0;
                    }
                }
                @media print {
                    html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
                    @page { size: A4 portrait; margin: 0; }
                    .print-scale-container {
                        padding: 0 !important;
                        overflow: visible !important;
                        display: block !important;
                    }
                    .print-scale-wrapper {
                        transform: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        height: auto !important;
                    }
                }
                .no-print-btn {
                    position: fixed; bottom: 20px; right: 20px;
                    background: #dc2626; color: white; border: none;
                    padding: 12px 24px; border-radius: 8px; font-size: 16px;
                    cursor: pointer; font-family: Arial; z-index: 999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                @media print { .no-print-btn { display: none !important; } }
            `}</style>

            <div className="no-print-btn flex flex-col gap-3 fixed bottom-5 right-5 z-[999]">
                <button 
                    onClick={() => router.back()}
                    className="bg-slate-800 text-white border-none py-3 px-6 rounded-xl text-base cursor-pointer font-bold shadow-lg flex items-center gap-2 justify-center"
                >
                    <ArrowRight size={20} /> رجوع
                </button>
                <button 
                    onClick={() => window.print()}
                    className="bg-rose-600 text-white border-none py-3 px-6 rounded-xl text-base cursor-pointer font-bold shadow-lg"
                >
                    🖨️ طباعة مرة أخرى
                </button>
            </div>

            <div className="print-scale-container">
                <div className="print-scale-wrapper" style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    width: '800px',
                    flexShrink: 0,
                    marginBottom: `calc(800px * (${scale} - 1))`,
                    height: 'auto'
                }}>
                    <PrintableInspectionReport report={report} mode={mode} />
                </div>
            </div>
        </>
    );
}
