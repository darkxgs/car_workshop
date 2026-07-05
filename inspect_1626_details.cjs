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

function toLocalTime(utcString) {
    if (!utcString) return "غير متوفر";
    const date = new Date(utcString);
    return date.toLocaleString('ar-IQ', {
        timeZone: 'Asia/Baghdad',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

async function inspect1626() {
    console.log("Fetching Report #1626 details...");
    const { data: report, error } = await supabase
        .from('inspection_reports')
        .select(`
            id,
            report_number,
            status,
            order_type,
            branch_id,
            receptionist_id,
            created_at,
            completed_at,
            branches(name),
            receptionist:receptionist_id(name)
        `)
        .eq('report_number', 1626)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    console.log("Report #1626:", JSON.stringify({
        ...report,
        created_at_local: toLocalTime(report.created_at),
        completed_at_local: toLocalTime(report.completed_at)
    }, null, 2));
}

inspect1626();
