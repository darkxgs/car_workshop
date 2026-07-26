"use client";

import { useParams, useRouter } from "next/navigation";
import BookletCodes from "@/components/BookletCodes";
import { ArrowRight } from "lucide-react";

// Booklet sticker for a given serial (QR only). Printed from the customer file.
export default function StickerPage() {
    const params = useParams();
    const router = useRouter();
    const serial = decodeURIComponent((params.serial as string) || "");

    return (
        <>
            <style>{`
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { background: white; color: black; }
                @media screen { body { padding: 40px; background: #f5f5f5; display: flex; justify-content: center; } .sticker-card { box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 12px; } }
                @media print { html, body { margin: 0 !important; padding: 0 !important; } @page { size: 58mm 60mm; margin: 0; } .no-print-btn { display: none !important; } }
                .no-print-btn { position: fixed; bottom: 20px; right: 20px; z-index: 999; }
            `}</style>

            <div className="no-print-btn flex flex-col gap-3">
                <button onClick={() => router.back()} className="bg-slate-800 text-white py-3 px-6 rounded-xl text-base font-bold shadow-lg flex items-center gap-2 justify-center">
                    <ArrowRight size={20} /> رجوع
                </button>
                <button onClick={() => window.print()} className="bg-rose-600 text-white py-3 px-6 rounded-xl text-base font-bold shadow-lg">🖨️ طباعة الملصق</button>
            </div>

            <div className="sticker-card bg-white p-4 flex flex-col items-center justify-center text-center select-none"
                style={{ width: "58mm", height: "60mm", fontFamily: "system-ui, -apple-system, sans-serif", direction: "rtl" }}>
                <div style={{ margin: "4px 0" }}>
                    <BookletCodes serial={serial} variant="sticker" />
                </div>
                <strong style={{ fontSize: "15px", fontFamily: "monospace", color: "#000", letterSpacing: "0.5px", marginTop: "4px" }}>{serial}</strong>
            </div>
        </>
    );
}
