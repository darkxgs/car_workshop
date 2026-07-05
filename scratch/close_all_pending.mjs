import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    if (!line || line.trim().startsWith('#')) return;
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value;
    }
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

const num = (v) => parseFloat(String(v ?? "").replace(/[^\d.]/g, "")) || 0;

async function closeAllPending() {
    console.log("Fetching and processing all completed reports in batches...");
    let offset = 0;
    const limit = 1000;
    let hasMore = true;
    let totalUpdated = 0;

    while (hasMore) {
        console.log(`Fetching records in range ${offset} to ${offset + limit - 1}...`);
        const { data: reports, error } = await supabase
            .from('inspection_reports')
            .select('id, report_number, status, order_type, selected_services, total_price')
            .eq('status', 'تم الانتهاء')
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Error fetching reports:", error);
            break;
        }

        if (!reports || reports.length === 0) {
            console.log("No more records found.");
            break;
        }

        const pending = reports.filter(o => {
            const p = (Array.isArray(o.selected_services) ? o.selected_services[0] : o.selected_services)?.pricing;
            return p?.accounted !== true;
        });

        console.log(`Found ${pending.length} pending reports in this batch of ${reports.length}.`);

        if (pending.length > 0) {
            let successCount = 0;
            const batchSize = 20;

            for (let i = 0; i < pending.length; i += batchSize) {
                const batch = pending.slice(i, i + batchSize);
                await Promise.all(batch.map(async (o) => {
                    try {
                        const services = [...(Array.isArray(o.selected_services) ? o.selected_services : [o.selected_services])].filter(Boolean);
                        if (services.length === 0) services.push({ is_paper_v2_format: true, services: {} });

                        const currentPricing = services[0].pricing || {};
                        const grand = num(o.total_price) || 0;

                        services[0] = {
                            ...services[0],
                            pricing: {
                                ...currentPricing,
                                grandTotal: currentPricing.grandTotal || String(grand),
                                discount: currentPricing.discount || "0",
                                amountReceived: currentPricing.amountReceived || String(grand),
                                accounted: true,
                                accountedAt: new Date().toISOString(),
                            }
                        };

                        const net = grand - num(services[0].pricing.discount);

                        const { error: updateErr } = await supabase
                            .from('inspection_reports')
                            .update({ selected_services: services, total_price: net })
                            .eq('id', o.id);

                        if (updateErr) {
                            console.error(`Error updating report #${o.report_number}:`, updateErr);
                        } else {
                            successCount++;
                        }
                    } catch (err) {
                        console.error(`Exception updating report #${o.report_number}:`, err);
                    }
                }));
            }
            totalUpdated += successCount;
            console.log(`Updated ${successCount} reports in this batch.`);
        }

        if (reports.length < limit) {
            hasMore = false;
        } else {
            // Since we updated some reports, they might still be returned if we just increment offset,
            // but actually, we are selecting by 'status' = 'تم الانتهاء' which doesn't change when we update them.
            // So we must increment offset by reports.length.
            offset += limit;
        }
    }

    console.log(`Completed. Total reports updated/closed: ${totalUpdated}`);
}

closeAllPending();
