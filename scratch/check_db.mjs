import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .from('reports')
        .select('id, branches(name), selected_services')
        .order('created_at', { ascending: false })
        .limit(5);
        
    if (error) {
        console.error("Error:", error);
        return;
    }
    
    for (const r of data) {
        console.log(`Report ID: ${r.id}, Branch: ${r.branches?.name}`);
        const s = r.selected_services?.[0]?.services;
        if (!s) continue;
        
        console.log("  engineOil details:", s.engineOil?.details);
        console.log("  oilFilter details:", s.oilFilter?.details);
        console.log("  brakeFluid details:", s.brakeFluid?.details);
        console.log("  wipers details:", s.wipers?.details);
    }
}
check();
