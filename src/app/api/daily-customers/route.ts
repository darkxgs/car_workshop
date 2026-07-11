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

function unauthorized() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
    // ── API-key gate ──
    const expected = process.env.DAILY_CUSTOMERS_API_KEY || "";
    const auth = request.headers.get("authorization") || "";
    const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
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

    const SELECT = `id, report_number, status, order_type, created_at, odometer_reading, selected_services,
                 branches(name), vehicles(make, model, clients(name, phone))`;

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

        return {
            report_number: r.report_number,
            full_name: fullName,
            phone,
            branch: branch?.name || "",
            car: isSale ? "" : `${vehicle?.make || ""} ${vehicle?.model || ""}`.trim(),
            service: servicesOf(r),
            current_mileage: r.odometer_reading || 0,
            next_service_mileage: nextService,
            status: r.status,
            created_at: r.created_at,
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
