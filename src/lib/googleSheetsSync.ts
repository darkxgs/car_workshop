import { supabase } from './supabase';

// ── Retry queue ──────────────────────────────────────────────────────────────
// The webhook POST is fire-and-forget (no-cors), so a dropped connection would
// silently lose the row. Failed sends are queued in localStorage and retried on
// the next sync attempt, so the sheet doesn't miss rows when the network blips.
const QUEUE_KEY = 'gs_sync_retry_queue';
const MAX_ATTEMPTS = 20;

type QueueEntry = { id: string; attempts: number };

function readQueue(): QueueEntry[] {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

function writeQueue(q: QueueEntry[]) {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* storage full/blocked */ }
}

function enqueue(reportId: string) {
    const q = readQueue();
    const existing = q.find(e => e.id === reportId);
    if (existing) existing.attempts += 1;
    else q.push({ id: reportId, attempts: 1 });
    writeQueue(q.filter(e => e.attempts <= MAX_ATTEMPTS));
}

/** Public entry point: retry anything previously failed, then sync this order. */
export async function syncOrderToGoogleSheets(reportId: string) {
    // Flush queued failures first (oldest first), removing the ones that go through.
    const q = readQueue();
    for (const entry of q) {
        if (entry.id === reportId) continue; // about to send it anyway
        const ok = await doSync(entry.id);
        if (ok !== 'fail') writeQueue(readQueue().filter(e => e.id !== entry.id));
    }
    const result = await doSync(reportId);
    if (result === 'fail') enqueue(reportId);
    else writeQueue(readQueue().filter(e => e.id !== reportId));
}

