"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

/**
 * Locally-generated QR + Code128 barcode for a vehicle service booklet.
 * - QR encodes the public booklet URL (origin + /b/<serial>) — scan with a phone.
 * - Barcode (Code128) ALSO encodes the full URL, so a laser scanner opens the
 *   booklet instead of just typing "BK-xxxxx". It used to carry the bare serial.
 *
 * A URL is ~6x longer than the serial, so Code128 needs far more bars for it. The
 * bar width is scaled down to keep the symbol inside the 58mm sticker; readers that
 * still receive the bare serial keep working, because the in-app lookups run the
 * scanned text through normalizeBookletCode() first.
 *
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

    // Code128 needs roughly 11 modules per character. Keep the whole symbol within the
    // label width by shrinking the module, with a floor so the bars stay printable.
    const maxSymbolPx = variant === "sticker" ? 200 : 300;
    const modules = url.length * 11 + 35; // + start/stop/checksum
    const barWidth = Math.max(0.6, Math.min(cfg.barWidth, maxSymbolPx / modules));

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: cfg.gap }}>
            <QRCodeSVG value={url} size={cfg.qr} level="M" marginSize={2} bgColor="#ffffff" fgColor="#000000" />
            <Barcode
                value={url}
                format="CODE128"
                width={barWidth}
                height={cfg.barHeight}
                displayValue={false}
                fontSize={cfg.fontSize}
                margin={0}
                background="#ffffff"
                lineColor="#000000"
            />
        </div>
    );
}
