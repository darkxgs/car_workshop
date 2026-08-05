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

    // Only uppercase things that actually look like a serial, so ordinary search
    // terms (a customer's name, a plate) are passed through untouched.
    return /^bk-?\d+$/i.test(candidate)
        ? candidate.toUpperCase().replace(/^BK(?!-)/, "BK-")
        : candidate;
}
