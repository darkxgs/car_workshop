const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const XLSX = require('xlsx');

// Simple env loader
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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in env files.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const branchId = 'a9d32e9b-57ba-4d58-aced-8fe797113ea7'; // الصناعية
const key = 'materials';
const label = 'قائمة المواد والقطع الموحدة';

async function main() {
    const filePath = './Book1.xlsx';
    if (!fs.existsSync(filePath)) {
        console.error(`Excel file not found at: ${filePath}`);
        process.exit(1);
    }
    
    console.log('Loading workbook...');
    const workbook = XLSX.readFile(filePath);
    const items = [];
    let nextSerial = 1;

    // 1. Parse Sheet1
    const sheet1 = workbook.Sheets['Sheet1'];
    if (sheet1) {
        const rows = XLSX.utils.sheet_to_json(sheet1);
        rows.forEach(row => {
            const cleanRow = {};
            Object.keys(row).forEach(k => {
                cleanRow[k.trim()] = row[k];
            });

            const serial = cleanRow['ت'] ? String(cleanRow['ت']).trim() : '';
            const name = cleanRow['المادة'] ? String(cleanRow['المادة']).trim() : '';
            const price = cleanRow['سعر البيع'] !== undefined && cleanRow['سعر البيع'] !== null ? String(cleanRow['سعر البيع']).trim() : '';
            
            if (name) {
                items.push({
                    serial: serial,
                    name: name,
                    price: price
                });
                const sNum = parseInt(serial);
                if (!isNaN(sNum) && sNum >= nextSerial) {
                    nextSerial = sNum + 1;
                }
            }
        });
    }

    // 2. Parse Sheet2
    const sheet2 = workbook.Sheets['Sheet2'];
    if (sheet2) {
        const rawRows = XLSX.utils.sheet_to_json(sheet2, { header: 1 });
        rawRows.forEach(row => {
            if (!row || row.length === 0) return;
            const name = row[0] ? String(row[0]).trim() : '';
            const price = row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '';
            
            if (name) {
                items.push({
                    serial: String(nextSerial++),
                    name: name,
                    price: price
                });
            }
        });
    }

    console.log(`Parsed ${items.length} items from Excel.`);
    console.log('Sample first item:', items[0]);
    console.log('Sample last item:', items[items.length - 1]);

    console.log('Upserting suggestions to Supabase suggestion_lists table...');
    const { data, error } = await supabase.from('suggestion_lists').upsert({
        branch_id: branchId,
        key: key,
        label: label,
        items: items,
        updated_at: new Date().toISOString()
    });

    if (error) {
        console.error('Error upserting suggestions:', error);
    } else {
        console.log('Success! Suggestions imported successfully into Supabase.');
    }
}

main();
