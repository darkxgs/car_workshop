import { supabase } from "./supabase";

/**
 * Send a finished order back to the workshop floor (قيد العمل).
 *
 * If the invoice was ALREADY accounted, reopening also UN-accounts it: the
 * audit's grandTotal/accounted/accountedAt stamps are removed and total_price
 * is restored to the gross figure, so once the new work is finished the invoice
 * returns to بانتظار المحاسبة and is settled again with fresh numbers.
 *
 * Leaving the stamps in place (what all three reopen buttons used to do) meant
 * a reopened order skipped re-accounting entirely, while services added during
 * the new work bumped total_price underneath the frozen grandTotal — the audit
 * card then showed figures from two different closings at once.
 */
export async function reopenWorkOrder(id: string): Promise<{ error: { message: string } | null }> {
    const { data } = await supabase
        .from("inspection_reports")
        .select("selected_services, total_price")
        .eq("id", id)
        .single();

    const update: Record<string, unknown> = {
        status: "قيد العمل",
        start_time: new Date().toISOString(),
        completed_at: null,
    };

    const raw: unknown = data?.selected_services;
    const arr: any[] = Array.isArray(raw) ? [...raw] : raw ? [raw] : [];
    const pricing = arr[0]?.pricing;
    if (pricing?.accounted === true) {
        const cleared = { ...pricing };
        delete cleared.accounted;
        delete cleared.accountedAt;
        delete cleared.grandTotal;
        arr[0] = { ...arr[0], pricing: cleared };
        update.selected_services = arr;
        // Back to the gross total: total_price currently holds the accountant's NET,
        // and re-accounting from a net would apply the discount a second time.
        const gross = parseFloat(String(pricing.grandTotal ?? "")) || 0;
        if (gross > 0) update.total_price = gross;
    }

    const { error } = await supabase.from("inspection_reports").update(update).eq("id", id);
    return { error };
}
