import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";

// Daily customers feed for the WhatsApp automation (Wassenger / Cowork MCP).
// Protected by a static API key: Authorization: Bearer <DAILY_CUSTOMERS_API_KEY>.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Service key → Arabic label (mirrors the reception service set).
const SERVICE_LABELS: Record<string, string> = {
    engineOil: 'زيت المحرك', oilFilter: 'فلتر زيت المحرك', airFilter: 'فلتر الهواء',
    acFilter: 'فلتر التبريد', brakeFluid: 'زيت المكابح', coolant: 'ماء الراديتر',
    battery: 'البطارية', engineBelts: 'قايش المحرك', brakePads: 'دسكات السيارة',
    sparkPlugs: 'شمعات الاحتراق', gearboxOil: 'زيت كير', gearboxHydraulic: 'هايدروليك الكير', gearboxFilter: 'فلتر الكير',
    wipers: 'المساحات', windshieldFluid: 'سائل غسيل جام',
    battery2: 'البطارية فحص دوري', batteryFilter: 'فلتر البطارية',
    engineFlash: 'فلاش المحرك', engineCeramic: 'سيراميك محرك',
    linerCleaner: 'منظف بطانة (جكجكة)', oilLeakPreventer: 'مانع تسريب زيت',
    smokePreventer: 'مانع دخان', gearboxFlash: 'فلاش كير',
    gearboxCeramic: 'سيراميك كير', gearboxAntiSlip: 'مانع انزلاق كير',
    acCleaner: 'منظف دورة تبريد', injectorCleaner: 'منظف بخاخات',
    fuelSystemCleaner: 'منظف نظام وقود', octaneBooster: 'محسن أوكتان',
    additives: 'معالجات ومحسنات', cleaners: 'منظفات وأساسيات',
    transOil: 'زيت ناقل الحركة', differentialOil: 'زيت الدبل / البكك',
    maintenanceUnits: 'وحدات الصيانة',
};

/** Normalize an Iraqi phone number to international digits: 9647XXXXXXXXX. */
function normalizePhone(raw?: string | null): string | null {
    if (!raw) return null;
    let p = String(raw).replace(/[^\d]/g, ""); // drop +, spaces, dashes
    if (!p) return null;
    if (p.startsWith("00964")) p = p.slice(2);
    if (p.startsWith("964")) return p;
    if (p.startsWith("0")) return "964" + p.slice(1);
    // bare local number without the leading zero (e.g. 7701234567)
    if (p.length === 10 && p.startsWith("7")) return "964" + p;
    return p;
}

/** The actual services performed on an order (real names, not headings). */
function servicesOf(order: any): string {
    const payload = Array.isArray(order.selected_services) ? order.selected_services[0] : order.selected_services;
    if (order.order_type === "sale") {
        const products = (Array.isArray(payload?.products) ? payload.products : [])
            .map((p: any) => String(p?.name || "").trim()).filter(Boolean);
        return products.length ? `بيع منتج: ${products.join("، ")}` : "بيع منتج";
    }
    const services = payload?.services || {};
    const performed: string[] = [];
    for (const [k, v] of Object.entries(services as Record<string, any>)) {
        if (!v || v.status !== "يحتاج تغيير") continue;
        if (k === "additives" || k === "cleaners" || k === "wipers") {
            const det = v.details || {};
            const prods = Object.keys(det)
                .filter(dk => dk.startsWith("prod_") && det[dk])
                .map(dk => String(det[dk]).trim());
            performed.push(...(prods.length ? prods : [SERVICE_LABELS[k] || k]));
        } else {
            performed.push(SERVICE_LABELS[k] || k);
        }
    }
    (payload?.customServices || []).forEach((c: any) => { if (c?.label) performed.push(String(c.label)); });
    return performed.join("، ") || "فحص";
}

// Arabic labels for the detail-field keys as entered in reception.
const DETAIL_LABELS: Record<string, string> = {
    brand: "النوع/الماركة", type: "النوع", viscosity: "اللزوجة", liters: "اللترات",
    qty: "العدد", size: "الحجم", filterNum: "رقم الفلتر", num: "الرقم", notes: "ملاحظات",
};

/** FULL service details exactly as entered in the system (viscosity, liters, brand,
 *  filter numbers, sizes, quantities, notes, per-service price …). */
