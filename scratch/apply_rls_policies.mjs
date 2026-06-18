import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load env variables
let envText = '';
if (fs.existsSync('.env.local')) {
    envText = fs.readFileSync('.env.local', 'utf8');
} else if (fs.existsSync('.env')) {
    envText = fs.readFileSync('.env', 'utf8');
}

const env = {};
envText.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > -1) {
        const key = line.substring(0, idx).trim();
        const val = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        env[key] = val;
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
    console.log("Applying RLS policies for anonymous digital booklet access...");

    const sql = `
        -- 1. Drop existing policies if they exist (to avoid duplication errors)
        DROP POLICY IF EXISTS "Allow public read-only access to vehicles with booklets" ON public.vehicles;
        DROP POLICY IF EXISTS "Allow public read-only access to clients of vehicles with booklets" ON public.clients;
        DROP POLICY IF EXISTS "Allow public read-only access to inspection reports of vehicles with booklets" ON public.inspection_reports;
        DROP POLICY IF EXISTS "Allow public read-only access to branches" ON public.branches;
        DROP POLICY IF EXISTS "Allow public read-only access to employees of reports" ON public.employees;

        -- 2. Create the RLS policies for the "anon" role (public users)
        
        -- Vehicles: Allow public select only if the vehicle has a booklet serial number
        CREATE POLICY "Allow public read-only access to vehicles with booklets" 
        ON public.vehicles 
        FOR SELECT 
        TO anon 
        USING (booklet_serial IS NOT NULL);

        -- Clients: Allow public select only for clients who own a vehicle with a booklet
        CREATE POLICY "Allow public read-only access to clients of vehicles with booklets" 
        ON public.clients 
        FOR SELECT 
        TO anon 
        USING (
            EXISTS (
                SELECT 1 FROM public.vehicles 
                WHERE vehicles.client_id = clients.id 
                  AND vehicles.booklet_serial IS NOT NULL
            )
        );

        -- Inspection Reports: Allow public select only for reports associated with a vehicle that has a booklet
        CREATE POLICY "Allow public read-only access to inspection reports of vehicles with booklets" 
        ON public.inspection_reports 
        FOR SELECT 
        TO anon 
        USING (
            EXISTS (
                SELECT 1 FROM public.vehicles 
                WHERE vehicles.id = inspection_reports.vehicle_id 
                  AND vehicles.booklet_serial IS NOT NULL
            )
        );

        -- Branches: Allow public select to get branch names
        CREATE POLICY "Allow public read-only access to branches" 
        ON public.branches 
        FOR SELECT 
        TO anon 
        USING (true);

        -- Employees: Allow public select only for employees mentioned in public inspection reports
        CREATE POLICY "Allow public read-only access to employees of reports" 
        ON public.employees 
        FOR SELECT 
        TO anon 
        USING (
            EXISTS (
                SELECT 1 FROM public.inspection_reports 
                JOIN public.vehicles ON vehicles.id = inspection_reports.vehicle_id 
                WHERE (inspection_reports.receptionist_id = employees.id 
                       OR inspection_reports.supervisor_id = employees.id
                       OR inspection_reports.technician_id = employees.id)
                  AND vehicles.booklet_serial IS NOT NULL
            )
        );
    `;

    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
        console.error("Error applying RLS policies:", error);
    } else {
        console.log("RLS policies applied successfully:", data);
    }
}

main();
