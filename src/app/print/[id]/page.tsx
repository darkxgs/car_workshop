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
                    id, report_number, status, order_type, total_price, created_at, completed_at, odometer_reading,
                    estimated_duration, elapsed_time, start_time, selected_services, notes, branch_id,
                    branches(id, name),
                    vehicles (make, model, plate_number, engine_size, booklet_serial, clients (name, phone)),
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
            const handleAfterPrint = () => {
                window.parent.postMessage({ type: 'print_complete' }, '*');
            };
            window.addEventListener("afterprint", handleAfterPrint);
            setTimeout(() => window.print(), 500);
            return () => {
                window.removeEventListener("afterprint", handleAfterPrint);
            };
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

    if (mode === 'sticker') {
        const v = Array.isArray(report.vehicles) ? (report.vehicles[0] || {}) : (report.vehicles || {});
        const serialNum = v.booklet_serial || "BK-00000";
        
        return (
            <>
                <style>{`
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body { background: white; color: black; }
                    @media screen {
                        body { padding: 40px; background: #f5f5f5; display: flex; justify-content: center; }
                        .sticker-card {
                            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                            border-radius: 12px;
                        }
                    }
                    @media print {
                        html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
                        @page { size: 58mm 60mm; margin: 0; }
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
                        🖨️ طباعة الملصق
                    </button>
                </div>

                <div className="sticker-card bg-white p-4 flex flex-col items-center justify-center text-center select-none" style={{
                    width: '58mm',
                    height: '60mm',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    direction: 'rtl',
                    border: '1px solid #ddd'
                }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 800, margin: '0 0 2px 0', color: '#000' }}>مجمع هندسة السيارات</h3>
                    <span style={{ fontSize: '9px', color: '#444', fontWeight: 600 }}>دفتر الخدمة الرقمي</span>
                    
                    {false && typeof window !== 'undefined' && (
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                window.location.origin + '/b/' + serialNum
                            )}`}
                            alt="Booklet QR"
                            style={{ width: '85px', height: '85px', margin: '4px 0', padding: '1px', border: '1.5px solid #000', background: '#fff' }}
                        />
                    )}
                    
                    <strong style={{ fontSize: '15px', fontFamily: 'monospace', color: '#000', letterSpacing: '0.5px', marginTop: '1px' }}>{serialNum}</strong>
                    <span style={{ fontSize: '8px', color: '#666', marginTop: '2px', lineHeight: '1' }}>امسح لعرض سجل الصيانة والزيارات</span>
                </div>
            </>
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
                    {report.order_type === 'sale'
                        ? <SaleInvoice report={report} />
                        : <PrintableInspectionReport report={report} mode={mode} />}
                </div>
            </div>
        </>
    );
}

// Product-sale ("بيع منتج") invoice — sales have no inspection/work sheet, so the generic
// PrintableInspectionReport would print blank. This mirrors the invoice in SaleForm.
function SaleInvoice({ report }: { report: any }) {
    const payload = Array.isArray(report.selected_services) ? report.selected_services[0] : report.selected_services;
    const branch = Array.isArray(report.branches) ? report.branches[0] : report.branches;
    const products = Array.isArray(payload?.products) ? payload.products : [];
    const total = products.reduce((s: number, p: any) => s + (parseFloat(p.qty) || 0) * (parseFloat(p.price) || 0), 0) || report.total_price || 0;
    return (
        <div className="text-black bg-white p-8" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", width: '800px' }}>
            <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black">هندسة السيارات</h1>
                    <p className="text-sm">فاتورة بيع منتج — {branch?.name || ''}</p>
                </div>
                <div className="text-left text-sm">
                    <p>رقم الفاتورة: #{report.report_number}</p>
                    <p>التاريخ: {new Date(report.created_at).toLocaleDateString("ar-EG")}</p>
                </div>
            </div>
            {(payload?.customerName || payload?.customerPhone) && (
                <p className="mb-4 text-sm font-bold">العميل: {payload?.customerName || "—"}{payload?.customerPhone ? ` • ${payload.customerPhone}` : ""}</p>
            )}
            <table className="w-full text-right border-collapse text-sm">
                <thead>
                    <tr className="border-b-2 border-black">
                        <th className="p-2 border border-gray-400">المنتج</th>
                        <th className="p-2 border border-gray-400">الكمية</th>
                        <th className="p-2 border border-gray-400">السعر</th>
                        <th className="p-2 border border-gray-400">الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map((p: any, i: number) => {
                        const q = parseFloat(p.qty) || 0;
                        const pr = parseFloat(p.price) || 0;
                        return (
                            <tr key={i}>
                                <td className="p-2 border border-gray-400">{p.name}</td>
                                <td className="p-2 border border-gray-400 text-center">{q.toLocaleString()}</td>
                                <td className="p-2 border border-gray-400 text-center">{pr.toLocaleString()}</td>
                                <td className="p-2 border border-gray-400 text-center">{(q * pr).toLocaleString()}</td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-black font-black">
                        <td className="p-2 border border-gray-400" colSpan={3}>الإجمالي الكلي</td>
                        <td className="p-2 border border-gray-400 text-center">{total.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