function serviceDetailsOf(order: any): { name: string; details: string; price: number }[] {
    const payload = Array.isArray(order.selected_services) ? order.selected_services[0] : order.selected_services;
    const num = (v: any) => parseFloat(String(v ?? "").replace(/[^\d.]/g, "")) || 0;
    const out: { name: string; details: string; price: number }[] = [];

    if (order.order_type === "sale") {
        (Array.isArray(payload?.products) ? payload.products : []).forEach((p: any) => {
            if (!p?.name) return;
            out.push({
                name: String(p.name).trim(),
                details: `العدد: ${p.qty || 1}`,
                price: num(p.price) * (num(p.qty) || 1),
            });
        });
        return out;
    }

    const services = payload?.services || {};
    for (const [k, v] of Object.entries(services as Record<string, any>)) {
        if (!v || v.status !== "يحتاج تغيير") continue;
        const det = v.details || {};
        if (k === "additives" || k === "cleaners" || k === "wipers") {
            // Multi-product services: each product with its qty, unit price and notes.
            Object.keys(det).filter(dk => dk.startsWith("prod_") && det[dk]).forEach(dk => {
                const suf = dk.replace("prod_", "");
                const parts: string[] = [];
                const qty = det[`qty_${suf}`];
                if (qty) parts.push(`العدد: ${qty}`);
                const noteVal = det[`notes_${dk}`] || det[`notes_${suf}`];
                if (noteVal) parts.push(`ملاحظات: ${noteVal}`);
                out.push({
                    name: String(det[dk]).trim(),
                    details: parts.join(" - "),
                    price: num(det[`price_${suf}`]) * (num(qty) || 1),
                });
            });
        } else {
            const parts: string[] = [];
            const norm = (s: any) => String(s ?? "").toLowerCase().replace(/[\s\-_]/g, "");
            const typeVal = norm(det.brand) + norm(det.type);
            for (const [dk, dval] of Object.entries(det)) {
                if (dk === "unitPrice" || dval === "" || dval == null) continue;
                // Skip the viscosity when the brand/type text already contains it
                // (e.g. "شل 5W30 HX8" + viscosity "5W30" would duplicate it).
                if (dk === "viscosity" && typeVal.includes(norm(dval))) continue;
                parts.push(`${DETAIL_LABELS[dk] || dk}: ${dval}`);
            }
            if (det.unitPrice) parts.push(`سعر الوحدة: ${det.unitPrice}`);
            out.push({ name: SERVICE_LABELS[k] || k, details: parts.join(" - "), price: num(v.price) });
        }
    }
    (payload?.customServices || []).forEach((c: any) => {
        if (!c?.label) return;
        out.push({ name: String(c.label), details: "", price: num(c.price) });
    });
    return out;
}

