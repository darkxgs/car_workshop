const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
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

async function inspectEmployees() {
    console.log("Fetching employees list...");
    const { data: employees, error } = await supabase
        .from('employees')
        .select('id, name, role, branch_id, branches(name)');

    if (error) {
        console.error(error);
        return;
    }

    employees.forEach(e => {
        console.log(`Employee: ${e.name} | Role: ${e.role} | Email: ${e.email} | Branch: ${e.branches?.name || 'No Branch'} (ID: ${e.branch_id})`);
    });
}

inspectEmployees();
