"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

/**
 * Locally-generated QR + Code128 barcode for a vehicle service booklet.
 * - QR encodes the public booklet URL (origin + /b/<serial>) — scan with a phone.
 * - Barcode (Code128) encodes the raw serial (BK-xxxxx) — scan with a laser gun.
 * Everything renders as inline SVG (no external service, prints deterministically).
 */
export default function BookletCodes({
    serial,
    variant = "sticker",
}: {
    serial?: string | null;
    variant?: "sticker" | "report";
}) {
    // Resolve the origin only after mount so SSR and first client render match
    // (avoids a hydration mismatch and works on both the test and live sites).
    const [origin, setOrigin] = useState("");
    useEffect(() => setOrigin(window.location.origin), []);

    if (!serial) return null;

    const cfg =
        variant === "sticker"
            ? { qr: 80, barWidth: 1.4, barHeight: 32, fontSize: 11, showText: false, gap: 3 }
            : { qr: 92, barWidth: 1.6, barHeight: 42, fontSize: 13, showText: true, gap: 5 };

    // Placeholder keeps layout stable until the origin is known (post-mount).
    if (!origin) return <div aria-hidden style={{ width: cfg.qr, height: cfg.qr }} />;

    const url = `${origin}/b/${serial}`;

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: cfg.gap }}>
            <QRCodeSVG value={url} size={cfg.qr} level="M" marginSize={2} bgColor="#ffffff" fgColor="#000000" />
            <Barcode
                value={serial}
                format="CODE128"
                width={cfg.barWidth}
                height={cfg.barHeight}
                displayValue={cfg.showText}
                fontSize={cfg.fontSize}
                margin={0}
                background="#ffffff"
                lineColor="#000000"
            />
        </div>
    );
}
