const XLSX = require('xlsx');

const filePath = './Book1.xlsx';
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

console.log('Total items parsed:', items.length);
console.log('Sample parsed items:');
console.log('First 5:', items.slice(0, 5));
console.log('Last 5:', items.slice(-5));
