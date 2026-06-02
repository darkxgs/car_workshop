import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

const branchId = '62d96405-eab3-4f45-b337-f131f8f42540'; // فرع القطاع

async function seed() {
    const file = '66 - Copy.xls';
    const workbook = XLSX.readFile(file);
    const sheetNames = workbook.SheetNames;
    const firstSheet = workbook.Sheets[sheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    console.log('Total rows in XLS:', data.length);
    const itemsToInsert = [];
    const uniqueNames = new Set();

    for (let i = 9; i < data.length; i++) {
        const row = data[i];
        if (row && row[8]) {
            const pName = String(row[8]).trim();
            if (!pName || pName.toLowerCase() === 'keep' || uniqueNames.has(pName)) continue;
            uniqueNames.add(pName);

            // Clean price
            let sellPrice = 0;
            if (row[1]) {
                const cleanPriceStr = String(row[1]).replace(/,/g, '').replace(/د\.ع/g, '').trim();
                const parsedPrice = parseFloat(cleanPriceStr);
                if (!isNaN(parsedPrice)) {
                    sellPrice = parsedPrice;
                }
            }

            // Clean quantity
            let quantity = 100; // Default to 100 so it doesn't show as low stock / out of stock
            if (row[4]) {
                const parsedQty = parseFloat(String(row[4]).trim());
                if (!isNaN(parsedQty)) {
                    // Round to nearest integer to avoid postgres integer syntax error
                    quantity = Math.round(parsedQty);
                    if (quantity <= 0) quantity = 100;
                }
            }

            // Generate SKU
            const sku = `SEC-${Math.floor(100000 + Math.random() * 900000)}`;

            // Determine category
            let category = 'قطع غيار';
            const nameLower = pName.toLowerCase();
            if (nameLower.includes('زيت') || nameLower.includes('دهن') || nameLower.includes('atf') || nameLower.includes('cvt')) {
                category = 'زيوت';
            } else if (nameLower.includes('فلتر') || nameLower.includes('شوتة') || nameLower.includes('شوته') || nameLower.includes('بواجي') || nameLower.includes('سفايف') || nameLower.includes('بريك')) {
                category = 'مستهلكات';
            } else if (nameLower.includes('بطارية') || nameLower.includes('بطاريه')) {
                category = 'كهرباء';
            } else if (nameLower.includes('منظف') || nameLower.includes('فلاش') || nameLower.includes('سيراميك') || nameLower.includes('مانع') || nameLower.includes('واقي')) {
                category = 'تكييف'; 
            }

            itemsToInsert.push({
                branch_id: branchId,
                item_code: sku,
                name: pName,
                category: category,
                purchase_price: Math.round(sellPrice * 0.7), 
                sell_price: sellPrice,
                quantity: quantity,
                min_quantity: 5
            });
        }
    }

    console.log(`Prepared ${itemsToInsert.length} unique products to seed.`);

    // Delete existing items for the Sector branch first to avoid duplication
    console.log('Cleaning existing inventory for Sector branch...');
    const { error: deleteErr } = await supabase.from('inventory').delete().eq('branch_id', branchId);
    if (deleteErr) {
        console.error('Error cleaning inventory:', deleteErr);
        return;
    }

    // Batch insert
    const batchSize = 100;
    for (let i = 0; i < itemsToInsert.length; i += batchSize) {
        const batch = itemsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('inventory').insert(batch);
        if (error) {
            console.error(`Error inserting batch ${i / batchSize}:`, error);
        } else {
            console.log(`Inserted batch ${i / batchSize + 1}/${Math.ceil(itemsToInsert.length / batchSize)}`);
        }
    }

    console.log('Seeding completed successfully!');
}

seed();
