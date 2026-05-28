import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
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

async function checkOrders() {
    const { data, error } = await supabase.from('inspection_reports').select('id, report_number, status, estimated_duration, selected_services');
    if (error) {
        console.error("Error fetching orders:", error);
    } else {
        console.log("Current Orders in DB:", data);
        
        // Let's update any order with estimated_duration = 0
        const SERVICE_ESTIMATED_MINUTES = {
            engineOil: 30,
            oilFilter: 20,
            airFilter: 20,
            acFilter: 20,
            brakeFluid: 25,
            coolant: 30,
            battery: 20,
            engineBelts: 30,
            brakePads: 30,
            sparkPlugs: 30,
            gearboxHydraulic: 45,
            gearboxFilter: 30,
            wipers: 15,
            additives: 10,
        };

        for (const order of data) {
            if (!order.estimated_duration || order.estimated_duration === 0) {
                let calculatedDuration = 0;
                const svc = order.selected_services?.[0] || {};
                
                if (svc.is_paper_v2_format) {
                    const services = svc.services || {};
                    Object.entries(services).forEach(([key, val]) => {
                        if (val && val.status === 'يحتاج تغيير') {
                            calculatedDuration += SERVICE_ESTIMATED_MINUTES[key] || 30;
                        }
                    });
                    const freeServices = svc.freeServices || {};
                    Object.entries(freeServices).forEach(([key, val]) => {
                        if (val) {
                            calculatedDuration += 10;
                        }
                    });
                    if (Array.isArray(svc.customServices)) {
                        calculatedDuration += svc.customServices.length * 30;
                    }
                }
                
                if (calculatedDuration === 0) {
                    calculatedDuration = 30; // default
                }
                
                console.log(`Updating order #${order.report_number} (${order.id}) estimated_duration to ${calculatedDuration}`);
                await supabase.from('inspection_reports').update({ estimated_duration: calculatedDuration }).eq('id', order.id);
            }
        }
    }
}

checkOrders();
