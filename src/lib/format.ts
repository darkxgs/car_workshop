// Number formatting helpers for inputs and display.
//
// Design: component state always stays as a RAW digit string (e.g. "70000").
// Only the *display* gets thousands separators ("70,000"). This means existing
// save logic (parseInt / Number on the raw state) keeps working unchanged — the
// stored value never contains commas.

/** Display a value with thousands separators: 70000 -> "70,000". Empty -> "". */
export function withCommas(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === "") return "";
    const digits = String(value).replace(/[^\d]/g, "");
    if (digits === "") return "";
    return Number(digits).toLocaleString("en-US");
}

/** Keep only digits — used in input onChange so state stays raw. */
export function digitsOnly(value: string): string {
    return (value ?? "").replace(/[^\d]/g, "");
}