function unauthorized() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
    // ── API-key gate ──
    // Accepted as a header (Authorization: Bearer <key> — the "Bearer " prefix is
    // optional and case-insensitive, since some connector tools send the raw key),
    // as an x-api-key header, or, for tools that can only call a plain URL, as a
    // query param (?key=<key>).
    const expected = process.env.DAILY_CUSTOMERS_API_KEY || "";
    const auth = (request.headers.get("authorization") || "").trim();
    const provided = (/^bearer\s+/i.test(auth) ? auth.replace(/^bearer\s+/i, "") : auth).trim()
        || (request.headers.get("x-api-key") || "").trim()
        || (request.nextUrl.searchParams.get("key") || "").trim();
    if (!expected || !provided) return unauthorized();
    const a = Buffer.from(provided), b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return unauthorized();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Filters ──
    // ?all=1 (or ?date=all)  → the ENTIRE database (paged internally).
    // ?date=YYYY-MM-DD       → that day only (Iraq time). Default: today.
    // ?unique=1              → one row per phone number (latest visit) — for broadcasts.
    const params = request.nextUrl.searchParams;
    const wantAll = params.get("all") === "1" || params.get("date") === "all";
    const unique = params.get("unique") === "1";

    const SELECT = `id, report_number, status, order_type, created_at, completed_at, odometer_reading, odometer_unit,
                 total_price, bay_number, notes, selected_services,
                 branches(name), vehicles(make, model, plate_number, engine_size, booklet_serial, clients(name, phone)),
                 receptionist:receptionist_id(name)`;

    let data: any[] = [];
    if (wantAll) {
        // Page through everything (Supabase caps a single request at 1000 rows).
        const PAGE = 1000, MAX = 20000;
        for (let from = 0; from < MAX; from += PAGE) {
            const { data: page, error } = await supabase
                .from("inspection_reports").select(SELECT)
                .order("created_at", { ascending: true })
                .range(from, from + PAGE - 1);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            data.push(...(page || []));
            if (!page || page.length < PAGE) break;
        }
    } else {
        const qp = params.get("date");
        let dateStr = qp && /^\d{4}-\d{2}-\d{2}$/.test(qp) ? qp : null;
        if (!dateStr) {
            const nowIraq = new Date(Date.now() + 3 * 3600 * 1000);
            dateStr = nowIraq.toISOString().slice(0, 10);
        }
        const start = new Date(`${dateStr}T00:00:00Z`); start.setUTCHours(start.getUTCHours() - 3);
        const end = new Date(`${dateStr}T23:59:59.999Z`); end.setUTCHours(end.getUTCHours() - 3);
        const { data: day, error } = await supabase
            .from("inspection_reports").select(SELECT)
            .gte("created_at", start.toISOString())
            .lte("created_at", end.toISOString())
            .order("created_at", { ascending: true })
            .limit(1000);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        data = day || [];
    }

    const customers = (data || []).map((r: any) => {
        const payload = Array.isArray(r.selected_services) ? r.selected_services[0] : r.selected_services;
        const vehicle = Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles;
        const client = vehicle ? (Array.isArray(vehicle.clients) ? vehicle.clients[0] : vehicle.clients) : null;
        const branch = Array.isArray(r.branches) ? r.branches[0] : r.branches;
        const isSale = r.order_type === "sale";

        const fullName = isSale ? (payload?.customerName || "عميل نقدي") : (client?.name || "");
        const phone = normalizePhone(isSale ? payload?.customerPhone : client?.phone);
        const nextService = parseInt(String(payload?.futureOdometer || "").replace(/[^\d]/g, "")) || null;
        const receptionist = Array.isArray(r.receptionist) ? r.receptionist[0] : r.receptionist;
        // Technician names: the structured array first, else the legacy joined string.
        const techNames = Array.isArray(payload?.technicians) && payload.technicians.length
            ? payload.technicians.map((t: any) => (t?.name || "").trim()).filter(Boolean).join("، ")
            : (payload?.technicianName || "");
        const pricing = payload?.pricing || {};
        const numQ = (v: any) => parseFloat(String(v ?? "").replace(/[^\d.]/g, "")) || 0;
        const booklet = payload?.booklet || {};

        return {
            report_number: r.report_number,
            full_name: fullName,
            phone,
            branch: branch?.name || "",
            car: isSale ? "" : `${vehicle?.make || ""} ${vehicle?.model || ""}`.trim(),
            plate_number: isSale ? "" : (vehicle?.plate_number || ""),
            engine_size: isSale ? "" : (vehicle?.engine_size || ""),
            service: servicesOf(r),
            // Full per-service details exactly as entered in the system
            // (viscosity, liters, brand, filter number, size, qty, notes, price).
            services_details: serviceDetailsOf(r),
            total_price: r.total_price || 0,
            discount: numQ(pricing.discount),
            amount_received: numQ(pricing.amountReceived),
            current_mileage: r.odometer_reading || 0,
            odometer_unit: r.odometer_unit === "mi" ? "mi" : "km",
            next_service_mileage: nextService,
            technician: isSale ? "" : techNames,
            supervisor: isSale ? "" : (payload?.shiftSupervisor || ""),
            receptionist: receptionist?.name || payload?.receptionistName || "",
            shift: payload?.shiftName || "",
            bay_number: r.bay_number || "",
            booklet_type: booklet.type || "",
            booklet_serial: vehicle?.booklet_serial || booklet.serial || "",
            order_notes: r.notes || "",
            status: r.status,
            created_at: r.created_at,
            completed_at: r.completed_at || null,
        };
    }).filter(c => c.phone); // WhatsApp needs a phone number

    // ?unique=1 → one row per phone, keeping the MOST RECENT visit (rows are oldest→newest,
    // so later entries overwrite earlier ones). Right shape for broadcast lists.
    if (unique) {
        const byPhone = new Map<string, (typeof customers)[number]>();
        for (const c of customers) byPhone.set(c.phone!, c);
        return NextResponse.json([...byPhone.values()]);
    }

    return NextResponse.json(customers);
}