/** One sync attempt. 'sent' = delivered, 'skip' = sync disabled/not configured, 'fail' = retry later. */
async function doSync(reportId: string): Promise<'sent' | 'skip' | 'fail'> {
    try {
        // 1. Fetch settings from workshop_settings
        const { data: settings, error: settingsError } = await supabase
            .from('workshop_settings')
            .select('*');
            
        if (settingsError || !settings) {
            console.log("No workshop settings found for Google Sheets sync.");
            return 'fail'; // likely a network blip — retry later
        }

        const enabled = settings.find(s => s.setting_key === 'google_sheets_sync_enabled')?.setting_value === 'true';
        const webhookUrl = settings.find(s => s.setting_key === 'google_sheets_webhook_url')?.setting_value || '';

        if (!enabled || !webhookUrl) {
            console.log("Google Sheets sync is disabled or webhook URL is empty.");
            return 'skip';
        }
        
        // 2. Fetch full report details
        const { data, error: reportError } = await supabase
            .from("inspection_reports")
            .select(`
                id, report_number, created_at, total_price, status, order_type, selected_services, odometer_reading, branch_id,
                receptionist:employees!receptionist_id(name),
                vehicles(make, model, plate_number, booklet_serial, clients(name, phone)), branches(name)
            `)
            .eq("id", reportId)
            .single();
            
        if (reportError || !data) {
            console.error("Error loading report for sync:", reportError);
            return 'fail';
        }
        
        const r = data as any;
        
        const vehicle = Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles;
        const client  = vehicle ? (Array.isArray(vehicle.clients) ? vehicle.clients[0] : vehicle.clients) : null;
        const payload = Array.isArray(r.selected_services) ? r.selected_services[0] : r.selected_services;
        
        const services   = payload?.services  || {};
        const customs    = payload?.customServices || [];
        const bookletObj = payload?.booklet   || {};
        
        const isSale = r.order_type === 'sale' || payload?.is_sale === true;
        let saleOilType = "", saleOilVisc = "", saleOilLiters = "", saleExtra = "";
        if (isSale) {
            const oils: { name: string; qty: number; visc: string }[] = [];
            const others: { name: string; qty: number }[] = [];
            (Array.isArray(payload?.products) ? payload.products : []).forEach((p: any) => {
                const name = String(p?.name || '').trim();
                if (!name) return;
                const qty = Number(p?.qty || 0);
                const visc = (name.match(/\d+\s*w\s*[-_ ]?\s*\d+/i) || [''])[0].replace(/\s+/g, '');
                const isOil = !visc || /زيت|oil/i.test(name);
                if (isOil) oils.push({ name, qty, visc });
                else others.push({ name, qty });
            });
            saleOilType = oils.map(o => o.name).join('، ');
            saleOilVisc = oils.map(o => o.visc).filter(Boolean).join('، ');
            saleOilLiters = oils.map(o => o.qty).filter(Boolean).join('، ');
            saleExtra = others.map(o => (o.qty > 1 ? `${o.name} ×${o.qty}` : o.name)).join('، ');
        }
        
        const oilSvc  = services.engineOil || {};
        const oilType = oilSvc.details?.type || oilSvc.details?.brand || "";
        const oilVisc = oilSvc.details?.viscosity || "";
        const oilLiters = oilSvc.details?.liters || oilSvc.details?.qty || "";
        
        const SERVICE_LABELS: Record<string, string> = {
            engineOil: 'زيت المحرك', oilFilter: 'فلتر زيت المحرك',
            airFilter: 'فلتر الهواء', acFilter: 'فلتر التبريد',
            brakeFluid: 'زيت المكابح', coolant: 'ماء الراديتر',
            battery: 'البطارية', engineBelts: 'قايش المحرك',
            brakePads: 'دسكات السيارة', sparkPlugs: 'شمعات الاحتراق',
            gearboxOil: 'هايدروليك الكير', gearboxFilter: 'فلتر الكير',
            wipers: 'مساحات زجاج', windshieldFluid: 'سائل غسيل جام',
            battery2: 'البطارية فحص دوري', batteryFilter: 'فلتر البطارية',
            engineFlash: 'فلاش المحرك', engineCeramic: 'سيراميك محرك',
            linerCleaner: 'منظف بطانة (جكجكة)', oilLeakPreventer: 'مانع تسريب زيت',
            smokePreventer: 'مانع دخان', gearboxFlash: 'فلاش كير',
            gearboxCeramic: 'سيراميك كير', gearboxAntiSlip: 'مانع انزلاق كير',
            acCleaner: 'منظف دورة تبريد', injectorCleaner: 'منظف بخاخات',
            fuelSystemCleaner: 'منظف نظام وقود', octaneBooster: 'محسن أوكتان',
            additives: 'معالجات ومحسنات', cleaners: 'منظفات وأساسيات',
            transOil: 'زيت ناقل الحركة', differentialOil: 'زيت الدبل / البكك',
            maintenanceUnits: 'وحدات الصيانة'
        };

        const needChange = Object.entries(services as Record<string, any>)
            .filter(([, v]) => v?.status === "يحتاج تغيير")
            .map(([k, v]) => {
                const label = SERVICE_LABELS[k] || k;
                const det = v?.details || {};
                const parts = [];
                if (k === 'additives' || k === 'cleaners' || k === 'wipers') {
                    // Match the reception multi-product format: prod_<key> + qty_<key> + notes_<key>.
                    Object.keys(det).forEach(dk => {
                        if (dk.startsWith('prod_') && det[dk]) {
                            let s = String(det[dk]);
                            const q = det[dk.replace('prod_', 'qty_')] || "1";
                            s += ` ×${q}`;
                            if (det['notes_' + dk]) s += ` (${det['notes_' + dk]})`;
                            parts.push(s);
                        }
                    });
                } else if (k !== 'engineOil') {
                    for (const [dk, dval] of Object.entries(det)) {
                        if (dk === 'unitPrice' || !dval) continue;
                        if (dk === 'notes') parts.push(`ملاحظات: ${dval}`);
                        else if (dk === 'qty' || dk === 'liters') parts.push(`العدد/اللترات: ${dval}`);
                        else parts.push(String(dval));
                    }
                }
                return parts.length ? `${label}: ${parts.join(' - ')}` : label;
            });
            
        const serviceType = isSale 
            ? ("بيع منتج: " + (saleExtra || saleOilType || 'منتجات متنوعة'))
            : (needChange.join("، ") || "فحص دوري");
        
        const createdYmd = (() => { 
            const d = new Date(r.created_at); 
            return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`; 
        })();
        
        const dbCar = isSale ? "" : `${vehicle?.make || ""} ${vehicle?.model || ""}`.trim();
        const dbOilTypeVisc = (isSale ? [saleOilType, saleOilVisc] : [oilType, oilVisc]).filter(Boolean).join(" ");
        const dbLiters = isSale ? saleOilLiters : (oilLiters || "");
        
        const technicianName = payload?.technicianName || "";
        const shiftName = payload?.shiftName || "";
        const receptionistName = r.receptionist?.name || payload?.receptionistName || "";
        const supervisorName = payload?.shiftSupervisor || "";
        
        // 3. Post to Google Web App Webhook URL
        const postData = {
            report_id: r.id,
            seq: r.report_number,
            client_name: isSale ? (payload?.customerName || "عميل نقدي") : (client?.name  || "—"),
            client_phone: isSale ? (payload?.customerPhone || "—") : (client?.phone || "—"),
            car: dbCar,
            date: createdYmd,
            service_type: serviceType,
            oil_type_viscosity: dbOilTypeVisc,
            liters: dbLiters,
            odometer: isSale ? "" : (r.odometer_reading || ""),
            future_odometer: payload?.futureOdometer || "",
            price: r.total_price || 0,
            booklet_type: bookletObj.type || "",
            booklet_changes: bookletObj.changes || "",
            shift: shiftName || "",
            receptionist: receptionistName || "",
            supervisor: supervisorName || "",
            technician: isSale ? "" : (technicianName || "")
        };
        
        console.log("Sending sync to Google Sheets webhook:", webhookUrl, postData);
        
        await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        console.log("Google Sheets sync completed successfully.");
        return 'sent';
    } catch (err) {
        console.error("Failed to sync to Google Sheets:", err);
        return 'fail';
    }
}
