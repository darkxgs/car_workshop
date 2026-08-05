/**
 * Normalise whatever a barcode scanner typed into a plain booklet serial (BK-xxxxx).
 *
 * The printed Code128 now carries the full booklet URL so a scanner opens the page
 * instead of just emitting an id. But a laser scanner in keyboard-wedge mode types
 * that URL straight into whatever field has focus, so every in-app lookup has to
 * accept both forms — and older stickers in circulation still carry the bare serial.
 *
 *   "https://site/b/BK-10001"  -> "BK-10001"
 *   "/b/BK-10001"              -> "BK-10001"
 *   "bk-10001"                 -> "BK-10001"
 *   "احمد"                     -> "احمد"   (untouched: not a booklet code)
 */
export function normalizeBookletCode(input: string): string {
    const raw = (input || "").trim();
    if (!raw) return raw;

    // Pull the serial out of a booklet URL / path if that is what was scanned.
    const fromUrl = raw.match(/\/b\/([^/?#\s]+)/i);
    const candidate = fromUrl ? decodeURIComponent(fromUrl[1]) : raw;

    if (/^bk-?\d+$/i.test(candidate)) {
        return candidate.toUpperCase().replace(/^BK(?!-)/, "BK-");
    }
    // Bare digits taken FROM A URL are the short barcode form (/b/10001) — the "BK-"
    // is dropped there purely to keep the printed symbol narrow. Typed digits on their
    // own are left alone, since those are normally a phone number being searched.
    if (fromUrl && /^\d+$/.test(candidate)) return `BK-${candidate}`;

    return candidate;
}

/**
 * The shortest text that still resolves to this booklet, used for the printed
 * Code128. Code128 needs ~11 modules per character and a 58mm label only fits
 * roughly 10 characters at a readable bar width, so every character counts:
 *
 *   - the scheme is dropped ("https://") — browsers still resolve a bare host+path
 *   - the "BK-" prefix is dropped; /b/ restores it
 *   - NEXT_PUBLIC_BOOKLET_BASE_URL overrides the host, so pointing a short domain
 *     at the site immediately shrinks the barcode with no code change
 *
 * The QR keeps the full https:// URL — it has capacity to spare and phone cameras
 * are more reliable with an explicit scheme.
 */
export function bookletBarcodeValue(origin: string, serial: string): string {
    const configured = process.env.NEXT_PUBLIC_BOOKLET_BASE_URL;
    const base = (configured || origin).replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    const short = /^BK-?(\d+)$/i.test(serial) ? serial.replace(/^BK-?/i, "") : serial;
    return `${base}/b/${short}`;
}
