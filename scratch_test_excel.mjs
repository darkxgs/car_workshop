import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// Parse .env manually
const envPath = path.resolve('.env');
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

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Fetching data for Excel simulation...");
    const { data: filteredReports, error } = await supabase
        .from("inspection_reports")
        .select(`id, report_number, created_at, total_price, status, selected_services, odometer_reading,
                 receptionist:receptionist_id(name),
                 vehicles(make, model, plate_number, clients(name, phone)), branches(name)`)
        .order("created_at", { ascending: false });

    if (error || !filteredReports) {
        console.error("Fetch failed:", error);
        return;
    }

    const STATUS_MAP = {
        "pending": "قيد الانتظار", "قيد الانتظار": "قيد الانتظار",
        "in_progress": "قيد العمل", "قيد العمل": "قيد العمل",
        "completed": "تم الانتهاء", "تم الانتهاء": "تم الانتهاء",
        "cancelled": "ملغي", "ملغي": "ملغي"
    };

    const mapped = filteredReports.map((r, idx) => {
        const vehicle = Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles;
        const client  = vehicle ? (Array.isArray(vehicle.clients) ? vehicle.clients[0] : vehicle.clients) : null;
        const payload = Array.isArray(r.selected_services) ? r.selected_services[0] : r.selected_services;
        const odometer = r.odometer_reading || "";
        const receptionistName = r.receptionist?.name || payload?.receptionistName || "";
        
        return {
            seq: idx + 1,
            branch_name: r.branches?.name || "—",
            client_name:  client?.name  || "—",
            client_phone: client?.phone || "—",
            car_make:  vehicle?.make  || "—",
            car_model: vehicle?.model || "—",
            plate: vehicle?.plate_number || "—",
            created_at: new Date(r.created_at).toLocaleDateString("en-US"),
            total_price: r.total_price || 0,
            status: STATUS_MAP[r.status] || r.status || "",
        };
    });

    const wsData = [
        ["#", "الفرع", "اسم الزبون", "رقم الهاتف", "السيارة", "الموديل", "رقم اللوحة", "التاريخ", "السعر", "الحالة"],
        ...mapped.map(r => [
            r.seq, r.branch_name, r.client_name, r.client_phone, r.car_make, r.car_model, r.plate, r.created_at, r.total_price, r.status
        ])
    ];

    console.log(`wsData contains ${wsData.length - 1} rows (excluding header)`);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "طلبات الصيانة");
    XLSX.writeFile(wb, `test_output.xlsx`);
    
    console.log("Excel file written to test_output.xlsx");
    
    // Read the excel file back to verify rows
    const wbRead = XLSX.readFile(`test_output.xlsx`);
    const wsRead = wbRead.Sheets["طلبات الصيانة"];
    const rowsRead = XLSX.utils.sheet_to_json(wsRead);
    console.log(`Excel sheet reads back with ${rowsRead.length} rows.`);
    
    // Get unique dates in Excel sheet
    const dates = new Set();
    rowsRead.forEach(row => {
        // The date column header is "التاريخ"
        dates.add(row["التاريخ"]);
    });
    console.log("Unique dates in exported Excel sheet:", Array.from(dates));
}

run();
