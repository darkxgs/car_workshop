import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync('.env', 'utf8');
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

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkPolicies() {
    const sql = `
        SELECT tablename, policyname, roles, cmd, qual 
        FROM pg_policies 
        WHERE tablename IN ('vehicles', 'clients', 'inspection_reports');
    `;
    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql });
    if (error) {
        console.error("Error checking policies:", error);
    } else {
        console.log("Policies found:");
        console.table(data);
    }
    
    // Also check if RLS is enabled on these tables
    const rlsSql = `
        SELECT relname as tablename, relrowsecurity as rls_enabled 
        FROM pg_class 
        WHERE relname IN ('vehicles', 'clients', 'inspection_reports');
    `;
    const { data: rlsData, error: rlsError } = await supabaseAdmin.rpc('exec_sql', { sql: rlsSql });
    if (rlsError) {
        console.error("Error checking RLS status:", rlsError);
    } else {
        console.log("RLS Status (true means enabled):");
        console.table(rlsData);
    }
}

checkPolicies();
